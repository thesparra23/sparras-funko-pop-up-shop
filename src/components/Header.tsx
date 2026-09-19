"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "../context/CartContext";

export default function Header() {
  const [wishlistCount, setWishlistCount] = useState(0);
  const [funkosOpen, setFunkosOpen] = useState(false);
  const { itemCount } = useCart();

  const funkoCategories = [
    ["Marvel", "/marvel"],
    ["DC", "/dc"],
    ["Star Wars", "/starwars"],
    ["Anime", "/anime"],
    ["Movies", "/movies"],
    ["Television", "/television"],
    ["Games", "/games"],
    ["Disney", "/disney"],
    ["Disney Funko", "/#disney-funko"],
    ["Icons", "/icons"],
    ["Sports", "/sports"],
    ["Rocks", "/rocks"],
    ["Ad Icons", "/ad-icons"],
    ["Animation", "/animation"],
  ];

  return (
    <header
      style={{
        background: "#05070b",
        color: "#ffffff",
        borderBottom: "1px solid #252a32",
        position: "relative",
        zIndex: 1000,
      }}
    >
      {/* TOP LOGO AREA */}

      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          minHeight: "385px",
          padding: "105px 40px 0",
          position: "relative",
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
        }}
      >
        <Link
          href="/"
          style={{
            display: "block",
            textDecoration: "none",
          }}
        >
          <img
            src="/sparras-logo.png?v=3"
            alt="Sparra's Funko Pop Shop"
            style={{
              display: "block",
              width: "620px",
              height: "250px",
              objectFit: "contain",
            }}
          />
        </Link>

        {/* CONTACT / WISHLIST / BASKET */}

        <div
          style={{
            position: "absolute",
            right: "40px",
            bottom: "35px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            alignItems: "flex-end",
          }}
        >
          <a
            href="https://wa.me/447833439462"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              ...yellowButton,
              textDecoration: "none",
              color: "#05070b",
              display: "block",
              textAlign: "center",
            }}
          >
            💬 WhatsApp Us
          </a>

          <a
            href="mailto:sparrascollectables@gmail.com"
            style={{
              ...yellowButton,
              textDecoration: "none",
              color: "#05070b",
              display: "block",
              textAlign: "center",
            }}
          >
            📧 Email Us
          </a>

          <div
            style={{
              display: "flex",
              gap: "16px",
              alignItems: "center",
            }}
          >
            <button
              type="button"
              onClick={() =>
                setWishlistCount((count) => count + 1)
              }
              style={yellowButton}
            >
              ❤️ Wishlist
              <br />
              <strong>({wishlistCount})</strong>
            </button>

            <Link
              href="/cart"
              style={{
                ...yellowButton,
                textDecoration: "none",
                color: "#05070b",
                display: "block",
                textAlign: "center",
              }}
            >
              🛒 Basket
              <br />
              <strong>({itemCount})</strong>
            </Link>
          </div>
        </div>
      </div>

      {/* MAIN NAVIGATION */}

      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          padding: "0 40px 20px",
          display: "flex",
          justifyContent: "center",
          position: "relative",
          zIndex: 20000,
        }}
      >
        <nav
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* HOME */}

          <Link href="/" style={navStyle}>
            <span style={{ color: "#ffd21c", fontSize: "20px" }}>
              🏠
            </span>
            Home
          </Link>

          {/* FUNKOS */}

          <div
            style={{
              position: "relative",
              zIndex: 20001,
            }}
          >
            <button
              type="button"
              onClick={() => setFunkosOpen(!funkosOpen)}
              style={{
                ...navStyle,
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#ffffff",
              }}
            >
              FUNKOS {funkosOpen ? "▲" : "▼"}
            </button>

            {funkosOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: "0",
                  width: "260px",
                  maxHeight: "650px",
                  overflowY: "auto",
                  background: "#080b10",
                  border: "1px solid #333943",
                  borderRadius: "10px",
                  padding: "8px",
                  boxShadow: "0 15px 35px rgba(0,0,0,0.7)",
                  zIndex: 20002,
                }}
              >
                <Link
                  href="/"
                  onClick={() => setFunkosOpen(false)}
                  style={mainCategoryLink}
                >
                  ALL FUNKOS
                </Link>

                {funkoCategories.map(([label, href]) => (
                  <Link
                    key={label}
                    href={href}
                    onClick={() => setFunkosOpen(false)}
                    style={subCategoryStyle}
                  >
                    {label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* MAIN CATEGORIES */}

          <Link href="/disney" style={navStyle}>
            DISNEY
          </Link>

          <Link href="/clothing#shop" style={navStyle}>
            CLOTHING
          </Link>

          <Link href="/loungefly#shop" style={navStyle}>
            LOUNGEFLY
          </Link>

          <Link href="/clearance#shop" style={navStyle}>
            CLEARANCE ITEMS
          </Link>
        </nav>
      </div>

      {/* SHOP FILTER BAR */}

      <div
        style={{
          position: "relative",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          background: "#05070b",
          borderBottom: "1px solid #252a32",
          padding: "10px 16px",
          boxShadow: "0 4px 14px rgba(0,0,0,0.35)",
        }}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();

            const form = e.currentTarget;
            const data = new FormData(form);

            const search = String(
              data.get("search") || ""
            ).trim();

            const sort = String(
              data.get("sort") || "newest"
            );

            const category = String(
              data.get("category") || "home"
            );

            const stock = data.get("stock") === "on";

            const params = new URLSearchParams();

            if (search) {
              params.set("search", search);
            }

            if (sort !== "newest") {
              params.set("sort", sort);
            }

            if (stock) {
              params.set("stock", "1");
            }

            const query = params.toString();

            const hash =
              category === "home" ? "shop" : category;

            window.location.href = `/?${query}#${hash}`;
          }}
          style={{
            maxWidth: "1400px",
            margin: "0 auto",
            display: "flex",
            gap: "10px",
            alignItems: "center",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <input
            name="search"
            type="search"
            placeholder="🔎 Search Funko Pops..."
            style={{
              flex: "1 1 260px",
              maxWidth: "420px",
              minWidth: "220px",
              padding: "11px 14px",
              borderRadius: "10px",
              border: "1px solid #334155",
              background: "#111827",
              color: "#ffffff",
              fontSize: "15px",
              outline: "none",
            }}
          />

          <select
            name="sort"
            defaultValue="newest"
            style={filterControlStyle}
            aria-label="Sort products"
          >
            <option value="newest">Newest</option>
            <option value="low">
              Price: Low to High
            </option>
            <option value="high">
              Price: High to Low
            </option>
          </select>

          <select
            name="category"
            defaultValue="home"
            style={filterControlStyle}
            aria-label="Choose category"
          >
            <option value="home">
              All Collections
            </option>
            <option value="chase">🎯 Chase</option>
            <option value="vaulted">
              🔒 Vaulted
            </option>
            <option value="exclusives">
              ⭐ Exclusives
            </option>
            <option value="offers">🔥 Offers</option>
            <option value="marvel">Marvel</option>
            <option value="dc">DC</option>
            <option value="starwars">
              Star Wars
            </option>
            <option value="anime">Anime</option>
            <option value="television">
              Television
            </option>
            <option value="disney">Disney</option>
            <option value="disney-funko">
              Disney Funko
            </option>
            <option value="games">Games</option>
            <option value="icons">Icons</option>
            <option value="sports">Sports</option>
            <option value="rocks">Rocks</option>
            <option value="ad-icons">
              Ad Icons
            </option>
            <option value="animation">
              Animation
            </option>
            <option value="movies">Movies</option>
          </select>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "7px",
              color: "#ffffff",
              fontSize: "14px",
              whiteSpace: "nowrap",
              cursor: "pointer",
            }}
          >
            <input name="stock" type="checkbox" />
            In stock only
          </label>

          <button
            type="submit"
            style={filterButtonStyle}
          >
            Search
          </button>
        </form>
      </div>
    </header>
  );
}

