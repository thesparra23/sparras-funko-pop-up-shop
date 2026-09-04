import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY!
);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
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

    for (const item of items) {
      const quantity = Number(item.quantity);

      if (!Number.isInteger(quantity) || quantity < 1) {
        return NextResponse.json(
          {
            error: `Invalid quantity for ${item.name}`,
          },
          { status: 400 }
        );
      }

      const { data: product, error: stockError } =
        await supabase
          .from("products")
          .select("id, name, stock")
          .eq("name", item.name)
          .maybeSingle();

      if (stockError) {
        console.error("STOCK CHECK ERROR:", stockError);

        return NextResponse.json(
          { error: "Unable to check product stock." },
          { status: 500 }
        );
      }

      if (!product) {
        return NextResponse.json(
          {
            error: `${item.name} is no longer available.`,
          },
          { status: 400 }
        );
      }

      const availableStock = Number(product.stock || 0);

      if (availableStock < quantity) {
        return NextResponse.json(
          {
            error:
              availableStock === 0
                ? `${item.name} is out of stock.`
                : `Only ${availableStock} of ${item.name} available.`,
          },
          { status: 400 }
        );
      }
    }

    const host =
      request.headers.get("x-forwarded-host") ||
      request.headers.get("host");

    if (!host) {
      throw new Error("Unable to determine website address.");
    }

    const protocol =
      request.headers.get("x-forwarded-proto") || "https";

    const siteUrl = `${protocol}://${host}`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",

      payment_method_types: ["card"],

      customer_email: customer.email,

      billing_address_collection: "required",

      shipping_address_collection: {
        allowed_countries: ["GB"],
      },

      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: {
              amount: 399,
              currency: "gbp",
            },
            display_name: "Evri Delivery",
            delivery_estimate: {
              minimum: {
                unit: "business_day",
                value: 2,
              },
              maximum: {
                unit: "business_day",
                value: 4,
              },
            },
          },
        },
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: {
              amount: 299,
              currency: "gbp",
            },
            display_name: "Relay Delivery",
            delivery_estimate: {
              minimum: {
                unit: "business_day",
                value: 2,
              },
              maximum: {
                unit: "business_day",
                value: 4,
              },
            },
          },
        },
      ],

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

      cancel_url: `${siteUrl}/cart`,
    });

    if (!session.url) {
      throw new Error("Stripe did not return a checkout URL.");
    }

    return NextResponse.json({
      url: session.url,
    });
  } catch (error) {
    console.error("Stripe checkout error:", error);

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