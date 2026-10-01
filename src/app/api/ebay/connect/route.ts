import { NextResponse } from "next/server";

const EBAY_AUTHORIZE_URL = "https://auth.ebay.com/oauth2/authorize";

export async function GET() {
  const clientId = process.env.EBAY_CLIENT_ID;
  const ruName = process.env.EBAY_RU_NAME;

  if (!clientId || !ruName) {
    console.error("Missing eBay OAuth environment variables");

    return NextResponse.json(
      {
        error: "eBay OAuth is not configured on the server.",
      },
      { status: 500 }
    );
  }

  const scopes = [
    "https://api.ebay.com/oauth/api_scope",
    "https://api.ebay.com/oauth/api_scope/sell.inventory",
    "https://api.ebay.com/oauth/api_scope/sell.inventory.readonly",
    "https://api.ebay.com/oauth/api_scope/sell.account",
    "https://api.ebay.com/oauth/api_scope/sell.account.readonly",
    "https://api.ebay.com/oauth/api_scope/sell.fulfillment",
    "https://api.ebay.com/oauth/api_scope/sell.fulfillment.readonly",
    "https://api.ebay.com/oauth/api_scope/sell.listing",
    "https://api.ebay.com/oauth/api_scope/sell.listing.read",
    "https://api.ebay.com/oauth/api_scope/sell.offer",
    "https://api.ebay.com/oauth/api_scope/commerce.identity.readonly",
  ].join(" ");

  const authorizeUrl = new URL(EBAY_AUTHORIZE_URL);
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("redirect_uri", ruName);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("scope", scopes);
  authorizeUrl.searchParams.set("prompt", "login");

  return NextResponse.redirect(authorizeUrl);
}
