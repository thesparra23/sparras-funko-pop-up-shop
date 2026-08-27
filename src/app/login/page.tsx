"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setLoading(true);

    const supabase = createClient();

    const { error: loginError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (loginError) {
      setError(loginError.message);
      setLoading(false);
      return;
    }

    router.replace("/admin");
    router.refresh();
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#070b18",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "460px",
          background: "#111827",
          border: "1px solid #273449",
          borderRadius: "20px",
          padding: "40px",
          boxShadow: "0 25px 60px rgba(0,0,0,0.4)",
        }}
      >
        <div
          style={{
            textAlign: "center",
            marginBottom: "32px",
          }}
        >
          <div
            style={{
              fontSize: "14px",
              fontWeight: 800,
              letterSpacing: "3px",
              color: "#8b5cf6",
              marginBottom: "12px",
            }}
          >
            SPARRA'S FUNKO POP SHOP
          </div>

          <h1
            style={{
              margin: 0,
              color: "#ffffff",
              fontSize: "32px",
              fontWeight: 800,
            }}
          >
            Admin Login
          </h1>

          <p
            style={{
              color: "#94a3b8",
              marginTop: "10px",
              marginBottom: 0,
            }}
          >
            Sign in to manage your shop.
          </p>
        </div>

        <form onSubmit={handleLogin}>
          <label
            style={{
              display: "block",
              color: "#e2e8f0",
              fontWeight: 700,
              marginBottom: "8px",
            }}
          >
            Email
          </label>

          <input
            type="email"
            value={email}
            onChange={(event) =>
              setEmail(event.target.value)
            }
            required
            autoComplete="email"
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "14px 16px",
              borderRadius: "10px",
              border: "1px solid #334155",
              background: "#0f172a",
              color: "#ffffff",
              fontSize: "16px",
              marginBottom: "20px",
              outline: "none",
            }}
          />

          <label
            style={{
              display: "block",
              color: "#e2e8f0",
              fontWeight: 700,
              marginBottom: "8px",
            }}
          >
            Password
          </label>

          <input
            type="password"
            value={password}
            onChange={(event) =>
              setPassword(event.target.value)
            }
            required
            autoComplete="current-password"
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "14px 16px",
              borderRadius: "10px",
              border: "1px solid #334155",
              background: "#0f172a",
              color: "#ffffff",
              fontSize: "16px",
              marginBottom: "20px",
              outline: "none",
            }}
          />

          {error && (
            <div
              style={{
                background: "#451a1a",
                border: "1px solid #7f1d1d",
                color: "#fecaca",
                padding: "12px 14px",
                borderRadius: "10px",
                marginBottom: "20px",
                fontSize: "14px",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              border: "none",
              borderRadius: "10px",
              padding: "15px",
              background: loading
                ? "#475569"
                : "#7c3aed",
              color: "#ffffff",
              fontSize: "17px",
              fontWeight: 800,
              cursor: loading
                ? "default"
                : "pointer",
            }}
          >
            {loading
              ? "Signing in..."
              : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}