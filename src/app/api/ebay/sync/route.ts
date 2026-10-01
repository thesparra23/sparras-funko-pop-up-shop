import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const EBAY_TOKEN_URL = "https://api.ebay.com/identity/v1/oauth2/token";
const EBAY_API = "https://api.ebay.com";
const MARKETPLACE_ID = "EBAY_GB";
const EBAY_TIMEOUT_MS = 20000;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
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
      Accept: "application/json",
      "Accept-Language": "en-GB",
      "Content-Type": "application/json",
      "Content-Language": "en-GB",
      "X-EBAY-C-MARKETPLACE-ID": MARKETPLACE_ID,
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  let data: any = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  return { response, data };
}

function getSku(productId: string) {
  return `SPARRA-${productId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

async function syncProductToEbay(accessToken: string, product: any) {
  const sku = getSku(String(product.id));
  const offersResponse = await ebayRequest(
    accessToken,
    `/sell/inventory/v1/offer?sku=${encodeURIComponent(sku)}&marketplace_id=${MARKETPLACE_ID}`
  );

  if (!offersResponse.response.ok) {
    return {
      success: false,
      productId: String(product.id),
      message: "Could not retrieve the eBay offer.",
      details: offersResponse.data,
    };
  }

  const offers = Array.isArray(offersResponse.data?.offers)
    ? offersResponse.data.offers
    : [];
  const publishedOffer = offers.find(
    (offer: any) => offer?.status === "PUBLISHED" && offer?.offerId
  );

  if (!publishedOffer) {
    return {
      success: true,
      productId: String(product.id),
      skipped: true,
      message: "Product is not currently listed on eBay.",
    };
  }

  const quantity = Math.max(0, Number(product.stock) || 0);

  const bulkResponse = await ebayRequest(
    accessToken,
    "/sell/inventory/v1/bulk_update_price_quantity",
    {
      method: "POST",
      body: JSON.stringify({
        requests: [
          {
            sku,
            shipToLocationAvailability: { quantity },
            offers: [
              {
                offerId: publishedOffer.offerId,
                availableQuantity: quantity,
              },
            ],
          },
        ],
      }),
    }
  );

  if (!bulkResponse.response.ok) {
    return {
      success: false,
      productId: String(product.id),
      message: "eBay rejected the stock update.",
      details: bulkResponse.data,
    };
  }

  const result = bulkResponse.data?.responses?.[0];
  if (result && Number(result.statusCode) >= 400) {
    return {
      success: false,
      productId: String(product.id),
      message: "eBay rejected the stock update.",
      details: result,
    };
  }

  return {
    success: true,
    productId: String(product.id),
    quantity,
    listingId: publishedOffer?.listing?.listingId || null,
    message: `eBay stock updated to ${quantity}.`,
  };
}

async function syncWebsiteStockToEbay(
  accessToken: string,
  productId?: string
) {
  let query = supabase
    .from("products")
    .select("id, name, stock")
    .order("created_at", { ascending: false });

  if (productId) query = query.eq("id", productId);

  const { data: products, error } = await query;
  if (error) throw error;

  const results = [];
  for (const product of products || []) {
    results.push(await syncProductToEbay(accessToken, product));
  }

  return results;
}

async function syncEbayStockToWebsite(accessToken: string) {
  const { data: products, error } = await supabase
    .from("products")
    .select("id, name, stock")
    .order("created_at", { ascending: false });

  if (error) throw error;

  const results = [];

  for (const product of products || []) {
    const sku = getSku(String(product.id));
    const offersResponse = await ebayRequest(
      accessToken,
      `/sell/inventory/v1/offer?sku=${encodeURIComponent(sku)}&marketplace_id=${MARKETPLACE_ID}`
    );

    if (!offersResponse.response.ok) {
      results.push({
        success: false,
        productId: String(product.id),
        message: "Could not retrieve the eBay offer.",
      });
      continue;
    }

    const offers = Array.isArray(offersResponse.data?.offers)
      ? offersResponse.data.offers
      : [];
    const publishedOffer = offers.find(
      (offer: any) => offer?.status === "PUBLISHED" && offer?.offerId
    );

    if (!publishedOffer) continue;

    const ebayQuantity = Math.max(
      0,
      Number(publishedOffer.availableQuantity ?? 0)
    );
    const websiteQuantity = Number(product.stock || 0);

    if (websiteQuantity !== ebayQuantity) {
      const { error: updateError } = await supabase
        .from("products")
        .update({ stock: ebayQuantity })
        .eq("id", product.id);

      if (updateError) {
        results.push({
          success: false,
          productId: String(product.id),
          message: `Could not update website stock: ${updateError.message}`,
        });
        continue;
      }
    }

    results.push({
      success: true,
      productId: String(product.id),
      previousWebsiteQuantity: websiteQuantity,
      ebayQuantity,
      changed: websiteQuantity !== ebayQuantity,
      listingId: publishedOffer?.listing?.listingId || null,
    });
  }

  return results;
}

async function importRecentEbayOrders(accessToken: string) {
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const filter = encodeURIComponent(`creationdate:[${since}..]`);

  const ordersResponse = await ebayRequest(
    accessToken,
    `/sell/fulfillment/v1/order?filter=${filter}&limit=50&offset=0`
  );

  if (!ordersResponse.response.ok) {
    throw new Error(
      `Could not retrieve eBay orders. ${JSON.stringify(ordersResponse.data)}`
    );
  }

  const ebayOrders = Array.isArray(ordersResponse.data?.orders)
    ? ordersResponse.data.orders
    : [];

  let imported = 0;
  let alreadyKnown = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const ebayOrder of ebayOrders) {
    const orderId = String(ebayOrder?.orderId || "");
    if (!orderId) continue;

    const externalId = `ebay:${orderId}`;
    const { data: existingOrder, error: existingError } = await supabase
      .from("orders")
      .select("id")
      .eq("stripe_session_id", externalId)
      .maybeSingle();

    if (existingError) {
      errors.push(`Order ${orderId}: ${existingError.message}`);
      continue;
    }

    if (existingOrder) {
      alreadyKnown += 1;
      continue;
    }

    const lineItems = Array.isArray(ebayOrder?.lineItems)
      ? ebayOrder.lineItems
      : [];
    const resolvedItems = [];

    for (const lineItem of lineItems) {
      const sku = String(lineItem?.sku || "");
      const productId = sku.startsWith("SPARRA-")
        ? sku.substring("SPARRA-".length)
        : "";
      const quantity = Math.max(1, Number(lineItem?.quantity || 1));

      if (!productId) continue;

      const { data: product } = await supabase
        .from("products")
        .select("id, name, price")
        .eq("id", productId)
        .maybeSingle();

      if (!product) {
        errors.push(`Order ${orderId}: product ${productId} could not be found.`);
        continue;
      }

      const lineTotal = Number(lineItem?.lineItemCost?.value || 0);
      const unitPrice = quantity > 0
        ? lineTotal / quantity
        : Number(product.price || 0);

      resolvedItems.push({
        name: String(product.name),
        quantity,
        price: unitPrice,
      });
    }

    if (resolvedItems.length === 0) {
      skipped += 1;
      continue;
    }

    const shipTo =
      ebayOrder?.fulfillmentStartInstructions?.[0]?.shippingStep?.shipTo;
    const customerName = shipTo?.fullName || ebayOrder?.buyer?.username || "eBay Customer";
    const customerEmail = shipTo?.email || "";
    const total = Number(ebayOrder?.pricingSummary?.total?.value || 0);

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        stripe_session_id: externalId,
        customer_name: customerName,
        customer_email: customerEmail,
        status: "paid",
        payment_status: "paid",
        fulfilment_status: "processing",
        total,
      })
      .select()
      .single();

    if (orderError || !order) {
      errors.push(`Order ${orderId}: ${orderError?.message || "could not create order"}`);
      continue;
    }

    const { error: itemsError } = await supabase.from("order_items").insert(
      resolvedItems.map((item) => ({
        order_id: order.id,
        product_name: item.name,
        quantity: item.quantity,
        price: item.price,
      }))
    );

    if (itemsError) {
      errors.push(`Order ${orderId}: ${itemsError.message}`);
      continue;
    }

    imported += 1;
  }

  return { imported, alreadyKnown, skipped, errors };
}

async function handleSync(request: NextRequest) {
  const accessToken = await getEbayAccessToken();
  const body =
    request.method === "POST"
      ? await request.json().catch(() => ({}))
      : {};
  const productId =
    typeof body?.productId === "string" ? body.productId : undefined;
  const ordersOnly = body?.ordersOnly === true;
  const ebayToWebsite = body?.ebayToWebsite === true;

  if (productId) {
    const stock = await syncWebsiteStockToEbay(accessToken, productId);
    return NextResponse.json({
      success: true,
      stock,
      message: "Website stock sent to eBay successfully.",
    });
  }

  if (ebayToWebsite || request.method === "GET") {
    const stock = await syncEbayStockToWebsite(accessToken);
    const orders = ordersOnly ? null : await importRecentEbayOrders(accessToken);

    return NextResponse.json({
      success: true,
      stock,
      orders,
      message: "eBay stock reconciled with the website.",
    });
  }

  const stock = await syncWebsiteStockToEbay(accessToken);
  const orders = ordersOnly ? null : await importRecentEbayOrders(accessToken);

  return NextResponse.json({
    success: true,
    stock,
    orders,
    message: "Website stock sent to eBay successfully.",
  });
}

export async function POST(request: NextRequest) {
  try {
    return await handleSync(request);
  } catch (error) {
    console.error("eBay sync route error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected error during eBay sync.",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authorization = request.headers.get("authorization");

    if (cronSecret && authorization !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return await handleSync(request);
  } catch (error) {
    console.error("eBay sync cron error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected error during eBay sync.",
      },
      { status: 500 }
    );
  }
}
