import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY!
);

export async function POST(request: Request) {
  try {
    const { items, customer } = await request.json();

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: "Basket is empty" },
        { status: 400 }
      );
    }

    if (!customer?.email) {
      return NextResponse.json(
        { error: "Customer email is required" },
        { status: 400 }
      );
    }

    const host =
      request.headers.get("x-forwarded-host") ||
      request.headers.get("host");

    if (!host) {
      throw new Error(
        "Unable to determine website address."
      );
    }

    const protocol =
      request.headers.get("x-forwarded-proto") ||
      "https";

    const siteUrl = `${protocol}://${host}`;

    const session =
      await stripe.checkout.sessions.create({
        mode: "payment",

        payment_method_types: ["card"],

        customer_email: customer.email,

        billing_address_collection: "required",

        shipping_address_collection: {
          allowed_countries: ["GB"],
        },

        metadata: {
          customer_name: customer.name || "",
          customer_address: customer.address || "",
          customer_town: customer.town || "",
          customer_postcode: customer.postcode || "",
        },

        line_items: items.map(
          (item: {
            name: string;
            price: number;
            quantity: number;
          }) => ({
            price_data: {
              currency: "gbp",

              product_data: {
                name: item.name,
              },

              unit_amount: Math.round(
                Number(item.price) * 100
              ),
            },

            quantity: Number(item.quantity),
          })
        ),

        success_url:
          `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,

        cancel_url:
          `${siteUrl}/cart`,
      });

    if (!session.url) {
      throw new Error(
        "Stripe did not return a checkout URL."
      );
    }

    return NextResponse.json({
      url: session.url,
    });
  } catch (error) {
    console.error(
      "Stripe checkout error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to create checkout session",
      },
      { status: 500 }
    );
  }
}