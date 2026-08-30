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
  const [description, setDescription] = useState("");

  const [isChase, setIsChase] = useState(false);
  const [isVaulted, setIsVaulted] = useState(false);
  const [isExclusive, setIsExclusive] = useState(false);
  const [isOffer, setIsOffer] = useState(false);

  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [showExtraPhotos, setShowExtraPhotos] = useState(false);

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

    const { data, error } = await supabase
      .from("categories")
      .select("id, name, slug")
      .order("name");

    if (error) {
      console.error("Error loading categories:", error);
      setCategoryMessage(`Error loading categories: ${error.message}`);
      return;
    }

    const loadedCategories = data || [];

    setCategories(loadedCategories);

    if (
      loadedCategories.length > 0 &&
      !loadedCategories.some(
        (item) => item.name === category
      )
    ) {
      setCategory(loadedCategories[0].name);
    }
  }

  useEffect(() => {
    loadCategories();
  }, []);

  function createSlug(value: string) {
    return value
      .trim()
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  async function addCategory() {
    const trimmedName = newCategory.trim();

    if (!supabase) {
      setCategoryMessage("Supabase is not configured.");
      return;
    }

    if (!trimmedName) {
      setCategoryMessage("Please enter a category name.");
      return;
    }

    const slug = createSlug(trimmedName);

    if (!slug) {
      setCategoryMessage("Please enter a valid category name.");
      return;
    }

    if (
      categories.some(
        (item) =>
          item.name.toLowerCase() ===
          trimmedName.toLowerCase()
      )
    ) {
      setCategoryMessage("That category already exists.");
      return;
    }

    setCategorySaving(true);
    setCategoryMessage("");

    const { data, error } = await supabase
      .from("categories")
      .insert({
        name: trimmedName,
        slug,
      })
      .select("id, name, slug")
      .single();

    if (error) {
      console.error(error);
      setCategoryMessage(`Error: ${error.message}`);
      setCategorySaving(false);
      return;
    }

    if (data) {
      setCategories((current) =>
        [...current, data].sort((a, b) =>
          a.name.localeCompare(b.name)
        )
      );

      setCategory(data.name);
    }

    setNewCategory("");
    setCategoryMessage("✅ Category added successfully!");
    setCategorySaving(false);
  }

  async function renameCategory(categoryItem: Category) {
    if (!supabase) {
      setCategoryMessage("Supabase is not configured.");
      return;
    }

    const newName = window.prompt(
      "Enter the new category name:",
      categoryItem.name
    );

    if (newName === null) return;

    const trimmedName = newName.trim();

    if (!trimmedName) {
      setCategoryMessage("Category name cannot be empty.");
      return;
    }

    if (
      trimmedName.toLowerCase() !==
        categoryItem.name.toLowerCase() &&
      categories.some(
        (item) =>
          item.name.toLowerCase() ===
          trimmedName.toLowerCase()
      )
    ) {
      setCategoryMessage("That category already exists.");
      return;
    }

    const newSlug = createSlug(trimmedName);

    if (!newSlug) {
      setCategoryMessage("Invalid category name.");
      return;
    }

    setCategorySaving(true);
    setCategoryMessage("");

    const { error: categoryError } = await supabase
      .from("categories")
      .update({
        name: trimmedName,
        slug: newSlug,
      })
      .eq("id", categoryItem.id);

    if (categoryError) {
      console.error(categoryError);
      setCategoryMessage(
        `Error renaming category: ${categoryError.message}`
      );
      setCategorySaving(false);
      return;
    }

    const { error: productError } = await supabase
      .from("products")
      .update({
        category: trimmedName,
      })
      .eq("category", categoryItem.name);

    if (productError) {
      console.error(productError);
      setCategoryMessage(
        `Category renamed, but existing products could not be updated: ${productError.message}`
      );
      await loadCategories();
      setCategorySaving(false);
      return;
    }

    setCategories((current) =>
      current
        .map((item) =>
          item.id === categoryItem.id
            ? {
                ...item,
                name: trimmedName,
                slug: newSlug,
              }
            : item
        )
        .sort((a, b) =>
          a.name.localeCompare(b.name)
        )
    );

    if (category === categoryItem.name) {
      setCategory(trimmedName);
    }

    setCategoryMessage("✅ Category renamed successfully!");
    setCategorySaving(false);
  }

  async function deleteCategory(categoryItem: Category) {
    if (!supabase) {
      setCategoryMessage("Supabase is not configured.");
      return;
    }

    const confirmed = window.confirm(
      `Delete the category "${categoryItem.name}"?\n\nThis will only delete the category. Products currently using it will not be deleted.`
    );

    if (!confirmed) return;

    setCategorySaving(true);
    setCategoryMessage("");

    const { count, error: productCheckError } =
      await supabase
        .from("products")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("category", categoryItem.name);

    if (productCheckError) {
      console.error(productCheckError);
      setCategoryMessage(
        `Error checking products: ${productCheckError.message}`
      );
      setCategorySaving(false);
      return;
    }

    if ((count || 0) > 0) {
      setCategoryMessage(
        `Cannot delete "${categoryItem.name}" because ${count} product${
          count === 1 ? "" : "s"
        } use this category.`
      );
      setCategorySaving(false);
      return;
    }

    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", categoryItem.id);

    if (error) {
      console.error(error);
      setCategoryMessage(
        `Error deleting category: ${error.message}`
      );
      setCategorySaving(false);
      return;
    }

    const remaining = categories.filter(
      (item) => item.id !== categoryItem.id
    );

    setCategories(remaining);

    if (category === categoryItem.name) {
      setCategory(
        remaining.length > 0
          ? remaining[0].name
          : ""
      );
    }

    setCategoryMessage("✅ Category deleted successfully!");
    setCategorySaving(false);
  }

  async function handleImageUpload(
    event: React.ChangeEvent<HTMLInputElement>,
    imageIndex: number
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    setUploading(true);
    setMessage("");

    if (!supabase) {
      setMessage("Supabase is not configured.");
      setUploading(false);
      return;
    }

    const fileExtension =
      file.name.split(".").pop()?.toLowerCase() || "jpg";

    const fileName = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2)}.${fileExtension}`;

    const filePath = `products/${fileName}`;

    const { error } = await supabase.storage
      .from("product-images")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error(error);
      setMessage(`Image upload error: ${error.message}`);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage
      .from("product-images")
      .getPublicUrl(filePath);

    const updatedImages = [...images];
    updatedImages[imageIndex] = data.publicUrl;

    setImages(updatedImages);

    setMessage(
      imageIndex === 0
        ? "✅ Main photo uploaded!"
        : `✅ Photo ${imageIndex + 1} uploaded!`
    );

    setUploading(false);

    event.target.value = "";
  }

  async function addProduct(
    event: React.FormEvent
  ) {
    event.preventDefault();

    setSaving(true);
    setMessage("");

    if (!supabase) {
      setMessage("Supabase is not configured.");
      setSaving(false);
      return;
    }

    if (!images[0]) {
      setMessage(
        "Please take or upload the main photo first."
      );
      setSaving(false);
      return;
    }

    if (!category) {
      setMessage("Please select a category.");
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("products")
      .insert({
        name,
        image: images[0],
        image_2: images[1] || null,
        image_3: images[2] || null,
        image_4: images[3] || null,
        image_5: images[4] || null,
        image_6: images[5] || null,
        product_number: productNumber === "" ? null : Number(productNumber),
        price: Number(price),
        stock: Number(stock),
        category,
        badge: badge || null,
        description: description || null,
        is_chase: isChase,
        is_vaulted: isVaulted,
        is_exclusive: isExclusive,
        is_offer: isOffer,
      });

    if (error) {
      console.error(error);
      setMessage(`Error: ${error.message}`);
      setSaving(false);
      return;
    }

    setMessage("✅ Product added successfully!");

    setName("");
    setImages(Array(6).fill(""));
    setPrice("");
    setStock("1");
    setCategory(
      categories.length > 0
        ? categories[0].name
        : ""
    );
    setBadge("");
    setDescription("");

    setIsChase(false);
    setIsVaulted(false);
    setIsExclusive(false);
    setIsOffer(false);

    setShowMoreOptions(false);
    setShowExtraPhotos(false);

    setSaving(false);
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0f172a",
        color: "#ffffff",
        padding: "20px 12px 50px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "700px",
          margin: "0 auto",
        }}
      >
        <h1
          style={{
            fontSize: "clamp(30px, 8vw, 42px)",
            marginBottom: "6px",
          }}
        >
          ➕ Add Product
        </h1>

        <p
          style={{
            color: "#94a3b8",
            marginBottom: "20px",
          }}
        >
          Add a product quickly from your phone.
        </p>

        {/* CATEGORY MANAGER */}

        <section
          style={{
            background: "#111827",
            border: "1px solid #334155",
            borderRadius: "18px",
            padding: "16px",
            marginBottom: "18px",
          }}
        >
          <h2
            style={{
              margin: "0 0 8px",
              fontSize: "22px",
            }}
          >
            📂 Categories
          </h2>

          <p
            style={{
              color: "#94a3b8",
              margin: "0 0 14px",
            }}
          >
            Add, rename or remove product categories.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "1fr auto",
              gap: "10px",
            }}
          >
            <input
              value={newCategory}
              onChange={(event) =>
                setNewCategory(event.target.value)
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addCategory();
                }
              }}
              placeholder="New category e.g. Clothing"
              style={inputStyle}
            />

            <button
              type="button"
              onClick={addCategory}
              disabled={categorySaving}
              style={{
                border: "none",
                borderRadius: "10px",
                padding: "0 18px",
                background: categorySaving
                  ? "#64748b"
                  : "#facc15",
                color: "#111827",
                fontWeight: "800",
                cursor: categorySaving
                  ? "not-allowed"
                  : "pointer",
              }}
            >
              ➕ Add
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gap: "8px",
              marginTop: "14px",
            }}
          >
            {categories.map((categoryItem) => (
              <div
                key={categoryItem.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "10px",
                  padding: "10px 12px",
                  background: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "10px",
                }}
              >
                <span
                  style={{
                    fontWeight: "700",
                    wordBreak: "break-word",
                  }}
                >
                  {categoryItem.name}
                </span>

                <div
                  style={{
                    display: "flex",
                    gap: "7px",
                    flexShrink: 0,
                  }}
                >
                  <button
                    type="button"
                    onClick={() =>
                      renameCategory(categoryItem)
                    }
                    disabled={categorySaving}
                    style={smallButtonStyle}
                  >
                    ✏️
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      deleteCategory(categoryItem)
                    }
                    disabled={categorySaving}
                    style={{
                      ...smallButtonStyle,
                      background: "#7f1d1d",
                    }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}

            {categories.length === 0 && (
              <p
                style={{
                  color: "#94a3b8",
                  margin: "8px 0 0",
                }}
              >
                No categories found.
              </p>
            )}
          </div>

          {categoryMessage && (
            <div
              style={{
                marginTop: "12px",
                padding: "12px",
                borderRadius: "10px",
                background: "#0f172a",
                color: "#e2e8f0",
                fontSize: "14px",
              }}
            >
              {categoryMessage}
            </div>
          )}
        </section>

        <form
          suppressHydrationWarning
          onSubmit={addProduct}
          style={{
            display: "grid",
            gap: "18px",
            background: "#111827",
            padding: "16px",
            borderRadius: "18px",
            border: "1px solid #334155",
          }}
        >
          {/* MAIN PHOTO */}

          <div
            style={{
              background: "#1e293b",
              border: "2px solid #facc15",
              borderRadius: "16px",
              padding: "16px",
            }}
          >
            <h2
              style={{
                margin: "0 0 8px",
                fontSize: "22px",
              }}
            >
              📸 Product Photo
            </h2>

            <p
              style={{
                color: "#94a3b8",
                margin: "0 0 14px",
              }}
            >
              Take a photo or choose one from your phone.
            </p>

            <label
              style={{
                display: "block",
                background: "#facc15",
                color: "#111827",
                padding: "19px 12px",
                borderRadius: "12px",
                textAlign: "center",
                fontSize: "19px",
                fontWeight: "800",
                cursor: "pointer",
              }}
            >
              📷 TAKE PHOTO / CHOOSE PHOTO

              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(event) =>
                  handleImageUpload(event, 0)
                }
                style={{
                  display: "none",
                }}
              />
            </label>

            {images[0] && (
              <div
                style={{
                  marginTop: "14px",
                  textAlign: "center",
                }}
              >
                <img
                  src={images[0]}
                  alt="Main product"
                  style={{
                    width: "100%",
                    maxWidth: "320px",
                    height: "260px",
                    objectFit: "contain",
                    background: "#ffffff",
                    borderRadius: "12px",
                    padding: "8px",
                  }}
                />

                <p
                  style={{
                    color: "#86efac",
                    fontWeight: "700",
                    margin: "10px 0 0",
                  }}
                >
                  ✅ Photo ready
                </p>
              </div>
            )}
          </div>

          {/* PRODUCT NAME */}

          <label>
            <strong>Product Name</strong>

            <input
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
              required
              placeholder="e.g. Rey 434"
              style={inputStyle}
            />
          </label>

          {/* FUNKO PRODUCT NUMBER */}

          <label>
            <strong>Funko Product Number</strong>

            <input
              type="number"
              min="0"
              step="1"
              value={productNumber}
              onChange={(e) => setProductNumber(e.target.value)}
              placeholder="e.g. 123"
              inputMode="numeric"
              style={inputStyle}
            />
          </label>

          {/* PRICE */}

          <label>
            <strong>Price (£)</strong>

            <input
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) =>
                setPrice(e.target.value)
              }
              required
              placeholder="e.g. 15.00"
              inputMode="decimal"
              style={inputStyle}
            />
          </label>

          {/* CATEGORY */}

          <label>
            <strong>Category</strong>

            <select
              value={category}
              onChange={(e) =>
                setCategory(e.target.value)
              }
              style={inputStyle}
            >
              {categories.map((categoryItem) => (
                <option
                  key={categoryItem.id}
                  value={categoryItem.name}
                >
                  {categoryItem.name}
                </option>
              ))}
            </select>
          </label>

          {/* QUICK TAGS */}

          <div>
            <strong
              style={{
                display: "block",
                marginBottom: "10px",
              }}
            >
              Quick Tags
            </strong>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(2, minmax(0, 1fr))",
                gap: "10px",
              }}
            >
              <label style={tagStyle}>
                <input
                  type="checkbox"
                  checked={isChase}
                  onChange={(e) =>
                    setIsChase(e.target.checked)
                  }
                />
                🎯 Chase
              </label>

              <label style={tagStyle}>
                <input
                  type="checkbox"
                  checked={isExclusive}
                  onChange={(e) =>
                    setIsExclusive(e.target.checked)
                  }
                />
                ⭐ Exclusive
              </label>

              <label style={tagStyle}>
                <input
                  type="checkbox"
                  checked={isVaulted}
                  onChange={(e) =>
                    setIsVaulted(e.target.checked)
                  }
                />
                🔒 Vaulted
              </label>

              <label style={tagStyle}>
                <input
                  type="checkbox"
                  checked={isOffer}
                  onChange={(e) =>
                    setIsOffer(e.target.checked)
                  }
                />
                🔥 Offer
              </label>
            </div>
          </div>

          {/* EXTRA PHOTOS */}

          <button
            type="button"
            onClick={() =>
              setShowExtraPhotos(!showExtraPhotos)
            }
            style={secondaryButtonStyle}
          >
            {showExtraPhotos
              ? "▲ Hide Extra Photos"
              : "📸 Add Extra Photos"}
          </button>

          {showExtraPhotos && (
            <div
              style={{
                display: "grid",
                gap: "12px",
              }}
            >
              <p
                style={{
                  color: "#94a3b8",
                  margin: 0,
                }}
              >
                Optional — add up to 5 more photos.
              </p>

              {images.slice(1).map(
                (imageUrl, arrayIndex) => {
                  const index = arrayIndex + 1;

                  return (
                    <div
                      key={index}
                      style={{
                        background: "#1e293b",
                        border: "1px solid #334155",
                        borderRadius: "12px",
                        padding: "12px",
                      }}
                    >
                      <label>
                        <strong>
                          Photo {index + 1}
                        </strong>

                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={(event) =>
                            handleImageUpload(
                              event,
                              index
                            )
                          }
                          style={{
                            ...inputStyle,
                            padding: "10px",
                          }}
                        />
                      </label>

                      {imageUrl && (
                        <img
                          src={imageUrl}
                          alt={`Product photo ${
                            index + 1
                          }`}
                          style={{
                            width: "100%",
                            height: "180px",
                            objectFit: "contain",
                            background: "#ffffff",
                            borderRadius: "10px",
                            padding: "8px",
                            marginTop: "10px",
                          }}
                        />
                      )}
                    </div>
                  );
                }
              )}
            </div>
          )}

          {/* MORE OPTIONS */}

          <button
            type="button"
            onClick={() =>
              setShowMoreOptions(!showMoreOptions)
            }
            style={secondaryButtonStyle}
          >
            {showMoreOptions
              ? "▲ Hide More Options"
              : "⚙️ More Options"}
          </button>

          {showMoreOptions && (
            <div
              style={{
                display: "grid",
                gap: "18px",
                background: "#1e293b",
                padding: "15px",
                borderRadius: "12px",
              }}
            >
              <label>
                <strong>Stock</strong>

                <input
                  type="number"
                  min="0"
                  value={stock}
                  onChange={(e) =>
                    setStock(e.target.value)
                  }
                  style={inputStyle}
                />
              </label>

              <label>
                <strong>Badge</strong>

                <input
                  value={badge}
                  onChange={(e) =>
                    setBadge(e.target.value)
                  }
                  placeholder="Latest Arrival"
                  style={inputStyle}
                />
              </label>

              <label>
                <strong>Description</strong>

                <textarea
                  value={description}
                  onChange={(e) =>
                    setDescription(e.target.value)
                  }
                  rows={4}
                  placeholder="Optional product description"
                  style={{
                    ...inputStyle,
                    resize: "vertical",
                  }}
                />
              </label>
            </div>
          )}

          {/* UPLOAD MESSAGE */}

          {uploading && (
            <p
              style={{
                color: "#facc15",
                fontWeight: "700",
                textAlign: "center",
                margin: 0,
              }}
            >
              ⏳ Uploading photo...
            </p>
          )}

          {/* ADD PRODUCT */}

          <button
            type="submit"
            disabled={
              saving ||
              uploading ||
              !images[0] ||
              !name ||
              !price ||
              !category
            }
            style={{
              padding: "20px 16px",
              border: "none",
              borderRadius: "13px",
              background:
                saving ||
                uploading ||
                !images[0] ||
                !name ||
                !price ||
                !category
                  ? "#64748b"
                  : "#facc15",
              color: "#111827",
              fontSize: "20px",
              fontWeight: "900",
              cursor:
                saving ||
                uploading ||
                !images[0] ||
                !name ||
                !price ||
                !category
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {saving
              ? "ADDING PRODUCT..."
              : "➕ ADD PRODUCT"}
          </button>

          {message && (
            <div
              style={{
                padding: "15px",
                borderRadius: "10px",
                background: "#1e293b",
                textAlign: "center",
                fontWeight: "700",
              }}
            >
              {message}
            </div>
          )}
        </form>
      </div>
    </main>
  );
}

const inputStyle = {
  display: "block",
  width: "100%",
  marginTop: "8px",
  padding: "14px",
  borderRadius: "10px",
  border: "1px solid #334155",
  background: "#1e293b",
  color: "#ffffff",
  fontSize: "17px",
  boxSizing: "border-box" as const,
};

const tagStyle = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  padding: "13px 10px",
  background: "#1e293b",
  border: "1px solid #334155",
  borderRadius: "10px",
  fontSize: "16px",
};

const secondaryButtonStyle = {
  width: "100%",
  padding: "15px",
  border: "1px solid #475569",
  borderRadius: "10px",
  background: "#1e293b",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "700",
  cursor: "pointer",
};

const smallButtonStyle = {
  border: "none",
  borderRadius: "8px",
  padding: "8px 10px",
  background: "#334155",
  color: "#ffffff",
  fontSize: "15px",
  cursor: "pointer",
};

