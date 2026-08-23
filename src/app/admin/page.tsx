"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

const categories = [
  "Marvel",
  "DC",
  "Star Wars",
  "Anime",
  "Movies",
  "Television",
  "Games",
  "Disney",
  "Icons",
  "Sports",
  "Rocks",
  "Ad Icons",
  "Animation",
];

export default function AdminPage() {
  const [name, setName] = useState("");
  const [images, setImages] = useState<string[]>(Array(6).fill(""));
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("1");
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

  async function addProduct(event: React.FormEvent) {
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
    setCategory("Marvel");
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
          ➕ Quick Add Funko
        </h1>

        <p
          style={{
            color: "#94a3b8",
            marginBottom: "20px",
          }}
        >
          Add a Pop quickly from your phone.
        </p>

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
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Rey 434"
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
              onChange={(e) => setPrice(e.target.value)}
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
              onChange={(e) => setCategory(e.target.value)}
              style={inputStyle}
            >
              {categories.map((categoryName) => (
                <option
                  key={categoryName}
                  value={categoryName}
                >
                  {categoryName}
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
              !price
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
                !price
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
                !price
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