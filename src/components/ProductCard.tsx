"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useCart } from "../context/CartContext";

type ProductCardProps = {
  id?: string;
  name: string;
  image: string;
  image_2?: string | null;
  image_3?: string | null;
  image_4?: string | null;
  image_5?: string | null;
  image_6?: string | null;
  price: string;
  badge?: string;
  stock?: number;
};

export default function ProductCard({
  id,
  name,
  image,
  image_2,
  image_3,
  image_4,
  image_5,
  image_6,
  price,
 badge,
  stock,
}: ProductCardProps) {
  const [wishlisted, setWishlisted] =
    useState(false);

  const [galleryOpen, setGalleryOpen] =
    useState(false);

  const [offerOpen, setOfferOpen] =
    useState(false);

  const [offerAmount, setOfferAmount] =
    useState("");

  const [offerName, setOfferName] =
    useState("");

  const [offerEmail, setOfferEmail] =
    useState("");

  const [selectedImage, setSelectedImage] =
    useState(0);

  const { addToCart } = useCart();

  const productId =
    id ||
    name
      .toLowerCase()
      .replace(/\s+/g, "-");

  const numericPrice = Number(
    price.replace("£", "").replace(",", "")
  );

  const handleAddToCart = () => {
    addToCart({
      id: productId,
      name,
      image,
      price: numericPrice,
    });
  };

  const handleOfferSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const message = `Hi Sparra's Collectables, I'd like to make an offer of £${offerAmount} for ${name}. My name is ${offerName} and my email is ${offerEmail}.`;

    window.location.href =
      `mailto:offers@sparrascollectables.co.uk?subject=${encodeURIComponent(
        `Offer for ${name}`
      )}&body=${encodeURIComponent(message)}`;
  };

  const galleryImages = [
    image,
    image_2,
    image_3,
    image_4,
    image_5,
    image_6,
  ].filter(
    (photo): photo is string =>
      Boolean(photo)
  );

  const openGallery = () => {
    setSelectedImage(0);
    setGalleryOpen(true);
  };

  const closeGallery = () => {
    setGalleryOpen(false);
  };

  const previousImage = () => {
    setSelectedImage((current) =>
      current === 0
        ? galleryImages.length - 1
        : current - 1
    );
  };

  const nextImage = () => {
    setSelectedImage((current) =>
      current === galleryImages.length - 1
        ? 0
        : current + 1
    );
  };

  return (
    <>
      <article className="product-card">
        <div
          className="image-wrapper"
          onClick={openGallery}
          style={{
            cursor: "pointer",
          }}
        >
          {badge && (
            <span className="badge">
              {badge}
            </span>
          )}

          <img
            src={image}
            alt={name}
            className="figure-image"
          />

          {galleryImages.length > 1 && (
            <div
              style={{
                position: "absolute",
                bottom: "12px",
                right: "12px",
                background:
                  "rgba(0,0,0,0.75)",
                color: "#ffffff",
                padding: "7px 11px",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: "800",
              }}
            >
              📸 {galleryImages.length} Photos
            </div>
          )}
        </div>

        <div className="card-content">
          <h3>{name}</h3>

          <div className="product-price">
            {price}
          </div>

          <div style={{ marginTop: "6px", fontSize: "13px", fontWeight: "700", color: stock && stock > 0 ? "#16a34a" : "#dc2626" }}>
            {stock && stock > 0 ? `Available: ${stock}` : "Out of stock"}
          </div>

          <div className="card-buttons">
            <button
              type="button"
              className="basket-btn"
              onClick={handleAddToCart}
            >
              🛒 Add to Basket
            </button>

            <button
              type="button"
              className="wish-btn"
              onClick={() =>
                setWishlisted(!wishlisted)
              }
              aria-label={
                wishlisted
                  ? `Remove ${name} from wishlist`
                  : `Add ${name} to wishlist`
              }
            >
              {wishlisted
                ? "❤️"
                : "♡"}
            </button>
          </div>
        </div>
      </article>

      {offerOpen && (
        <div
          onClick={() => setOfferOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "500px",
              background: "#111827",
              border: "1px solid #334155",
              borderRadius: "16px",
              padding: "25px",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "15px",
              }}
            >
              <h2 style={{ margin: 0 }}>
                💷 Make an Offer
              </h2>

              <button
                type="button"
                onClick={() => setOfferOpen(false)}
                style={{
                  background: "#475569",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "8px 12px",
                  cursor: "pointer",
                  fontWeight: "700",
                }}
              >
                ✕
              </button>
            </div>

            <p style={{ color: "#cbd5e1", marginTop: "15px" }}>
              {name}
            </p>

            <form
              onSubmit={handleOfferSubmit}
              style={{
                display: "grid",
                gap: "12px",
                marginTop: "20px",
              }}
            >
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                placeholder="Your offer (£)"
                value={offerAmount}
                onChange={(event) =>
                  setOfferAmount(event.target.value)
                }
                style={{
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid #475569",
                  fontSize: "16px",
                }}
              />

              <input
                type="text"
                required
                placeholder="Your name"
                value={offerName}
                onChange={(event) =>
                  setOfferName(event.target.value)
                }
                style={{
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid #475569",
                  fontSize: "16px",
                }}
              />

              <input
                type="email"
                required
                placeholder="Your email"
                value={offerEmail}
                onChange={(event) =>
                  setOfferEmail(event.target.value)
                }
                style={{
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid #475569",
                  fontSize: "16px",
                }}
              />

              <button
                type="submit"
                style={{
                  padding: "13px",
                  border: "none",
                  borderRadius: "8px",
                  background: "#facc15",
                  color: "#111827",
                  fontWeight: "800",
                  fontSize: "16px",
                  cursor: "pointer",
                }}
              >
                SEND OFFER
              </button>
            </form>
          </div>
        </div>
      )}

      {galleryOpen && (
        <div
          onClick={closeGallery}
          style={{
            position: "fixed",
            inset: 0,
            background:
              "rgba(0,0,0,0.92)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "30px",
            boxSizing: "border-box",
          }}
        >
          <button
            type="button"
            onClick={closeGallery}
            style={{
              position: "absolute",
              top: "20px",
              right: "25px",
              background: "#ffd21c",
              color: "#05070b",
              border: "none",
              width: "45px",
              height: "45px",
              borderRadius: "50%",
              fontSize: "24px",
              fontWeight: "900",
              cursor: "pointer",
              zIndex: 10001,
            }}
            aria-label="Close gallery"
          >
            ×
          </button>

          <div
            onClick={(event) =>
              event.stopPropagation()
            }
            style={{
              width: "100%",
              maxWidth: "1100px",
              maxHeight: "95vh",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <h2
              style={{
                color: "#ffffff",
                margin:
                  "0 0 15px",
                textAlign: "center",
                fontSize: "26px",
              }}
            >
              {name}
            </h2>

            <div
              style={{
                position: "relative",
                width: "100%",
                height: "65vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <img
                src={
                  galleryImages[
                    selectedImage
                  ]
                }
                alt={`${name} photo ${
                  selectedImage + 1
                }`}
                style={{
                  maxWidth: "85%",
                  maxHeight: "100%",
                  objectFit: "contain",
                  borderRadius: "12px",
                }}
              />

              {galleryImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={previousImage}
                    style={{
                      position:
                        "absolute",
                      left: "10px",
                      top: "50%",
                      transform:
                        "translateY(-50%)",
                      width: "50px",
                      height: "50px",
                      borderRadius:
                        "50%",
                      border: "none",
                      background:
                        "#ffd21c",
                      color:
                        "#05070b",
                      fontSize: "28px",
                      fontWeight:
                        "900",
                      cursor:
                        "pointer",
                    }}
                    aria-label="Previous photo"
                  >
                    ‹
                  </button>

                  <button
                    type="button"
                    onClick={nextImage}
                    style={{
                      position:
                        "absolute",
                      right: "10px",
                      top: "50%",
                      transform:
                        "translateY(-50%)",
                      width: "50px",
                      height: "50px",
                      borderRadius:
                        "50%",
                      border: "none",
                      background:
                        "#ffd21c",
                      color:
                        "#05070b",
                      fontSize: "28px",
                      fontWeight:
                        "900",
                      cursor:
                        "pointer",
                    }}
                    aria-label="Next photo"
                  >
                    ›
                  </button>
                </>
              )}
            </div>

            {galleryImages.length > 1 && (
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  marginTop: "18px",
                  overflowX: "auto",
                  maxWidth: "100%",
                  padding:
                    "5px 5px 10px",
                }}
              >
                {galleryImages.map(
                  (
                    photo,
                    index
                  ) => (
                    <button
                      key={photo}
                      type="button"
                      onClick={() =>
                        setSelectedImage(
                          index
                        )
                      }
                      style={{
                        width: "80px",
                        height: "80px",
                        flexShrink: 0,
                        padding: "4px",
                        borderRadius:
                          "10px",
                        border:
                          selectedImage ===
                          index
                            ? "3px solid #ffd21c"
                            : "2px solid #334155",
                        background:
                          "#ffffff",
                        cursor:
                          "pointer",
                      }}
                    >
                      <img
                        src={photo}
                        alt={`${name} thumbnail ${
                          index + 1
                        }`}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit:
                            "contain",
                        }}
                      />
                    </button>
                  )
                )}
              </div>
            )}

            <div
              style={{
                color: "#94a3b8",
                fontSize: "13px",
                marginTop: "10px",
              }}
            >
              Photo{" "}
              {selectedImage + 1} of{" "}
              {galleryImages.length}
            </div>
          </div>
        </div>
      )}
    </>
  );
}