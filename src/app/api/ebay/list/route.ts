import { NextRequest, NextResponse } from "next/server";

const EBAY_TOKEN_URL = "https://api.ebay.com/identity/v1/oauth2/token";
const EBAY_API = "https://api.ebay.com";
const MARKETPLACE_ID = "EBAY_GB";
const CATEGORY_ID = process.env.EBAY_CATEGORY_ID || "149372";
const EBAY_TIMEOUT_MS = 20000;

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = EBAY_TIMEOUT_MS
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`eBay request timed out after ${timeoutMs / 1000} seconds.`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function getEbayAccessToken() {
  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!clientId || !clientSecret || !supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing eBay or Supabase server environment variables.");
  }

  const tokenResponse = await fetchWithTimeout(
    `${supabaseUrl}/rest/v1/ebay_oauth_tokens?id=eq.ebay&select=refresh_token`,
    {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    }
  );

  if (!tokenResponse.ok) {
    throw new Error("Could not read the saved eBay connection.");
  }

  const tokenRows = await tokenResponse.json();
  const refreshToken = tokenRows?.[0]?.refresh_token;

  if (!refreshToken) {
    throw new Error("eBay is not connected. Click Connect eBay first.");
  }

  const credentials = Buffer.from(
    `${clientId}:${clientSecret}`
  ).toString("base64");

  const response = await fetchWithTimeout(EBAY_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }).toString(),
  });

  const data = await response.json();

  if (!response.ok || !data.access_token) {
    console.error("eBay refresh token exchange failed:", data);
    throw new Error(
      data?.error_description ||
        "eBay could not refresh the connection. Please reconnect eBay."
    );
  }

  return data.access_token as string;
}

