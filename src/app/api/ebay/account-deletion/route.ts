import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const ENDPOINT =
  "https://www.sparrascollectables.co.uk/api/ebay/account-deletion";

const VERIFICATION_TOKEN =
  "60972bf6799555238ba5e9517460919fa5f3dc5aef3ba513365332";

export async function GET(request: NextRequest) {
  const challengeCode =
    request.nextUrl.searchParams.get("challenge_code");

  if (!challengeCode) {
    return NextResponse.json(
      { error: "Missing challenge_code" },
      { status: 400 }
    );
  }

  const hash = crypto.createHash("sha256");

  hash.update(challengeCode);
  hash.update(VERIFICATION_TOKEN);
  hash.update(ENDPOINT);

  const challengeResponse = hash.digest("hex");

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

    console.log("eBay Marketplace Account Deletion notification:", body);

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