import { NextRequest, NextResponse } from "next/server";

const EBAY_TOKEN_URL = "https://api.ebay.com/identity/v1/oauth2/token";
const EBAY_API = "https://api.ebay.com";
const MARKETPLACE_ID = "EBAY_GB";
const EBAY_TIMEOUT_MS = 20000;

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

async function ebayRequest(accessToken: string, path: string) {
  const response = await fetchWithTimeout(`${EBAY_API}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Accept-Language": "en-GB",
      "Content-Type": "application/json",
      "Content-Language": "en-GB",
      "X-EBAY-C-MARKETPLACE-ID": MARKETPLACE_ID,
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const productIds = Array.isArray(body?.productIds)
      ? body.productIds.filter((id: unknown) => typeof id === "string" && id.length > 0)
      : [];

    if (productIds.length === 0) {
      return NextResponse.json({ listings: {} });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Supabase server environment variables are missing." },
        { status: 500 }
      );
    }

    const idFilter = `(${productIds.map((id: string) => `"${id.replace(/"/g, "\\\"")}"`).join(",")})`;
    const productResponse = await fetchWithTimeout(
      `${supabaseUrl}/rest/v1/products?id=in.${encodeURIComponent(idFilter)}&select=id`,
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
      }
    );

    if (!productResponse.ok) {
      return NextResponse.json(
        { error: "Could not load products from Supabase." },
        { status: 500 }
      );
    }

    const products = await productResponse.json();
    const validIds = new Set(
      (Array.isArray(products) ? products : []).map((product: any) => String(product.id))
    );

    const accessToken = await getEbayAccessToken();
    const listings: Record<string, string> = {};

    await Promise.all(
      productIds.map(async (productId: string) => {
        if (!validIds.has(productId)) return;

        const sku = `SPARRA-${productId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
        const offersResponse = await ebayRequest(
          accessToken,
          `/sell/inventory/v1/offer?sku=${encodeURIComponent(sku)}&marketplace_id=${MARKETPLACE_ID}`
        );

        if (!offersResponse.response.ok) return;

        const offers = Array.isArray((offersResponse.data as any)?.offers)
          ? (offersResponse.data as any).offers
          : [];
        const publishedOffer = offers.find((offer: any) => offer?.status === "PUBLISHED");
        const listingId = publishedOffer?.listing?.listingId;

        if (listingId) {
          listings[productId] = String(listingId);
        }
      })
    );

    return NextResponse.json({ listings });
  } catch (error) {
    console.error("eBay status route error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected error while checking eBay listings.",
      },
      { status: 500 }
    );
  }
}
