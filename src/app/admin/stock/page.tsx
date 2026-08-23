"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

type Product = {
  id: string;
  name: string;
  image: string;
  price: number;
  stock: number;
  category: string | null;
  badge: string | null;
};

export default function StockPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  async function loadProducts() {
    if (!supabase) {
      setMessage("Supabase is not configured.");
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from("products")
      .select("id, name, image, price, stock, category, badge")
      .order("name", { ascending: true });

    if (error) {
      console.error(error);
      setMessage(`Error loading products: ${error.message}`);
      setLoading(false);
      return;
    }

    setProducts(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadProducts();
  }, []);

  function changeStock(id: string, amount: number) {
    setProducts((current) =>
      current.map((product) =>
        product.id === id
          ? {
              ...product,
              stock: Math.max(0, product.stock + amount),
            }
          : product
      )
    );
  }

  function setStockValue(id: string, value: string) {
    const number = Math.max(0, Number(value) || 0);

    setProducts((current) =>
      current.map((product) =>
        product.id === id
          ? {
              ...product,
              stock: number,
            }
          : product
      )
    );
  }

  async function saveStock(
    product: Product,
    successMessage?: string
  ) {
    if (!supabase) return;

    setSavingId(product.id);
    setMessage("");

    const { error } = await supabase
      .from("products")
      .update({
        stock: product.stock,
      })
      .eq("id", product.id);

    if (error) {
      console.error(error);
      setMessage(`Error saving ${product.name}: ${error.message}`);
      setSavingId(null);
      return;
    }

    setMessage(
      successMessage || `✅ Stock updated for ${product.name}`
    );

    setSavingId(null);
  }

  async function markSold(product: Product) {
    if (product.stock <= 0) {
      setMessage(`❌ ${product.name} is already out of stock.`);
      return;
    }

    const updatedProduct = {
      ...product,
      stock: product.stock - 1,
    };

    setProducts((current) =>
      current.map((item) =>
        item.id === product.id ? updatedProduct : item
      )
    );

    await saveStock(
      updatedProduct,
      `✅ 1 x ${product.name} marked as sold`
    );
  }

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0f172a",
        color: "#ffffff",
        padding: "40px 20px",
      }}
    >
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
        }}
      >
        <h1
          style={{
            fontSize: "42px",
            marginBottom: "8px",
          }}
        >
          📦 Stock Manager
        </h1>

        <p
          style={{
            color: "#94a3b8",
            marginBottom: "30px",
          }}
        >
          Manage your Funko Pop stock quickly and easily.
        </p>

        <input
          type="text"
          placeholder="🔎 Search Funko Pops..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%",
            padding: "15px",
            borderRadius: "12px",
            border: "1px solid #334155",
            background: "#1e293b",
            color: "#ffffff",
            fontSize: "16px",
            boxSizing: "border-box",
            marginBottom: "25px",
          }}
        />

        {message && (
          <div
            style={{
              background: "#1e293b",
              border: "1px solid #334155",
              padding: "15px",
              borderRadius: "10px",
              marginBottom: "20px",
            }}
          >
            {message}
          </div>
        )}

        {loading ? (
          <p style={{ color: "#facc15" }}>
            Loading stock...
          </p>
        ) : filteredProducts.length === 0 ? (
          <div
            style={{
              background: "#111827",
              padding: "30px",
              borderRadius: "15px",
              textAlign: "center",
            }}
          >
            No products found.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: "15px",
            }}
          >
            {filteredProducts.map((product) => {
              const outOfStock = product.stock === 0;
              const lowStock =
                product.stock > 0 && product.stock <= 2;

              return (
                <div
                  key={product.id}
                  style={{
                    background: "#111827",
                    border: "1px solid #334155",
                    borderRadius: "16px",
                    padding: "18px",
                    display: "flex",
                    alignItems: "center",
                    gap: "20px",
                    flexWrap: "wrap",
                  }}
                >
                  <img
                    src={product.image}
                    alt={product.name}
                    style={{
                      width: "100px",
                      height: "100px",
                      objectFit: "contain",
                      background: "#ffffff",
                      borderRadius: "10px",
                      padding: "8px",
                      flexShrink: 0,
                    }}
                  />

                  <div
                    style={{
                      flex: "1 1 250px",
                      minWidth: "220px",
                    }}
                  >
                    <h2
                      style={{
                        fontSize: "20px",
                        margin: "0 0 6px",
                      }}
                    >
                      {product.name}
                    </h2>

                    <p
                      style={{
                        margin: "0 0 5px",
                        color: "#94a3b8",
                      }}
                    >
                      {product.category || "Uncategorised"}
                    </p>

                    <p
                      style={{
                        margin: 0,
                        fontWeight: "700",
                        color: "#facc15",
                      }}
                    >
                      £{Number(product.price).toFixed(2)}
                    </p>

                    {product.badge && (
                      <span
                        style={{
                          display: "inline-block",
                          marginTop: "8px",
                          padding: "4px 8px",
                          borderRadius: "6px",
                          background: "#334155",
                          fontSize: "12px",
                        }}
                      >
                        {product.badge}
                      </span>
                    )}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        changeStock(product.id, -1)
                      }
                      style={stockButton}
                    >
                      −
                    </button>

                    <input
                      type="number"
                      min="0"
                      value={product.stock}
                      onChange={(e) =>
                        setStockValue(
                          product.id,
                          e.target.value
                        )
                      }
                      style={{
                        width: "70px",
                        padding: "10px",
                        textAlign: "center",
                        borderRadius: "8px",
                        border: "1px solid #475569",
                        background: "#1e293b",
                        color: "#ffffff",
                        fontSize: "18px",
                        fontWeight: "700",
                      }}
                    />

                    <button
                      type="button"
                      onClick={() =>
                        changeStock(product.id, 1)
                      }
                      style={stockButton}
                    >
                      +
                    </button>

                    <button
                      type="button"
                      onClick={() => saveStock(product)}
                      disabled={savingId === product.id}
                      style={{
                        background:
                          savingId === product.id
                            ? "#64748b"
                            : "#facc15",
                        color: "#111827",
                        border: "none",
                        borderRadius: "8px",
                        padding: "11px 18px",
                        fontWeight: "800",
                        cursor:
                          savingId === product.id
                            ? "not-allowed"
                            : "pointer",
                      }}
                    >
                      {savingId === product.id
                        ? "Saving..."
                        : "Save"}
                    </button>

                    <button
                      type="button"
                      onClick={() => markSold(product)}
                      disabled={
                        savingId === product.id ||
                        product.stock === 0
                      }
                      style={{
                        background:
                          product.stock === 0
                            ? "#374151"
                            : "#22c55e",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "8px",
                        padding: "11px 18px",
                        fontWeight: "800",
                        cursor:
                          product.stock === 0
                            ? "not-allowed"
                            : "pointer",
                      }}
                    >
                      ✓ SOLD
                    </button>
                  </div>

                  <div
                    style={{
                      minWidth: "120px",
                      textAlign: "center",
                      fontWeight: "800",
                      color: outOfStock
                        ? "#ef4444"
                        : lowStock
                        ? "#facc15"
                        : "#22c55e",
                    }}
                  >
                    {outOfStock
                      ? "OUT OF STOCK"
                      : lowStock
                      ? "⚠️ LOW STOCK"
                      : "✓ IN STOCK"}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

const stockButton = {
  width: "42px",
  height: "42px",
  border: "none",
  borderRadius: "8px",
  background: "#334155",
  color: "#ffffff",
  fontSize: "24px",
  fontWeight: "700",
  cursor: "pointer",
};