import { NextRequest, NextResponse } from "next/server";

const EBAY_TOKEN_URL = "https://api.ebay.com/identity/v1/oauth2/token";
const EBAY_API = "https://api.ebay.com";
const MARKETPLACE_ID = "EBAY_GB";
const CATEGORY_ID = process.env.EBAY_CATEGORY_ID || "149372";
const EBAY_TIMEOUT_MS = 20000;

const DEFAULT_MERCHANT_LOCATION_KEY = "SPARRAS-SWINESHEAD";
const DEFAULT_INVENTORY_LOCATION_NAME = "Sparra's Collectables";
const DEFAULT_INVENTORY_POSTAL_CODE = "PE20 3LJ";
const DEFAULT_INVENTORY_COUNTRY = "GB";

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = EBAY_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal, cache: "no-store" });
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
    { headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` } }
  );

  if (!tokenResponse.ok) throw new Error("Could not read the saved eBay connection.");

  const tokenRows = await tokenResponse.json();
  const refreshToken = tokenRows?.[0]?.refresh_token;
  if (!refreshToken) throw new Error("eBay is not connected. Click Connect eBay first.");

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetchWithTimeout(EBAY_TOKEN_URL, {
    method: "POST",
    headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }).toString(),
  });

  const data = await response.json();
  if (!response.ok || !data.access_token) {
    console.error("eBay refresh token exchange failed:", data);
    throw new Error(data?.error_description || "eBay could not refresh the connection. Please reconnect eBay.");
  }
  return data.access_token as string;
}

async function ebayRequest(accessToken: string, path: string, options: RequestInit = {}) {
  const response = await fetchWithTimeout(`${EBAY_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Accept-Language": "en-GB",
      "Content-Type": "application/json",
      "Content-Language": "en-GB",
      "X-EBAY-C-MARKETPLACE-ID": MARKETPLACE_ID,
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = { message: text }; }
  }
  return { response, data };
}

function getFirstPolicyId(data: any, collectionName: string, idName: string) {
  const collection = Array.isArray(data?.[collectionName]) ? data[collectionName] : [];
  return collection.find((policy: any) => policy?.[idName])?.[idName] || null;
}

async function ensureSellingPolicyManagement(accessToken: string) {
  const programsResponse = await ebayRequest(accessToken, "/sell/account/v1/program/get_opted_in_programs");
  if (programsResponse.response.ok) {
    const programs = Array.isArray((programsResponse.data as any)?.programs) ? (programsResponse.data as any).programs : [];
    if (programs.some((program: any) => program?.programType === "SELLING_POLICY_MANAGEMENT")) return;
  }

  const optInResponse = await ebayRequest(accessToken, "/sell/account/v1/program/opt_in", {
    method: "POST",
    body: JSON.stringify({ programType: "SELLING_POLICY_MANAGEMENT" }),
  });

  if (!optInResponse.response.ok) {
    throw new Error(`eBay business policy setup could not be enabled. ${JSON.stringify(optInResponse.data)}`);
  }
}

function getLocationStatus(location: any) {
  return location?.merchantLocationStatus || location?.locationStatus || null;
}

