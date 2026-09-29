import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function GET(request: NextRequest) {
  const challengeCode = request.nextUrl.searchParams.get("challenge_code");

  if (!challengeCode) {
    return NextResponse.json(
      { error: "Missing challenge_code" },
      { status: 400 }
    );
  }

  const verificationToken = process.env.EBAY_VERIFICATION_TOKEN;

  if (!verificationToken) {
    return NextResponse.json(
      { error: "Missing verification token" },
      { status: 500 }
    );
  }

  const endpoint =
    "https://www.sparrascollectables.co.uk/api/ebay/account-deletion";

  const challengeResponse = crypto
    .createHash("sha256")
    .update(challengeCode + verificationToken + endpoint)
    .digest("hex");

  return NextResponse.json({ challengeResponse });
}

export async function POST() {
  return new NextResponse(null, { status: 200 });
}