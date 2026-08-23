"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const db = supabase!;

type FulfilmentStatus =
  | "processing"
  | "packed"
  | "shipped"
  | "completed";

type Order = {
  id: string;
  customer_name: string;
  customer_email: string;
  address: string | null;
  town: string | null;
  postcode: string | null;
  total: number;
  status: string | null;
  payment_status: string | null;
  payment_reference: string | null;
  fulfilment_status: FulfilmentStatus | null;
  created_at: string;
};

type OrderItem = {
  id: string;
  order_id: string;
  product_name: string;
  quantity: number;
  price: number;
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderItems, setOrderItems] = useState<
    Record<string, OrderItem[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [selectedOrder, setSelectedOrder] =
    useState<Order | null>(null);
  const [saving, setSaving] = useState(false);

  async function loadOrders() {
    setLoading(true);
    setMessage("");

    const { data, error } = await db
      .from("orders")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(error);
      setMessage(
        `Error loading orders: ${error.message}`
      );
      setLoading(false);
      return;
    }

    const loadedOrders = data || [];

    setOrders(loadedOrders);

    const { data: items, error: itemsError } =
      await db
        .from("order_items")
        .select("*");

    if (itemsError) {
      console.error(itemsError);
      setMessage(
        `Error loading order items: ${itemsError.message}`
      );
      setLoading(false);
      return;
    }

    const groupedItems: Record<
      string,
      OrderItem[]
    > = {};

    (items || []).forEach((item) => {
      if (!groupedItems[item.order_id]) {
        groupedItems[item.order_id] = [];
      }

      groupedItems[item.order_id].push(item);
    });

    setOrderItems(groupedItems);
    setLoading(false);
  }

  useEffect(() => {
    loadOrders();
  }, []);

  async function updateStatus(
    orderId: string,
    status: FulfilmentStatus
  ) {
    setSaving(true);
    setMessage("");

    const { error } = await db
      .from("orders")
      .update({
        fulfilment_status: status,
      })
      .eq("id", orderId);

    if (error) {
      console.error(error);
      setMessage(
        `Error updating order: ${error.message}`
      );
      setSaving(false);
      return;
    }

    setOrders((current) =>
      current.map((order) =>
        order.id === orderId
          ? {
              ...order,
              fulfilment_status: status,
            }
          : order
      )
    );

    setSelectedOrder((current) =>
      current && current.id === orderId
        ? {
            ...current,
            fulfilment_status: status,
          }
        : current
    );

    setMessage(
      `✅ Order updated to ${status.toUpperCase()}`
    );

    setSaving(false);
  }

  function getStatusStyle(
    status: FulfilmentStatus | null
  ) {
    switch (status) {
      case "packed":
        return {
          background: "#fef3c7",
          color: "#92400e",
        };

      case "shipped":
        return {
          background: "#dbeafe",
          color: "#1d4ed8",
        };

      case "completed":
        return {
          background: "#dcfce7",
          color: "#15803d",
        };

      case "processing":
      default:
        return {
          background: "#ede9fe",
          color: "#6d28d9",
        };
    }
  }

  function formatStatus(
    status: FulfilmentStatus | null
  ) {
    return (
      status || "processing"
    ).toUpperCase();
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleString(
      "en-GB",
      {
        dateStyle: "medium",
        timeStyle: "short",
      }
    );
  }

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#0f172a",
          color: "#ffffff",
          padding: "60px 30px",
        }}
      >
        <h1>📦 Orders</h1>
        <p>Loading orders...</p>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0f172a",
        color: "#ffffff",
        padding: "40px 30px 80px",
      }}
    >
      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "20px",
            marginBottom: "30px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "42px",
                margin: 0,
              }}
            >
              📦 Order Management
            </h1>

            <p
              style={{
                color: "#94a3b8",
                fontSize: "18px",
                marginTop: "10px",
              }}
            >
              View and manage customer orders.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: "10px",
            }}
          >
            <a
              href="/admin"
              style={{
                background: "#facc15",
                color: "#111827",
                padding: "12px 20px",
                borderRadius: "8px",
                textDecoration: "none",
                fontWeight: "700",
              }}
            >
              + Add Product
            </a>

            <a
              href="/admin/manage"
              style={{
                background: "#2563eb",
                color: "#ffffff",
                padding: "12px 20px",
                borderRadius: "8px",
                textDecoration: "none",
                fontWeight: "700",
              }}
            >
              Manage Products
            </a>
          </div>
        </div>

        {message && (
          <div
            style={{
              background: "#1e293b",
              border: "1px solid #334155",
              padding: "14px 18px",
              borderRadius: "8px",
              marginBottom: "20px",
            }}
          >
            {message}
          </div>
        )}

        {orders.length === 0 ? (
          <div
            style={{
              background: "#1e293b",
              padding: "40px",
              borderRadius: "12px",
              textAlign: "center",
            }}
          >
            <h2>No orders found</h2>

            <p
              style={{
                color: "#94a3b8",
              }}
            >
              Customer orders will appear here
              after payment.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: "18px",
            }}
          >
            {orders.map((order) => {
              const status =
                order.fulfilment_status ||
                "processing";

              const items =
                orderItems[order.id] || [];

              return (
                <div
                  key={order.id}
                  style={{
                    background: "#1e293b",
                    border: "1px solid #334155",
                    borderRadius: "14px",
                    padding: "22px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      alignItems: "flex-start",
                      gap: "20px",
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <h2
                        style={{
                          margin: 0,
                          fontSize: "22px",
                        }}
                      >
                        Order #{order.id}
                      </h2>

                      <p
                        style={{
                          color: "#94a3b8",
                          margin:
                            "8px 0 0",
                        }}
                      >
                        {formatDate(
                          order.created_at
                        )}
                      </p>
                    </div>

                    <span
                      style={{
                        display: "inline-block",
                        padding: "9px 15px",
                        borderRadius: "999px",
                        fontSize: "13px",
                        fontWeight: "800",
                        ...getStatusStyle(
                          status
                        ),
                      }}
                    >
                      {formatStatus(status)}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(220px, 1fr))",
                      gap: "20px",
                      marginTop: "22px",
                    }}
                  >
                    <div>
                      <strong>
                        Customer
                      </strong>

                      <p
                        style={{
                          margin:
                            "6px 0",
                        }}
                      >
                        {order.customer_name}
                      </p>

                      <p
                        style={{
                          margin: 0,
                          color: "#94a3b8",
                        }}
                      >
                        {order.customer_email}
                      </p>
                    </div>

                    <div>
                      <strong>
                        Delivery
                      </strong>

                      <p
                        style={{
                          margin:
                            "6px 0 0",
                        }}
                      >
                        {order.address ||
                          "No address"}
                      </p>

                      <p
                        style={{
                          margin: "4px 0 0",
                        }}
                      >
                        {order.town || ""}
                      </p>

                      <p
                        style={{
                          margin: "4px 0 0",
                          fontWeight: "700",
                        }}
                      >
                        {order.postcode ||
                          ""}
                      </p>
                    </div>

                    <div>
                      <strong>
                        Payment
                      </strong>

                      <p
                        style={{
                          margin:
                            "6px 0",
                        }}
                      >
                        Status:{" "}
                        {order.payment_status ||
                          order.status ||
                          "Unknown"}
                      </p>

                      <p
                        style={{
                          margin: 0,
                          color: "#94a3b8",
                          fontSize: "12px",
                          wordBreak:
                            "break-all",
                        }}
                      >
                        {order.payment_reference ||
                          ""}
                      </p>
                    </div>

                    <div>
                      <strong>
                        Total
                      </strong>

                      <p
                        style={{
                          fontSize: "24px",
                          fontWeight: "800",
                          margin:
                            "6px 0",
                        }}
                      >
                        £
                        {Number(
                          order.total
                        ).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: "20px",
                      paddingTop: "18px",
                      borderTop:
                        "1px solid #334155",
                    }}
                  >
                    <strong>
                      Items
                    </strong>

                    {items.length === 0 ? (
                      <p
                        style={{
                          color:
                            "#94a3b8",
                        }}
                      >
                        No items found.
                      </p>
                    ) : (
                      <div
                        style={{
                          marginTop:
                            "10px",
                          display: "grid",
                          gap: "8px",
                        }}
                      >
                        {items.map(
                          (item) => (
                            <div
                              key={
                                item.id
                              }
                              style={{
                                display:
                                  "flex",
                                justifyContent:
                                  "space-between",
                                gap: "15px",
                                padding:
                                  "8px 0",
                              }}
                            >
                              <span>
                                {
                                  item.product_name
                                }{" "}
                                ×{" "}
                                {
                                  item.quantity
                                }
                              </span>

                              <strong>
                                £
                                {(
                                  Number(
                                    item.price
                                  ) *
                                  Number(
                                    item.quantity
                                  )
                                ).toFixed(
                                  2
                                )}
                              </strong>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      flexWrap: "wrap",
                      marginTop: "20px",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedOrder(
                          order
                        )
                      }
                      style={{
                        background:
                          "#2563eb",
                        color:
                          "#ffffff",
                        border: "none",
                        padding:
                          "12px 18px",
                        borderRadius:
                          "8px",
                        cursor:
                          "pointer",
                        fontWeight:
                          "700",
                      }}
                    >
                      👁 View Order
                    </button>

                    <button
                      type="button"
                      disabled={
                        saving
                      }
                      onClick={() =>
                        updateStatus(
                          order.id,
                          "processing"
                        )
                      }
                      style={{
                        background:
                          "#7c3aed",
                        color:
                          "#ffffff",
                        border: "none",
                        padding:
                          "12px 18px",
                        borderRadius:
                          "8px",
                        cursor:
                          "pointer",
                        fontWeight:
                          "700",
                      }}
                    >
                      Processing
                    </button>

                    <button
                      type="button"
                      disabled={
                        saving
                      }
                      onClick={() =>
                        updateStatus(
                          order.id,
                          "packed"
                        )
                      }
                      style={{
                        background:
                          "#d97706",
                        color:
                          "#ffffff",
                        border: "none",
                        padding:
                          "12px 18px",
                        borderRadius:
                          "8px",
                        cursor:
                          "pointer",
                        fontWeight:
                          "700",
                      }}
                    >
                      📦 Packed
                    </button>

                    <button
                      type="button"
                      disabled={
                        saving
                      }
                      onClick={() =>
                        updateStatus(
                          order.id,
                          "shipped"
                        )
                      }
                      style={{
                        background:
                          "#2563eb",
                        color:
                          "#ffffff",
                        border: "none",
                        padding:
                          "12px 18px",
                        borderRadius:
                          "8px",
                        cursor:
                          "pointer",
                        fontWeight:
                          "700",
                      }}
                    >
                      🚚 Shipped
                    </button>

                    <button
                      type="button"
                      disabled={
                        saving
                      }
                      onClick={() =>
                        updateStatus(
                          order.id,
                          "completed"
                        )
                      }
                      style={{
                        background:
                          "#16a34a",
                        color:
                          "#ffffff",
                        border: "none",
                        padding:
                          "12px 18px",
                        borderRadius:
                          "8px",
                        cursor:
                          "pointer",
                        fontWeight:
                          "700",
                      }}
                    >
                      ✅ Completed
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedOrder && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background:
              "rgba(0,0,0,0.75)",
            display: "flex",
            alignItems:
              "center",
            justifyContent:
              "center",
            padding: "20px",
            zIndex: 2000,
            overflowY: "auto",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "700px",
              background: "#111827",
              border:
                "1px solid #334155",
              borderRadius: "18px",
              padding: "30px",
              maxHeight:
                "calc(100vh - 40px)",
              overflowY: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "center",
                gap: "15px",
              }}
            >
              <h2
                style={{
                  marginTop: 0,
                  fontSize: "28px",
                }}
              >
                Order Details
              </h2>

              <button
                type="button"
                onClick={() =>
                  setSelectedOrder(
                    null
                  )
                }
                style={{
                  background:
                    "#475569",
                  color:
                    "#ffffff",
                  border: "none",
                  borderRadius:
                    "8px",
                  padding:
                    "10px 15px",
                  cursor:
                    "pointer",
                  fontWeight:
                    "700",
                }}
              >
                ✕ Close
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gap: "14px",
              }}
            >
              <div>
                <strong>
                  Order ID
                </strong>

                <p
                  style={{
                    wordBreak:
                      "break-all",
                  }}
                >
                  {selectedOrder.id}
                </p>
              </div>

              <div>
                <strong>
                  Customer
                </strong>

                <p>
                  {
                    selectedOrder.customer_name
                  }
                </p>

                <p>
                  {
                    selectedOrder.customer_email
                  }
                </p>
              </div>

              <div>
                <strong>
                  Delivery Address
                </strong>

                <p>
                  {
                    selectedOrder.address
                  }
                  <br />
                  {
                    selectedOrder.town
                  }
                  <br />
                  {
                    selectedOrder.postcode
                  }
                </p>
              </div>

              <div>
                <strong>
                  Payment
                </strong>

                <p>
                  Status:{" "}
                  {
                    selectedOrder.payment_status
                  }
                </p>

                <p
                  style={{
                    wordBreak:
                      "break-all",
                    color:
                      "#94a3b8",
                    fontSize:
                      "13px",
                  }}
                >
                  {
                    selectedOrder.payment_reference
                  }
                </p>
              </div>

              <div>
                <strong>
                  Order Items
                </strong>

                <div
                  style={{
                    marginTop:
                      "10px",
                    borderTop:
                      "1px solid #334155",
                  }}
                >
                  {(
                    orderItems[
                      selectedOrder.id
                    ] || []
                  ).map(
                    (item) => (
                      <div
                        key={
                          item.id
                        }
                        style={{
                          display:
                            "flex",
                          justifyContent:
                            "space-between",
                          padding:
                            "12px 0",
                          borderBottom:
                            "1px solid #334155",
                        }}
                      >
                        <span>
                          {
                            item.product_name
                          }{" "}
                          ×{" "}
                          {
                            item.quantity
                          }
                        </span>

                        <strong>
                          £
                          {(
                            Number(
                              item.price
                            ) *
                            Number(
                              item.quantity
                            )
                          ).toFixed(
                            2
                          )}
                        </strong>
                      </div>
                    )
                  )}
                </div>
              </div>

              <h2>
                Total: £
                {Number(
                  selectedOrder.total
                ).toFixed(2)}
              </h2>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "1fr 1fr",
                  gap: "10px",
                }}
              >
                <button
                  type="button"
                  disabled={
                    saving
                  }
                  onClick={() =>
                    updateStatus(
                      selectedOrder.id,
                      "processing"
                    )
                  }
                  style={statusButtonStyle(
                    "#7c3aed"
                  )}
                >
                  Processing
                </button>

                <button
                  type="button"
                  disabled={
                    saving
                  }
                  onClick={() =>
                    updateStatus(
                      selectedOrder.id,
                      "packed"
                    )
                  }
                  style={statusButtonStyle(
                    "#d97706"
                  )}
                >
                  📦 Packed
                </button>

                <button
                  type="button"
                  disabled={
                    saving
                  }
                  onClick={() =>
                    updateStatus(
                      selectedOrder.id,
                      "shipped"
                    )
                  }
                  style={statusButtonStyle(
                    "#2563eb"
                  )}
                >
                  🚚 Shipped
                </button>

                <button
                  type="button"
                  disabled={
                    saving
                  }
                  onClick={() =>
                    updateStatus(
                      selectedOrder.id,
                      "completed"
                    )
                  }
                  style={statusButtonStyle(
                    "#16a34a"
                  )}
                >
                  ✅ Completed
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function statusButtonStyle(
  background: string
) {
  return {
    padding: "13px",
    border: "none",
    borderRadius: "9px",
    background,
    color: "#ffffff",
    fontWeight: "700",
    cursor: "pointer",
  };
}