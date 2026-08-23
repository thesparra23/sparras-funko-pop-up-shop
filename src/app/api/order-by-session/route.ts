import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("session_id");

    if (!sessionId) {
      return NextResponse.json(
        { error: "Missing session ID" },
        { status: 400 }
      );
    }

    const { data: order, error: orderError } =
      await supabase
        .from("orders")
        .select("*")
        .eq("stripe_session_id", sessionId)
        .maybeSingle();

    if (orderError) {
      console.error(
        "Order lookup error:",
        orderError
      );

      return NextResponse.json(
        { error: orderError.message },
        { status: 500 }
      );
    }

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    const { data: items, error: itemsError } =
      await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", order.id);

    if (itemsError) {
      console.error(
        "Order items lookup error:",
        itemsError
      );

      return NextResponse.json(
        { error: itemsError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      order,
      items: items || [],
    });
  } catch (error) {
    console.error(
      "Order lookup error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to find order",
      },
      { status: 500 }
    );
  }
}