"use client";

import { useState } from "react";

export default function EbaySyncPage() {
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");
  const [details, setDetails] = useState<any>(null);
  const [resyncingImages, setResyncingImages] = useState(false);

  async function resyncImages() {
    if (resyncingImages || syncing) return;
    if (!window.confirm("Update the photos on all your existing eBay listings using the photos saved on the website?\n\nThis will not create new listings or change prices/stock.")) return;
    setResyncingImages(true);
    setMessage("⏳ Updating photos on existing eBay listings...");
    setDetails(null);
    try {
      const response = await fetch("/api/ebay/resync-images", { method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store" });
      const data = await response.json();
      if (!response.ok) { setMessage(`❌ ${data?.error || "eBay photo resync failed."}`); return; }
      setDetails(data);
      setMessage(`✅ Photo resync complete. ${data.updated || 0} listing${data.updated === 1 ? "" : "s"} updated, ${data.skipped || 0} skipped and ${data.failed || 0} failed.`);
    } catch (error) {
      setMessage(`❌ ${error instanceof Error ? error.message : "Unexpected photo resync error."}`);
    } finally { setResyncingImages(false); }
  }

  async function syncNow() {
    if (syncing) return;

    setSyncing(true);
    setMessage("⏳ Checking eBay and synchronising stock...");
    setDetails(null);

    try {
      const response = await fetch("/api/ebay/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ebayToWebsite: true }),
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(`❌ ${data?.error || "eBay sync failed."}`);
        return;
      }

      setDetails(data);

      const changed = Array.isArray(data.stock)
        ? data.stock.filter((item: any) => item.changed).length
        : 0;
      const imported = Number(data.orders?.imported || 0);

      setMessage(
        `✅ Sync complete. ${changed} stock item${changed === 1 ? "" : "s"} changed and ${imported} new eBay order${imported === 1 ? "" : "s"} imported.`
      );
    } catch (error) {
      setMessage(
        `❌ ${error instanceof Error ? error.message : "Unexpected sync error."}`
      );
    } finally {
      setSyncing(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0f172a",
        color: "#ffffff",
        padding: "40px 30px 80px",
      }}
    >
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <div style={{ marginBottom: "30px" }}>
          <a
            href="/admin/manage"
            style={{
              color: "#94a3b8",
              textDecoration: "none",
              fontWeight: "700",
            }}
          >
            ← Back to Manage Products
          </a>
          <h1 style={{ fontSize: "42px", margin: "20px 0 8px" }}>
            🔄 eBay Stock Sync
          </h1>
          <p style={{ color: "#94a3b8", fontSize: "18px" }}>
            Keep your website stock and your live eBay listings in step.
          </p>
        </div>

        <div
          style={{
            background: "#1e293b",
            border: "1px solid #334155",
            borderRadius: "16px",
            padding: "30px",
          }}
        >
          <h2 style={{ marginTop: 0 }}>What this does</h2>
          <ul style={{ color: "#cbd5e1", lineHeight: 1.8 }}>
            <li>Reads the current quantity from your live eBay listings.</li>
            <li>Updates the website stock when eBay has changed.</li>
            <li>Imports recent eBay orders into the admin orders list.</li>
            <li>Website sales continue to push the new quantity to eBay automatically.</li>
            <li>Existing eBay listings can have their photos updated from the website.</li>
          </ul>

          <button
            type="button"
            onClick={syncNow}
            disabled={syncing}
            style={{
              marginTop: "20px",
              background: syncing ? "#64748b" : "#facc15",
              color: "#111827",
              border: "none",
              padding: "15px 24px",
              borderRadius: "10px",
              fontSize: "17px",
              fontWeight: "800",
              cursor: syncing ? "not-allowed" : "pointer",
            }}
          >
            {syncing ? "⏳ Syncing..." : "🔄 Sync eBay Now"}
          </button>

          <button
            type="button"
            onClick={resyncImages}
            disabled={syncing || resyncingImages}
            style={{ marginTop: "12px", background: resyncingImages ? "#64748b" : "#22c55e", color: "#ffffff", border: "none", padding: "15px 24px", borderRadius: "10px", fontSize: "17px", fontWeight: "800", cursor: syncing || resyncingImages ? "not-allowed" : "pointer" }}
          >
            {resyncingImages ? "⏳ Updating eBay photos..." : "📸 Update All eBay Photos"}
          </button>

          {message && (
            <div
              style={{
                marginTop: "24px",
                background: "#0f172a",
                border: "1px solid #334155",
                borderRadius: "10px",
                padding: "16px",
              }}
            >
              {message}
            </div>
          )}

          {details && (
            <details style={{ marginTop: "20px" }}>
              <summary style={{ cursor: "pointer", fontWeight: "700" }}>
                Show sync details
              </summary>
              <pre
                style={{
                  marginTop: "12px",
                  background: "#020617",
                  padding: "16px",
                  borderRadius: "10px",
                  overflowX: "auto",
                  fontSize: "12px",
                  color: "#cbd5e1",
                }}
              >
                {JSON.stringify(details, null, 2)}
              </pre>
            </details>
          )}
        </div>
      </div>
    </main>
  );
}
