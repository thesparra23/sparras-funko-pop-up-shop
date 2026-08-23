"use client";

import { useEffect, useState } from "react";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import ProductCard from "../../components/ProductCard";
import { supabase } from "../../lib/supabase";

type Product = {
  id: string;
  name: string;
  image: string;
  price: number;
  badge?: string | null;
  stock: number;
};

export default function MoviesPage() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const loadProducts = async () => {
      if (!supabase) return;

      const { data, error } = await supabase
        .from("products")
        .select("id, name, image, price, badge, stock")
        .eq("category", "Movies")
        .order("created_at", {
          ascending: false,
        });

      if (!error && data) {
        setProducts(data);
      }
    };

    loadProducts();
  }, []);

  return (
    <>
      <Header />

      <main>
        <section
          className="products-section"
          style={{
            paddingTop: "80px",
            minHeight: "70vh",
          }}
        >
          <h1 className="section-title">
            🎬 Movie Pops
          </h1>

          <p
            style={{
              textAlign: "center",
              color: "#94a3b8",
              fontSize: "20px",
              marginBottom: "50px",
            }}
          >
            Movie favourites, classics and
            collectible characters.
          </p>

          {products.length > 0 ? (
            <div className="figure-grid">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  id={product.id}
                  name={product.name}
                  image={product.image}
                  price={`£${Number(product.price).toFixed(2)}`}
                  badge={product.badge || "Movie"}
                />
              ))}
            </div>
          ) : (
            <p
              style={{
                textAlign: "center",
                color: "#94a3b8",
                fontSize: "20px",
                marginTop: "70px",
              }}
            >
              No Movie Pops available yet.
            </p>
          )}
        </section>
      </main>

      <Footer />
    </>
  );
}