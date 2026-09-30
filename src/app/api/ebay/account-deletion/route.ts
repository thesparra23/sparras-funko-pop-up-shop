import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const ENDPOINT =
  "https://www.sparrascollectables.co.uk/api/ebay/account-deletion";

const VERIFICATION_TOKEN =
  "SparrasEbayDelete2026-9f7K2mQ8xL4pN6vR";

export async function GET(request: NextRequest) {
  const challengeCode =
    request.nextUrl.searchParams.get("challenge_code");

  if (!challengeCode) {
    return NextResponse.json(
      { error: "Missing challenge_code" },
      { status: 400 }
    );
  }

  const challengeResponse = crypto
    .createHash("sha256")
    .update(challengeCode)
    .update(VERIFICATION_TOKEN)
    .update(ENDPOINT)
    .digest("hex");

  return NextResponse.json(
    { challengeResponse },
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log(
      "eBay Marketplace Account Deletion notification:",
      body
    );

    return NextResponse.json(
      { received: true },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { received: true },
      { status: 200 }
    );
  }
}