async function ebayRequest(
  accessToken: string,
  path: string,
  options: RequestInit = {}
) {
  const response = await fetchWithTimeout(`${EBAY_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Content-Language": "en-GB",
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  let data: unknown = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  return { response, data };
}

function getFirstPolicyId(
  data: any,
  collectionName: string,
  idName: string
) {
  const collection = Array.isArray(data?.[collectionName])
    ? data[collectionName]
    : [];

  const active = collection.find(
    (policy: any) => policy?.status === "ACTIVE" && policy?.[idName]
  );

  return active?.[idName] || collection?.[0]?.[idName] || null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const productId = body?.productId;

    if (!productId) {
      return NextResponse.json(
        { error: "Missing productId." },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Supabase server environment variables are missing." },
        { status: 500 }
      );
    }

    const productResponse = await fetchWithTimeout(
      `${supabaseUrl}/rest/v1/products?id=eq.${encodeURIComponent(
        productId
      )}&select=*`,
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
      }
    );

    if (!productResponse.ok) {
      return NextResponse.json(
        { error: "Could not load the product from Supabase." },
        { status: 500 }
      );
    }

    const products = await productResponse.json();
    const product = products?.[0];

    if (!product) {
      return NextResponse.json(
        { error: "Product not found." },
        { status: 404 }
      );
    }

    if (!product.image) {
      return NextResponse.json(
        { error: "This product needs an image before it can be listed on eBay." },
        { status: 400 }
      );
    }

    const accessToken = await getEbayAccessToken();
    const sku = `SPARRA-${String(product.id).replace(/[^a-zA-Z0-9_-]/g, "")}`;

    const existingOffers = await ebayRequest(
      accessToken,
      `/sell/inventory/v1/offer?sku=${encodeURIComponent(
        sku
      )}&marketplace_id=${MARKETPLACE_ID}`
    );

    if (existingOffers.response.ok) {
      const offers = (existingOffers.data as any)?.offers || [];
      const publishedOffer = offers.find(
        (offer: any) => offer?.status === "PUBLISHED"
      );

      if (publishedOffer) {
        const listingId = publishedOffer?.listing?.listingId;
        return NextResponse.json({
          success: true,
          alreadyListed: true,
          listingId,
          message: listingId
            ? `Already listed on eBay. Listing ID: ${listingId}`
            : "This product is already listed on eBay.",
        });
      }
    }

    const fulfillmentResponse = await ebayRequest(
      accessToken,
      `/sell/account/v1/fulfillment_policy?marketplace_id=${MARKETPLACE_ID}`
    );
    const paymentResponse = await ebayRequest(
      accessToken,
      `/sell/account/v1/payment_policy?marketplace_id=${MARKETPLACE_ID}`
    );
    const returnResponse = await ebayRequest(
      accessToken,
      `/sell/account/v1/return_policy?marketplace_id=${MARKETPLACE_ID}`
    );

    if (!fulfillmentResponse.response.ok) {
      console.error("eBay fulfillment policies error:", fulfillmentResponse.data);
    }
    if (!paymentResponse.response.ok) {
      console.error("eBay payment policies error:", paymentResponse.data);
    }
    if (!returnResponse.response.ok) {
      console.error("eBay return policies error:", returnResponse.data);
    }

    const fulfillmentPolicyId =
      process.env.EBAY_FULFILLMENT_POLICY_ID ||
      getFirstPolicyId(
        fulfillmentResponse.data,
        "fulfillmentPolicies",
        "fulfillmentPolicyId"
      );

    const paymentPolicyId =
      process.env.EBAY_PAYMENT_POLICY_ID ||
      getFirstPolicyId(
        paymentResponse.data,
        "paymentPolicies",
        "paymentPolicyId"
      );

    const returnPolicyId =
      process.env.EBAY_RETURN_POLICY_ID ||
      getFirstPolicyId(
        returnResponse.data,
        "returnPolicies",
        "returnPolicyId"
      );

    if (!fulfillmentPolicyId || !paymentPolicyId || !returnPolicyId) {
      return NextResponse.json(
        {
          error:
            "eBay business policies are not ready. You need an active payment, postage/fulfillment and returns policy for eBay UK before products can be published.",
        },
        { status: 400 }
      );
    }

    const locationsResponse = await ebayRequest(
      accessToken,
      "/sell/inventory/v1/location?limit=100"
    );

    if (!locationsResponse.response.ok) {
      console.error("eBay locations error:", locationsResponse.data);
    }

    const locations = Array.isArray((locationsResponse.data as any)?.locations)
      ? (locationsResponse.data as any).locations
      : [];

    const configuredLocationKey = process.env.EBAY_MERCHANT_LOCATION_KEY;
    const location = configuredLocationKey
      ? locations.find(
          (item: any) =>
            item?.merchantLocationKey === configuredLocationKey &&
            item?.locationStatus !== "DISABLED"
        )
      : locations.find((item: any) => item?.locationStatus !== "DISABLED");

    const merchantLocationKey =
      configuredLocationKey || location?.merchantLocationKey;

    if (!merchantLocationKey) {
      return NextResponse.json(
        {
          error:
            "eBay has no active inventory location yet. Add your selling/shipping location in eBay first, then try List on eBay again.",
        },
        { status: 400 }
      );
    }

    const description =
      product.description?.trim() ||
      `${product.name}. Genuine Funko collectible from Sparra's Funko Pop Up Shop.`;

    const aspects: Record<string, string[]> = {
      Brand: ["Funko"],
      Type: ["Vinyl Figure"],
      "Product Line": ["Pop!"],
    };

    if (product.category) {
      aspects.Collection = [product.category];
    }

    const inventoryPayload = {
      availability: {
        shipToLocationAvailability: {
          quantity: Math.max(0, Number(product.stock) || 0),
        },
      },
      condition: "NEW",
      product: {
        title: String(product.name).slice(0, 80),
        description,
        imageUrls: [product.image],
        aspects,
      },
    };

    const inventoryResponse = await ebayRequest(
      accessToken,
      `/sell/inventory/v1/inventory_item/${encodeURIComponent(sku)}`,
      {
        method: "PUT",
        body: JSON.stringify(inventoryPayload),
      }
    );

    if (!inventoryResponse.response.ok) {
      console.error("eBay inventory item error:", inventoryResponse.data);

      return NextResponse.json(
        {
          error: "eBay rejected the inventory item.",
          details: inventoryResponse.data,
        },
        { status: inventoryResponse.response.status }
      );
    }

    const offerPayload = {
      sku,
      marketplaceId: MARKETPLACE_ID,
      format: "FIXED_PRICE",
      availableQuantity: Math.max(0, Number(product.stock) || 0),
      categoryId: CATEGORY_ID,
      listingDescription: description,
      listingDuration: "GTC",
      merchantLocationKey,
      pricingSummary: {
        price: {
          currency: "GBP",
          value: Number(product.price).toFixed(2),
        },
      },
      listingPolicies: {
        fulfillmentPolicyId,
        paymentPolicyId,
        returnPolicyId,
      },
    };

    const offerResponse = await ebayRequest(
      accessToken,
      "/sell/inventory/v1/offer",
      {
        method: "POST",
        body: JSON.stringify(offerPayload),
      }
    );

    if (!offerResponse.response.ok) {
      console.error("eBay offer creation error:", offerResponse.data);

      return NextResponse.json(
        {
          error: "eBay created the inventory item but rejected the listing offer.",
          details: offerResponse.data,
        },
        { status: offerResponse.response.status }
      );
    }

    const offerId = (offerResponse.data as any)?.offerId;

    if (!offerId) {
      return NextResponse.json(
        { error: "eBay did not return an offer ID." },
        { status: 500 }
      );
    }

    const publishResponse = await ebayRequest(
      accessToken,
      `/sell/inventory/v1/offer/${encodeURIComponent(offerId)}/publish`,
      {
        method: "POST",
        body: JSON.stringify({}),
      }
    );

    if (!publishResponse.response.ok) {
      console.error("eBay publish error:", publishResponse.data);

      return NextResponse.json(
        {
          error: "eBay created the offer but could not publish the listing.",
          details: publishResponse.data,
        },
        { status: publishResponse.response.status }
      );
    }

    const listingId = (publishResponse.data as any)?.listingId;

    return NextResponse.json({
      success: true,
      listingId,
      offerId,
      message: listingId
        ? `Listed on eBay successfully. Listing ID: ${listingId}`
        : "Listed on eBay successfully.",
    });
  } catch (error) {
    console.error("eBay list route error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected error while listing on eBay.",
      },
      { status: 500 }
    );
  }
}
