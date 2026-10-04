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
  "Marvel", "DC", "Star Wars", "Anime", "Movies", "Television", "Games", "Disney", "Disney Funko", "Icons", "Sports", "Rocks", "Ad Icons", "Animation",
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
  const [bulkListing, setBulkListing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const [searchTerm, setSearchTerm] = useState("");

  async function loadEbayStatuses(productList: Product[]) {
    if (productList.length === 0) { setEbayListings({}); return; }
    try {
      const response = await fetch("/api/ebay/status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productIds: productList.map((product) => product.id) }), cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      setEbayListings(data?.listings || {});
    } catch {}
  }

  async function loadProducts() {
    setLoading(true);
    const { data, error } = await db.from("products").select("*").order("created_at", { ascending: false });
    if (error) setMessage(`Error loading products: ${error.message}`);
    else { const loadedProducts = (data || []) as Product[]; setProducts(loadedProducts); await loadEbayStatuses(loadedProducts); }
    setLoading(false);
  }

  useEffect(() => { loadProducts(); }, []);

  async function deleteProduct(id: string) {
    const product = products.find((p) => p.id === id); if (!product) return;
    if (!window.confirm(`Delete "${product.name}"?\n\nThis cannot be undone.`)) return;
    const { error } = await db.from("products").delete().eq("id", id);
    if (error) { setMessage(`Error deleting product: ${error.message}`); return; }
    setProducts((current) => current.filter((item) => item.id !== id));
    setEbayListings((current) => { const next = { ...current }; delete next[id]; return next; });
    setMessage("Product deleted successfully.");
  }

  function openEbayListing(listingId: string) { window.open(`https://www.ebay.co.uk/itm/${listingId}`, "_blank", "noopener,noreferrer"); }

  async function listOnEbay(product: Product, openListing = true) {
    if (listingProductId || bulkListing) return false;
    const existingListingId = ebayListings[product.id];
    if (existingListingId) { if (openListing) openEbayListing(existingListingId); return true; }
    if (!product.image) { setMessage(`❌ ${product.name} needs an image before it can be listed on eBay.`); return false; }
    if (Number(product.stock) <= 0) { setMessage(`❌ ${product.name} has no stock, so it cannot be listed on eBay.`); return false; }
    if (openListing && !window.confirm(`List "${product.name}" on eBay for £${Number(product.price).toFixed(2)}?\n\nStock: ${product.stock}`)) return false;
    setListingProductId(product.id); if (openListing) setMessage(`⏳ Listing "${product.name}" on eBay...`);
    try {
      const response = await fetch("/api/ebay/list", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId: product.id }), cache: "no-store" });
      const data = await response.json();
      if (!response.ok) { const detail = data?.details?.errors?.[0]?.longMessage || data?.details?.errors?.[0]?.message || data?.error || "eBay could not publish this listing."; setMessage(`❌ ${detail}`); return false; }
      if (data.listingId) setEbayListings((current) => ({ ...current, [product.id]: String(data.listingId) }));
      if (openListing) { setMessage(`✅ ${data.message || "Listed on eBay successfully."}`); if (data.listingId) openEbayListing(String(data.listingId)); }
      return true;
    } catch (error) { setMessage(`❌ ${error instanceof Error ? error.message : "Unexpected eBay error."}`); return false; }
    finally { setListingProductId(null); }
  }

  async function listProductForBulk(product: Product) {
    try {
      const response = await fetch("/api/ebay/list", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId: product.id }), cache: "no-store" });
      const data = await response.json(); if (!response.ok) return false;
      if (data.listingId) setEbayListings((current) => ({ ...current, [product.id]: String(data.listingId) }));
      return true;
    } catch { return false; }
  }

  async function listAllUnlistedOnEbay() {
    if (bulkListing || listingProductId) return;
    const unlisted = products.filter((product) => !ebayListings[product.id] && product.image && Number(product.stock) > 0);
    if (unlisted.length === 0) { setMessage("✅ All products with stock and images are already listed on eBay."); return; }
    const noImage = products.filter((product) => !ebayListings[product.id] && !product.image && Number(product.stock) > 0).length;
    const noStock = products.filter((product) => !ebayListings[product.id] && product.image && Number(product.stock) <= 0).length;
    const skipped = [noImage ? `${noImage} without an image` : "", noStock ? `${noStock} with no stock` : ""].filter(Boolean);
    if (!window.confirm(`This will list ${unlisted.length} unlisted product${unlisted.length === 1 ? "" : "s"} on eBay.\n\n${skipped.length ? `${skipped.join(" and ")} will be skipped.\n\n` : ""}The website will process them one at a time.\n\nContinue?`)) return;
    setBulkListing(true); setBulkProgress({ current: 0, total: unlisted.length });
    let listed = 0; let failed = 0;
    for (let index = 0; index < unlisted.length; index += 1) {
      const product = unlisted[index]; setBulkProgress({ current: index + 1, total: unlisted.length }); setMessage(`⏳ Listing ${index + 1} of ${unlisted.length}: ${product.name}`);
      if (await listProductForBulk(product)) listed += 1; else failed += 1;
    }
    setBulkListing(false); setMessage(failed === 0 ? `✅ Finished. ${listed} product${listed === 1 ? " is" : "s are"} now listed on eBay.` : `⚠️ Finished. ${listed} listed successfully and ${failed} failed. Check the product list for the failed items.`);
  }

  async function saveProduct() {
    if (!editingProduct) return; setSaving(true); setMessage("");
    const { error } = await db.from("products").update({ name: editingProduct.name, image: editingProduct.image, price: Number(editingProduct.price), stock: Number(editingProduct.stock), category: editingProduct.category, badge: editingProduct.badge || null, description: editingProduct.description || null, is_chase: editingProduct.is_chase, is_vaulted: editingProduct.is_vaulted, is_exclusive: editingProduct.is_exclusive, is_offer: editingProduct.is_offer }).eq("id", editingProduct.id);
    if (error) { setMessage(`Error updating product: ${error.message}`); setSaving(false); return; }
    setProducts((current) => current.map((product) => product.id === editingProduct.id ? editingProduct : product));
    setEditingProduct(null); setMessage("✅ Product updated successfully!"); setSaving(false);
  }

  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    if (!editingProduct) return; const file = event.target.files?.[0]; if (!file) return; setUploading(true); setMessage("");
    const extension = file.name.split(".").pop()?.toLowerCase() || "png"; const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${extension}`; const filePath = `products/${fileName}`;
    const { error } = await db.storage.from("product-images").upload(filePath, file, { cacheControl: "3600", upsert: false });
    if (error) { setMessage(`Image upload error: ${error.message}`); setUploading(false); return; }
    const { data } = db.storage.from("product-images").getPublicUrl(filePath); setEditingProduct({ ...editingProduct, image: data.publicUrl }); setMessage("✅ New image uploaded successfully!"); setUploading(false);
  }

  if (loading) return <main style={{ minHeight: "100vh", background: "#0f172a", color: "#ffffff", padding: "60px 30px" }}><h1>Manage Products</h1><p>Loading products...</p></main>;

  const unlistedCount = products.filter((product) => !ebayListings[product.id] && product.image && Number(product.stock) > 0).length;
  const search = searchTerm.trim().toLowerCase();
  const filteredProducts = products.filter((product) => !search || [product.name, product.id, product.category, product.badge, product.description].some((value) => String(value ?? "").toLowerCase().includes(search)));

  return (
    <main style={{ minHeight: "100vh", background: "#0f172a", color: "#ffffff", padding: "40px 30px 80px" }}>
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "20px", marginBottom: "20px", flexWrap: "wrap" }}>
          <div><h1 style={{ fontSize: "42px", margin: 0 }}>📦 Manage Funko Pops</h1><p style={{ color: "#94a3b8", fontSize: "18px", marginTop: "10px" }}>Edit, update or remove your products.</p></div>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}><a href="/admin" style={{ background: "#facc15", color: "#111827", padding: "12px 20px", borderRadius: "8px", textDecoration: "none", fontWeight: "700" }}>+ Add Product</a>{unlistedCount > 0 && <button type="button" onClick={listAllUnlistedOnEbay} disabled={bulkListing || listingProductId !== null} style={{ background: bulkListing ? "#64748b" : "#22c55e", color: "#ffffff", border: "none", padding: "12px 20px", borderRadius: "8px", fontWeight: "800", cursor: bulkListing ? "not-allowed" : "pointer" }}>{bulkListing ? `⏳ Listing ${bulkProgress.current}/${bulkProgress.total}...` : `🚀 List All ${unlistedCount} on eBay`}</button>}</div>
        </div>

        {message && <div style={{ background: "#1e293b", border: "1px solid #334155", padding: "14px 18px", borderRadius: "8px", marginBottom: "20px" }}>{message}</div>}
        {bulkListing && <div style={{ background: "#1e293b", border: "1px solid #334155", padding: "16px 18px", borderRadius: "8px", marginBottom: "20px" }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", color: "#cbd5e1" }}><span>eBay listing progress</span><strong>{bulkProgress.current} / {bulkProgress.total}</strong></div><div style={{ width: "100%", height: "10px", background: "#0f172a", borderRadius: "999px", overflow: "hidden" }}><div style={{ width: `${bulkProgress.total ? (bulkProgress.current / bulkProgress.total) * 100 : 0}%`, height: "100%", background: "#22c55e", transition: "width 0.2s" }} /></div></div>}

        {products.length > 0 && <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "12px", padding: "18px", marginBottom: "20px" }}><div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}><input type="search" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="🔎 Find a product by name, Pop number, category..." style={{ flex: 1, minWidth: "280px", padding: "14px 16px", borderRadius: "10px", border: "1px solid #475569", background: "#0f172a", color: "#ffffff", fontSize: "17px", boxSizing: "border-box" }} />{searchTerm && <button type="button" onClick={() => setSearchTerm("")} style={{ padding: "14px 18px", border: "none", borderRadius: "10px", background: "#475569", color: "#ffffff", fontWeight: "700", cursor: "pointer" }}>Clear</button>}</div><div style={{ marginTop: "10px", color: "#94a3b8", fontSize: "14px" }}>{search ? `${filteredProducts.length} product${filteredProducts.length === 1 ? "" : "s"} found` : `${products.length} products`}</div></div>}

        {products.length === 0 ? <div style={{ background: "#1e293b", padding: "40px", borderRadius: "12px", textAlign: "center" }}><h2>No products found</h2><p style={{ color: "#94a3b8" }}>Add your first Funko Pop.</p></div> : filteredProducts.length === 0 ? <div style={{ background: "#1e293b", padding: "40px", borderRadius: "12px", textAlign: "center" }}><h2>No matching products</h2><p style={{ color: "#94a3b8" }}>Nothing matched &quot;{searchTerm}&quot;.</p></div> : <div style={{ display: "grid", gap: "18px" }}>{filteredProducts.map((product) => { const listingId = ebayListings[product.id]; return <div key={product.id} style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "12px", padding: "18px", display: "grid", gridTemplateColumns: "110px 1fr auto", gap: "20px", alignItems: "center" }}><div style={{ width: "110px", height: "110px", background: "#0f172a", borderRadius: "8px", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>{product.image ? <img src={product.image} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <span>No image</span>}</div><div><h2 style={{ margin: "0 0 8px", fontSize: "22px" }}>{product.name}</h2><div style={{ color: "#94a3b8", marginBottom: "12px" }}>Category: {product.category || "None"}</div><div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>{product.is_chase && <span>🎯 Chase</span>}{product.is_vaulted && <span>🔒 Limited Edition</span>}{product.is_exclusive && <span>⭐ Exclusive</span>}{product.is_offer && <span>🔥 Special Edition</span>}</div><div style={{ marginTop: "12px", color: "#ffffff" }}><strong>£{Number(product.price).toFixed(2)}</strong> • Stock: {product.stock}</div>{listingId && <div style={{ marginTop: "10px", color: "#86efac", fontWeight: "700" }}>✅ Listed on eBay</div>}</div><div style={{ display: "flex", flexDirection: "column", gap: "10px", minWidth: "150px" }}><button type="button" onClick={() => listOnEbay(product)} disabled={listingProductId !== null || bulkListing} style={{ background: listingProductId === product.id ? "#64748b" : listingId ? "#22c55e" : "#facc15", color: listingId ? "#ffffff" : "#111827", border: "none", padding: "12px 18px", borderRadius: "8px", cursor: listingProductId !== null || bulkListing ? "not-allowed" : "pointer", fontWeight: "700" }}>{listingProductId === product.id ? "⏳ Listing..." : listingId ? "🔗 View on eBay" : "🛒 List on eBay"}</button><button type="button" onClick={() => setEditingProduct({ ...product })} disabled={bulkListing} style={{ background: "#2563eb", color: "#ffffff", border: "none", padding: "12px 18px", borderRadius: "8px", cursor: bulkListing ? "not-allowed" : "pointer", fontWeight: "700" }}>✏️ Edit</button><button type="button" onClick={() => deleteProduct(product.id)} disabled={bulkListing} style={{ background: "#dc2626", color: "#ffffff", border: "none", padding: "12px 18px", borderRadius: "8px", cursor: bulkListing ? "not-allowed" : "pointer", fontWeight: "700" }}>🗑 Delete</button></div></div>; })}</div>}
      </div>

      {editingProduct && <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "20px", zIndex: 2000, overflowY: "auto" }}><div style={{ width: "100%", maxWidth: "700px", background: "#111827", border: "1px solid #334155", borderRadius: "18px", padding: "30px", maxHeight: "calc(100vh - 40px)", overflowY: "auto" }}><h2 style={{ fontSize: "30px", marginTop: 0 }}>✏️ Edit Product</h2><div style={{ display: "grid", gap: "18px" }}><label>Product Name<input value={editingProduct.name} onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })} style={inputStyle} /></label><label>Product Image<input type="file" accept="image/*" onChange={handleImageUpload} style={{ ...inputStyle, padding: "10px" }} /></label>{editingProduct.image && <img src={editingProduct.image} alt={editingProduct.name} style={{ width: "180px", height: "180px", objectFit: "contain", background: "#ffffff", borderRadius: "12px", padding: "10px" }} />}{uploading && <p style={{ color: "#facc15" }}>Uploading image...</p>}<label>Price (£)<input type="number" step="0.01" min="0" value={editingProduct.price} onChange={(e) => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })} style={inputStyle} /></label><label>Stock<input type="number" min="0" value={editingProduct.stock} onChange={(e) => setEditingProduct({ ...editingProduct, stock: Number(e.target.value) })} style={inputStyle} /></label><label>Category<select value={editingProduct.category || "Marvel"} onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })} style={inputStyle}>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label><label>Badge<input value={editingProduct.badge || ""} onChange={(e) => setEditingProduct({ ...editingProduct, badge: e.target.value })} placeholder="Latest Arrival" style={inputStyle} /></label><label>Description<textarea value={editingProduct.description || ""} onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })} rows={4} style={{ ...inputStyle, resize: "vertical" }} /></label><div style={{ display: "grid", gap: "12px" }}><label><input type="checkbox" checked={editingProduct.is_chase} onChange={(e) => setEditingProduct({ ...editingProduct, is_chase: e.target.checked })} /> 🎯 Chase</label><label><input type="checkbox" checked={editingProduct.is_vaulted} onChange={(e) => setEditingProduct({ ...editingProduct, is_vaulted: e.target.checked })} /> 🔒 Limited Edition</label><label><input type="checkbox" checked={editingProduct.is_exclusive} onChange={(e) => setEditingProduct({ ...editingProduct, is_exclusive: e.target.checked })} /> ⭐ Exclusive</label><label><input type="checkbox" checked={editingProduct.is_offer} onChange={(e) => setEditingProduct({ ...editingProduct, is_offer: e.target.checked })} /> 🔥 Special Edition</label></div><div style={{ display: "flex", gap: "12px", marginTop: "10px" }}><button type="button" onClick={() => setEditingProduct(null)} style={{ flex: 1, padding: "14px", border: "none", borderRadius: "10px", background: "#475569", color: "#ffffff", fontWeight: "700", cursor: "pointer" }}>Cancel</button><button type="button" disabled={saving || uploading} onClick={saveProduct} style={{ flex: 1, padding: "14px", border: "none", borderRadius: "10px", background: saving || uploading ? "#64748b" : "#facc15", color: "#111827", fontWeight: "700", cursor: saving || uploading ? "not-allowed" : "pointer" }}>{saving ? "Saving..." : "💾 Save Changes"}</button></div></div></div></div>}
    </main>
  );
}

const inputStyle = { display: "block", width: "100%", marginTop: "8px", padding: "13px", borderRadius: "10px", border: "1px solid #334155", background: "#1e293b", color: "#ffffff", fontSize: "16px", boxSizing: "border-box" as const };
