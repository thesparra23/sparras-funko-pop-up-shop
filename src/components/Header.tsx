"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "../context/CartContext";

export default function Header() {
  const [wishlistCount, setWishlistCount] = useState(0);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const { itemCount } = useCart();

  const categories = [
    ["Marvel", "/marvel"],
    ["DC", "/dc"],
    ["Star Wars", "/starwars"],
    ["Anime", "/anime"],
    ["Movies", "/movies"],
    ["Television", "/television"],
    ["Games", "/games"],
    ["Disney", "/disney"],
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

        {/* WISHLIST + BASKET */}

        <div
          style={{
            position: "absolute",
            right: "40px",
            bottom: "35px",
            display: "flex",
            gap: "16px",
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

      {/* NAVIGATION */}

      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          padding: "0 40px 20px",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <nav
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Link href="/" style={navStyle}>
            <span style={{ color: "#ffd21c", fontSize: "20px" }}>
              🏠
            </span>
            Home
          </Link>

          <Link href="/#latest-arrivals" style={navStyle}>
            New Arrivals
          </Link>

          <Link href="/#chase" style={navStyle}>
            Chase
          </Link>

          <Link href="/#vaulted" style={navStyle}>
            Vaulted
          </Link>

          <Link href="/#exclusives" style={navStyle}>
            Exclusives
          </Link>

          <Link href="/#offers" style={navStyle}>
            Offers
          </Link>

          <div style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() =>
                setCategoriesOpen(!categoriesOpen)
              }
              style={{
                ...navStyle,
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              Categories ▼
            </button>

            {categoriesOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: "220px",
                  background: "#080b10",
                  border: "1px solid #333943",
                  borderRadius: "10px",
                  padding: "8px",
                  boxShadow:
                    "0 15px 35px rgba(0,0,0,0.7)",
                  zIndex: 2000,
                }}
              >
                {categories.map(([label, href]) => (
                  <Link
                    key={label}
                    href={href}
                    onClick={() =>
                      setCategoriesOpen(false)
                    }
                    style={dropdownStyle}
                  >
                    {label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </nav>
      </div>

      {/* FIXED SHOP FILTER BAR */}
      <div
        style={{
          position: "relative",
          display: "none",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10000,
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

            const search = String(data.get("search") || "").trim();
            const sort = String(data.get("sort") || "newest");
            const category = String(data.get("category") || "home");
            const stock = data.get("stock") === "on";

            const params = new URLSearchParams();
            if (search) params.set("search", search);
            if (sort !== "newest") params.set("sort", sort);
            if (stock) params.set("stock", "1");

            const query = params.toString();
            const hash = category === "home" ? "shop" : category;

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
            <option value="low">Price: Low to High</option>
            <option value="high">Price: High to Low</option>
          </select>

          <select
            name="category"
            defaultValue="home"
            style={filterControlStyle}
            aria-label="Choose category"
          >
            <option value="home">All Collections</option>
            <option value="chase">🎯 Chase</option>
            <option value="vaulted">🔒 Vaulted</option>
            <option value="exclusives">⭐ Exclusives</option>
            <option value="offers">🔥 Offers</option>
            <option value="marvel">Marvel</option>
            <option value="dc">DC</option>
            <option value="starwars">Star Wars</option>
            <option value="anime">Anime</option>
            <option value="television">Television</option>
            <option value="disney">Disney</option>
            <option value="games">Games</option>
            <option value="icons">Icons</option>
            <option value="sports">Sports</option>
            <option value="rocks">Rocks</option>
            <option value="ad-icons">Ad Icons</option>
            <option value="animation">Animation</option>
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

          <button type="submit" style={filterButtonStyle}>
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

const dropdownStyle = {
  display: "block",
  color: "#ffffff",
  textDecoration: "none",
  padding: "11px 14px",
  borderRadius: "6px",
  fontSize: "15px",
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