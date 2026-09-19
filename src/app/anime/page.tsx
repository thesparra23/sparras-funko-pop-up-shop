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

export default function AnimePage() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const loadProducts = async () => {
      if (!supabase) return;

      const { data, error } = await supabase
        .from("products")
        .select(
          "id, name, image, image_2, image_3, image_4, image_5, image_6, price, badge, stock"
        )
        .eq("category", "Anime")
        .order("created_at", {
          ascending: false,
        });

      if (!error && data) {
        setProducts(data);
      }

      if (error) {
        console.error("Error loading Anime:", error);
      }
    };

    loadProducts();
  }, []);

  return (
    <>
      <Header />

      <main
        style={{
          minHeight: "100vh",
          backgroundImage:
            'linear-gradient(rgba(5, 8, 15, 0.72), rgba(5, 8, 15, 0.88)), url("/category-backgrounds/funkos-background.png")',
          backgroundSize: "cover",
          backgroundPosition: "center top",
          backgroundAttachment: "fixed",
        }}
      >
        <section
          className="products-section"
          style={{
            paddingTop: "80px",
            minHeight: "70vh",
            background: "transparent",
          }}
        >
          <h1
            className="section-title"
            style={{
              textAlign: "center",
              marginBottom: "20px",
            }}
          >
            🎌 Anime Pops
          </h1>

          <p
            style={{
              textAlign: "center",
              color: "#cbd5e1",
              fontSize: "20px",
              marginBottom: "50px",
            }}
          >
            One Piece, Naruto, Dragon Ball & more.
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
                  badge={product.badge || "Anime"}
                  stock={product.stock}
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
              No Anime Pops available yet.
            </p>
          )}
        </section>
      </main>

      <Footer />
    </>
  );
}