"use client";

import { useEffect, useState } from "react";
import Header from "../components/Header";
import Hero from "../components/Hero";
import Footer from "../components/Footer";
import ProductCard from "../components/ProductCard";
import { supabase } from "../lib/supabase";

type Product = {
  id: string;
  name: string;
  image: string;
  image_2?: string | null;
  image_3?: string | null;
  image_4?: string | null;
  image_5?: string | null;
  image_6?: string | null;
  price: number;
  product_number?: number | null;
  badge?: string | null;
  stock: number;
  category?: string | null;
  is_chase?: boolean;
  is_vaulted?: boolean;
  is_exclusive?: boolean;
  is_offer?: boolean;
};

const categories = [
  { value: "home", label: "All Collections" },
  { value: "chase", label: "🎯 Chase" },
  { value: "vaulted", label: "🔒 Vaulted" },
  { value: "exclusives", label: "⭐ Exclusives" },
  { value: "offers", label: "🔥 Offers" },
  { value: "marvel", label: "Marvel" },
  { value: "dc", label: "DC" },
  { value: "starwars", label: "Star Wars" },
  { value: "anime", label: "Anime" },
  { value: "television", label: "Television" },
  { value: "disney", label: "Disney" },
  { value: "games", label: "Games" },
  { value: "icons", label: "Icons" },
  { value: "sports", label: "Sports" },
  { value: "rocks", label: "Rocks" },
  { value: "ad-icons", label: "Ad Icons" },
  { value: "animation", label: "Animation" },
  { value: "movies", label: "Movies" },
];

const fallbackFigures: Product[] = [
  {
    id: "darth-vader",
    name: "Darth Vader",
    image: "/images/DarthVader/DarthVader.png",
    price: 15,
    badge: "Latest Arrival",
    stock: 1,
    category: "Star Wars",
  },
  {
    id: "deadpool",
    name: "Deadpool",
    image: "/images/Deadpool/Deadpool.png",
    price: 15,
    badge: "Latest Arrival",
    stock: 1,
    category: "Marvel",
  },
  {
    id: "spider-man",
    name: "Spider-Man",
    image: "/images/Spiderman/Spiderman.png",
    price: 15,
    badge: "Latest Arrival",
    stock: 1,
    category: "Marvel",
  },
];

