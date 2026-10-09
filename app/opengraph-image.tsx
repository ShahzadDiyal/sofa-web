import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/* Default social share image: deep forest gradient, Sofora wordmark, COD tagline. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px 90px",
          background: "linear-gradient(135deg, #2e5247 0%, #1f3a32 55%, #1e2421 100%)",
          color: "#f6f1ea",
          fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "18px",
              background: "#b65a35",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "36px",
              fontWeight: 700,
              color: "#fff",
            }}
          >
            S
          </div>
          <div style={{ fontSize: "72px", fontWeight: 700, letterSpacing: "-2px" }}>Sofora</div>
        </div>
        <div style={{ marginTop: "28px", fontSize: "44px", fontWeight: 500, color: "#ebe3d6" }}>
          Designer sofas. Pay on delivery.
        </div>
        <div style={{ marginTop: "22px", fontSize: "26px", fontWeight: 400, color: "#a9b3ab" }}>
          Free UK delivery over £500&nbsp;&nbsp;·&nbsp;&nbsp;5-year guarantee
        </div>
      </div>
    ),
    { ...size }
  );
}
