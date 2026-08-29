import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const resend = new Resend(process.env.RESEND_API_KEY!);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  const body = await request.text();

  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing Stripe signature" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error) {
    console.error("Webhook signature error:", error);

    return NextResponse.json(
      { error: "Invalid webhook signature" },
      { status: 400 }
    );
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      console.log(
        "Checkout completed:",
        session.id
      );

      const customerEmail =
        session.customer_details?.email ||
        session.customer_email ||
        null;

      const existingOrder = await supabase
        .from("orders")
        .select("id")
        .eq("stripe_session_id", session.id)
        .maybeSingle();

      if (existingOrder.data) {
        console.log(
          "Order already exists:",
          session.id
        );

        return NextResponse.json({ received: true });
      }

      const { data: order, error: orderError } =
        await supabase
          .from("orders")
          .insert({
            stripe_session_id: session.id,
            customer_email: customerEmail,
            status: "paid",
            total: session.amount_total
              ? session.amount_total / 100
              : 0,
          })
          .select()
          .single();

      if (orderError) {
        console.error(
          "Error creating order:",
          orderError
        );

        throw orderError;
      }

      const lineItems =
        await stripe.checkout.sessions.listLineItems(
          session.id,
          {
            expand: ["data.price.product"],
          }
        );

      const orderItems = lineItems.data.map(
        (item) => ({
          order_id: order.id,
          product_name:
            item.description || "Product",
          quantity: item.quantity || 1,
          price:
            item.amount_total / 100,
        })
      );

      if (orderItems.length > 0) {
        const { error: itemsError } =
          await supabase
            .from("order_items")
            .insert(orderItems);

        if (itemsError) {
          console.error(
            "Error creating order items:",
            itemsError
          );

          throw itemsError;
        }
      }

      if (customerEmail) {
        await resend.emails.send({
          from:
            "Sparra's Collectables <orders@sparrascollectables.co.uk>",
          to: customerEmail,
          subject: "Thanks for your order!",
          html: `
            <h1>Thank you for your order!</h1>
            <p>We've received your order and payment successfully.</p>
            <p><strong>Order reference:</strong> ${session.id}</p>
            <p>We'll be in touch when your order is on its way.</p>
            <br />
            <p>Thanks,</p>
            <p><strong>Sparra's Collectables</strong></p>
          `,
        });
      }

      console.log(
        "Order created successfully:",
        order.id
      );
    }

    return NextResponse.json({
      received: true,
    });
  } catch (error) {
    console.error(
      "Webhook processing error:",
      error
    );

    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}