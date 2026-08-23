"use client";

export default function Hero() {
  const scrollToSection = (id: string) => {
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      className="hero"
      style={{
        position: "relative",
        minHeight: "560px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        background:
          "radial-gradient(circle at center, #111c2b 0%, #050910 55%, #02050a 100%)",
      }}
    >
      {/* LEFT SMOKE */}
      <div
        style={{
          position: "absolute",
          left: "-80px",
          top: "0",
          bottom: "0",
          width: "38%",
          opacity: 0.65,
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse at 20% 55%, rgba(180,190,205,0.18) 0%, rgba(100,110,125,0.10) 25%, transparent 65%)",
          filter: "blur(18px)",
        }}
      />

      {/* RIGHT SMOKE */}
      <div
        style={{
          position: "absolute",
          right: "-80px",
          top: "0",
          bottom: "0",
          width: "38%",
          opacity: 0.65,
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse at 80% 55%, rgba(180,190,205,0.18) 0%, rgba(100,110,125,0.10) 25%, transparent 65%)",
          filter: "blur(18px)",
        }}
      />

      {/* SMOKE CURLS */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          opacity: 0.35,
          background:
            "radial-gradient(ellipse at 8% 45%, rgba(210,215,225,0.22) 0%, transparent 22%), radial-gradient(ellipse at 92% 45%, rgba(210,215,225,0.22) 0%, transparent 22%), radial-gradient(ellipse at 12% 85%, rgba(150,160,175,0.15) 0%, transparent 25%), radial-gradient(ellipse at 88% 85%, rgba(150,160,175,0.15) 0%, transparent 25%)",
          filter: "blur(8px)",
        }}
      />

      {/* HERO CONTENT */}
      <div
        className="hero-content"
        style={{
          position: "relative",
          zIndex: 2,
          width: "100%",
          maxWidth: "1100px",
          textAlign: "center",
          padding: "70px 25px 80px",
          boxSizing: "border-box",
        }}
      >
        {/* BADGE */}
        <div
          className="hero-tag"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#ffd21c",
            color: "#05070b",
            padding: "14px 30px",
            borderRadius: "40px",
            fontSize: "20px",
            fontWeight: "800",
            marginBottom: "32px",
            boxShadow: "0 5px 20px rgba(0,0,0,0.35)",
          }}
        >
          ⭐ New Arrivals Every Week
        </div>

        {/* HEADING */}
        <h1
          style={{
            margin: "0 auto",
            maxWidth: "1050px",
            color: "#ffffff",
            fontSize: "58px",
            lineHeight: "1.05",
            fontWeight: "900",
            letterSpacing: "-1.5px",
            textShadow: "0 4px 15px rgba(0,0,0,0.5)",
          }}
        >
          The Home of Chase, Grails &
          <br />
          Exclusive Funko Pops
        </h1>

        {/* DESCRIPTION */}
        <p
          style={{
            margin: "30px auto 0",
            maxWidth: "900px",
            color: "#d7dde7",
            fontSize: "21px",
            lineHeight: "1.55",
            fontWeight: "500",
          }}
        >
          Browse hundreds of genuine Funko Pops including Chase variants,
          Vaulted figures, Exclusives and Limited Editions.
        </p>

        {/* BUTTONS */}
        <div
          className="hero-buttons"
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "18px",
            marginTop: "38px",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            className="primary-btn"
            onClick={() => scrollToSection("latest-arrivals")}
            style={{
              background: "#ffd21c",
              color: "#05070b",
              border: "none",
              borderRadius: "30px",
              padding: "16px 32px",
              fontSize: "18px",
              fontWeight: "800",
              cursor: "pointer",
              minWidth: "190px",
              boxShadow: "0 5px 18px rgba(0,0,0,0.35)",
            }}
          >
            🏷️ Shop Now
          </button>

          <button
            type="button"
            className="secondary-btn"
            onClick={() => scrollToSection("latest-arrivals")}
            style={{
              background: "#171f2d",
              color: "#ffffff",
              border: "none",
              borderRadius: "30px",
              padding: "16px 32px",
              fontSize: "18px",
              fontWeight: "800",
              cursor: "pointer",
              minWidth: "240px",
              boxShadow: "0 5px 18px rgba(0,0,0,0.3)",
            }}
          >
            ⭐ View Latest Arrivals
          </button>
        </div>
      </div>
    </section>
  );
}