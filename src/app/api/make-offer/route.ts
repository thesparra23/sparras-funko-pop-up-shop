import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(
  process.env.RESEND_API_KEY!
);

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const productName = String(
      body.productName || ""
    ).trim();

    const customerName = String(
      body.customerName || ""
    ).trim();

    const customerEmail = String(
      body.customerEmail || ""
    ).trim();

    const offerAmount = Number(
      body.offerAmount
    );

    const askingPrice = Number(
      body.askingPrice
    );

    if (
      !productName ||
      !customerName ||
      !customerEmail ||
      !Number.isFinite(offerAmount) ||
      offerAmount <= 0
    ) {
      return NextResponse.json(
        { error: "Please complete all fields." },
        { status: 400 }
      );
    }

    if (
      !customerEmail.includes("@") ||
      customerEmail.length > 200
    ) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const offerEmail =
      process.env.OFFER_EMAIL_TO;

    if (!offerEmail) {
      console.error(
        "OFFER_EMAIL_TO is not configured"
      );

      return NextResponse.json(
        { error: "Offer system is not configured yet." },
        { status: 500 }
      );
    }

    const safeProductName =
      escapeHtml(productName);

    const safeCustomerName =
      escapeHtml(customerName);

    const safeCustomerEmail =
      escapeHtml(customerEmail);

    const safeOfferAmount =
      offerAmount.toFixed(2);

    const safeAskingPrice =
      Number.isFinite(askingPrice)
        ? askingPrice.toFixed(2)
        : "Not supplied";

    const result =
      await resend.emails.send({
        from:
          "Sparra's Collectables <orders@sparrascollectables.co.uk>",
        to: offerEmail,
        replyTo: customerEmail,
        subject:
          `New offer: ${productName} - £${safeOfferAmount}`,
        html: `
          <h1>New Make an Offer request</h1>

          <p><strong>Product:</strong> ${safeProductName}</p>
          <p><strong>Asking price:</strong> £${safeAskingPrice}</p>
          <p><strong>Offer:</strong> £${safeOfferAmount}</p>

          <hr />

          <p><strong>Customer:</strong> ${safeCustomerName}</p>
          <p><strong>Email:</strong> ${safeCustomerEmail}</p>

          <p>
            Reply directly to this email to contact the customer.
          </p>

          <p>
            <strong>Sparra's Collectables</strong>
          </p>
        `,
      });

    if (result.error) {
      console.error(
        "Offer email error:",
        result.error
      );

      return NextResponse.json(
        { error: "Unable to send offer." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Make offer error:",
      error
    );

    return NextResponse.json(
      { error: "Unable to send offer." },
      { status: 500 }
    );
  }
}
