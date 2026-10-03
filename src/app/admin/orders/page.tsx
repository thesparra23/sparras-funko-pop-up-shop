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
  const [orderItems, setOrderItems] = useState<Record<string, OrderItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [saving, setSaving] = useState(false);

  async function loadOrders() {
    setLoading(true);
    setMessage("");

    const { data, error } = await db
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setMessage(`Error loading orders: ${error.message}`);
      setLoading(false);
      return;
    }

    const loadedOrders = (data || []) as Order[];
    setOrders(loadedOrders);

    const { data: items, error: itemsError } = await db
      .from("order_items")
      .select("*");

    if (itemsError) {
      console.error(itemsError);
      setMessage(`Error loading order items: ${itemsError.message}`);
      setLoading(false);
      return;
    }

    const groupedItems: Record<string, OrderItem[]> = {};

    ((items || []) as OrderItem[]).forEach((item) => {
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

  async function updateStatus(orderId: string, status: FulfilmentStatus) {
    setSaving(true);
    setMessage("");

    const { error } = await db
      .from("orders")
      .update({ fulfilment_status: status })
      .eq("id", orderId);

    if (error) {
      console.error(error);
      setMessage(`Error updating order: ${error.message}`);
      setSaving(false);
      return;
    }

    setOrders((current) =>
      current.map((order) =>
        order.id === orderId
          ? { ...order, fulfilment_status: status }
          : order
      )
    );

    setSelectedOrder((current) =>
      current && current.id === orderId
        ? { ...current, fulfilment_status: status }
        : current
    );

    setMessage(`✅ Order updated to ${status.toUpperCase()}`);
    setSaving(false);
  }

  function getStatusStyle(status: FulfilmentStatus | null) {
    switch (status) {
      case "packed":
        return { background: "#fef3c7", color: "#92400e" };
      case "shipped":
        return { background: "#dbeafe", color: "#1d4ed8" };
      case "completed":
        return { background: "#dcfce7", color: "#15803d" };
      case "processing":
      default:
        return { background: "#ede9fe", color: "#6d28d9" };
    }
  }

  function formatStatus(status: FulfilmentStatus | null) {
    return (status || "processing").toUpperCase();
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleString("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  function formatMoney(value: number) {
    return `£${Number(value || 0).toFixed(2)}`;
  }

  function getOrderTitle(items: OrderItem[]) {
    if (items.length === 0) return "Order awaiting item details";
    if (items.length === 1) return items[0].product_name;
    return `${items[0].product_name} + ${items.length - 1} other item${items.length - 1 === 1 ? "" : "s"}`;
  }

  function getTotalItemQuantity(items: OrderItem[]) {
    return items.reduce((total, item) => total + Number(item.quantity || 0), 0);
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
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
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
            <h1 style={{ fontSize: "42px", margin: 0 }}>📦 Order Management</h1>
            <p style={{ color: "#94a3b8", fontSize: "18px", marginTop: "10px" }}>
              View and manage customer orders.
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
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
            <p style={{ color: "#94a3b8" }}>
              Customer orders will appear here after payment.
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "18px" }}>
            {orders.map((order) => {
              const status = order.fulfilment_status || "processing";
              const items = orderItems[order.id] || [];
              const itemQuantity = getTotalItemQuantity(items);

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
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: "20px",
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ minWidth: 0, flex: "1 1 500px" }}>
                      <div
                        style={{
                          color: items.length ? "#ffffff" : "#fbbf24",
                          fontSize: "25px",
                          fontWeight: "800",
                          lineHeight: 1.2,
                        }}
                      >
                        {getOrderTitle(items)}
                      </div>

                      {items.length > 0 && (
                        <div
                          style={{
                            color: "#94a3b8",
                            marginTop: "7px",
                            fontSize: "15px",
                          }}
                        >
                          {itemQuantity} item{itemQuantity === 1 ? "" : "s"} in this order
                        </div>
                      )}

                      <div
                        style={{
                          color: "#64748b",
                          marginTop: "8px",
                          fontSize: "13px",
                          wordBreak: "break-all",
                        }}
                      >
                        Order #{order.id}
                      </div>

                      <div style={{ color: "#94a3b8", marginTop: "5px" }}>
                        {formatDate(order.created_at)}
                      </div>
                    </div>

                    <span
                      style={{
                        display: "inline-block",
                        padding: "9px 15px",
                        borderRadius: "999px",
                        fontSize: "13px",
                        fontWeight: "800",
                        ...getStatusStyle(status),
                      }}
                    >
                      {formatStatus(status)}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                      gap: "20px",
                      marginTop: "22px",
                    }}
                  >
                    <div>
                      <strong>Customer</strong>
                      <p style={{ margin: "6px 0" }}>{order.customer_name}</p>
                      <p style={{ margin: 0, color: "#94a3b8" }}>{order.customer_email}</p>
                    </div>

                    <div>
                      <strong>Delivery</strong>
                      <p style={{ margin: "6px 0 0" }}>{order.address || "No address"}</p>
                      <p style={{ margin: "4px 0 0" }}>{order.town || ""}</p>
                      <p style={{ margin: "4px 0 0", fontWeight: "700" }}>{order.postcode || ""}</p>
                    </div>

                    <div>
                      <strong>Payment</strong>
                      <p style={{ margin: "6px 0" }}>
                        Status: {order.payment_status || order.status || "Unknown"}
                      </p>
                      {order.payment_reference && (
                        <p
                          style={{
                            margin: 0,
                            color: "#94a3b8",
                            fontSize: "12px",
                            wordBreak: "break-all",
                          }}
                        >
                          {order.payment_reference}
                        </p>
                      )}
                    </div>

                    <div>
                      <strong>Total</strong>
                      <p style={{ fontSize: "24px", fontWeight: "800", margin: "6px 0" }}>
                        {formatMoney(order.total)}
                      </p>
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: "20px",
                      paddingTop: "18px",
                      borderTop: "1px solid #334155",
                    }}
                  >
                    <strong>Items</strong>

                    {items.length === 0 ? (
                      <p style={{ color: "#fbbf24", marginBottom: 0 }}>
                        No item record is attached to this order. This is normally an older order created before item tracking was added.
                      </p>
                    ) : (
                      <div style={{ marginTop: "10px", display: "grid", gap: "6px" }}>
                        {items.map((item) => (
                          <div
                            key={item.id}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              gap: "15px",
                              padding: "10px 12px",
                              background: "#172033",
                              borderRadius: "8px",
                            }}
                          >
                            <span style={{ fontWeight: "700" }}>
                              {item.product_name} × {item.quantity}
                            </span>
                            <strong>{formatMoney(Number(item.price) * Number(item.quantity))}</strong>
                          </div>
                        ))}
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
                      onClick={() => setSelectedOrder(order)}
                      style={{
                        background: "#2563eb",
                        color: "#ffffff",
                        border: "none",
                        padding: "12px 18px",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontWeight: "700",
                      }}
                    >
                      👁 View Order
                    </button>

                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => updateStatus(order.id, "processing")}
                      style={{
                        background: "#7c3aed",
                        color: "#ffffff",
                        border: "none",
                        padding: "12px 18px",
                        borderRadius: "8px",
                        cursor: saving ? "not-allowed" : "pointer",
                        fontWeight: "700",
                        opacity: saving ? 0.6 : 1,
                      }}
                    >
                      Processing
                    </button>

                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => updateStatus(order.id, "packed")}
                      style={{
                        background: "#d97706",
                        color: "#ffffff",
                        border: "none",
                        padding: "12px 18px",
                        borderRadius: "8px",
                        cursor: saving ? "not-allowed" : "pointer",
                        fontWeight: "700",
                        opacity: saving ? 0.6 : 1,
                      }}
                    >
                      📦 Packed
                    </button>

                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => updateStatus(order.id, "shipped")}
                      style={{
                        background: "#2563eb",
                        color: "#ffffff",
                        border: "none",
                        padding: "12px 18px",
                        borderRadius: "8px",
                        cursor: saving ? "not-allowed" : "pointer",
                        fontWeight: "700",
                        opacity: saving ? 0.6 : 1,
                      }}
                    >
                      🚚 Shipped
                    </button>

                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => updateStatus(order.id, "completed")}
                      style={{
                        background: "#16a34a",
                        color: "#ffffff",
                        border: "none",
                        padding: "12px 18px",
                        borderRadius: "8px",
                        cursor: saving ? "not-allowed" : "pointer",
                        fontWeight: "700",
                        opacity: saving ? 0.6 : 1,
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
          onClick={() => setSelectedOrder(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            zIndex: 1000,
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "800px",
              maxHeight: "90vh",
              overflowY: "auto",
              background: "#1e293b",
              border: "1px solid #475569",
              borderRadius: "16px",
              padding: "28px",
              boxShadow: "0 25px 60px rgba(0,0,0,0.4)",
            }}
          >
            {(() => {
              const items = orderItems[selectedOrder.id] || [];
              return (
                <>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "15px",
                      alignItems: "flex-start",
                    }}
                  >
                    <div>
                      <div style={{ color: "#f8fafc", fontSize: "28px", fontWeight: "800" }}>
                        {getOrderTitle(items)}
                      </div>
                      <div style={{ color: "#94a3b8", marginTop: "6px" }}>
                        Order #{selectedOrder.id}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedOrder(null)}
                      style={{
                        background: "#334155",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "8px",
                        padding: "8px 12px",
                        cursor: "pointer",
                        fontWeight: "700",
                      }}
                    >
                      ✕ Close
                    </button>
                  </div>

                  <div style={{ marginTop: "25px", display: "grid", gap: "18px" }}>
                    <div>
                      <strong>Customer</strong>
                      <p style={{ margin: "6px 0" }}>{selectedOrder.customer_name}</p>
                      <p style={{ margin: 0, color: "#94a3b8" }}>{selectedOrder.customer_email}</p>
                    </div>

                    <div>
                      <strong>Delivery address</strong>
                      <p style={{ margin: "6px 0 0" }}>{selectedOrder.address || "No address recorded"}</p>
                      <p style={{ margin: "4px 0 0" }}>{selectedOrder.town || ""}</p>
                      <p style={{ margin: "4px 0 0", fontWeight: "700" }}>{selectedOrder.postcode || ""}</p>
                    </div>

                    <div>
                      <strong>Items</strong>
                      {items.length === 0 ? (
                        <p style={{ color: "#fbbf24" }}>No item record is attached to this order.</p>
                      ) : (
                        <div style={{ marginTop: "10px", display: "grid", gap: "8px" }}>
                          {items.map((item) => (
                            <div
                              key={item.id}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                gap: "15px",
                                padding: "12px",
                                background: "#172033",
                                borderRadius: "8px",
                              }}
                            >
                              <span>{item.product_name} × {item.quantity}</span>
                              <strong>{formatMoney(Number(item.price) * Number(item.quantity))}</strong>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        borderTop: "1px solid #334155",
                        paddingTop: "16px",
                        fontSize: "20px",
                      }}
                    >
                      <strong>Total</strong>
                      <strong>{formatMoney(selectedOrder.total)}</strong>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </main>
  );
}
