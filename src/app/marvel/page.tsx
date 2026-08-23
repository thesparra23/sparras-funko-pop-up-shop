"use client";

import Header from "../../components/Header";
import Footer from "../../components/Footer";
import ProductCard from "../../components/ProductCard";

const marvelProducts = [
  {
    id: "36c3b88f-2124-4277-9940-9b1083e6",
    name: "Deadpool",
    image: "/images/Deadpool/Deadpool.png",
    price: 15,
    badge: "Marvel",
  },
  {
    id: "ed415968-10be-485f-9641-879a3b470",
    name: "Spider-Man",
    image: "/images/Spiderman/Spiderman.png",
    price: 15,
    badge: "Marvel",
  },
];

export default function MarvelPage() {
  return (
    <>
      <Header />

      <main>
        <section className="products-section">
          <h1 className="section-title">
            🦸 Marvel Pops
          </h1>

          <p
            style={{
              textAlign: "center",
              color: "#94a3b8",
              fontSize: "18px",
              marginBottom: "40px",
            }}
          >
            Spider-Man, Deadpool, Avengers and more.
          </p>

          <div className="figure-grid">
            {marvelProducts.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                name={product.name}
                image={product.image}
                price={`£${product.price.toFixed(2)}`}
                badge={product.badge}
              />
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}