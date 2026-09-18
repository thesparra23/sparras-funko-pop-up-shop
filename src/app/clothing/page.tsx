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

export default function ClothingPage() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const loadProducts = async () => {
      if (!supabase) return;

      const { data, error } = await supabase
        .from("products")
        .select("id, name, image, price, badge, stock")
        .eq("category", "Clothing")
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
            background:
              "linear-gradient(135deg, #111827 0%, #1f2937 50%, #111827 100%)",
          }}
        >
          <h1
            className="section-title"
            style={{
              textAlign: "center",
              color: "#ffffff",
            }}
          >
            👕 Clothing
          </h1>

          <p
            style={{
              textAlign: "center",
              color: "#cbd5e1",
              fontSize: "20px",
              marginBottom: "50px",
              fontWeight: 600,
            }}
          >
            Collectible clothing and merchandise from Sparra's Funko Pop Shop.
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
                  badge={product.badge || "Clothing"}
                />
              ))}
            </div>
          ) : (
            <p
              style={{
                textAlign: "center",
                color: "#cbd5e1",
                fontSize: "20px",
                marginTop: "70px",
                fontWeight: 600,
              }}
            >
              No Clothing available yet.
            </p>
          )}
        </section>
      </main>

      <Footer />
    </>
  );
}