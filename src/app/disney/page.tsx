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
  category?: string | null;
};

type Category = {
  id: number;
  name: string;
  parent_id: number | null;
};

export default function DisneyPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProducts = async () => {
      if (!supabase) {
        setLoading(false);
        return;
      }

      try {
        const { data: disneyCategory, error: disneyError } =
          await supabase
            .from("categories")
            .select("id, name, parent_id")
            .eq("name", "Disney")
            .is("parent_id", null)
            .maybeSingle();

        if (disneyError) {
          console.error(
            "Error loading Disney category:",
            disneyError
          );
        }

        let disneyCategories: Category[] = [];

        if (disneyCategory) {
          const { data: childCategories, error: childError } =
            await supabase
              .from("categories")
              .select("id, name, parent_id")
              .eq("parent_id", disneyCategory.id)
              .order("name", {
                ascending: true,
              });

          if (childError) {
            console.error(
              "Error loading Disney subcategories:",
              childError
            );
          }

          disneyCategories = childCategories || [];
        }

        setCategories(disneyCategories);

        const categoryNames = [
          "Disney",
          ...disneyCategories.map(
            (category) => category.name
          ),
        ];

        const { data, error } = await supabase
          .from("products")
          .select(
            "id, name, image, image_2, image_3, image_4, image_5, image_6, price, badge, stock, category"
          )
          .in("category", categoryNames)
          .order("created_at", {
            ascending: false,
          });

        if (error) {
          console.error(
            "Error loading Disney products:",
            error
          );
          setProducts([]);
        } else {
          setProducts(data || []);
        }
      } catch (error) {
        console.error(
          "Unexpected error loading Disney:",
          error
        );
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  const getProductsForCategory = (categoryName: string) => {
    return products.filter(
      (product) => product.category === categoryName
    );
  };

  return (
    <>
      <Header />

      <main>
        <section
          className="products-section"
          style={{
            paddingTop: "80px",
            minHeight: "70vh",
            backgroundImage:
              "url('/category-backgrounds/disney-background.png')",
            backgroundSize: "cover",
            backgroundPosition: "top center",
            backgroundRepeat: "repeat-y",
          }}
        >
          <h1
            className="section-title"
            style={{
              textAlign: "center",
              marginBottom: "20px",
            }}
          >
            🏰{" "}
            <span style={{ color: "#1e3a8a" }}>
              Disney
            </span>
          </h1>

          <p
            style={{
              textAlign: "center",
              color: "#334155",
              fontSize: "20px",
              marginBottom: "50px",
              fontWeight: 600,
            }}
          >
            Disney favourites, classics and collectible
            characters.
          </p>

          {loading ? (
            <div
              style={{
                textAlign: "center",
                padding: "70px 20px",
                color: "#334155",
                fontSize: "20px",
                fontWeight: 600,
              }}
            >
              Loading Disney items...
            </div>
          ) : products.length > 0 ? (
            <div>
              {getProductsForCategory("Disney").length > 0 && (
                <section
                  style={{
                    marginBottom: "55px",
                  }}
                >
                  <h2
                    style={{
                      textAlign: "center",
                      color: "#1e3a8a",
                      fontSize: "30px",
                      marginBottom: "25px",
                    }}
                  >
                    Disney
                  </h2>

                  <div className="figure-grid">
                    {getProductsForCategory("Disney").map(
                      (product) => (
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
                            product.badge || "Disney"
                          }
                        />
                      )
                    )}
                  </div>
                </section>
              )}

              {categories.map((category) => {
                const categoryProducts =
                  getProductsForCategory(category.name);

                if (categoryProducts.length === 0) {
                  return null;
                }

                return (
                  <section
                    key={category.id}
                    style={{
                      marginBottom: "55px",
                    }}
                  >
                    <h2
                      style={{
                        textAlign: "center",
                        color: "#1e3a8a",
                        fontSize: "30px",
                        marginBottom: "25px",
                        textTransform: "capitalize",
                      }}
                    >
                      {category.name}
                    </h2>

                    <div className="figure-grid">
                      {categoryProducts.map((product) => (
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
                            product.badge || category.name
                          }
                        />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          ) : (
            <p
              style={{
                textAlign: "center",
                color: "#334155",
                fontSize: "20px",
                marginTop: "70px",
                fontWeight: 600,
              }}
            >
              No Disney items available yet.
            </p>
          )}
        </section>
      </main>

      <Footer />
    </>
  );
}