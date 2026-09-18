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
  image_2?: string | null;
  image_3?: string | null;
  image_4?: string | null;
  image_5?: string | null;
  image_6?: string | null;
  price: number;
  badge?: string | null;
  stock: number;
};

export default function ClearancePage() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const loadProducts = async () => {
      if (!supabase) return;

      const { data, error } = await supabase
        .from("products")
        .select(
          "id, name, image, image_2, image_3, image_4, image_5, image_6, price, badge, stock"
        )
        .eq("category", "Clearance")
        .order("created_at", {
          ascending: false,
        });

      if (!error && data) {
        setProducts(data);
      }

      if (error) {
        console.error("Error loading clearance items:", error);
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
              "linear-gradient(rgba(15, 23, 42, 0.92), rgba(15, 23, 42, 0.92))",
          }}
        >
          <h1
            className="section-title"
            style={{
              textAlign: "center",
              marginBottom: "20px",
            }}
          >
            🔥 Clearance Items
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
            Great prices on selected items.
          </p>

          {products.length > 0 ? (
            <div className="figure-grid">
              {products.map((product) => (
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
                  price={`£${Number(product.price).toFixed(2)}`}
                  badge={product.badge || "Clearance"}
                />
              ))}
            </div>
          ) : (
            <div
              style={{
                textAlign: "center",
                padding: "70px 20px",
                color: "#cbd5e1",
              }}
            >
              <h2
                style={{
                  color: "#ffffff",
                  fontSize: "28px",
                  marginBottom: "15px",
                }}
              >
                🔥 Clearance Items
              </h2>

              <p
                style={{
                  fontSize: "20px",
                  fontWeight: 600,
                }}
              >
                No clearance items available yet.
              </p>

              <p
                style={{
                  marginTop: "10px",
                  color: "#94a3b8",
                }}
              >
                Check back soon for new clearance items.
              </p>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </>
  );
}