async function ensureInventoryLocation(accessToken: string) {
  const configuredLocationKey = process.env.EBAY_MERCHANT_LOCATION_KEY?.trim() || DEFAULT_MERCHANT_LOCATION_KEY;

  const locationsResponse = await ebayRequest(accessToken, "/sell/inventory/v1/location?limit=100");
  if (!locationsResponse.response.ok) {
    throw new Error(`eBay could not retrieve inventory locations. ${JSON.stringify(locationsResponse.data)}`);
  }

  const locations = Array.isArray((locationsResponse.data as any)?.locations) ? (locationsResponse.data as any).locations : [];
  const configuredLocation = locations.find((item: any) => item?.merchantLocationKey === configuredLocationKey);

  if (configuredLocation) {
    if (getLocationStatus(configuredLocation) !== "DISABLED") return configuredLocationKey;

    const enableResponse = await ebayRequest(
      accessToken,
      `/sell/inventory/v1/location/${encodeURIComponent(configuredLocationKey)}/enable`,
      { method: "POST", body: JSON.stringify({}) }
    );
    if (!enableResponse.response.ok) {
      throw new Error(`eBay found the inventory location but could not enable it. ${JSON.stringify(enableResponse.data)}`);
    }
    return configuredLocationKey;
  }

  const existingActiveLocation = locations.find((item: any) => getLocationStatus(item) !== "DISABLED" && item?.merchantLocationKey);
  if (existingActiveLocation?.merchantLocationKey) return existingActiveLocation.merchantLocationKey as string;

  const createResponse = await ebayRequest(
    accessToken,
    `/sell/inventory/v1/location/${encodeURIComponent(configuredLocationKey)}`,
    {
      method: "POST",
      body: JSON.stringify({
        location: { address: { postalCode: DEFAULT_INVENTORY_POSTAL_CODE, country: DEFAULT_INVENTORY_COUNTRY } },
        name: DEFAULT_INVENTORY_LOCATION_NAME,
        merchantLocationStatus: "ENABLED",
        locationTypes: ["WAREHOUSE"],
      }),
    }
  );

  if (!createResponse.response.ok) {
    if (createResponse.response.status === 409) {
      const retryResponse = await ebayRequest(accessToken, `/sell/inventory/v1/location/${encodeURIComponent(configuredLocationKey)}`);
      if (retryResponse.response.ok && getLocationStatus(retryResponse.data) !== "DISABLED") return configuredLocationKey;
    }
    throw new Error(`eBay could not create the inventory location. ${JSON.stringify(createResponse.data)}`);
  }

  return configuredLocationKey;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const productId = body?.productId;
    if (!productId) return NextResponse.json({ error: "Missing productId." }, { status: 400 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: "Supabase server environment variables are missing." }, { status: 500 });
    }

    const productResponse = await fetchWithTimeout(
      `${supabaseUrl}/rest/v1/products?id=eq.${encodeURIComponent(productId)}&select=*`,
      { headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` } }
    );
    if (!productResponse.ok) return NextResponse.json({ error: "Could not load the product from Supabase." }, { status: 500 });

    const products = await productResponse.json();
    const product = products?.[0];
    if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });
    if (!product.image) return NextResponse.json({ error: "This product needs an image before it can be listed on eBay." }, { status: 400 });

    const accessToken = await getEbayAccessToken();
    const sku = `SPARRA-${String(product.id).replace(/[^a-zA-Z0-9_-]/g, "")}`;

    const existingOffers = await ebayRequest(accessToken, `/sell/inventory/v1/offer?sku=${encodeURIComponent(sku)}&marketplace_id=${MARKETPLACE_ID}`);
    let existingUnpublishedOffer: any = null;

    if (existingOffers.response.ok) {
      const offers = Array.isArray((existingOffers.data as any)?.offers) ? (existingOffers.data as any).offers : [];
      const publishedOffer = offers.find((offer: any) => offer?.status === "PUBLISHED");
      if (publishedOffer) {
        const listingId = publishedOffer?.listing?.listingId;
        return NextResponse.json({ success: true, alreadyListed: true, listingId, message: listingId ? `Already listed on eBay. Listing ID: ${listingId}` : "This product is already listed on eBay." });
      }
      existingUnpublishedOffer = offers.find((offer: any) => offer?.offerId && offer?.status !== "PUBLISHED") || null;
    }

    await ensureSellingPolicyManagement(accessToken);

    const fulfillmentResponse = await ebayRequest(accessToken, `/sell/account/v1/fulfillment_policy?marketplace_id=${MARKETPLACE_ID}`);
    const paymentResponse = await ebayRequest(accessToken, `/sell/account/v1/payment_policy?marketplace_id=${MARKETPLACE_ID}`);
    const returnResponse = await ebayRequest(accessToken, `/sell/account/v1/return_policy?marketplace_id=${MARKETPLACE_ID}`);

    const fulfillmentPolicyId = process.env.EBAY_FULFILLMENT_POLICY_ID || getFirstPolicyId(fulfillmentResponse.data, "fulfillmentPolicies", "fulfillmentPolicyId");
    const paymentPolicyId = process.env.EBAY_PAYMENT_POLICY_ID || getFirstPolicyId(paymentResponse.data, "paymentPolicies", "paymentPolicyId");
    const returnPolicyId = process.env.EBAY_RETURN_POLICY_ID || getFirstPolicyId(returnResponse.data, "returnPolicies", "returnPolicyId");

    if (!fulfillmentPolicyId || !paymentPolicyId || !returnPolicyId) {
      const missing = [!fulfillmentPolicyId ? "postage/fulfillment" : null, !paymentPolicyId ? "payment" : null, !returnPolicyId ? "returns" : null].filter(Boolean);
      return NextResponse.json({
        error: `eBay is still not returning a usable ${missing.join(", ")} policy for eBay UK.`,
        details: { fulfillment: fulfillmentResponse.data, payment: paymentResponse.data, returns: returnResponse.data },
      }, { status: 400 });
    }

    const merchantLocationKey = await ensureInventoryLocation(accessToken);
    const description = product.description?.trim() || `${product.name}. Genuine Funko collectible from Sparra's Funko Pop Up Shop.`;
    const availableQuantity = Math.max(0, Number(product.stock) || 0);
    const aspects: Record<string, string[]> = { Brand: ["Funko"], Type: ["Vinyl Figure"], "Product Line": ["Pop!"] };
    if (product.category) aspects.Collection = [product.category];

    const inventoryResponse = await ebayRequest(accessToken, `/sell/inventory/v1/inventory_item/${encodeURIComponent(sku)}`, {
      method: "PUT",
      body: JSON.stringify({
        availability: { shipToLocationAvailability: { quantity: availableQuantity } },
        condition: "NEW",
        product: {\n          title: String(product.name).slice(0, 80),\n          description,\n          imageUrls: [product.image, product.image_2, product.image_3, product.image_4, product.image_5, product.image_6].filter(Boolean),\n          aspects,\n        },
      }),
    });

    if (!inventoryResponse.response.ok) {
      return NextResponse.json({ error: "eBay rejected the inventory item.", details: inventoryResponse.data }, { status: inventoryResponse.response.status });
    }

    const offerPayload: any = {
      sku,
      marketplaceId: MARKETPLACE_ID,
      format: "FIXED_PRICE",
      availableQuantity,
      categoryId: CATEGORY_ID,
      listingDescription: description,
      listingDuration: "GTC",
      merchantLocationKey,
      pricingSummary: { price: { currency: "GBP", value: Number(product.price).toFixed(2) } },
      listingPolicies: {
        fulfillmentPolicyId,
        paymentPolicyId,
        returnPolicyId,
        bestOfferTerms: { bestOfferEnabled: true },
      },
    };

    let offerId: string | null = null;

    if (existingUnpublishedOffer?.offerId) {
      const updateResponse = await ebayRequest(
        accessToken,
        `/sell/inventory/v1/offer/${encodeURIComponent(existingUnpublishedOffer.offerId)}`,
        { method: "PUT", body: JSON.stringify(offerPayload) }
      );

      if (!updateResponse.response.ok) {
        return NextResponse.json({
          error: "eBay found an existing unpublished offer but could not update it.",
          details: updateResponse.data,
        }, { status: updateResponse.response.status });
      }

      offerId = existingUnpublishedOffer.offerId as string;
    } else {
      const offerResponse = await ebayRequest(accessToken, "/sell/inventory/v1/offer", {
        method: "POST",
        body: JSON.stringify(offerPayload),
      });

      if (!offerResponse.response.ok) {
        return NextResponse.json({ error: "eBay created the inventory item but rejected the listing offer.", details: offerResponse.data }, { status: offerResponse.response.status });
      }

      offerId = (offerResponse.data as any)?.offerId || null;
    }

    if (!offerId) return NextResponse.json({ error: "eBay did not return an offer ID." }, { status: 500 });

    const publishResponse = await ebayRequest(accessToken, `/sell/inventory/v1/offer/${encodeURIComponent(offerId)}/publish`, { method: "POST", body: JSON.stringify({}) });
    if (!publishResponse.response.ok) {
      return NextResponse.json({ error: "eBay has the offer but could not publish the listing.", details: publishResponse.data }, { status: publishResponse.response.status });
    }

    const listingId = (publishResponse.data as any)?.listingId;
    return NextResponse.json({
      success: true,
      listingId,
      offerId,
      bestOfferEnabled: true,
      message: listingId ? `Listed on eBay successfully. Listing ID: ${listingId}` : "Listed on eBay successfully.",
    });
  } catch (error) {
    console.error("eBay list route error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unexpected error while listing on eBay." }, { status: 500 });
  }
}
