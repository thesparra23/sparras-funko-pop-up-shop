import { NextRequest, NextResponse } from "next/server";

const EBAY_TOKEN_URL = "https://api.ebay.com/identity/v1/oauth2/token";
const EBAY_API = "https://api.ebay.com";
const MARKETPLACE_ID = "EBAY_GB";
const EBAY_TIMEOUT_MS = 20000;
const DEFAULT_BATCH_SIZE = 20;

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = EBAY_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal, cache: "no-store" });
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

function cleanPolicy(policy: any) {
  return {
    fulfillmentPolicyId: policy?.fulfillmentPolicyId,
    paymentPolicyId: policy?.paymentPolicyId,
    returnPolicyId: policy?.returnPolicyId,
    bestOfferTerms: { bestOfferEnabled: true },
  };
}

async function updateOffer(accessToken: string, offer: any) {
  const offerId = offer?.offerId;
  if (!offerId) throw new Error("eBay returned an offer without an offer ID.");

  const current = await ebayRequest(accessToken, `/sell/inventory/v1/offer/${encodeURIComponent(offerId)}`);
  if (!current.response.ok) throw new Error(`Could not read eBay offer ${offerId}.`);

  const data = current.data;
  if (data?.listingPolicies?.bestOfferTerms?.bestOfferEnabled === true) {
    return { status: "already", offerId };
  }

  const payload: any = {
    sku: data.sku,
    marketplaceId: data.marketplaceId || MARKETPLACE_ID,
    format: data.format || "FIXED_PRICE",
    availableQuantity: data.availableQuantity,
    categoryId: data.categoryId,
    listingDescription: data.listingDescription,
    listingDuration: data.listingDuration || "GTC",
    merchantLocationKey: data.merchantLocationKey,
    pricingSummary: data.pricingSummary,
    listingPolicies: cleanPolicy(data.listingPolicies),
  };

  const update = await ebayRequest(
    accessToken,
    `/sell/inventory/v1/offer/${encodeURIComponent(offerId)}`,
    { method: "PUT", body: JSON.stringify(payload) }
  );

  if (!update.response.ok) {
    const detail = update.data?.errors?.[0]?.message || update.data?.message || JSON.stringify(update.data);
    throw new Error(detail);
  }

  return { status: "updated", offerId };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const offset = Math.max(0, Number(body?.offset) || 0);
    const requestedLimit = Math.max(1, Number(body?.limit) || DEFAULT_BATCH_SIZE);
    const limit = Math.min(20, requestedLimit);

    const accessToken = await getEbayAccessToken();
    const offersResponse = await ebayRequest(
      accessToken,
      `/sell/inventory/v1/offer?marketplace_id=${MARKETPLACE_ID}&limit=${limit}&offset=${offset}`
    );

    if (!offersResponse.response.ok) {
      return NextResponse.json({ error: "eBay could not retrieve your listings.", details: offersResponse.data }, { status: offersResponse.response.status });
    }

    const offers = Array.isArray(offersResponse.data?.offers) ? offersResponse.data.offers : [];
    const total = Number(offersResponse.data?.total) || offers.length;
    let updated = 0;
    let already = 0;
    let failed = 0;
    const errors: Array<{ offerId: string; error: string }> = [];

    for (const offer of offers) {
      try {
        const result = await updateOffer(accessToken, offer);
        if (result.status === "updated") updated += 1;
        else already += 1;
      } catch (error) {
        failed += 1;
        errors.push({
          offerId: String(offer?.offerId || "unknown"),
          error: error instanceof Error ? error.message : "Unknown eBay error.",
        });
      }
    }

    const processed = Math.min(offset + offers.length, total);
    return NextResponse.json({
      success: true,
      offset,
      limit,
      processed,
      total,
      nextOffset: processed < total ? processed : null,
      updated,
      already,
      failed,
      errors,
      done: processed >= total,
    });
  } catch (error) {
    console.error("eBay bulk Best Offer route error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unexpected error while updating eBay Best Offer." }, { status: 500 });
  }
}
