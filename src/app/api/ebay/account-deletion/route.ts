import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const ENDPOINT =
  "https://www.sparrascollectables.co.uk/api/ebay/account-deletion";

export async function GET(request: NextRequest) {
  const challengeCode =
    request.nextUrl.searchParams.get("challenge_code");

  if (!challengeCode) {
    return NextResponse.json(
      { error: "Missing challenge_code" },
      { status: 400 }
    );
  }

  const verificationToken =
    process.env.EBAY_VERIFICATION_TOKEN;

  if (!verificationToken) {
    return NextResponse.json(
      { error: "Missing EBAY_VERIFICATION_TOKEN" },
      { status: 500 }
    );
  }

  const challengeResponse = crypto
    .createHash("sha256")
    .update(challengeCode)
    .update(verificationToken)
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
    await request.json();
  } catch {
    // eBay may send an empty or non-JSON request.
  }

  return new NextResponse(null, {
    status: 200,
  });
}