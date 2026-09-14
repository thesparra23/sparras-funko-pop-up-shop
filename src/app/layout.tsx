import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "../context/CartContext";

export const metadata: Metadata = {
  title: "Sparra's Funko Pop Shop",
  description:
    "Chase, Grails, Exclusives, Vaulted and Limited Edition Funko Pops.",
  verification: {
    google: "j08sVWQGGU_Qb779SA_PWHgEw33AuQffaPalZYDNt1o",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <CartProvider>
          {children}
        </CartProvider>
      </body>
    </html>
  );
}
