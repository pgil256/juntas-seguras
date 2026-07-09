import { ImageResponse } from "next/og";

export const alt = "Juntas Seguras — community savings, made transparent";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#020617",
          color: "white",
          padding: "64px 72px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#1d4ed8",
              fontSize: 24,
              fontWeight: 800,
            }}
          >
            JS
          </div>
          <div style={{ fontSize: 30, fontWeight: 700 }}>Juntas Seguras</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ color: "#93c5fd", fontSize: 24, fontWeight: 700, letterSpacing: 2 }}>
            FULL-STACK FINTECH CASE STUDY
          </div>
          <div style={{ maxWidth: 980, marginTop: 20, fontSize: 68, lineHeight: 1.05, fontWeight: 800 }}>
            Community savings, made transparent.
          </div>
          <div style={{ marginTop: 28, color: "#cbd5e1", fontSize: 26 }}>
            Next.js · TypeScript · MongoDB · MFA · Audit logging · Automated testing
          </div>
        </div>
      </div>
    ),
    size,
  );
}
