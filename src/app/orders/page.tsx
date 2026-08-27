"use client";

import {
  Suspense,
  useEffect,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";

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

const statusInfo: Record<
  FulfilmentStatus,
  {
    label: string;
    icon: string;
    color: string;
    background: string;
  }
> = {
  processing: {
    label: "Processing",
    icon: "⏳",
    color: "#7c3aed",
    background: "#ede9fe",
  },
  packed: {
    label: "Packed",
    icon: "📦",
    color: "#b45309",
    background: "#fef3c7",
  },
  shipped: {
    label: "Shipped",
    icon: "🚚",
    color: "#1d4ed8",
    background: "#dbeafe",
  },
  completed: {
    label: "Completed",
    icon: "✅",
    color: "#15803d",
    background: "#dcfce7",
  },
};

function OrdersPageContent() {
  const searchParams = useSearchParams();

  const sessionId =
    searchParams.get("session_id");

  const [order, setOrder] =
    useState<Order | null>(null);

  const [items, setItems] =
    useState<OrderItem[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  async function loadOrder() {
    if (!sessionId) {
      setError(
        "No order reference was provided."
      );
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/order-by-session?session_id=${encodeURIComponent(
          sessionId
        )}`,
        {
          cache: "no-store",
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to load your order."
        );
      }

      setOrder(data.order);
      setItems(data.items || []);
    } catch (err) {
      console.error(
        "Customer order lookup error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load your order."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrder();
  }, [sessionId]);

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.container}>
          <div style={styles.messageCard}>
            <div style={styles.loadingIcon}>
              📦
            </div>

            <h1 style={styles.title}>
              Loading your order...
            </h1>

            <p style={styles.messageText}>
              Please wait while we retrieve
              your order details.
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (error || !order) {
    return (
      <main style={styles.page}>
        <div style={styles.container}>
          <div style={styles.errorCard}>
            <div style={styles.errorIcon}>
              ⚠️
            </div>

            <div>
              <h1 style={styles.errorTitle}>
                Order not found
              </h1>

              <p style={styles.errorText}>
                {error ||
                  "We couldn't find that order."}
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const fulfilmentStatus =
    order.fulfilment_status ||
    "processing";

  const currentStatus =
    statusInfo[fulfilmentStatus];

  const createdDate =
    new Date(
      order.created_at
    ).toLocaleString("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    });

  const statuses: FulfilmentStatus[] = [
    "processing",
    "packed",
    "shipped",
    "completed",
  ];

  const currentIndex =
    statuses.indexOf(
      fulfilmentStatus
    );

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <div style={styles.brand}>
              SPARRA'S FUNKO POP SHOP
            </div>

            <h1 style={styles.title}>
              My Order
            </h1>

            <p style={styles.subtitle}>
              Track the progress of your order.
            </p>
          </div>

          <button
            onClick={loadOrder}
            style={styles.refreshButton}
          >
            🔄 Refresh
          </button>
        </div>

        <section style={styles.orderCard}>
          <div style={styles.orderTop}>
            <div>
              <div style={styles.orderNumber}>
                ORDER
              </div>

              <div
                style={styles.orderId}
              >
                #{order.id}
              </div>

              <div style={styles.orderDate}>
                {createdDate}
              </div>
            </div>

            <div
              style={
                order.payment_status ===
                "paid"
                  ? styles.paidBadge
                  : styles.unpaidBadge
              }
            >
              {order.payment_status ===
              "paid"
                ? "✓ PAID"
                : "PAYMENT PENDING"}
            </div>
          </div>

          <div style={styles.customerSection}>
            <h2
              style={styles.sectionTitle}
            >
              Customer
            </h2>

            <p style={styles.customerName}>
              {order.customer_name ||
                "Customer"}
            </p>

            <p
              style={styles.customerEmail}
            >
              {order.customer_email || ""}
            </p>
          </div>

          <div style={styles.addressSection}>
            <div style={styles.addressTitle}>
              DELIVERY ADDRESS
            </div>

            <div style={styles.addressText}>
              {order.address || ""}
              <br />
              {order.town || ""}
              <br />
              {order.postcode || ""}
            </div>
          </div>

          <div style={styles.fulfilmentSection}>
            <div
              style={styles.fulfilmentHeader}
            >
              <div>
                <div
                  style={
                    styles.fulfilmentLabel
                  }
                >
                  ORDER STATUS
                </div>

                <div
                  style={
                    styles.fulfilmentDescription
                  }
                >
                  Your order is currently{" "}
                  <strong>
                    {currentStatus.label}
                  </strong>
                  .
                </div>
              </div>

              <div
                style={{
                  ...styles.statusBadge,
                  background:
                    currentStatus.background,
                  color:
                    currentStatus.color,
                }}
              >
                {currentStatus.icon}{" "}
                {currentStatus.label}
              </div>
            </div>

            <div style={styles.progress}>
              {statuses.map(
                (status, index) => {
                  const info =
                    statusInfo[status];

                  const active =
                    index <= currentIndex;

                  return (
                    <div
                      key={status}
                      style={
                        styles.progressItem
                      }
                    >
                      <div
                        style={{
                          ...styles.progressCircle,
                          background: active
                            ? info.color
                            : "#e2e8f0",
                          color: active
                            ? "#ffffff"
                            : "#94a3b8",
                        }}
                      >
                        {active
                          ? "✓"
                          : index + 1}
                      </div>

                      <div
                        style={{
                          ...styles.progressLabel,
                          color: active
                            ? info.color
                            : "#94a3b8",
                        }}
                      >
                        {info.label}
                      </div>

                      {index < 3 && (
                        <div
                          style={{
                            ...styles.progressLine,
                            background:
                              index <
                              currentIndex
                                ? "#7c3aed"
                                : "#e2e8f0",
                          }}
                        />
                      )}
                    </div>
                  );
                }
              )}
            </div>
          </div>

          <div style={styles.itemsSection}>
            <div style={styles.itemsHeader}>
              <h2
                style={styles.itemsTitle}
              >
                Items
              </h2>

              <span
                style={styles.itemCount}
              >
                {items.length}{" "}
                {items.length === 1
                  ? "item"
                  : "items"}
              </span>
            </div>

            {items.length === 0 ? (
              <div style={styles.noItems}>
                No item details found.
              </div>
            ) : (
              <div style={styles.itemsList}>
                {items.map((item) => (
                  <div
                    key={item.id}
                    style={styles.itemRow}
                  >
                    <div
                      style={styles.itemInfo}
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
                          {item.quantity || 1}
                        </p>
                      </div>
                    </div>

                    <div
                      style={styles.itemPrice}
                    >
                      £
                      {(
                        Number(
                          item.price || 0
                        ) *
                        Number(
                          item.quantity || 1
                        )
                      ).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={styles.totalRow}>
              <span>Total</span>

              <strong>
                £
                {Number(
                  order.total || 0
                ).toFixed(2)}
              </strong>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function OrdersPage() {
  return (
    <Suspense
      fallback={
        <main style={styles.page}>
          <div style={styles.container}>
            <div style={styles.messageCard}>
              <div style={styles.loadingIcon}>
                📦
              </div>

              <h1 style={styles.title}>
                Loading your order...
              </h1>

              <p
                style={styles.messageText}
              >
                Please wait while we retrieve
                your order details.
              </p>
            </div>
          </div>
        </main>
      }
    >
      <OrdersPageContent />
    </Suspense>
  );
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
    color: "#ffffff",
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
    padding:
      "22px",
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

  orderId: {
    marginTop: "5px",
    fontSize: "18px",
    fontWeight: 800,
    wordBreak: "break-all",
  },

  orderDate: {
    marginTop: "8px",
    color: "#9ca3af",
    fontSize: "13px",
  },

  paidBadge: {
    borderRadius: "999px",
    background: "#dcfce7",
    color: "#15803d",
    padding: "7px 12px",
    fontSize: "11px",
    fontWeight: 800,
    whiteSpace: "nowrap",
  },

  unpaidBadge: {
    borderRadius: "999px",
    background: "#fef3c7",
    color: "#92400e",
    padding: "7px 12px",
    fontSize: "11px",
    fontWeight: 800,
    whiteSpace: "nowrap",
  },

  customerSection: {
    padding:
      "24px 22px 18px",
  },

  sectionTitle: {
    margin:
      "0 0 12px",
    fontSize: "15px",
    fontWeight: 800,
  },

  customerName: {
    margin: 0,
    fontSize: "22px",
    fontWeight: 800,
  },

  customerEmail: {
    margin:
      "5px 0 0",
    color: "#6b7280",
    fontSize: "14px",
  },

  addressSection: {
    margin:
      "0 22px 22px",
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
    margin:
      "0 22px 22px",
    padding: "18px",
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
    marginBottom: "24px",
  },

  fulfilmentLabel: {
    fontSize: "11px",
    fontWeight: 800,
    letterSpacing: "1px",
    color: "#6b7280",
  },

  fulfilmentDescription: {
    marginTop: "4px",
    fontSize: "13px",
    color: "#9ca3af",
  },

  statusBadge: {
    borderRadius: "999px",
    padding: "8px 12px",
    fontSize: "11px",
    fontWeight: 800,
    whiteSpace: "nowrap",
  },

  progress: {
    display: "flex",
    alignItems: "flex-start",
    width: "100%",
  },

  progressItem: {
    flex: 1,
    position: "relative",
    textAlign: "center",
  },

  progressCircle: {
    width: "38px",
    height: "38px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin:
      "0 auto 8px",
    fontWeight: 900,
    position: "relative",
    zIndex: 2,
  },

  progressLabel: {
    fontSize: "12px",
    fontWeight: 800,
  },

  progressLine: {
    position: "absolute",
    height: "4px",
    left: "50%",
    right: "-50%",
    top: "17px",
    zIndex: 1,
  },

  itemsSection: {
    padding:
      "0 22px 22px",
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
    padding:
      "12px 14px",
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
    justifyContent: "center",
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
    margin:
      "3px 0 0",
    fontSize: "12px",
    color: "#9ca3af",
  },

  itemPrice: {
    fontSize: "15px",
    fontWeight: 800,
    whiteSpace: "nowrap",
  },

  totalRow: {
    display: "flex",
    alignItems: "center",
    justifyContent:
      "space-between",
    marginTop: "18px",
    paddingTop: "18px",
    borderTop:
      "2px solid #111827",
    fontSize: "22px",
    fontWeight: 800,
  },

  messageCard: {
    background: "#ffffff",
    color: "#111827",
    borderRadius: "16px",
    padding:
      "60px 30px",
    textAlign: "center",
  },

  loadingIcon: {
    fontSize: "45px",
    marginBottom: "15px",
  },

  messageText: {
    margin: "8px 0 0",
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
    justifyContent: "center",
    background: "#fee2e2",
    color: "#dc2626",
    fontSize: "22px",
    fontWeight: 800,
    flexShrink: 0,
  },

  errorTitle: {
    margin: 0,
    fontSize: "20px",
    fontWeight: 800,
  },

  errorText: {
    margin:
      "7px 0 0",
    color: "#6b7280",
    fontSize: "14px",
  },

  noItems: {
    background: "#f8fafc",
    borderRadius: "10px",
    padding: "14px",
    color: "#9ca3af",
    fontSize: "13px",
  },
};