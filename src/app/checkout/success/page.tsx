"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type FulfilmentStatus =
  | "processing"
  | "packed"
  | "shipped"
  | "completed";

type Order = {
  id: string;
  customer_name: string;
  customer_email: string;
  total: number;
  fulfilment_status?: FulfilmentStatus;
  status?: string;
};

type OrderItem = {
  id: string;
  product_name: string;
  quantity: number;
  price: number;
};

function SuccessContent() {
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

  useEffect(() => {
    if (!sessionId) {
      setError("Missing payment session.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    let attempts = 0;

    let retryTimer:
      ReturnType<typeof setTimeout> | null =
      null;

    let refreshTimer:
      ReturnType<typeof setInterval> | null =
      null;

    const fetchOrder =
      async (): Promise<boolean> => {
        try {
          const response = await fetch(
            `/api/order-by-session?session_id=${encodeURIComponent(
              sessionId
            )}`,
            {
              cache: "no-store",
            }
          );

          const text =
            await response.text();

          let data: {
            order?: Order;
            items?: OrderItem[];
            error?: string;
          };

          try {
            data = JSON.parse(text);
          } catch {
            throw new Error(
              "Invalid response from server."
            );
          }

          if (
            response.ok &&
            data.order
          ) {
            if (!cancelled) {
              setOrder(data.order);
              setItems(data.items || []);
              setLoading(false);
              setError("");
            }

            return true;
          }

          attempts++;

          if (
            attempts < 10 &&
            !cancelled
          ) {
            retryTimer = setTimeout(() => {
              fetchOrder();
            }, 1000);

            return false;
          }

          if (!cancelled) {
            setError(
              data.error ||
                "Order not found."
            );

            setLoading(false);
          }

          return false;
        } catch (err) {
          console.error(
            "Order lookup failed:",
            err
          );

          attempts++;

          if (
            attempts < 10 &&
            !cancelled
          ) {
            retryTimer = setTimeout(() => {
              fetchOrder();
            }, 1000);

            return false;
          }

          if (!cancelled) {
            setError(
              "Unable to load your order."
            );

            setLoading(false);
          }

          return false;
        }
      };

    const start = async () => {
      const found =
        await fetchOrder();

      if (!found || cancelled) {
        return;
      }

      refreshTimer = setInterval(
        async () => {
          if (cancelled) return;

          try {
            const response =
              await fetch(
                `/api/order-by-session?session_id=${encodeURIComponent(
                  sessionId
                )}`,
                {
                  cache: "no-store",
                }
              );

            if (!response.ok) {
              return;
            }

            const data =
              await response.json();

            if (
              data.order &&
              !cancelled
            ) {
              setOrder(data.order);
              setItems(
                data.items || []
              );
            }
          } catch (err) {
            console.error(
              "Order refresh failed:",
              err
            );
          }
        },
        30000
      );
    };

    start();

    return () => {
      cancelled = true;

      if (retryTimer) {
        clearTimeout(
          retryTimer
        );
      }

      if (refreshTimer) {
        clearInterval(
          refreshTimer
        );
      }
    };
  }, [sessionId]);

  const fulfilmentStatus: FulfilmentStatus =
    order?.fulfilment_status ||
    "processing";

  const statusLabel = {
    processing: "PROCESSING",
    packed: "PACKED",
    shipped: "SHIPPED",
    completed: "COMPLETED",
  }[fulfilmentStatus];

  const statusStyle = {
    processing: {
      background: "#f3f4f6",
      color: "#374151",
    },
    packed: {
      background: "#fef3c7",
      color: "#92400e",
    },
    shipped: {
      background: "#dbeafe",
      color: "#1d4ed8",
    },
    completed: {
      background: "#dcfce7",
      color: "#166534",
    },
  }[fulfilmentStatus];

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
        color: "#111827",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          background: "#f8fafc",
        }}
      >
        <div
          style={{
            background: "#ffffff",
            padding: "40px",
            borderRadius: "16px",
            textAlign: "center",
            boxShadow:
              "0 10px 30px rgba(0,0,0,0.08)",
          }}
        >
          <h1
            style={{
              margin:
                "0 0 12px",
              fontSize: "28px",
            }}
          >
            Payment successful
          </h1>

          <p
            style={{
              margin: 0,
              color: "#64748b",
            }}
          >
            Loading your order...
          </p>
        </div>
      </main>
    );
  }

  if (error || !order) {
    return (
      <main
        style={{
          minHeight: "100vh",
        color: "#111827",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          background: "#f8fafc",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "600px",
            background: "#ffffff",
            padding: "40px",
            borderRadius: "16px",
            textAlign: "center",
            boxShadow:
              "0 10px 30px rgba(0,0,0,0.08)",
          }}
        >
          <h1
            style={{
              margin:
                "0 0 12px",
              fontSize: "30px",
            }}
          >
            Payment received
          </h1>

          <p
            style={{
              margin:
                "0 0 24px",
              color: "#64748b",
            }}
          >
            {error ||
              "Your order is being processed."}
          </p>

          <Link
            href="/"
            style={{
              display:
                "inline-block",
              padding:
                "12px 22px",
              borderRadius: "8px",
              background: "#111827",
              color: "#ffffff",
              textDecoration:
                "none",
              fontWeight: 700,
            }}
          >
            Return to shop
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        color: "#111827",
        background: "#f8fafc",
        padding:
          "40px 20px 60px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "800px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            background: "#ffffff",
            borderRadius: "18px",
            padding: "40px",
            boxShadow:
              "0 10px 30px rgba(0,0,0,0.08)",
          }}
        >
          <div
            style={{
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "64px",
                height: "64px",
                margin:
                  "0 auto 20px",
                borderRadius: "50%",
                background: "#dcfce7",
                color: "#166534",
                display: "flex",
                alignItems: "center",
                justifyContent:
                  "center",
                fontSize: "32px",
                fontWeight: 800,
              }}
            >
              ✓
            </div>

            <h1
              style={{
                margin:
                  "0 0 10px",
                fontSize: "34px",
              }}
            >
              Thank you for your
              order!
            </h1>

            <p
              style={{
                margin:
                  "0 0 24px",
                color: "#64748b",
                fontSize: "17px",
              }}
            >
              Your payment has been
              received successfully.
            </p>

            <div
              style={{
                display:
                  "inline-block",
                padding:
                  "10px 18px",
                borderRadius:
                  "999px",
                background:
                  statusStyle.background,
                color:
                  statusStyle.color,
                fontWeight: 800,
                fontSize: "14px",
                letterSpacing:
                  "0.5px",
              }}
            >
              {statusLabel}
            </div>
          </div>

          <div
            style={{
              marginTop: "35px",
              padding: "22px",
              background: "#f8fafc",
              borderRadius: "12px",
            }}
          >
            <h2
              style={{
                margin:
                  "0 0 16px",
                fontSize: "20px",
              }}
            >
              Order details
            </h2>

            <p
              style={{
                margin: "6px 0",
              }}
            >
              <strong>
                Order:
              </strong>{" "}
              {order.id}
            </p>

            <p
              style={{
                margin: "6px 0",
              }}
            >
              <strong>
                Name:
              </strong>{" "}
              {order.customer_name}
            </p>

            <p
              style={{
                margin: "6px 0",
              }}
            >
              <strong>
                Email:
              </strong>{" "}
              {order.customer_email}
            </p>
          </div>

          <div
            style={{
              marginTop: "30px",
            }}
          >
            <h2
              style={{
                margin:
                  "0 0 16px",
                fontSize: "20px",
              }}
            >
              Items
            </h2>

            {items.length === 0 ? (
              <p
                style={{
                  color: "#64748b",
                }}
              >
                No item details are
                available yet.
              </p>
            ) : (
              <div>
                {items.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      gap: "20px",
                      padding:
                        "14px 0",
                      borderBottom:
                        "1px solid #e5e7eb",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontWeight: 700,
                        }}
                      >
                        {
                          item.product_name
                        }
                      </div>

                      <div
                        style={{
                          marginTop:
                            "4px",
                          color:
                            "#64748b",
                        }}
                      >
                        Qty:{" "}
                        {
                          item.quantity
                        }
                      </div>
                    </div>

                    <div
                      style={{
                        fontWeight: 700,
                      }}
                    >
                      £
                      {(
                        item.price *
                        item.quantity
                      ).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              marginTop: "24px",
              paddingTop: "20px",
              borderTop:
                "2px solid #111827",
              fontSize: "20px",
              fontWeight: 800,
            }}
          >
            <span>Total</span>

            <span>
              £
              {Number(
                order.total
              ).toFixed(2)}
            </span>
          </div>

          <div
            style={{
              marginTop: "30px",
              padding: "18px",
              borderRadius: "10px",
              background: "#eff6ff",
              color: "#1e3a8a",
            }}
          >
            <strong>
              Order status updates
            </strong>

            <p
              style={{
                margin:
                  "6px 0 0",
                color: "#475569",
              }}
            >
              This page will
              automatically update
              when your order status
              changes.
            </p>
          </div>

          <div
            style={{
              textAlign: "center",
              marginTop: "32px",
            }}
          >
            <Link
              href={`/orders?session_id=${encodeURIComponent(
                sessionId || ""
              )}`}
              style={{
                display:
                  "inline-block",
                padding:
                  "13px 26px",
                borderRadius: "8px",
                background: "#7c3aed",
                color: "#ffffff",
                textDecoration:
                  "none",
                fontWeight: 700,
                marginRight: "10px",
              }}
            >
              Track My Order
            </Link>

            <Link
              href="/"
              style={{
                display:
                  "inline-block",
                padding:
                  "13px 26px",
                borderRadius: "8px",
                background: "#111827",
                color: "#ffffff",
                textDecoration:
                  "none",
                fontWeight: 700,
              }}
            >
              Continue shopping
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <main
          style={{
            minHeight: "100vh",
        color: "#111827",
            display: "flex",
            alignItems: "center",
            justifyContent:
              "center",
          }}
        >
          <p>
            Loading your order...
          </p>
        </main>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}