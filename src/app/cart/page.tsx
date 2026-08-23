"use client";

import Link from "next/link";
import { useCart } from "../../context/CartContext";

export default function CartPage() {
  const {
    items,
    removeFromCart,
    updateQuantity,
    clearCart,
    total,
  } = useCart();

  return (
    <main className="cart-page">
      <div className="cart-container">
        <Link href="/" className="cart-back">
          ← Continue Shopping
        </Link>

        <h1>🛒 Your Basket</h1>

        {items.length === 0 ? (
          <div className="empty-cart">
            <h2>Your basket is empty</h2>

            <p>
              Add some Funko Pops to your basket
              and they will appear here.
            </p>

            <Link
              href="/"
              className="primary-btn"
            >
              Shop Funko Pops
            </Link>
          </div>
        ) : (
          <>
            <div className="cart-items">
              {items.map((item) => (
                <div
                  className="cart-item"
                  key={item.id}
                >
                  <img
                    src={item.image}
                    alt={item.name}
                  />

                  <div className="cart-item-details">
                    <h2>{item.name}</h2>

                    <p className="cart-item-price">
                      £{item.price.toFixed(2)}
                    </p>

                    <div className="quantity-controls">
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(
                            item.id,
                            item.quantity - 1
                          )
                        }
                      >
                        −
                      </button>

                      <span>
                        {item.quantity}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(
                            item.id,
                            item.quantity + 1
                          )
                        }
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      className="remove-btn"
                      onClick={() =>
                        removeFromCart(item.id)
                      }
                    >
                      Remove
                    </button>
                  </div>

                  <div className="cart-item-total">
                    £
                    {(
                      item.price * item.quantity
                    ).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>

            <div className="cart-summary">
              <h2>
                Total: £{total.toFixed(2)}
              </h2>

              <div className="cart-summary-buttons">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={clearCart}
                >
                  Clear Basket
                </button>

                <Link
                  href="/checkout"
                  className="primary-btn"
                >
                  Checkout
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}