import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const EBAY_TOKEN_URL = "https://api.ebay.com/identity/v1/oauth2/token";
const EBAY_API = "https://api.ebay.com";
const MARKETPLACE_ID = "EBAY_GB";
const EBAY_TIMEOUT_MS = 20000;
const ORDER_LOOKBACK_DAYS = 30;
const ORDER_PAGE_SIZE = 50;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
  let data: any = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = { message: text }; }
  }
  return { response, data };
}

function getSku(productId: string) {
  return `SPARRA-${productId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

function normaliseTitle(value: unknown) {
  return String(value || "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

async function getPublishedOffer(accessToken: string, productId: string) {
  const sku = getSku(productId);
  const response = await ebayRequest(
    accessToken,
    `/sell/inventory/v1/offer?sku=${encodeURIComponent(sku)}&marketplace_id=${MARKETPLACE_ID}`
  );
  if (!response.response.ok) return { error: response.data, offer: null };
  const offers = Array.isArray(response.data?.offers) ? response.data.offers : [];
  const offer = offers.find((item: any) => item?.status === "PUBLISHED" && item?.offerId) || null;
  return { error: null, offer };
}

async function syncEbayStockToWebsite(accessToken: string) {
  const { data: products, error } = await supabase.from("products").select("id, name, stock").order("created_at", { ascending: false });
  if (error) throw error;
  const results = [];
  for (const product of products || []) {
    const { error: offerError, offer } = await getPublishedOffer(accessToken, String(product.id));
    if (offerError) {
      results.push({ success: false, productId: String(product.id), name: String(product.name), message: "Could not retrieve the eBay offer." });
      continue;
    }
    if (!offer) continue;
    const ebayQuantity = Math.max(0, Number(offer.availableQuantity ?? 0));
    const websiteQuantity = Math.max(0, Number(product.stock || 0));
    let changed = false;
    if (websiteQuantity !== ebayQuantity) {
      const { error: updateError } = await supabase.from("products").update({ stock: ebayQuantity }).eq("id", product.id);
      if (updateError) {
        results.push({ success: false, productId: String(product.id), name: String(product.name), message: `Could not update website stock: ${updateError.message}` });
        continue;
      }
      changed = true;
    }
    results.push({ success: true, productId: String(product.id), name: String(product.name), previousWebsiteQuantity: websiteQuantity, ebayQuantity, changed, listingId: offer.listing?.listingId || null });
  }
  return results;
}

async function syncProductToEbay(accessToken: string, productId: string) {
  const { data: product, error } = await supabase.from("products").select("id, name, stock").eq("id", productId).maybeSingle();
  if (error) throw error;
  if (!product) return;
  const { error: offerError, offer } = await getPublishedOffer(accessToken, String(product.id));
  if (offerError || !offer?.offerId) return;
  const quantity = Math.max(0, Number(product.stock) || 0);
  const response = await ebayRequest(accessToken, "/sell/inventory/v1/bulk_update_price_quantity", {
    method: "POST",
    body: JSON.stringify({ requests: [{ sku: getSku(String(product.id)), shipToLocationAvailability: { quantity }, offers: [{ offerId: offer.offerId, availableQuantity: quantity }] }] }),
  });
  if (!response.response.ok) console.error(`eBay stock update failed for ${product.id}:`, response.data);
  const result = response.data?.responses?.[0];
  if (result && Number(result.statusCode) >= 400) console.error(`eBay stock update rejected for ${product.id}:`, result);
}

async function getRecentEbayOrders(accessToken: string) {
  const since = new Date(Date.now() - ORDER_LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const allOrders: any[] = [];
  let offset = 0;
  while (true) {
    const filter = encodeURIComponent(`creationdate:[${since}..]`);
    const response = await ebayRequest(accessToken, `/sell/fulfillment/v1/order?filter=${filter}&limit=${ORDER_PAGE_SIZE}&offset=${offset}`);
    if (!response.response.ok) throw new Error(`Could not retrieve eBay orders. ${JSON.stringify(response.data)}`);
    const orders = Array.isArray(response.data?.orders) ? response.data.orders : [];
    allOrders.push(...orders);
    const total = Number(response.data?.total || 0);
    if (orders.length < ORDER_PAGE_SIZE || allOrders.length >= total) break;
    offset += ORDER_PAGE_SIZE;
    if (offset >= 1000) break;
  }
  return allOrders;
}

function findProductForEbayLineItem(lineItem: any, products: any[]) {
  const sku = String(lineItem?.sku || "").trim();
  if (sku.startsWith("SPARRA-")) {
    const productId = sku.substring("SPARRA-".length);
    const byId = products.find(product => String(product.id) === productId);
    if (byId) return byId;
  }
  const title = normaliseTitle(lineItem?.title);
  if (!title) return null;
  const exact = products.find(product => normaliseTitle(product.name) === title);
  if (exact) return exact;
  return products.find(product => {
    const productTitle = normaliseTitle(product.name);
    return productTitle && (productTitle.includes(title) || title.includes(productTitle));
  }) || null;
}

async function importRecentEbayOrders(accessToken: string) {
  const ebayOrders = await getRecentEbayOrders(accessToken);
  const { data: products, error: productsError } = await supabase.from("products").select("id, name, price, stock");
  if (productsError) throw productsError;
  let imported = 0;
  let alreadyKnown = 0;
  let skipped = 0;
  const errors: string[] = [];
  for (const ebayOrder of ebayOrders) {
    const orderId = String(ebayOrder?.orderId || "");
    if (!orderId) continue;
    const externalId = `ebay:${orderId}`;
    const { data: existingOrder, error: existingError } = await supabase.from("orders").select("id").eq("stripe_session_id", externalId).maybeSingle();
    if (existingError) { errors.push(`Order ${orderId}: ${existingError.message}`); continue; }
    if (existingOrder) { alreadyKnown += 1; continue; }
    const lineItems = Array.isArray(ebayOrder?.lineItems) ? ebayOrder.lineItems : [];
    const resolvedItems = [];
    for (const lineItem of lineItems) {
      const product = findProductForEbayLineItem(lineItem, products || []);
      if (!product) { errors.push(`Order ${orderId}: could not match eBay item "${lineItem?.title || lineItem?.sku || "unknown"}" to a website product.`); continue; }
      const quantity = Math.max(1, Number(lineItem?.quantity || 1));
      const lineTotal = Number(lineItem?.lineItemCost?.value || 0);
      resolvedItems.push({ name: String(product.name), quantity, price: quantity > 0 ? lineTotal / quantity : Number(product.price || 0) });
    }
    if (resolvedItems.length === 0) { skipped += 1; continue; }
    const shipTo = ebayOrder?.fulfillmentStartInstructions?.[0]?.shippingStep?.shipTo;
    const customerName = shipTo?.fullName || ebayOrder?.buyer?.username || "eBay Customer";
    const customerEmail = shipTo?.email || "";
    const address = shipTo?.contactAddress?.addressLine1 || null;
    const town = shipTo?.contactAddress?.city || null;
    const postcode = shipTo?.contactAddress?.postalCode || null;
    const total = Number(ebayOrder?.pricingSummary?.total?.value || 0);
    const { data: order, error: orderError } = await supabase.from("orders").insert({
      stripe_session_id: externalId,
      customer_name: customerName,
      customer_email: customerEmail,
      address,
      town,
      postcode,
      status: "paid",
      payment_status: "paid",
      payment_reference: externalId,
      fulfilment_status: "processing",
      total,
    }).select().single();
    if (orderError || !order) { errors.push(`Order ${orderId}: ${orderError?.message || "could not create order"}`); continue; }
    const { error: itemsError } = await supabase.from("order_items").insert(resolvedItems.map(item => ({ order_id: order.id, product_name: item.name, quantity: item.quantity, price: item.price })));
    if (itemsError) { errors.push(`Order ${orderId}: could not create order items: ${itemsError.message}`); continue; }
    imported += 1;
  }
  return { imported, alreadyKnown, skipped, totalEbayOrders: ebayOrders.length, errors };
}

async function handleSync(request: NextRequest) {
  const accessToken = await getEbayAccessToken();
  const body = request.method === "POST" ? await request.json().catch(() => ({})) : {};
  const productId = typeof body?.productId === "string" ? body.productId : undefined;
  const ordersOnly = body?.ordersOnly === true;
  const ebayToWebsite = body?.ebayToWebsite === true;
  if (productId) {
    await syncProductToEbay(accessToken, productId);
    return NextResponse.json({ success: true, message: "Website stock sent to eBay successfully." });
  }
  if (ebayToWebsite || request.method === "GET") {
    const orders = ordersOnly ? null : await importRecentEbayOrders(accessToken);
    const stock = await syncEbayStockToWebsite(accessToken);
    return NextResponse.json({ success: true, stock, orders, message: "eBay orders imported and website stock reconciled from live eBay quantities." });
  }
  const stock = await syncEbayStockToWebsite(accessToken);
  const orders = ordersOnly ? null : await importRecentEbayOrders(accessToken);
  return NextResponse.json({ success: true, stock, orders, message: "eBay orders imported and website stock reconciled from live eBay quantities." });
}

export async function POST(request: NextRequest) {
  try { return await handleSync(request); }
  catch (error) {
    console.error("eBay sync route error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unexpected error during eBay sync." }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { return await handleSync(request); }
  catch (error) {
    console.error("eBay sync cron error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unexpected error during eBay sync." }, { status: 500 });
  }
}