export default function Home() {
  const [products, setProducts] =
    useState<Product[]>(fallbackFigures);

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [category, setCategory] = useState("home");
  const [inStockOnly, setInStockOnly] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSearch(params.get("search") || "");
    setSort(params.get("sort") || "newest");
    setInStockOnly(params.get("stock") === "1");
  }, []);

  useEffect(() => {
    const loadProducts = async () => {
      if (!supabase) return;

      const { data, error } = await supabase
        .from("products")
        .select(
          `
          id,
          name,
          image,
          image_2,
          image_3,
          image_4,
          image_5,
          image_6,
          price,
          product_number,
          badge,
          stock,
          category,
          is_chase,
          is_vaulted,
          is_exclusive,
          is_offer
        `
        )
        .order("created_at", {
          ascending: false,
        });

      if (!error && data && data.length > 0) {
        setProducts(data);
      }

      if (error) {
        console.error(
          "Error loading products:",
          error
        );
      }
    };

    loadProducts();
  }, []);

  useEffect(() => {
    const updateCategory = () => {
      const hash =
        window.location.hash.replace("#", "");

      const validCategories = [
        "chase",
        "vaulted",
        "exclusives",
        "offers",
        "marvel",
        "dc",
        "starwars",
        "anime",
        "television",
        "disney",
        "games",
        "icons",
        "sports",
        "rocks",
        "ad-icons",
        "animation",
        "movies",
      ];

      if (validCategories.includes(hash)) {
        setCategory(hash);
      } else {
        setCategory("home");
      }
    };

    updateCategory();

    window.addEventListener(
      "hashchange",
      updateCategory
    );

    return () => {
      window.removeEventListener(
        "hashchange",
        updateCategory
      );
    };
  }, []);

  function selectCategory(value: string) {
    setCategory(value);
    window.location.hash = value === "home" ? "" : value;

    setTimeout(() => {
      document.getElementById("shop")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 50);
  }

  const getCategoryProducts = () => {
    if (category === "chase") {
      return products.filter(
        (product) =>
          product.is_chase === true
      );
    }

    if (category === "vaulted") {
      return products.filter(
        (product) =>
          product.is_vaulted === true
      );
    }

    if (category === "exclusives") {
      return products.filter(
        (product) =>
          product.is_exclusive === true
      );
    }

    if (category === "offers") {
      return products.filter(
        (product) =>
          product.is_offer === true
      );
    }

    if (category === "marvel") {
      return products.filter(
        (product) =>
          product.category?.toLowerCase() ===
          "marvel"
      );
    }

    if (category === "dc") {
      return products.filter(
        (product) =>
          product.category?.toLowerCase() ===
          "dc"
      );
    }

    if (category === "starwars") {
      return products.filter(
        (product) =>
          product.category?.toLowerCase() ===
          "star wars"
      );
    }

    if (category === "anime") {
      return products.filter(
        (product) =>
          product.category?.toLowerCase() ===
          "anime"
      );
    }

    if (category === "television") {
      return products.filter(
        (product) =>
          product.category?.toLowerCase() ===
          "television"
      );
    }

    if (category === "disney") {
      return products.filter(
        (product) =>
          product.category?.toLowerCase() ===
          "disney"
      );
    }

    if (category === "games") {
      return products.filter(
        (product) =>
          product.category?.toLowerCase() ===
          "games"
      );
    }

    if (category === "icons") {
      return products.filter(
        (product) =>
          product.category?.toLowerCase() ===
          "icons"
      );
    }

    if (category === "sports") {
      return products.filter(
        (product) =>
          product.category?.toLowerCase() ===
          "sports"
      );
    }

    if (category === "rocks") {
      return products.filter(
        (product) =>
          product.category?.toLowerCase() ===
          "rocks"
      );
    }

    if (category === "ad-icons") {
      return products.filter(
        (product) =>
          product.category?.toLowerCase() ===
          "ad icons"
      );
    }

    if (category === "animation") {
      return products.filter(
        (product) =>
          product.category?.toLowerCase() ===
          "animation"
      );
    }

    if (category === "movies") {
      return products.filter(
        (product) =>
          product.category?.toLowerCase() ===
          "movies"
      );
    }

    return products;
  };

  const searchTerm = search.trim().toLowerCase();

  const filteredProducts =
    (searchTerm ? products : getCategoryProducts())
      .filter((product) => {
        if (!searchTerm) return true;

        const nameMatches = product.name
          .toLowerCase()
          .includes(searchTerm);

        const numberMatches =
          product.product_number !== null &&
          product.product_number !== undefined &&
          String(product.product_number).includes(
            searchTerm
          );

        return nameMatches || numberMatches;
      })
      .filter((product) =>
        inStockOnly ? product.stock > 0 : true
      )
      .sort((a, b) => {
        if (sort === "low") {
          return (
            Number(a.price) -
            Number(b.price)
          );
        }

        if (sort === "high") {
          return (
            Number(b.price) -
            Number(a.price)
          );
        }

        return 0;
      });

  const categoryTitle =
    category === "chase"
      ? "🎯 Chase Pops"
      : category === "vaulted"
      ? "🔒 Vaulted Pops"
      : category === "exclusives"
      ? "⭐ Exclusives"
      : category === "offers"
      ? "🔥 This Week's Offers"
      : category === "marvel"
      ? "🦸 Marvel Pops"
      : category === "dc"
      ? "🦇 DC Pops"
      : category === "starwars"
      ? "⭐ Star Wars Pops"
      : category === "anime"
      ? "🍥 Anime Pops"
      : category === "television"
      ? "📺 Television Pops"
      : category === "disney"
      ? "🏰 Disney Pops"
      : category === "games"
      ? "🎮 Games Pops"
      : category === "icons"
      ? "🌟 Icons Pops"
      : category === "sports"
      ? "⚽ Sports Pops"
      : category === "rocks"
      ? "🎸 Rocks Pops"
      : category === "ad-icons"
      ? "📢 Ad Icons Pops"
      : category === "animation"
      ? "🎨 Animation Pops"
      : category === "movies"
      ? "🎬 Movies Pops"
      : "⭐ Latest Arrivals";

  const renderProductCard = (
    product: Product,
    defaultBadge: string
  ) => (
    <ProductCard
      key={product.id}
      id={product.id}
      name={product.name}
      image={product.image}
      image_2={product.image_2}
      image_3={product.image_3}
      image_4={product.image_4}
      image_5={product.image_5}
      image_6={product.image_6}
      price={`£${Number(
        product.price
      ).toFixed(2)}`}
      badge={
        product.badge ||
        defaultBadge
      }
    />
  );

  return (
    <>
      <Header />

      <main>
        {category === "home" && <Hero />}

        <section
          className="products-section"
          id="shop"
        >
          <h2 className="section-title">
            {categoryTitle}
          </h2>

          {filteredProducts.length > 0 ? (
            <div className="figure-grid">
              {filteredProducts.map(
                (product) =>
                  renderProductCard(
                    product,
                    "Latest Arrival"
                  )
              )}
            </div>
          ) : (
            <div
              style={{
                textAlign: "center",
                padding: "50px 20px",
                color: "#94a3b8",
              }}
            >
              <h3
                style={{
                  color: "#ffffff",
                  fontSize: "24px",
                  marginBottom: "10px",
                }}
              >
                No Funko Pops found
              </h3>

              <p>
                There are no Pops in this
                collection yet.
              </p>
            </div>
          )}
        </section>

        {category === "home" && (
          <>
            <section
              className="products-section"
              id="chase"
            >
              <h2 className="section-title">
                🎯 Chase Pops
              </h2>

              <div className="figure-grid">
                {products
                  .filter(
                    (product) =>
                      product.is_chase === true
                  )
                  .map((product) =>
                    renderProductCard(
                      product,
                      "Chase"
                    )
                  )}
              </div>
            </section>

            <section
              className="products-section"
              id="vaulted"
            >
              <h2 className="section-title">
                🔒 Vaulted Pops
              </h2>

              <div className="figure-grid">
                {products
                  .filter(
                    (product) =>
                      product.is_vaulted === true
                  )
                  .map((product) =>
                    renderProductCard(
                      product,
                      "Vaulted"
                    )
                  )}
              </div>
            </section>

            <section
              className="products-section"
              id="exclusives"
            >
              <h2 className="section-title">
                ⭐ Exclusives
              </h2>

              <div className="figure-grid">
                {products
                  .filter(
                    (product) =>
                      product.is_exclusive === true
                  )
                  .map((product) =>
                    renderProductCard(
                      product,
                      "Exclusive"
                    )
                  )}
              </div>
            </section>

            <section
              className="products-section"
              id="offers"
            >
              <h2 className="section-title">
                🔥 This Week's Offers
              </h2>

              <div className="figure-grid">
                {products
                  .filter(
                    (product) =>
                      product.is_offer === true
                  )
                  .map((product) =>
                    renderProductCard(
                      product,
                      "Special Offer"
                    )
                  )}
              </div>
            </section>

            <section className="products-section">
              <h2 className="section-title">
                🛍️ Browse Our Collections
              </h2>

              <div className="collection-grid">
                <div
                  className="collection marvel"
                  onClick={() => selectCategory("marvel")}
                  style={{
                    cursor: "pointer",
                  }}
                >
                  <h2>Marvel</h2>
                  <p>
                    Spider-Man, Deadpool,
                    Avengers and more.
                  </p>
                </div>

                <div
                  className="collection dc"
                  onClick={() => selectCategory("dc")}
                  style={{
                    cursor: "pointer",
                  }}
                >
                  <h2>
                    DC Heroes / Comics
                  </h2>
                  <p>
                    Batman, Superman,
                    Joker and more.
                  </p>
                </div>

                <div
                  className="collection starwars"
                  onClick={() => selectCategory("starwars")}
                  style={{
                    cursor: "pointer",
                  }}
                >
                  <h2>Star Wars</h2>
                  <p>
                    Jedi, Sith,
                    Mandalorians and more.
                  </p>
                </div>

                <div
                  className="collection anime"
                  onClick={() => selectCategory("anime")}
                  style={{
                    cursor: "pointer",
                  }}
                >
                  <h2>Anime</h2>
                  <p>
                    One Piece, Naruto,
                    Dragon Ball and more.
                  </p>
                </div>

                <div
                  className="collection disney"
                  onClick={() => selectCategory("disney")}
                  style={{
                    cursor: "pointer",
                  }}
                >
                  <h2>Disney</h2>
                  <p>
                    Disney and Pixar
                    favourites.
                  </p>
                </div>

                <div
                  className="collection television"
                  onClick={() => selectCategory("television")}
                  style={{
                    cursor: "pointer",
                  }}
                >
                  <h2>Television</h2>
                  <p>
                    TV favourites and
                    iconic characters.
                  </p>
                </div>

                <div
                  className="collection games"
                  onClick={() => selectCategory("games")}
                  style={{
                    cursor: "pointer",
                  }}
                >
                  <h2>Games</h2>
                  <p>
                    Popular video game
                    characters.
                  </p>
                </div>

                <div
                  className="collection icons"
                  onClick={() => selectCategory("icons")}
                  style={{
                    cursor: "pointer",
                  }}
                >
                  <h2>Icons</h2>
                  <p>
                    Famous people,
                    mascots and symbols.
                  </p>
                </div>

                <div
                  className="collection sports"
                  onClick={() => selectCategory("sports")}
                  style={{
                    cursor: "pointer",
                  }}
                >
                  <h2>Sports</h2>
                  <p>
                    Athletes and sports
                    team mascots.
                  </p>
                </div>

                <div
                  className="collection rocks"
                  onClick={() => selectCategory("rocks")}
                  style={{
                    cursor: "pointer",
                  }}
                >
                  <h2>Rocks</h2>
                  <p>
                    Famous musicians
                    and bands.
                  </p>
                </div>

                <div
                  className="collection ad-icons"
                  onClick={() => selectCategory("ad-icons")}
                  style={{
                    cursor: "pointer",
                  }}
                >
                  <h2>Ad Icons</h2>
                  <p>
                    Famous advertising
                    characters and mascots.
                  </p>
                </div>

                <div
                  className="collection animation"
                  onClick={() => selectCategory("animation")}
                  style={{
                    cursor: "pointer",
                  }}
                >
                  <h2>Animation</h2>
                  <p>
                    Cartoon and animated
                    characters.
                  </p>
                </div>

                <div
                  className="collection movies"
                  onClick={() => selectCategory("movies")}
                  style={{
                    cursor: "pointer",
                  }}
                >
                  <h2>Movies</h2>
                  <p>
                    Characters from
                    feature films.
                  </p>
                </div>
              </div>
            </section>
          </>
        )}
      </main>

        <div
          className="shop-sticky-filters"
          style={{
            position: "relative",
            top: "0",
            zIndex: 9999,
            left: 0,
            width: "100%",
            background: "#0f172a",
            padding: "14px 10px 16px",
            borderBottom: "1px solid #334155",
          }}
        >
            <div
              style={{
                display: "flex",
                gap: "10px",
                justifyContent: "center",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <input
                type="text"
                placeholder="🔎 Search Funko Pops..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: "300px",
                  maxWidth: "90vw",
                  padding: "13px 16px",
                  borderRadius: "12px",
                  border: "1px solid #475569",
                  background: "#1e293b",
                  color: "#ffffff",
                  fontSize: "16px",
                  outline: "none",
                }}
              />

              <select
                value={category}
                onChange={(e) => selectCategory(e.target.value)}
                style={{
                  padding: "13px 16px",
                  borderRadius: "12px",
                  border: "1px solid #475569",
                  background: "#1e293b",
                  color: "#ffffff",
                  fontSize: "16px",
                  cursor: "pointer",
                }}
              >
                {categories.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>

              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                style={{
                  padding: "13px 16px",
                  borderRadius: "12px",
                  border: "1px solid #475569",
                  background: "#1e293b",
                  color: "#ffffff",
                  fontSize: "16px",
                  cursor: "pointer",
                }}
              >
                <option value="newest">Newest First</option>
                <option value="low">Price: Low to High</option>
                <option value="high">Price: High to Low</option>
              </select>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "7px",
                  padding: "12px 14px",
                  borderRadius: "10px",
                  background: inStockOnly ? "#166534" : "#1e293b",
                  border: "1px solid #475569",
                  cursor: "pointer",
                  fontWeight: "700",
                  whiteSpace: "nowrap",
                }}
              >
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => setInStockOnly(e.target.checked)}
                />
                🟢 In Stock
              </label>

              {(search ||
                category !== "home" ||
                sort !== "newest" ||
                inStockOnly) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setSort("newest");
                    setInStockOnly(false);
                    selectCategory("home");
                  }}
                  style={{
                    padding: "12px 16px",
                    border: "none",
                    borderRadius: "10px",
                    background: "#dc2626",
                    color: "#ffffff",
                    fontWeight: "800",
                    cursor: "pointer",
                  }}
                >
                  ✕ Clear
                </button>
              )}
            </div>
        </div>


      <Footer />
    </>
  );
}
