import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY!
);

const resend = new Resend(
  process.env.RESEND_API_KEY
);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  const body = await request.text();

  const signature =
    request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      {
        error: "Missing Stripe signature",
      },
      { status: 400 }
    );
  }

  try {
    const event =
      stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );

    console.log(
      "Stripe webhook received:",
      event.type
    );

    if (
      event.type ===
      "checkout.session.completed"
    ) {
      const session =
        event.data.object as Stripe.Checkout.Session;

      console.log(
        "Payment completed:",
        session.id
      );

      /*
       * Prevent duplicate orders
       */
      const { data: existingOrder } =
        await supabase
          .from("orders")
          .select("id")
          .eq(
            "stripe_session_id",
            session.id
          )
          .maybeSingle();

      if (existingOrder) {
        console.log(
          "Order already exists:",
          existingOrder.id
        );

        return NextResponse.json({
          received: true,
        });
      }

      /*
       * Get customer details
       */
      const customerDetails =
        session.customer_details;

      /*
       * Get PaymentIntent
       */
      let paymentIntent:
        | Stripe.PaymentIntent
        | null = null;

      if (session.payment_intent) {
        const paymentIntentId =
          typeof session.payment_intent ===
          "string"
            ? session.payment_intent
            : session.payment_intent.id;

        paymentIntent =
          await stripe.paymentIntents.retrieve(
            paymentIntentId,
            {
              expand: [
                "latest_charge",
              ],
            }
          );
      }

      /*
       * Get Charge
       */
      let charge:
        | Stripe.Charge
        | null = null;

      if (
        paymentIntent?.latest_charge
      ) {
        charge =
          typeof paymentIntent.latest_charge ===
          "string"
            ? await stripe.charges.retrieve(
                paymentIntent.latest_charge
              )
            : paymentIntent.latest_charge;
      }

      /*
       * Shipping details
       */
      const shipping =
        charge?.shipping;

      /*
       * Billing details
       */
      const billing =
        charge?.billing_details;

      /*
       * Customer name
       */
      const customerName =
        shipping?.name ||
        billing?.name ||
        customerDetails?.name ||
        "Customer";

      /*
       * Customer email
       */
      const customerEmail =
        billing?.email ||
        customerDetails?.email ||
        "";

      /*
       * Customer address
       */
      const customerAddress =
        shipping?.address?.line1 ||
        billing?.address?.line1 ||
        customerDetails?.address?.line1 ||
        "";

      /*
       * Customer town
       */
      const customerTown =
        shipping?.address?.city ||
        billing?.address?.city ||
        customerDetails?.address?.city ||
        "";

      /*
       * Customer postcode
       */
      const customerPostcode =
        shipping?.address?.postal_code ||
        billing?.address?.postal_code ||
        customerDetails?.address?.postal_code ||
        "";

      /*
       * Payment reference
       */
      let paymentReference = "";

      if (session.payment_intent) {
        paymentReference =
          typeof session.payment_intent ===
          "string"
            ? session.payment_intent
            : session.payment_intent.id;
      }

      /*
       * Save order
       */
      const {
        data: order,
        error: orderError,
      } = await supabase
        .from("orders")
        .insert({
          customer_name:
            customerName,

          customer_email:
            customerEmail,

          address:
            customerAddress,

          town:
            customerTown,

          postcode:
            customerPostcode,

          total:
            (session.amount_total || 0) /
            100,

          stripe_session_id:
            session.id,

          status:
            "paid",

          payment_status:
            "paid",

          payment_reference:
            paymentReference,

          fulfilment_status:
            "processing",
        })
        .select()
        .single();

      if (orderError) {
        console.error(
          "ORDER SAVE ERROR:",
          orderError
        );

        return NextResponse.json(
          {
            error:
              orderError.message,
          },
          { status: 500 }
        );
      }

      /*
       * Get Stripe line items
       */
      const lineItems =
        await stripe.checkout.sessions.listLineItems(
          session.id,
          {
            expand: [
              "data.price.product",
            ],
          }
        );

      /*
       * Save order items
       * AND reduce Supabase stock
       */
      const emailItems: string[] = [];

      for (const item of lineItems.data) {
        const product =
          item.price?.product;

        let productName =
          "Funko Pop";

        if (
          product &&
          typeof product !== "string"
        ) {
          productName =
            "name" in product
              ? product.name ||
                "Funko Pop"
              : "Funko Pop";
        }

        const quantity =
          item.quantity || 1;

        const price =
          (item.price?.unit_amount || 0) /
          100;

        /*
         * Save order item
         */
        const {
          error: itemError,
        } = await supabase
          .from("order_items")
          .insert({
            order_id:
              order.id,

            product_name:
              productName,

            quantity,

            price,
          });

        if (itemError) {
          console.error(
            "ORDER ITEM ERROR:",
            itemError
          );

          return NextResponse.json(
            {
              error:
                itemError.message,
            },
            { status: 500 }
          );
        }

        /*
         * Find matching product in Supabase
         */
        const {
          data: stockProduct,
          error: stockLookupError,
        } = await supabase
          .from("products")
          .select("id, stock")
          .eq("name", productName)
          .maybeSingle();

        if (stockLookupError) {
          console.error(
            "STOCK LOOKUP ERROR:",
            stockLookupError
          );
        } else if (stockProduct) {
          const currentStock =
            Number(
              stockProduct.stock || 0
            );

          const newStock = Math.max(
            0,
            currentStock - quantity
          );

          const {
            error: stockUpdateError,
          } = await supabase
            .from("products")
            .update({
              stock: newStock,
            })
            .eq(
              "id",
              stockProduct.id
            );

          if (stockUpdateError) {
            console.error(
              "STOCK UPDATE ERROR:",
              stockUpdateError
            );
          } else {
            console.log(
              `STOCK UPDATED: ${productName} ${currentStock} -> ${newStock}`
            );
          }
        } else {
          console.error(
            `STOCK PRODUCT NOT FOUND: ${productName}`
          );
        }

        emailItems.push(`
          <tr>
            <td style="padding:14px 10px;border-bottom:1px solid #e5e7eb;">
              ${productName}
            </td>

            <td style="padding:14px 10px;border-bottom:1px solid #e5e7eb;text-align:center;">
              ${quantity}
            </td>

            <td style="padding:14px 10px;border-bottom:1px solid #e5e7eb;text-align:right;">
              £${(
                price * quantity
              ).toFixed(2)}
            </td>
          </tr>
        `);
      }

      /*
       * Work out the public website address
       */
      const host =
        request.headers.get(
          "x-forwarded-host"
        ) ||
        request.headers.get("host");

      const protocol =
        request.headers.get(
          "x-forwarded-proto"
        ) || "https";

      const siteUrl = host
        ? `${protocol}://${host}`
        : "";

      /*
       * Customer order page
       */
      const orderUrl =
        siteUrl
          ? `${siteUrl}/checkout/success?session_id=${encodeURIComponent(
              session.id
            )}`
          : "#";

      /*
       * Send customer confirmation email
       */
      if (customerEmail) {
        try {
          const emailResult =
            await resend.emails.send({
              from:
                "Sparra's Funko Pop Shop <onboarding@resend.dev>",

              to: customerEmail,

              subject:
                `🎉 Order Confirmation #${order.id}`,

              html: `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Order Confirmation</title>
</head>

<body style="margin:0;padding:0;background:#0f172a;font-family:Arial,Helvetica,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:30px 10px;">

<tr>
<td align="center">

<table width="100%" cellpadding="0" cellspacing="0" style="max-width:650px;background:#ffffff;border-radius:18px;overflow:hidden;">

<tr>
<td style="background:#111827;padding:35px 25px;text-align:center;">

<img
src="${siteUrl}/sparras-logo.png"
alt="Sparra's Funko Pop Shop"
style="max-width:180px;width:100%;height:auto;display:block;margin:0 auto 20px;"
/>

<h1 style="color:#ffffff;font-size:30px;margin:0;">
🎉 Order Confirmed!
</h1>

<p style="color:#cbd5e1;font-size:16px;margin:12px 0 0;">
Thank you for shopping with us.
</p>

</td>
</tr>

<tr>
<td style="padding:35px 30px;">

<p style="font-size:18px;color:#111827;">
Hi <strong>${customerName}</strong>,
</p>

<p style="font-size:16px;line-height:1.6;color:#4b5563;">
Thank you for your order from
<strong>Sparra's Funko Pop Shop</strong>.
Your payment has been received successfully and your order is now being processed.
</p>

<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;margin:25px 0;">

<tr>
<td style="padding:20px;">

<p style="margin:0 0 8px;color:#6b7280;font-size:13px;font-weight:bold;">
ORDER NUMBER
</p>

<p style="margin:0;color:#111827;font-size:16px;font-weight:bold;">
#${order.id}
</p>

</td>

<td style="padding:20px;text-align:right;">

<p style="margin:0 0 8px;color:#6b7280;font-size:13px;font-weight:bold;">
STATUS
</p>

<span style="display:inline-block;background:#ede9fe;color:#6d28d9;padding:8px 13px;border-radius:20px;font-size:12px;font-weight:bold;">
PROCESSING
</span>

</td>
</tr>

</table>

<h2 style="color:#111827;font-size:21px;">
Your Items
</h2>

<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">

<tr style="background:#f3f4f6;">

<th style="padding:12px 10px;text-align:left;font-size:13px;color:#374151;">
Item
</th>

<th style="padding:12px 10px;text-align:center;font-size:13px;color:#374151;">
Qty
</th>

<th style="padding:12px 10px;text-align:right;font-size:13px;color:#374151;">
Price
</th>

</tr>

${emailItems.join("")}

</table>

<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">

<tr>

<td style="padding:15px 10px;font-size:21px;font-weight:bold;color:#111827;">
Total Paid
</td>

<td style="padding:15px 10px;text-align:right;font-size:24px;font-weight:bold;color:#111827;">
£${(
  (session.amount_total || 0) /
  100
).toFixed(2)}
</td>

</tr>

</table>

<div style="background:#f8fafc;border-radius:12px;padding:20px;margin-top:20px;">

<h2 style="margin-top:0;color:#111827;font-size:19px;">
📦 Delivery Details
</h2>

<p style="margin:6px 0;color:#4b5563;">
${customerAddress}
</p>

<p style="margin:6px 0;color:#4b5563;">
${customerTown}
</p>

<p style="margin:6px 0;color:#4b5563;">
${customerPostcode}
</p>

</div>

<div style="text-align:center;margin:35px 0 20px;">

<a
href="${orderUrl}"
style="display:inline-block;background:#facc15;color:#111827;text-decoration:none;font-size:17px;font-weight:bold;padding:15px 28px;border-radius:10px;"
>
View Your Order
</a>

</div>

<p style="font-size:14px;line-height:1.6;color:#6b7280;text-align:center;">
Your order status will update automatically as we process, pack and ship your order.
</p>

</td>
</tr>

<tr>
<td style="background:#111827;padding:25px;text-align:center;">

<p style="margin:0;color:#ffffff;font-weight:bold;font-size:16px;">
Sparra's Funko Pop Shop
</p>

<p style="margin:8px 0 0;color:#94a3b8;font-size:13px;">
Thank you for your order!
</p>

</td>
</tr>

</table>

</td>
</tr>

</table>

</body>
</html>
              `,
            });

          console.log(
            "CUSTOMER EMAIL SENT:",
            emailResult
          );
        } catch (emailError) {
          console.error(
            "CUSTOMER EMAIL ERROR:",
            emailError
          );
        }
      }

      /*
       * Log order
       */
      console.log(
        "ORDER SAVED SUCCESSFULLY:",
        order.id
      );

      console.log(
        "CUSTOMER:",
        customerName
      );

      console.log(
        "EMAIL:",
        customerEmail
      );

      console.log(
        "ADDRESS:",
        customerAddress
      );

      console.log(
        "TOWN:",
        customerTown
      );

      console.log(
        "POSTCODE:",
        customerPostcode
      );
    }

    return NextResponse.json({
      received: true,
    });

  } catch (error) {

    console.error(
      "WEBHOOK ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Webhook error",
      },
      { status: 400 }
    );
  }
}