const filterControlStyle = {
  padding: "11px 12px",
  borderRadius: "10px",
  border: "1px solid #334155",
  background: "#111827",
  color: "#ffffff",
  fontSize: "14px",
  cursor: "pointer",
  outline: "none",
};

const filterButtonStyle = {
  padding: "11px 16px",
  borderRadius: "10px",
  border: "none",
  background: "#ffd21c",
  color: "#05070b",
  fontSize: "14px",
  fontWeight: "800",
  cursor: "pointer",
  whiteSpace: "nowrap" as const,
};

const navStyle = {
  color: "#ffffff",
  textDecoration: "none",
  fontSize: "17px",
  fontWeight: "800",
  padding: "8px 20px",
  borderRight: "1px solid #30343b",
  whiteSpace: "nowrap" as const,
  display: "flex",
  alignItems: "center",
  gap: "7px",
};

const mainCategoryLink = {
  display: "block",
  color: "#ffd21c",
  textDecoration: "none",
  padding: "12px 14px",
  borderRadius: "6px",
  fontSize: "16px",
  fontWeight: "900",
};

const subCategoryStyle = {
  display: "block",
  color: "#ffffff",
  textDecoration: "none",
  padding: "8px 12px",
  borderRadius: "5px",
  fontSize: "14px",
  fontWeight: "700",
};

const yellowButton = {
  background: "#ffd21c",
  color: "#05070b",
  border: "none",
  borderRadius: "20px",
  padding: "13px 22px",
  fontSize: "15px",
  fontWeight: "800",
  cursor: "pointer",
  minWidth: "115px",
  lineHeight: "1.15",
  boxShadow: "0 4px 12px rgba(0,0,0,0.35)",
};