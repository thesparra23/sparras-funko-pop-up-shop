"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const db = supabase!;

type Product = {
  id: string;
  name: string;
  image: string | null;
  price: number;
  stock: number;
  category: string | null;
  badge: string | null;
  description: string | null;
  is_chase: boolean;
  is_vaulted: boolean;
  is_exclusive: boolean;
  is_offer: boolean;
};

const categories = [
  "Marvel",
  "DC",
  "Star Wars",
  "Anime",
  "Movies",
  "Television",
  "Games",
  "Disney",
  "Disney Funko",
  "Icons",
  "Sports",
  "Rocks",
  "Ad Icons",
  "Animation",
];

export default function ManageProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [listingProductId, setListingProductId] = useState<string | null>(null);
  const [ebayListings, setEbayListings] = useState<Record<string, string>>({});

  async function loadEbayStatuses(productList: Product[]) {
    if (productList.length === 0) {
      setEbayListings({});
      return;
    }

    try {
      const response = await fetch("/api/ebay/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: productList.map((product) => product.id) }),
        cache: "no-store",
      });

      if (!response.ok) return;

      const data = await response.json();
      setEbayListings(data?.listings || {});
    } catch {
      // Listing status is helpful but should never stop the admin page loading.
    }
  }

  async function loadProducts() {
    setLoading(true);

    const { data, error } = await db
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(`Error loading products: ${error.message}`);
    } else {
      const loadedProducts = (data || []) as Product[];
      setProducts(loadedProducts);
      await loadEbayStatuses(loadedProducts);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadProducts();
  }, []);

  async function deleteProduct(id: string) {
    const product = products.find((p) => p.id === id);
    if (!product) return;

    const confirmed = window.confirm(
      `Delete "${product.name}"?\n\nThis cannot be undone.`
    );

    if (!confirmed) return;

    const { error } = await db.from("products").delete().eq("id", id);

    if (error) {
      setMessage(`Error deleting product: ${error.message}`);
      return;
    }

    setProducts((current) => current.filter((item) => item.id !== id));
    setEbayListings((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    setMessage("Product deleted successfully.");
  }

  function openEbayListing(listingId: string) {
    window.open(
      `https://www.ebay.co.uk/itm/${listingId}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  async function listOnEbay(product: Product) {
    if (listingProductId) return;

    const existingListingId = ebayListings[product.id];

    if (existingListingId) {
      openEbayListing(existingListingId);
      return;
    }

    if (!product.image) {
      setMessage("❌ This product needs an image before it can be listed on eBay.");
      return;
    }

    const confirmed = window.confirm(
      `List "${product.name}" on eBay for £${Number(product.price).toFixed(2)}?\n\nStock: ${product.stock}`
    );

    if (!confirmed) return;

    setListingProductId(product.id);
    setMessage(`⏳ Listing "${product.name}" on eBay...`);

    try {
      const response = await fetch("/api/ebay/list", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ productId: product.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        const detail =
          data?.details?.errors?.[0]?.longMessage ||
          data?.details?.errors?.[0]?.message ||
          data?.error ||
          "eBay could not publish this listing.";

        setMessage(`❌ ${detail}`);
        return;
      }

      if (data.listingId) {
        setEbayListings((current) => ({
          ...current,
          [product.id]: String(data.listingId),
        }));
      }

      setMessage(`✅ ${data.message || "Listed on eBay successfully."}`);

      if (data.listingId) {
        openEbayListing(String(data.listingId));
      }
    } catch (error) {
      setMessage(
        `❌ ${error instanceof Error ? error.message : "Unexpected eBay error."}`
      );
    } finally {
      setListingProductId(null);
    }
  }

  async function saveProduct() {
    if (!editingProduct) return;

    setSaving(true);
    setMessage("");

    const { error } = await db
      .from("products")
      .update({
        name: editingProduct.name,
        image: editingProduct.image,
        price: Number(editingProduct.price),
        stock: Number(editingProduct.stock),
        category: editingProduct.category,
        badge: editingProduct.badge || null,
        description: editingProduct.description || null,
        is_chase: editingProduct.is_chase,
        is_vaulted: editingProduct.is_vaulted,
        is_exclusive: editingProduct.is_exclusive,
        is_offer: editingProduct.is_offer,
      })
      .eq("id", editingProduct.id);

    if (error) {
      setMessage(`Error updating product: ${error.message}`);
      setSaving(false);
      return;
    }

    setProducts((current) =>
      current.map((product) =>
        product.id === editingProduct.id ? editingProduct : product
      )
    );

    setEditingProduct(null);
    setMessage("✅ Product updated successfully!");
    setSaving(false);
  }

  async function handleImageUpload(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    if (!editingProduct) return;

    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage("");

    const extension = file.name.split(".").pop()?.toLowerCase() || "png";
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${extension}`;
    const filePath = `products/${fileName}`;

    const { error } = await db.storage
      .from("product-images")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      setMessage(`Image upload error: ${error.message}`);
      setUploading(false);
      return;
    }

    const { data } = db.storage.from("product-images").getPublicUrl(filePath);

    setEditingProduct({
      ...editingProduct,
      image: data.publicUrl,
    });

    setMessage("✅ New image uploaded successfully!");
    setUploading(false);
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
        <h1>Manage Products</h1>
        <p>Loading products...</p>
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
            <h1 style={{ fontSize: "42px", margin: 0 }}>📦 Manage Funko Pops</h1>
            <p style={{ color: "#94a3b8", fontSize: "18px", marginTop: "10px" }}>
              Edit, update or remove your products.
            </p>
          </div>

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

        {products.length === 0 ? (
          <div
            style={{
              background: "#1e293b",
              padding: "40px",
              borderRadius: "12px",
              textAlign: "center",
            }}
          >
            <h2>No products found</h2>
            <p style={{ color: "#94a3b8" }}>Add your first Funko Pop.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "18px" }}>
            {products.map((product) => {
              const listingId = ebayListings[product.id];

              return (
                <div
                  key={product.id}
                  style={{
                    background: "#1e293b",
                    border: "1px solid #334155",
                    borderRadius: "12px",
                    padding: "18px",
                    display: "grid",
                    gridTemplateColumns: "110px 1fr auto",
                    gap: "20px",
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      width: "110px",
                      height: "110px",
                      background: "#0f172a",
                      borderRadius: "8px",
                      overflow: "hidden",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        style={{ width: "100%", height: "100%", objectFit: "contain" }}
                      />
                    ) : (
                      <span>No image</span>
                    )}
                  </div>

                  <div>
                    <h2 style={{ margin: "0 0 8px", fontSize: "22px" }}>
                      {product.name}
                    </h2>

                    <div style={{ color: "#94a3b8", marginBottom: "12px" }}>
                      Category: {product.category || "None"}
                    </div>

                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                      {product.is_chase && <span>🎯 Chase</span>}
                      {product.is_vaulted && <span>🔒 Vaulted</span>}
                      {product.is_exclusive && <span>⭐ Exclusive</span>}
                      {product.is_offer && <span>🔥 Offer</span>}
                    </div>

                    <div style={{ marginTop: "12px", color: "#ffffff" }}>
                      <strong>£{Number(product.price).toFixed(2)}</strong> • Stock: {product.stock}
                    </div>

                    {listingId && (
                      <div style={{ marginTop: "10px", color: "#86efac", fontWeight: "700" }}>
                        ✅ Listed on eBay
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                      minWidth: "150px",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => listOnEbay(product)}
                      disabled={listingProductId !== null}
                      style={{
                        background:
                          listingProductId === product.id
                            ? "#64748b"
                            : listingId
                              ? "#22c55e"
                              : "#facc15",
                        color: listingId ? "#ffffff" : "#111827",
                        border: "none",
                        padding: "12px 18px",
                        borderRadius: "8px",
                        cursor: listingProductId !== null ? "not-allowed" : "pointer",
                        fontWeight: "700",
                      }}
                    >
                      {listingProductId === product.id
                        ? "⏳ Listing..."
                        : listingId
                          ? "🔗 View on eBay"
                          : "🛒 List on eBay"}
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditingProduct({ ...product })}
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
                      ✏️ Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteProduct(product.id)}
                      style={{
                        background: "#dc2626",
                        color: "#ffffff",
                        border: "none",
                        padding: "12px 18px",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontWeight: "700",
                      }}
                    >
                      🗑 Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {editingProduct && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
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
              border: "1px solid #334155",
              borderRadius: "18px",
              padding: "30px",
              maxHeight: "calc(100vh - 40px)",
              overflowY: "auto",
            }}
          >
            <h2 style={{ fontSize: "30px", marginTop: 0 }}>✏️ Edit Product</h2>

            <div style={{ display: "grid", gap: "18px" }}>
              <label>
                Product Name
                <input
                  value={editingProduct.name}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, name: e.target.value })
                  }
                  style={inputStyle}
                />
              </label>

              <label>
                Product Image
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  style={{ ...inputStyle, padding: "10px" }}
                />
              </label>

              {editingProduct.image && (
                <img
                  src={editingProduct.image}
                  alt={editingProduct.name}
                  style={{
                    width: "180px",
                    height: "180px",
                    objectFit: "contain",
                    background: "#ffffff",
                    borderRadius: "12px",
                    padding: "10px",
                  }}
                />
              )}

              {uploading && <p style={{ color: "#facc15" }}>Uploading image...</p>}

              <label>
                Price (£)
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editingProduct.price}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      price: Number(e.target.value),
                    })
                  }
                  style={inputStyle}
                />
              </label>

              <label>
                Stock
                <input
                  type="number"
                  min="0"
                  value={editingProduct.stock}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      stock: Number(e.target.value),
                    })
                  }
                  style={inputStyle}
                />
              </label>

              <label>
                Category
                <select
                  value={editingProduct.category || "Marvel"}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      category: e.target.value,
                    })
                  }
                  style={inputStyle}
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Badge
                <input
                  value={editingProduct.badge || ""}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      badge: e.target.value,
                    })
                  }
                  placeholder="Latest Arrival"
                  style={inputStyle}
                />
              </label>

              <label>
                Description
                <textarea
                  value={editingProduct.description || ""}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      description: e.target.value,
                    })
                  }
                  rows={4}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </label>

              <div style={{ display: "grid", gap: "12px" }}>
                <label>
                  <input
                    type="checkbox"
                    checked={editingProduct.is_chase}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        is_chase: e.target.checked,
                      })
                    }
                  /> {" "}
                  🎯 Chase
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={editingProduct.is_vaulted}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        is_vaulted: e.target.checked,
                      })
                    }
                  /> {" "}
                  🔒 Vaulted
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={editingProduct.is_exclusive}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        is_exclusive: e.target.checked,
                      })
                    }
                  /> {" "}
                  ⭐ Exclusive
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={editingProduct.is_offer}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        is_offer: e.target.checked,
                      })
                    }
                  /> {" "}
                  🔥 Offer
                </label>
              </div>

              <div style={{ display: "flex", gap: "12px", marginTop: "10px" }}>
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  style={{
                    flex: 1,
                    padding: "14px",
                    border: "none",
                    borderRadius: "10px",
                    background: "#475569",
                    color: "#ffffff",
                    fontWeight: "700",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={saving || uploading}
                  onClick={saveProduct}
                  style={{
                    flex: 1,
                    padding: "14px",
                    border: "none",
                    borderRadius: "10px",
                    background: saving || uploading ? "#64748b" : "#facc15",
                    color: "#111827",
                    fontWeight: "700",
                    cursor: saving || uploading ? "not-allowed" : "pointer",
                  }}
                >
                  {saving ? "Saving..." : "💾 Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

const inputStyle = {
  display: "block",
  width: "100%",
  marginTop: "8px",
  padding: "13px",
  borderRadius: "10px",
  border: "1px solid #334155",
  background: "#1e293b",
  color: "#ffffff",
  fontSize: "16px",
  boxSizing: "border-box" as const,
};
