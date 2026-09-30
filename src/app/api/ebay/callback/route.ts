import { NextRequest, NextResponse } from "next/server";

const EBAY_TOKEN_URL = "https://api.ebay.com/identity/v1/oauth2/token";

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get("code");
    const error = request.nextUrl.searchParams.get("error");
    const errorDescription =
      request.nextUrl.searchParams.get("error_description");

    if (error) {
      return NextResponse.json(
        {
          error,
          error_description: errorDescription,
        },
        { status: 400 }
      );
    }

    if (!code) {
      return NextResponse.json(
        {
          error: "Missing eBay authorization code",
        },
        { status: 400 }
      );
    }

    const clientId = process.env.EBAY_CLIENT_ID;
    const clientSecret = process.env.EBAY_CLIENT_SECRET;
    const ruName = process.env.EBAY_RU_NAME;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (
      !clientId ||
      !clientSecret ||
      !ruName ||
      !supabaseUrl ||
      !supabaseServiceRoleKey
    ) {
      console.error("Missing eBay or Supabase environment variables");

      return NextResponse.json(
        {
          error: "eBay OAuth is not configured on the server.",
        },
        { status: 500 }
      );
    }

    const credentials = Buffer.from(
      `${clientId}:${clientSecret}`
    ).toString("base64");

    const tokenResponse = await fetch(EBAY_TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: ruName,
      }).toString(),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error("eBay token exchange failed:", tokenData);

      return NextResponse.json(
        {
          error: "eBay token exchange failed",
          details: tokenData,
        },
        { status: tokenResponse.status }
      );
    }

    if (!tokenData.refresh_token) {
      console.error("eBay did not return a refresh token");

      return NextResponse.json(
        {
          error: "eBay did not return a refresh token.",
        },
        { status: 500 }
      );
    }

    const saveResponse = await fetch(
      `${supabaseUrl}/rest/v1/ebay_oauth_tokens`,
      {
        method: "POST",
        headers: {
          apikey: supabaseServiceRoleKey,
          Authorization: `Bearer ${supabaseServiceRoleKey}`,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates",
        },
        body: JSON.stringify({
          id: "ebay",
          refresh_token: tokenData.refresh_token,
          updated_at: new Date().toISOString(),
        }),
      }
    );

    if (!saveResponse.ok) {
      const saveError = await saveResponse.text();

      console.error("Failed to save eBay refresh token:", saveError);

      return NextResponse.json(
        {
          error: "eBay connected, but the refresh token could not be saved.",
        },
        { status: 500 }
      );
    }

    console.log("eBay OAuth connection successful and token saved");

    return NextResponse.redirect(
      new URL("/admin?ebay=connected", request.url)
    );
  } catch (error) {
    console.error("eBay callback error:", error);

    return NextResponse.json(
      {
        error: "Unexpected error during eBay authorization",
      },
      { status: 500 }
    );
  }
}