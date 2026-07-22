import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#04111D",
          color: "#F7F8F3",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 8,
              background: "#071A2B",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              color: "#55E889",
              fontWeight: 700,
            }}
          >
            B
          </div>
          <span style={{ fontSize: 28, fontWeight: 600 }}>Bazi</span>
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 48,
            fontSize: 56,
            fontWeight: 600,
            maxWidth: 880,
            lineHeight: 1.15,
          }}
        >
          Digital therapeutics are static. Patients are not.
        </div>
        <div style={{ display: "flex", marginTop: 28, fontSize: 24, color: "#66727C", maxWidth: 760 }}>
          The adaptive intelligence layer for software-based medicine.
        </div>
      </div>
    ),
    { ...size }
  );
}
