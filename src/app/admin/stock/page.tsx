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
  description: string | null;
};

const CATEGORY_LIST = [
  "Marvel",
  "Disney",
  "Rocks",
  "Sports",
  "Icons",
  "Ad Icons",
  "Animation",
  "Anime",
  "Movies",
  "TV",
  "Games",
  "Star Wars",
  "Clearance",
  "Clothing",
  "Loungefly",
];

export default function StockPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>(CATEGORY_LIST);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [editForm, setEditForm] = useState({
    name: "",
    price: "",
    description: "",
    category: "",
    badge: "",
  });

  async function loadProducts() {
    if (!supabase) {
      setMessage("Supabase is not configured.");
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from("products")
      .select(
        "id, name, image, price, stock, category, badge, description"
      )
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

  function loadCategories() {
    const categoryNames = new Set<string>(CATEGORY_LIST);

    products.forEach((product) => {
      if (product.category) {
        categoryNames.add(product.category);
      }
    });

    setCategories(
      Array.from(categoryNames).sort((a, b) =>
        a.localeCompare(b)
      )
    );
  }

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    loadCategories();
  }, [products]);

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
      setMessage(
        `Error saving ${product.name}: ${error.message}`
      );
      setSavingId(null);
      return;
    }

    setMessage(
      successMessage ||
        `✅ Stock updated for ${product.name}`
    );

    setSavingId(null);
  }

  async function markSold(product: Product) {
    if (product.stock <= 0) {
      setMessage(
        `❌ ${product.name} is already out of stock.`
      );
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

  function startEditing(product: Product) {
    setEditingId(product.id);

    setEditForm({
      name: product.name,
      price: String(product.price),
      description: product.description || "",
      category: product.category || "",
      badge: product.badge || "",
    });

    setMessage("");
  }

  function cancelEditing() {
    setEditingId(null);
    setMessage("");
  }

  async function saveProductDetails(product: Product) {
    if (!supabase) {
      setMessage("Supabase is not configured.");
      return;
    }

    if (!editForm.name.trim()) {
      setMessage("❌ Product name cannot be empty.");
      return;
    }

    const price = Number(editForm.price);

    if (!Number.isFinite(price) || price < 0) {
      setMessage("❌ Please enter a valid price.");
      return;
    }

    if (!editForm.category.trim()) {
      setMessage("❌ Please select a category.");
      return;
    }

    setSavingId(product.id);
    setMessage("");

    const newCategory = editForm.category.trim();

    const updateData = {
      name: editForm.name.trim(),
      price,
      description:
        editForm.description.trim() || null,
      category: newCategory,
      badge: editForm.badge.trim() || null,
    };

    console.log("Saving product category:", {
      productId: product.id,
      productName: product.name,
      oldCategory: product.category,
      newCategory,
    });

    const { data, error } = await supabase
      .from("products")
      .update(updateData)
      .eq("id", product.id)
      .select(
        "id, name, image, price, stock, category, badge, description"
      )
      .single();

    if (error) {
      console.error("CATEGORY UPDATE ERROR:", error);

      setMessage(
        `❌ Could not change category for ${product.name}: ${error.message}`
      );

      setSavingId(null);
      return;
    }

    if (!data) {
      setMessage(
        `❌ The product was not returned after saving.`
      );

      setSavingId(null);
      return;
    }

    setProducts((current) =>
      current.map((item) =>
        item.id === product.id ? data : item
      )
    );

    setMessage(
      `✅ ${data.name} updated successfully. Category is now: ${data.category}`
    );

    setSavingId(null);
    setEditingId(null);
  }

  async function deleteProduct(product: Product) {
    if (!supabase) return;

    const confirmed = window.confirm(
      `Are you sure you want to permanently delete "${product.name}"?`
    );

    if (!confirmed) return;

    setDeletingId(product.id);
    setMessage("");

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", product.id);

    if (error) {
      console.error(error);

      setMessage(
        `Error deleting ${product.name}: ${error.message}`
      );

      setDeletingId(null);
      return;
    }

    setProducts((current) =>
      current.filter((item) => item.id !== product.id)
    );

    setMessage(
      `🗑️ ${product.name} deleted successfully.`
    );

    setDeletingId(null);
  }

  const filteredProducts = products.filter((product) =>
    product.name
      .toLowerCase()
      .includes(search.toLowerCase())
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
                product.stock > 0 &&
                product.stock <= 2;

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
                      Category:{" "}
                      <strong
                        style={{
                          color: "#ffffff",
                        }}
                      >
                        {product.category ||
                          "Uncategorised"}
                      </strong>
                    </p>

                    <p
                      style={{
                        margin: 0,
                        fontWeight: "700",
                        color: "#facc15",
                      }}
                    >
                      £
                      {Number(product.price).toFixed(2)}
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

                  {editingId === product.id ? (
                    <div
                      style={{
                        flex: "1 1 100%",
                        display: "grid",
                        gap: "10px",
                        background: "#1e293b",
                        padding: "15px",
                        borderRadius: "12px",
                        border: "1px solid #475569",
                      }}
                    >
                      <strong
                        style={{
                          fontSize: "18px",
                        }}
                      >
                        ✏️ Edit Product
                      </strong>

                      <input
                        value={editForm.name}
                        onChange={(e) =>
                          setEditForm((current) => ({
                            ...current,
                            name: e.target.value,
                          }))
                        }
                        placeholder="Product name"
                        style={editInputStyle}
                      />

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editForm.price}
                        onChange={(e) =>
                          setEditForm((current) => ({
                            ...current,
                            price: e.target.value,
                          }))
                        }
                        placeholder="Price"
                        style={editInputStyle}
                      />

                      <label
                        style={{
                          fontWeight: "700",
                          color: "#facc15",
                          marginTop: "5px",
                        }}
                      >
                        Category
                      </label>

                      <select
                        value={editForm.category}
                        onChange={(e) => {
                          const newCategory =
                            e.target.value;

                          setEditForm((current) => ({
                            ...current,
                            category: newCategory,
                          }));

                          setMessage(
                            `Category selected: ${newCategory}`
                          );
                        }}
                        style={{
                          ...editInputStyle,
                          cursor: "pointer",
                          appearance: "auto",
                        }}
                      >
                        <option
                          value=""
                          style={{
                            background: "#0f172a",
                            color: "#ffffff",
                          }}
                        >
                          Select category
                        </option>

                        {categories.map((category) => (
                          <option
                            key={category}
                            value={category}
                            style={{
                              background: "#0f172a",
                              color: "#ffffff",
                            }}
                          >
                            {category}
                          </option>
                        ))}
                      </select>

                      <input
                        value={editForm.badge}
                        onChange={(e) =>
                          setEditForm((current) => ({
                            ...current,
                            badge: e.target.value,
                          }))
                        }
                        placeholder="Badge"
                        style={editInputStyle}
                      />

                      <textarea
                        value={editForm.description}
                        onChange={(e) =>
                          setEditForm((current) => ({
                            ...current,
                            description:
                              e.target.value,
                          }))
                        }
                        rows={4}
                        placeholder="Product description"
                        style={{
                          ...editInputStyle,
                          resize: "vertical",
                        }}
                      />

                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                          flexWrap: "wrap",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            saveProductDetails(product)
                          }
                          disabled={
                            savingId === product.id
                          }
                          style={
                            editSaveButtonStyle
                          }
                        >
                          {savingId === product.id
                            ? "Saving..."
                            : "💾 SAVE DETAILS"}
                        </button>

                        <button
                          type="button"
                          onClick={cancelEditing}
                          disabled={
                            savingId === product.id
                          }
                          style={
                            editCancelButtonStyle
                          }
                        >
                          CANCEL
                        </button>
                      </div>
                    </div>
                  ) : (
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
                          changeStock(
                            product.id,
                            -1
                          )
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
                          border:
                            "1px solid #475569",
                          background: "#1e293b",
                          color: "#ffffff",
                          fontSize: "18px",
                          fontWeight: "700",
                        }}
                      />

                      <button
                        type="button"
                        onClick={() =>
                          changeStock(
                            product.id,
                            1
                          )
                        }
                        style={stockButton}
                      >
                        +
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          saveStock(product)
                        }
                        disabled={
                          savingId === product.id
                        }
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
                        onClick={() =>
                          markSold(product)
                        }
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

                      <button
                        type="button"
                        onClick={() =>
                          deleteProduct(product)
                        }
                        disabled={
                          savingId === product.id ||
                          deletingId === product.id
                        }
                        style={{
                          background:
                            deletingId === product.id
                              ? "#64748b"
                              : "#ef4444",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: "8px",
                          padding: "11px 18px",
                          fontWeight: "800",
                          cursor:
                            savingId === product.id ||
                            deletingId === product.id
                              ? "not-allowed"
                              : "pointer",
                        }}
                      >
                        {deletingId === product.id
                          ? "Deleting..."
                          : "🗑️ DELETE"}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          startEditing(product)
                        }
                        disabled={
                          savingId === product.id ||
                          deletingId === product.id
                        }
                        style={{
                          background: "#3b82f6",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: "8px",
                          padding: "11px 18px",
                          fontWeight: "800",
                          cursor:
                            savingId === product.id ||
                            deletingId === product.id
                              ? "not-allowed"
                              : "pointer",
                        }}
                      >
                        ✏️ EDIT
                      </button>
                    </div>
                  )}

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

const editInputStyle = {
  width: "100%",
  padding: "12px",
  borderRadius: "8px",
  border: "1px solid #475569",
  background: "#0f172a",
  color: "#ffffff",
  fontSize: "16px",
  boxSizing: "border-box" as const,
};

const editSaveButtonStyle = {
  border: "none",
  borderRadius: "8px",
  padding: "11px 18px",
  background: "#facc15",
  color: "#111827",
  fontWeight: "800",
  cursor: "pointer",
};

const editCancelButtonStyle = {
  border: "none",
  borderRadius: "8px",
  padding: "11px 18px",
  background: "#475569",
  color: "#ffffff",
  fontWeight: "800",
  cursor: "pointer",
};