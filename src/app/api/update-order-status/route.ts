import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const allowedStatuses = [
  "processing",
  "packed",
  "shipped",
  "completed",
];

export async function POST(request: Request) {
  try {
    const { orderId, status } =
      await request.json();

    if (!orderId) {
      return NextResponse.json(
        { error: "Missing order ID" },
        { status: 400 }
      );
    }

    if (!allowedStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid fulfilment status" },
        { status: 400 }
      );
    }

    const { data, error } =
      await supabase
        .from("orders")
        .update({
          fulfilment_status: status,
        })
        .eq("id", orderId)
        .select()
        .single();

    if (error) {
      console.error(
        "Order status update error:",
        error
      );

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      order: data,
    });
  } catch (error) {
    console.error(
      "Order status update error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to update order status",
      },
      { status: 500 }
    );
  }
}