"use client";

import { useState } from "react";

export default function BestOfferPage() {
  const [running, setRunning] = useState(false);
  const [processed, setProcessed] = useState(0);
  const [total, setTotal] = useState(0);
  const [updated, setUpdated] = useState(0);
  const [already, setAlready] = useState(0);
  const [failed, setFailed] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [message, setMessage] = useState("");

  async function enableBestOffer() {
    if (running) return;

    setRunning(true);
    setProcessed(0);
    setTotal(0);
    setUpdated(0);
    setAlready(0);
    setFailed(0);
    setErrors([]);
    setMessage("Starting Best Offer update...");

    let offset = 0;
    let finished = false;
    let totalCount = 0;

    try {
      while (!finished) {
        const response = await fetch("/api/ebay/best-offer-all", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ offset, limit: 20 }),
          cache: "no-store",
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error || "eBay Best Offer update failed.");
        }

        totalCount = Number(data.total) || totalCount;
        setTotal(totalCount);
        setProcessed(Number(data.processed) || 0);
        setUpdated((value) => value + (Number(data.updated) || 0));
        setAlready((value) => value + (Number(data.already) || 0));
        setFailed((value) => value + (Number(data.failed) || 0));

        if (Array.isArray(data.errors) && data.errors.length) {
          setErrors((current) => [
            ...current,
            ...data.errors.map((item: { offerId: string; error: string }) => `${item.offerId}: ${item.error}`),
          ]);
        }

        finished = Boolean(data.done);
        if (!finished) {
          offset = Number(data.nextOffset);
        }

        setMessage(finished ? "Finished updating eBay listings." : `Updating eBay listings ${data.processed} of ${data.total}...`);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unexpected error while updating eBay listings.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", background: "#0f172a", color: "#fff", padding: "40px 20px 80px" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "42px", marginBottom: "10px" }}>🏷️ eBay Best Offer</h1>
        <p style={{ color: "#94a3b8", fontSize: "18px" }}>
          Turn Best Offer on for every active eBay listing in one go.
        </p>

        <section style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "14px", padding: "25px", marginTop: "25px" }}>
          <h2 style={{ marginTop: 0 }}>Make every listing Best Offer</h2>
          <p style={{ color: "#cbd5e1", lineHeight: 1.6 }}>
            This will process your eBay listings in small batches. Listings that already have Best Offer enabled are left alone. Failed listings are reported at the end so nothing is hidden from you.
          </p>

          <button
            type="button"
            onClick={enableBestOffer}
            disabled={running}
            style={{
              width: "100%",
              background: running ? "#64748b" : "#22c55e",
              color: "#052e16",
              border: "none",
              padding: "18px 20px",
              borderRadius: "10px",
              fontSize: "20px",
              fontWeight: "900",
              cursor: running ? "not-allowed" : "pointer",
              marginTop: "20px",
            }}
          >
            {running ? `⏳ Updating ${processed}/${total || "..."}...` : "🏷️ MAKE EVERY EBAY LISTING BEST OFFER"}
          </button>

          {message && (
            <div style={{ background: "#0f172a", border: "1px solid #334155", padding: "15px", borderRadius: "8px", marginTop: "20px" }}>
              {message}
            </div>
          )}

          {(processed > 0 || updated > 0 || already > 0 || failed > 0) && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px", marginTop: "20px" }}>
              <Stat label="Processed" value={`${processed}${total ? ` / ${total}` : ""}`} />
              <Stat label="Updated" value={updated} />
              <Stat label="Already enabled" value={already} />
              <Stat label="Failed" value={failed} />
            </div>
          )}

          {errors.length > 0 && (
            <div style={{ marginTop: "25px" }}>
              <h3>Listings needing attention</h3>
              <ul style={{ color: "#fca5a5", lineHeight: 1.6 }}>
                {errors.map((error, index) => <li key={`${error}-${index}`}>{error}</li>)}
              </ul>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: "10px", padding: "15px" }}>
      <div style={{ color: "#94a3b8", fontSize: "13px", fontWeight: "700", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: "26px", fontWeight: "900", marginTop: "4px" }}>{value}</div>
    </div>
  );
}
