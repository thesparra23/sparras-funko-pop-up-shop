import Link from "next/link";

const links = [
  { href: "/admin", label: "➕ Add Product" },
  { href: "/admin/manage", label: "📦 Manage Products" },
  { href: "/admin/orders", label: "🛒 Orders" },
  { href: "/admin/ebay-sync", label: "🔄 eBay Stock Sync" },
];

export default function AdminNav() {
  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "#111827",
        borderBottom: "1px solid #334155",
        padding: "12px 20px",
      }}
    >
      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            color: "#ffffff",
            fontWeight: "900",
            fontSize: "18px",
            marginRight: "8px",
          }}
        >
          ⚡ Admin
        </div>

        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            style={{
              background: "#1e293b",
              color: "#ffffff",
              padding: "10px 14px",
              borderRadius: "8px",
              textDecoration: "none",
              fontWeight: "700",
              border: "1px solid #334155",
            }}
          >
            {link.label}
          </Link>
        ))}

        <a
          href="/"
          style={{
            marginLeft: "auto",
            background: "#22c55e",
            color: "#052e16",
            padding: "10px 14px",
            borderRadius: "8px",
            textDecoration: "none",
            fontWeight: "800",
          }}
        >
          🏠 View Shop
        </a>
      </div>
    </nav>
  );
}
