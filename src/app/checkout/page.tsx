"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useCart } from "../../context/CartContext";

export default function CheckoutPage() {
  const { items, total } = useCart();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [town, setTown] = useState("");
  const [postcode, setPostcode] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items,
          customer: {
            name,
            email,
            address,
            town,
            postcode,
          },
        }),
      });

      const responseText = await response.text();

      let data: {
        url?: string;
        error?: string;
      };

      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(
          `Payment server returned an unexpected response (${response.status}).`
        );
      }

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to start payment."
        );
      }

      if (!data.url) {
        throw new Error(
          "Stripe did not return a payment URL."
        );
      }

      if (
        !data.url.startsWith("https://") &&
        !data.url.startsWith("http://")
      ) {
        throw new Error(
          "Stripe returned an invalid payment URL."
        );
      }

      window.location.href = data.url;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "We couldn't start the payment. Please try again."
      );

      setSaving(false);
    }
  };

  if (items.length === 0) {
    return (
      <main>
        <div className="container">
          <Link href="/" className="back-link">
            ← Back to Shop
          </Link>

          <h1>Checkout</h1>

          <div className="empty-cart">
            <h2>Your basket is empty</h2>

            <p>
              Please add some Funko Pops before checking out.
            </p>

            <Link href="/" className="primary-btn">
              Return to Shop
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main>
      <div className="container">
        <Link href="/cart" className="back-link">
          ← Back to Basket
        </Link>

        <h1>Checkout</h1>

        {error && (
          <div
            style={{
              background: "#7f1d1d",
              color: "#ffffff",
              padding: "15px 20px",
              borderRadius: "12px",
              marginBottom: "25px",
            }}
          >
            {error}
          </div>
        )}

        <div className="checkout-grid">
          <form
            className="checkout-form"
            onSubmit={handleSubmit}
          >
            <h2>Delivery Details</h2>

            <label>
              Full Name
              <input
                type="text"
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                required
              />
            </label>

            <label>
              Email Address
              <input
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                required
              />
            </label>

            <label>
              Address
              <input
                type="text"
                value={address}
                onChange={(event) =>
                  setAddress(event.target.value)
                }
                required
              />
            </label>

            <label>
              Town / City
              <input
                type="text"
                value={town}
                onChange={(event) =>
                  setTown(event.target.value)
                }
                required
              />
            </label>

            <label>
              Postcode
              <input
                type="text"
                value={postcode}
                onChange={(event) =>
                  setPostcode(event.target.value)
                }
                required
              />
            </label>

            <button
              type="submit"
              className="primary-btn checkout-btn"
              disabled={saving}
            >
              {saving
                ? "Opening Payment..."
                : `Pay £${total.toFixed(2)}`}
            </button>
          </form>

          <div className="order-summary">
            <h2>Order Summary</h2>

            {items.map((item) => (
              <div
                className="summary-item"
                key={item.id}
              >
                <div>
                  <strong>{item.name}</strong>

                  <span>
                    Quantity: {item.quantity}
                  </span>
                </div>

                <strong>
                  £
                  {(
                    item.price * item.quantity
                  ).toFixed(2)}
                </strong>
              </div>
            ))}

            <div className="summary-total">
              <span>Total</span>

              <strong>
                £{total.toFixed(2)}
              </strong>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}