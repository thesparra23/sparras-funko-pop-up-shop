"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase/client";

type Category = {
  id: number;
  name: string;
  slug: string;
};

const supabase = createClient();

export default function AdminPage() {
  const [name, setName] = useState("");
  const [images, setImages] = useState<string[]>(Array(6).fill(""));
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("1");
  const [productNumber, setProductNumber] = useState("");
  const [category, setCategory] = useState("Marvel");
  const [badge, setBadge] = useState("");
  const [description, setDescription] = useState("Condition as shown in photos.");
  const [isChase, setIsChase] = useState(false);
  const [isVaulted, setIsVaulted] = useState(false);
  const [isExclusive, setIsExclusive] = useState(false);
  const [isOffer, setIsOffer] = useState(false);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [categoryMessage, setCategoryMessage] = useState("");
  const [categorySaving, setCategorySaving] = useState(false);

  async function loadCategories() {
    if (!supabase) {
      setCategoryMessage("Supabase is not configured.");
      return;
    }
    const { data, error } = await supabase.from("categories").select("id, name, slug").order("name");
    if (error) {
      setCategoryMessage(`Error loading categories: ${error.message}`);
      return;
    }
    setCategories(data || []);
  }

  useEffect(() => {
    loadCategories();
  }, []);

  async function addCategory() {
    const trimmed = newCategory.trim();
    if (!trimmed) return;
    if (!supabase) {
      setCategoryMessage("Supabase is not configured.");
      return;
    }
    setCategorySaving(true);
    setCategoryMessage("");
    const slug = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const { error } = await supabase.from("categories").insert({ name: trimmed, slug });
    if (error) {
      setCategoryMessage(`Error adding category: ${error.message}`);
      setCategorySaving(false);
      return;
    }
    setNewCategory("");
    setCategoryMessage("Category added successfully.");
    await loadCategories();
    setCategorySaving(false);
  }

  async function uploadImage(event: React.ChangeEvent<HTMLInputElement>, index: number) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!supabase) {
      setMessage("Supabase is not configured.");
      return;
    }
    setUploading(true);
    setMessage("");
    const extension = file.name.split(".").pop()?.toLowerCase() || "png";
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${extension}`;
    const filePath = `products/${fileName}`;
    const { error } = await supabase.storage.from("product-images").upload(filePath, file, { cacheControl: "3600", upsert: false });
    if (error) {
      setMessage(`Image upload error: ${error.message}`);
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("product-images").getPublicUrl(filePath);
    setImages((current) => {
      const updated = [...current];
      updated[index] = data.publicUrl;
      return updated;
    });
    setMessage("Image uploaded successfully.");
    setUploading(false);
  }

  async function saveProduct() {
    if (!supabase) {
      setMessage("Supabase is not configured.");
      return;
    }
    if (!name.trim()) {
      setMessage("Please enter a product name.");
      return;
    }
    if (!images[0]) {
      setMessage("Please upload the main product image before saving.");
      return;
    }

    setSaving(true);
    setMessage("Saving product...");

    const { data: insertedProduct, error } = await supabase
      .from("products")
      .insert({
        name: name.trim(),
        image: images[0] || null,
        image_2: images[1] || null,
        image_3: images[2] || null,
        image_4: images[3] || null,
        image_5: images[4] || null,
        image_6: images[5] || null,
        price: Number(price) || 0,
        stock: Number(stock) || 0,
        product_number: productNumber.trim() || null,
        category,
        badge: badge.trim() || null,
        description: description.trim() || null,
        is_chase: isChase,
        is_vaulted: isVaulted,
        is_exclusive: isExclusive,
        is_offer: isOffer,
      })
      .select("id")
      .single();

    if (error) {
      setMessage(`Error saving product: ${error.message}`);
      setSaving(false);
      return;
    }

    if (!insertedProduct?.id) {
      setMessage("Product was saved, but no product ID was returned. It was not sent to eBay.");
      setSaving(false);
      return;
    }

    setMessage("Product saved. Listing it on eBay...");

    try {
      const ebayResponse = await fetch("/api/ebay/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: insertedProduct.id }),
        cache: "no-store",
      });
      const ebayData = await ebayResponse.json();

      if (!ebayResponse.ok) {
        setMessage(`Product saved successfully, but eBay listing failed: ${ebayData?.error || "Unknown eBay error."}`);
      } else if (ebayData?.alreadyListed) {
        setMessage(`Product saved successfully. ${ebayData.message || "It is already listed on eBay."}`);
      } else {
        setMessage(ebayData?.listingId ? `✅ Product saved and listed on eBay successfully. Listing ID: ${ebayData.listingId}` : "✅ Product saved and listed on eBay successfully.");
      }
    } catch (error) {
      setMessage(`Product saved successfully, but eBay could not be contacted: ${error instanceof Error ? error.message : "Unknown error."}`);
    }

    setName("");
    setImages(Array(6).fill(""));
    setPrice("");
    setStock("1");
    setProductNumber("");
    setBadge("");
    setDescription("Condition as shown in photos.");
    setIsChase(false);
    setIsVaulted(false);
    setIsExclusive(false);
    setIsOffer(false);
    setSaving(false);
  }

  return (
    <main style={{ minHeight: "100vh", background: "#0f172a", color: "#ffffff", padding: "40px 20px 80px" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "20px", flexWrap: "wrap", marginBottom: "30px" }}>
          <div>
            <h1 style={{ fontSize: "42px", margin: 0 }}>Add Funko Pop</h1>
            <p style={{ color: "#94a3b8", fontSize: "18px" }}>Add products to your shop.</p>
          </div>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <a href="/admin/manage" style={{ background: "#2563eb", color: "#ffffff", padding: "12px 18px", borderRadius: "8px", textDecoration: "none", fontWeight: "700" }}>Manage Products</a>
            <a href="/admin/orders" style={{ background: "#334155", color: "#ffffff", padding: "12px 18px", borderRadius: "8px", textDecoration: "none", fontWeight: "700" }}>Orders</a>
            <a href="/api/ebay/connect" style={{ background: "#facc15", color: "#111827", padding: "12px 18px", borderRadius: "8px", textDecoration: "none", fontWeight: "800" }}>🔗 Connect eBay</a>
          </div>
        </div>

        {message && <div style={{ background: "#1e293b", border: "1px solid #334155", padding: "14px 18px", borderRadius: "8px", marginBottom: "20px" }}>{message}</div>}

        <section style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "14px", padding: "25px", marginBottom: "25px" }}>
          <h2>Product Details</h2>
          <div style={{ display: "grid", gap: "18px" }}>
            <label>Product Name<input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} /></label>
            <label>Price (£)<input type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} style={inputStyle} /></label>
            <label>Stock<input type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} style={inputStyle} /></label>
            <label>Product Number<input value={productNumber} onChange={(e) => setProductNumber(e.target.value)} style={inputStyle} /></label>
            <label>Category
              <select value={category} onChange={(e) => setCategory(e.target.value)} style={inputStyle}>
                {(categories.length ? categories.map((item) => item.name) : ["Marvel", "DC", "Star Wars", "Anime", "Movies", "Television", "Games", "Disney", "Disney Funko", "Icons", "Sports", "Rocks", "Ad Icons", "Animation"]).map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label>Badge<input value={badge} onChange={(e) => setBadge(e.target.value)} style={inputStyle} /></label>
            <label>Description<textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} style={{ ...inputStyle, resize: "vertical" }} /></label>
            <div style={{ display: "grid", gap: "10px" }}>
              <label><input type="checkbox" checked={isChase} onChange={(e) => setIsChase(e.target.checked)} /> Chase</label>
              <label><input type="checkbox" checked={isVaulted} onChange={(e) => setIsVaulted(e.target.checked)} /> Limited Edition</label>
              <label><input type="checkbox" checked={isExclusive} onChange={(e) => setIsExclusive(e.target.checked)} /> Exclusive</label>
              <label><input type="checkbox" checked={isOffer} onChange={(e) => setIsOffer(e.target.checked)} /> Special Edition</label>
            </div>
          </div>
        </section>

        <section style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "14px", padding: "25px", marginBottom: "25px" }}>
          <h2>Product Images</h2>
          <div style={{ display: "grid", gap: "15px" }}>
            {images.map((image, index) => (
              <div key={index}>
                <label>Image {index + 1}<input type="file" accept="image/*" onChange={(event) => uploadImage(event, index)} style={{ ...inputStyle, padding: "10px" }} /></label>
                {image && <img src={image} alt={`Product ${index + 1}`} style={{ width: "140px", height: "140px", objectFit: "contain", background: "#ffffff", borderRadius: "10px", marginTop: "10px" }} />}
              </div>
            ))}
          </div>
        </section>

        <button type="button" onClick={saveProduct} disabled={saving || uploading} style={{ width: "100%", background: "#22c55e", color: "#052e16", border: "none", padding: "16px 20px", borderRadius: "10px", cursor: saving || uploading ? "not-allowed" : "pointer", fontWeight: "800", fontSize: "18px" }}>
          {saving ? "Saving & Listing on eBay..." : "Save Product"}
        </button>

        <section style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "14px", padding: "25px", marginTop: "25px" }}>
          <h2>Category Manager</h2>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="New category" style={{ ...inputStyle, flex: "1 1 250px" }} />
            <button type="button" onClick={addCategory} disabled={categorySaving} style={{ background: "#2563eb", color: "#ffffff", border: "none", padding: "12px 18px", borderRadius: "8px", fontWeight: "700", cursor: categorySaving ? "not-allowed" : "pointer" }}>
              {categorySaving ? "Adding..." : "Add Category"}
            </button>
          </div>
          {categoryMessage && <p style={{ color: "#cbd5e1" }}>{categoryMessage}</p>}
        </section>
      </div>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  boxSizing: "border-box",
  marginTop: "8px",
  padding: "12px 14px",
  background: "#0f172a",
  color: "#ffffff",
  border: "1px solid #475569",
  borderRadius: "8px",
  fontSize: "16px",
};
