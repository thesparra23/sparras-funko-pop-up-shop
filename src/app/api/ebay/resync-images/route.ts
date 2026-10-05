import { NextRequest, NextResponse } from "next/server";

const EBAY_TOKEN_URL = "https://api.ebay.com/identity/v1/oauth2/token";
const EBAY_API = "https://api.ebay.com";
const MARKETPLACE_ID = "EBAY_GB";
const EBAY_TIMEOUT_MS = 20000;
const RESYNC_CONCURRENCY = 8;

async function fetchWithTimeout(url: string, options: RequestInit = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), EBAY_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal, cache: "no-store" });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`eBay request timed out after ${EBAY_TIMEOUT_MS / 1000} seconds.`);
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
  if (!clientId || !clientSecret || !supabaseUrl || !serviceRoleKey) throw new Error("Missing eBay or Supabase server environment variables.");

  const tokenResponse = await fetchWithTimeout(
    `${supabaseUrl}/rest/v1/ebay_oauth_tokens?id=eq.ebay&select=refresh_token`,
    { headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` } }
  );
  if (!tokenResponse.ok) throw new Error("Could not read the saved eBay connection.");

  const rows = await tokenResponse.json();
  const refreshToken = rows?.[0]?.refresh_token;
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

function getSku(id: string) {
  return `SPARRA-${id.replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

async function processProduct(accessToken: string, product: any) {
  const sku = getSku(String(product.id));
  const imageUrls = [
    product.image,
    product.image_2,
    product.image_3,
    product.image_4,
    product.image_5,
    product.image_6,
  ].filter((url): url is string => typeof url === "string" && url.trim().length > 0);

  if (imageUrls.length === 0) {
    return { status: "skipped" as const, name: product.name };
  }

  try {
    const offerResult = await ebayRequest(
      accessToken,
      `/sell/inventory/v1/offer?sku=${encodeURIComponent(sku)}&marketplace_id=${MARKETPLACE_ID}`
    );

    if (!offerResult.response.ok) {
      return { status: "failed" as const, name: product.name, error: "could not check eBay listing" };
    }

    const offers = Array.isArray(offerResult.data?.offers) ? offerResult.data.offers : [];
    const published = offers.find((offer: any) => offer?.status === "PUBLISHED");
    if (!published) {
      return { status: "skipped" as const, name: product.name };
    }

    const itemResult = await ebayRequest(
      accessToken,
      `/sell/inventory/v1/inventory_item/${encodeURIComponent(sku)}`
    );

    if (!itemResult.response.ok) {
      return { status: "failed" as const, name: product.name, error: "could not read eBay inventory item" };
    }

    const item = itemResult.data || {};
    const productData = item.product || {};

    const updateResult = await ebayRequest(
      accessToken,
      `/sell/inventory/v1/inventory_item/${encodeURIComponent(sku)}`,
      {
        method: "PUT",
        body: JSON.stringify({
          ...item,
          product: { ...productData, imageUrls },
        }),
      }
    );

    if (!updateResult.response.ok) {
      const detail = updateResult.data?.errors?.[0]?.message || updateResult.data?.message || "eBay rejected the photo update";
      return { status: "failed" as const, name: product.name, error: detail };
    }

    return { status: "updated" as const, name: product.name };
  } catch (error) {
    return {
      status: "failed" as const,
      name: product.name,
      error: error instanceof Error ? error.message : "Unexpected eBay error",
    };
  }
}

async function processInBatches(accessToken: string, products: any[]) {
  const results: Array<{ status: "updated" | "skipped" | "failed"; name: string; error?: string }> = [];

  for (let i = 0; i < products.length; i += RESYNC_CONCURRENCY) {
    const batch = products.slice(i, i + RESYNC_CONCURRENCY);
    const batchResults = await Promise.all(batch.map((product) => processProduct(accessToken, product)));
    results.push(...batchResults);
  }

  return results;
}

export async function POST(_request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: "Supabase server environment variables are missing." }, { status: 500 });
    }

    const accessToken = await getEbayAccessToken();
    const productsResponse = await fetchWithTimeout(
      `${supabaseUrl}/rest/v1/products?select=id,name,image,image_2,image_3,image_4,image_5,image_6`,
      { headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` } }
    );
    if (!productsResponse.ok) throw new Error("Could not load products from Supabase.");

    const products = await productsResponse.json();
    const results = await processInBatches(accessToken, Array.isArray(products) ? products : []);

    const updated = results.filter((result) => result.status === "updated").length;
    const skipped = results.filter((result) => result.status === "skipped").length;
    const failedResults = results.filter((result) => result.status === "failed");
    const errors = failedResults.map((result) => `${result.name}: ${result.error}`);

    return NextResponse.json({
      success: true,
      updated,
      skipped,
      failed: failedResults.length,
      errors,
    });
  } catch (error) {
    console.error("eBay photo resync error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error while updating eBay photos." },
      { status: 500 }
    );
  }
}
