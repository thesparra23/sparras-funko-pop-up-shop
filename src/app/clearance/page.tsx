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

export default function ClearancePage() {
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
        const { data: clearanceCategory, error: clearanceError } =
          await supabase
            .from("categories")
            .select("id, name, parent_id")
            .eq("name", "Clearance")
            .is("parent_id", null)
            .maybeSingle();

        if (clearanceError) {
          console.error(
            "Error loading Clearance category:",
            clearanceError
          );
        }

        let clearanceCategories: Category[] = [];

        if (clearanceCategory) {
          const { data: childCategories, error: childError } =
            await supabase
              .from("categories")
              .select("id, name, parent_id")
              .eq("parent_id", clearanceCategory.id)
              .order("name", {
                ascending: true,
              });

          if (childError) {
            console.error(
              "Error loading Clearance subcategories:",
              childError
            );
          }

          clearanceCategories = childCategories || [];
        }

        setCategories(clearanceCategories);

        const categoryNames = [
          "Clearance",
          ...clearanceCategories.map(
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
            "Error loading clearance products:",
            error
          );
          setProducts([]);
        } else {
          setProducts(data || []);
        }
      } catch (error) {
        console.error(
          "Unexpected error loading Clearance:",
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
              "linear-gradient(rgba(15, 23, 42, 0.82), rgba(15, 23, 42, 0.82)), url('/category-backgrounds/clearance-background.png')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundAttachment: "fixed",
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

          {loading ? (
            <div
              style={{
                textAlign: "center",
                padding: "70px 20px",
                color: "#cbd5e1",
                fontSize: "20px",
                fontWeight: 600,
              }}
            >
              Loading clearance items...
            </div>
          ) : products.length > 0 ? (
            <div>
              {getProductsForCategory("Clearance").length > 0 && (
                <section
                  style={{
                    marginBottom: "55px",
                  }}
                >
                  <h2
                    style={{
                      textAlign: "center",
                      color: "#ffffff",
                      fontSize: "30px",
                      marginBottom: "25px",
                    }}
                  >
                    Clearance
                  </h2>

                  <div className="figure-grid">
                    {getProductsForCategory("Clearance").map(
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
                            product.badge || "Clearance"
                          }
                          stock={product.stock}
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
                        color: "#ffffff",
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
                          stock={product.stock}
                        />
                      ))}
                    </div>
                  </section>
                );
              })}
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