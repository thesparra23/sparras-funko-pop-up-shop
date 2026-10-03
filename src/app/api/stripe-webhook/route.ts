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

async function syncProductToEbay(request: Request, productId: string) {
  try {
    const host =
      request.headers.get("x-forwarded-host") || request.headers.get("host");

    if (!host) return;

    const protocol = request.headers.get("x-forwarded-proto") || "https";

    await fetch(`${protocol}://${host}/api/ebay/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ productId }),
      cache: "no-store",
    });
  } catch (error) {
    console.error(`Could not sync product ${productId} to eBay:`, error);
  }
}

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

      console.log("Checkout completed:", session.id);

      const customerName = session.customer_details?.name || "Customer";

      const customerEmail =
        session.customer_details?.email || session.customer_email || "";

      const existingOrder = await supabase
        .from("orders")
        .select("id")
        .eq("stripe_session_id", session.id)
        .maybeSingle();

      if (existingOrder.data) {
        console.log("Order already exists:", session.id);

        return NextResponse.json({ received: true });
      }

      const metadata = session.metadata || {};

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          stripe_session_id: session.id,
          customer_name: customerName,
          customer_email: customerEmail,
          address: metadata.customer_address || null,
          town: metadata.customer_town || null,
          postcode: metadata.customer_postcode || null,
          status: "paid",
          payment_status: "paid",
          fulfilment_status: "processing",
          total: (session.amount_total || 0) / 100,
        })
        .select()
        .single();

      if (orderError) {
        console.error("Error creating order:", orderError);
        throw orderError;
      }

      const lineItems = await stripe.checkout.sessions.listLineItems(
        session.id,
        {
          limit: 100,
          expand: ["data.price.product"],
        }
      );

      const stockSyncs: Promise<void>[] = [];
      const orderItems: Array<{
        order_id: string;
        product_name: string;
        quantity: number;
        price: number;
      }> = [];

      for (const item of lineItems.data) {
        const quantity = item.quantity || 1;
        const product =
          item.price?.product && typeof item.price.product !== "string"
            ? (item.price.product as Stripe.Product)
            : null;

        const productId = product?.metadata?.sparra_product_id || "";

        orderItems.push({
          order_id: order.id,
          product_name: item.description || product?.name || "Funko Pop",
          quantity,
          price: (item.amount_total || 0) / 100,
        });

        if (!productId) {
          console.warn(
            "No Sparra product ID found for Stripe line item:",
            item.description
          );
          continue;
        }

        const { data: currentProduct, error: productError } = await supabase
          .from("products")
          .select("id, name, stock")
          .eq("id", productId)
          .maybeSingle();

        if (productError || !currentProduct) {
          console.error(
            `Could not find product ${productId} to reduce stock:`,
            productError
          );
          continue;
        }

        const currentStock = Number(currentProduct.stock || 0);
        const newStock = Math.max(0, currentStock - quantity);

        const { error: stockError } = await supabase
          .from("products")
          .update({ stock: newStock })
          .eq("id", productId);

        if (stockError) {
          console.error(
            `Could not update stock for product ${productId}:`,
            stockError
          );
          continue;
        }

        console.log(
          `Stock updated for ${currentProduct.name || productId}: ${currentStock} -> ${newStock}`
        );

        stockSyncs.push(syncProductToEbay(request, productId));
      }

      if (orderItems.length > 0) {
        const { error: itemsError } = await supabase
          .from("order_items")
          .insert(orderItems);

        if (itemsError) {
          console.error("Error creating order items:", itemsError);
          throw itemsError;
        }
      }

      await Promise.allSettled(stockSyncs);

      console.log("Order created successfully:", order.id);

      if (customerEmail) {
        try {
          await resend.emails.send({
            from: "Sparra's Collectables <onboarding@resend.dev>",
            to: customerEmail,
            subject: "Thanks for your order!",
            html: `
              <h1>Thank you for your order!</h1>
              <p>We've received your payment successfully.</p>
              <p>Your order is now being processed.</p>
              <p><strong>Order ID:</strong> ${order.id}</p>
              <p>Thanks,<br/>Sparra's Collectables</p>
            `,
          });
        } catch (emailError) {
          console.error("Email error:", emailError);
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);

    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
