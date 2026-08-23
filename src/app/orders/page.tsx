"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

type FulfilmentStatus =
  | "processing"
  | "packed"
  | "shipped"
  | "completed";

type Order = {
  id: string;
  customer_name: string | null;
  customer_email: string | null;
  address: string | null;
  town: string | null;
  postcode: string | null;
  total: number | null;
  status: string | null;
  payment_status: string | null;
  fulfilment_status: FulfilmentStatus | null;
  created_at: string;
};

type OrderItem = {
  id: string;
  order_id: string;
  product_name: string | null;
  quantity: number | null;
  price: number | null;
};

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(
        supabaseUrl,
        supabaseAnonKey
      )
    : null;

export default function OrdersPage() {
  const [orders, setOrders] =
    useState<Order[]>([]);

  const [orderItems, setOrderItems] =
    useState<OrderItem[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [updatingOrder, setUpdatingOrder] =
    useState<string | null>(null);

  async function loadOrders() {
    setLoading(true);
    setError("");

    if (!supabase) {
      setError(
        "Supabase is not configured. Please check the environment variables."
      );
      setLoading(false);
      return;
    }

    const {
      data: ordersData,
      error: ordersError,
    } = await supabase
      .from("orders")
      .select(
        "id, customer_name, customer_email, address, town, postcode, total, status, payment_status, fulfilment_status, created_at"
      )
      .order("created_at", {
        ascending: false,
      });

    if (ordersError) {
      console.error(
        "Error loading orders:",
        ordersError
      );

      setError(
        "Unable to load orders."
      );

      setLoading(false);
      return;
    }

    const {
      data: itemsData,
      error: itemsError,
    } = await supabase
      .from("order_items")
      .select(
        "id, order_id, product_name, quantity, price"
      );

    if (itemsError) {
      console.error(
        "Error loading order items:",
        itemsError
      );

      setOrders(ordersData || []);

      setError(
        "Orders loaded, but order items could not be loaded."
      );

      setLoading(false);
      return;
    }

    setOrders(ordersData || []);
    setOrderItems(itemsData || []);
    setLoading(false);
  }

  useEffect(() => {
    loadOrders();
  }, []);

  function getItemsForOrder(
    orderId: string
  ) {
    return orderItems.filter(
      (item) =>
        item.order_id === orderId
    );
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleString(
      "en-GB",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  }

  function formatMoney(
    amount: number | null
  ) {
    return `£${Number(
      amount || 0
    ).toFixed(2)}`;
  }

  function getFulfilmentStatus(
    order: Order
  ): FulfilmentStatus {
    return (
      order.fulfilment_status ||
      "processing"
    );
  }

  function getFulfilmentLabel(
    status: FulfilmentStatus
  ) {
    switch (status) {
      case "processing":
        return "PROCESSING";

      case "packed":
        return "PACKED";

      case "shipped":
        return "SHIPPED";

      case "completed":
        return "COMPLETED";

      default:
        return "PROCESSING";
    }
  }

  async function updateFulfilmentStatus(
    orderId: string,
    newStatus: FulfilmentStatus
  ) {
    setUpdatingOrder(orderId);
    setError("");

    try {
      const response = await fetch(
        "/api/update-order-status",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            orderId,
            status: newStatus,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to update the fulfilment status."
        );
      }

      setOrders(
        (currentOrders) =>
          currentOrders.map(
            (order) =>
              order.id === orderId
                ? {
                    ...order,
                    fulfilment_status:
                      newStatus,
                  }
                : order
          )
      );
    } catch (error) {
      console.error(
        "Error updating fulfilment status:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Unable to update the fulfilment status."
      );
    } finally {
      setUpdatingOrder(null);
    }
  }

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.container}>
          <div style={styles.header}>
            <div>
              <div style={styles.brand}>
                SPARRA&apos;S FUNKO SHOP
              </div>

              <h1 style={styles.title}>
                Orders
              </h1>

              <p style={styles.subtitle}>
                Loading orders...
              </p>
            </div>
          </div>

          <div style={styles.messageCard}>
            <div style={styles.spinner} />

            <p style={styles.messageText}>
              Loading orders from
              Supabase...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (
    error &&
    orders.length === 0
  ) {
    return (
      <main style={styles.page}>
        <div style={styles.container}>
          <div style={styles.header}>
            <div>
              <div style={styles.brand}>
                SPARRA&apos;S FUNKO SHOP
              </div>

              <h1 style={styles.title}>
                Orders
              </h1>

              <p style={styles.subtitle}>
                Something went wrong
              </p>
            </div>
          </div>

          <div style={styles.errorCard}>
            <div style={styles.errorIcon}>
              !
            </div>

            <div>
              <h2 style={styles.errorTitle}>
                Unable to load orders
              </h2>

              <p style={styles.errorText}>
                {error}
              </p>

              <button
                onClick={loadOrders}
                style={styles.primaryButton}
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <div style={styles.brand}>
              SPARRA&apos;S FUNKO SHOP
            </div>

            <h1 style={styles.title}>
              Orders
            </h1>

            <p style={styles.subtitle}>
              {orders.length}{" "}
              {orders.length === 1
                ? "order"
                : "orders"}{" "}
              received
            </p>
          </div>

          <button
            onClick={loadOrders}
            style={styles.refreshButton}
          >
            ↻ Refresh
          </button>
        </div>

        {error && (
          <div style={styles.warningCard}>
            <span
              style={styles.warningIcon}
            >
              !
            </span>

            <span>{error}</span>
          </div>
        )}

        <div style={styles.statsRow}>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>
              TOTAL ORDERS
            </div>

            <div style={styles.statValue}>
              {orders.length}
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statLabel}>
              PAID ORDERS
            </div>

            <div style={styles.statValue}>
              {
                orders.filter(
                  (order) =>
                    order.payment_status ===
                      "paid" ||
                    order.status ===
                      "paid"
                ).length
              }
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statLabel}>
              TOTAL SALES
            </div>

            <div style={styles.statValue}>
              {formatMoney(
                orders.reduce(
                  (
                    total,
                    order
                  ) =>
                    total +
                    Number(
                      order.total || 0
                    ),
                  0
                )
              )}
            </div>
          </div>
        </div>

        {orders.length === 0 ? (
          <div style={styles.emptyCard}>
            <div style={styles.emptyIcon}>
              🛒
            </div>

            <h2 style={styles.emptyTitle}>
              No orders yet
            </h2>

            <p style={styles.emptyText}>
              Orders will appear here
              after a successful
              payment.
            </p>
          </div>
        ) : (
          <div style={styles.ordersList}>
            {orders.map(
              (order, index) => {
                const items =
                  getItemsForOrder(
                    order.id
                  );

                const isPaid =
                  order.payment_status ===
                    "paid" ||
                  order.status ===
                    "paid";

                const fulfilmentStatus =
                  getFulfilmentStatus(
                    order
                  );

                return (
                  <div
                    key={order.id}
                    style={
                      styles.orderCard
                    }
                  >
                    <div
                      style={
                        styles.orderTop
                      }
                    >
                      <div
                        style={
                          styles.orderNumber
                        }
                      >
                        ORDER #
                        {orders.length -
                          index}
                      </div>

                      <div
                        style={
                          isPaid
                            ? styles.paidBadge
                            : styles.unpaidBadge
                        }
                      >
                        {isPaid
                          ? "✓ PAID"
                          : (
                              order.payment_status ||
                              order.status ||
                              "PENDING"
                            ).toUpperCase()}
                      </div>
                    </div>

                    <div
                      style={
                        styles.orderDetails
                      }
                    >
                      <div
                        style={
                          styles.customerSection
                        }
                      >
                        <h2
                          style={
                            styles.customerName
                          }
                        >
                          {order.customer_name ||
                            "Customer"}
                        </h2>

                        <p
                          style={
                            styles.customerEmail
                          }
                        >
                          {order.customer_email ||
                            "No email supplied"}
                        </p>

                        <p
                          style={
                            styles.orderDate
                          }
                        >
                          {formatDate(
                            order.created_at
                          )}
                        </p>
                      </div>

                      <div
                        style={
                          styles.totalSection
                        }
                      >
                        <div
                          style={
                            styles.totalLabel
                          }
                        >
                          ORDER TOTAL
                        </div>

                        <div
                          style={
                            styles.totalAmount
                          }
                        >
                          {formatMoney(
                            order.total
                          )}
                        </div>
                      </div>
                    </div>

                    <div
                      style={
                        styles.addressSection
                      }
                    >
                      <div
                        style={
                          styles.addressTitle
                        }
                      >
                        DELIVERY ADDRESS
                      </div>

                      <div
                        style={
                          styles.addressText
                        }
                      >
                        {order.address ||
                          "No address supplied"}
                        <br />

                        {order.town ||
                          "No town supplied"}
                        <br />

                        {order.postcode ||
                          "No postcode supplied"}
                      </div>
                    </div>

                    <div
                      style={
                        styles.fulfilmentSection
                      }
                    >
                      <div
                        style={
                          styles.fulfilmentHeader
                      }
                      >
                        <div>
                          <div
                            style={
                              styles.fulfilmentLabel
                            }
                          >
                            FULFILMENT STATUS
                          </div>

                          <div
                            style={
                              styles.fulfilmentDescription
                            }
                          >
                            Click a button to
                            update the order
                          </div>
                        </div>

                        <div
                          style={{
                            ...styles.statusBadge,
                            ...getStatusBadgeStyle(
                              fulfilmentStatus
                            ),
                          }}
                        >
                          {updatingOrder ===
                          order.id
                            ? "SAVING..."
                            : getFulfilmentLabel(
                                fulfilmentStatus
                              )}
                        </div>
                      </div>

                      <div
                        style={
                          styles.statusButtons
                        }
                      >
                        {(
                          [
                            "processing",
                            "packed",
                            "shipped",
                            "completed",
                          ] as FulfilmentStatus[]
                        ).map(
                          (status) => {
                            const active =
                              fulfilmentStatus ===
                              status;

                            const saving =
                              updatingOrder ===
                              order.id;

                            return (
                              <button
                                key={
                                  status
                                }
                                disabled={
                                  saving ||
                                  active
                                }
                                onClick={() =>
                                  updateFulfilmentStatus(
                                    order.id,
                                    status
                                  )
                                }
                                style={{
                                  ...styles.statusButton,
                                  ...getStatusButtonStyle(
                                    status
                                  ),
                                  ...(active
                                    ? styles.statusButtonActive
                                    : {}),
                                  ...(saving
                                    ? styles.statusButtonDisabled
                                    : {}),
                                }}
                              >
                                {active
                                  ? "✓ "
                                  : ""}
                                {getFulfilmentLabel(
                                  status
                                )}
                              </button>
                            );
                          }
                        )}
                      </div>
                    </div>

                    <div
                      style={
                        styles.itemsSection
                      }
                    >
                      <div
                        style={
                          styles.itemsHeader
                        }
                      >
                        <h3
                          style={
                            styles.itemsTitle
                          }
                        >
                          Items
                        </h3>

                        <span
                          style={
                            styles.itemCount
                          }
                        >
                          {items.length}{" "}
                          {items.length ===
                          1
                            ? "item"
                            : "items"}
                        </span>
                      </div>

                      {items.length ===
                      0 ? (
                        <div
                          style={
                            styles.noItems
                          }
                        >
                          No item details
                          found.
                        </div>
                      ) : (
                        <div
                          style={
                            styles.itemsList
                          }
                        >
                          {items.map(
                            (item) => (
                              <div
                                key={
                                  item.id
                                }
                                style={
                                  styles.itemRow
                                }
                              >
                                <div
                                  style={
                                    styles.itemInfo
                                  }
                                >
                                  <div
                                    style={
                                      styles.productIcon
                                    }
                                  >
                                    ★
                                  </div>

                                  <div>
                                    <p
                                      style={
                                        styles.productName
                                      }
                                    >
                                      {item.product_name ||
                                        "Funko Pop"}
                                    </p>

                                    <p
                                      style={
                                        styles.quantity
                                      }
                                    >
                                      Quantity:{" "}
                                      {item.quantity ||
                                        1}
                                    </p>
                                  </div>
                                </div>

                                <div
                                  style={
                                    styles.itemPrice
                                  }
                                >
                                  {formatMoney(
                                    item.price
                                  )}
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              }
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function getStatusBadgeStyle(
  status: FulfilmentStatus
): React.CSSProperties {
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

function getStatusButtonStyle(
  status: FulfilmentStatus
): React.CSSProperties {
  switch (status) {
    case "processing":
      return {
        border: "1px solid #8b5cf6",
        background: "#f5f3ff",
        color: "#6d28d9",
      };

    case "packed":
      return {
        border: "1px solid #f59e0b",
        background: "#fffbeb",
        color: "#92400e",
      };

    case "shipped":
      return {
        border: "1px solid #3b82f6",
        background: "#eff6ff",
        color: "#1d4ed8",
      };

    case "completed":
      return {
        border: "1px solid #22c55e",
        background: "#f0fdf4",
        color: "#15803d",
      };

    default:
      return {};
  }
}

const styles: {
  [key: string]: React.CSSProperties;
} = {
  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(135deg, #080d1c 0%, #111a31 50%, #080d1c 100%)",
    color: "#ffffff",
    padding:
      "40px 24px 80px",
    boxSizing: "border-box",
    fontFamily:
      "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },

  container: {
    maxWidth: "1200px",
    margin: "0 auto",
  },

  header: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent:
      "space-between",
    gap: "20px",
    marginBottom: "30px",
  },

  brand: {
    color: "#8b5cf6",
    fontSize: "13px",
    fontWeight: 800,
    letterSpacing: "2px",
    marginBottom: "8px",
  },

  title: {
    margin: 0,
    fontSize: "42px",
    lineHeight: 1.1,
    fontWeight: 800,
  },

  subtitle: {
    margin: "8px 0 0",
    color: "#9ca8c4",
    fontSize: "16px",
  },

  refreshButton: {
    border: "none",
    borderRadius: "10px",
    background:
      "linear-gradient(135deg, #6d28d9, #8b5cf6)",
    color: "#ffffff",
    padding:
      "13px 22px",
    fontSize: "15px",
    fontWeight: 700,
    cursor: "pointer",
  },

  warningCard: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    background: "#fff7ed",
    color: "#9a3412",
    borderRadius: "10px",
    padding: "12px 16px",
    marginBottom: "18px",
    fontSize: "14px",
    fontWeight: 600,
  },

  warningIcon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent:
      "center",
    width: "24px",
    height: "24px",
    borderRadius: "50%",
    background: "#fed7aa",
    color: "#9a3412",
    fontWeight: 800,
  },

  statsRow: {
    display: "grid",
    gridTemplateColumns:
      "repeat(3, minmax(0, 1fr))",
    gap: "16px",
    marginBottom: "24px",
  },

  statCard: {
    background:
      "rgba(255, 255, 255, 0.06)",
    border:
      "1px solid rgba(255, 255, 255, 0.09)",
    borderRadius: "14px",
    padding: "20px",
  },

  statLabel: {
    color: "#8995b0",
    fontSize: "11px",
    fontWeight: 800,
    letterSpacing: "1.2px",
  },

  statValue: {
    marginTop: "8px",
    fontSize: "28px",
    fontWeight: 800,
    color: "#ffffff",
  },

  ordersList: {
    display: "flex",
    flexDirection: "column",
    gap: "18px",
  },

  orderCard: {
    background: "#ffffff",
    color: "#111827",
    borderRadius: "16px",
    overflow: "hidden",
    boxShadow:
      "0 12px 35px rgba(0, 0, 0, 0.22)",
  },

  orderTop: {
    display: "flex",
    alignItems: "center",
    justifyContent:
      "space-between",
    gap: "15px",
    padding: "15px 22px",
    background: "#f7f8fc",
    borderBottom:
      "1px solid #e5e7eb",
  },

  orderNumber: {
    fontSize: "12px",
    fontWeight: 800,
    letterSpacing: "1px",
    color: "#6b7280",
  },

  paidBadge: {
    borderRadius: "999px",
    background: "#dcfce7",
    color: "#15803d",
    padding: "6px 11px",
    fontSize: "11px",
    fontWeight: 800,
  },

  unpaidBadge: {
    borderRadius: "999px",
    background: "#fef3c7",
    color: "#92400e",
    padding: "6px 11px",
    fontSize: "11px",
    fontWeight: 800,
  },

  orderDetails: {
    display: "flex",
    justifyContent:
      "space-between",
    gap: "30px",
    padding:
      "24px 22px 16px",
  },

  customerSection: {
    minWidth: 0,
  },

  customerName: {
    margin: 0,
    fontSize: "22px",
    fontWeight: 800,
  },

  customerEmail: {
    margin: "5px 0 0",
    color: "#6b7280",
    fontSize: "14px",
  },

  orderDate: {
    margin: "9px 0 0",
    color: "#9ca3af",
    fontSize: "13px",
  },

  totalSection: {
    textAlign: "right",
    flexShrink: 0,
  },

  totalLabel: {
    color: "#9ca3af",
    fontSize: "10px",
    fontWeight: 800,
    letterSpacing: "1px",
  },

  totalAmount: {
    marginTop: "5px",
    fontSize: "28px",
    fontWeight: 800,
  },

  addressSection: {
    margin: "0 22px 22px",
    padding: "16px",
    background: "#f8fafc",
    border:
      "1px solid #e5e7eb",
    borderRadius: "12px",
  },

  addressTitle: {
    fontSize: "11px",
    fontWeight: 800,
    letterSpacing: "1px",
    color: "#6b7280",
    marginBottom: "7px",
  },

  addressText: {
    fontSize: "14px",
    lineHeight: 1.6,
    color: "#111827",
    fontWeight: 600,
  },

  fulfilmentSection: {
    margin: "0 22px 22px",
    padding: "16px",
    background: "#f8fafc",
    border:
      "1px solid #e5e7eb",
    borderRadius: "12px",
  },

  fulfilmentHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent:
      "space-between",
    gap: "15px",
    marginBottom: "14px",
  },

  fulfilmentLabel: {
    fontSize: "11px",
    fontWeight: 800,
    letterSpacing: "1px",
    color: "#6b7280",
  },

  fulfilmentDescription: {
    marginTop: "4px",
    fontSize: "12px",
    color: "#9ca3af",
  },

  statusButtons: {
    display: "grid",
    gridTemplateColumns:
      "repeat(4, minmax(0, 1fr))",
    gap: "9px",
  },

  statusButton: {
    borderRadius: "9px",
    padding: "11px 8px",
    fontSize: "11px",
    fontWeight: 800,
    cursor: "pointer",
    transition:
      "all 0.15s ease",
  },

  statusButtonActive: {
    boxShadow:
      "inset 0 0 0 2px rgba(0,0,0,0.08)",
    cursor: "default",
  },

  statusButtonDisabled: {
    opacity: 0.55,
    cursor: "wait",
  },

  statusBadge: {
    borderRadius: "999px",
    padding: "7px 11px",
    fontSize: "10px",
    fontWeight: 800,
    whiteSpace: "nowrap",
  },

  itemsSection: {
    padding: "0 22px 22px",
  },

  itemsHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent:
      "space-between",
    borderTop:
      "1px solid #e5e7eb",
    paddingTop: "18px",
    marginBottom: "10px",
  },

  itemsTitle: {
    margin: 0,
    fontSize: "15px",
    fontWeight: 800,
  },

  itemCount: {
    color: "#9ca3af",
    fontSize: "12px",
    fontWeight: 600,
  },

  itemsList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },

  itemRow: {
    display: "flex",
    alignItems: "center",
    justifyContent:
      "space-between",
    gap: "15px",
    background: "#f8fafc",
    border:
      "1px solid #eef0f4",
    borderRadius: "10px",
    padding: "12px 14px",
  },

  itemInfo: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    minWidth: 0,
  },

  productIcon: {
    width: "36px",
    height: "36px",
    borderRadius: "9px",
    display: "flex",
    alignItems: "center",
    justifyContent:
      "center",
    flexShrink: 0,
    background:
      "linear-gradient(135deg, #6d28d9, #a855f7)",
    color: "#ffffff",
    fontSize: "15px",
    fontWeight: 800,
  },

  productName: {
    margin: 0,
    fontSize: "14px",
    fontWeight: 700,
  },

  quantity: {
    margin: "3px 0 0",
    fontSize: "12px",
    color: "#9ca3af",
  },

  itemPrice: {
    fontSize: "15px",
    fontWeight: 800,
    whiteSpace: "nowrap",
  },

  messageCard: {
    background: "#ffffff",
    color: "#111827",
    borderRadius: "16px",
    padding: "50px 30px",
    textAlign: "center",
  },

  spinner: {
    width: "34px",
    height: "34px",
    borderRadius: "50%",
    border:
      "4px solid #e5e7eb",
    borderTopColor: "#7c3aed",
    margin:
      "0 auto 16px",
  },

  messageText: {
    margin: 0,
    color: "#6b7280",
    fontSize: "15px",
  },

  errorCard: {
    display: "flex",
    alignItems: "flex-start",
    gap: "18px",
    background: "#ffffff",
    color: "#111827",
    borderRadius: "16px",
    padding: "30px",
  },

  errorIcon: {
    width: "42px",
    height: "42px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent:
      "center",
    background: "#fee2e2",
    color: "#dc2626",
    fontSize: "22px",
    fontWeight: 800,
  },

  errorTitle: {
    margin: 0,
    fontSize: "20px",
    fontWeight: 800,
  },

  errorText: {
    margin: "7px 0 18px",
    color: "#6b7280",
    fontSize: "14px",
  },

  primaryButton: {
    border: "none",
    borderRadius: "9px",
    background: "#111827",
    color: "#ffffff",
    padding: "10px 18px",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
  },

  emptyCard: {
    background: "#ffffff",
    color: "#111827",
    borderRadius: "16px",
    padding: "70px 30px",
    textAlign: "center",
  },

  emptyIcon: {
    fontSize: "45px",
    marginBottom: "15px",
  },

  emptyTitle: {
    margin: 0,
    fontSize: "24px",
    fontWeight: 800,
  },

  emptyText: {
    margin: "8px 0 0",
    color: "#6b7280",
    fontSize: "15px",
  },

  noItems: {
    background: "#f8fafc",
    borderRadius: "10px",
    padding: "14px",
    color: "#9ca3af",
    fontSize: "13px",
  },
};