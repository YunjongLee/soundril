import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Soundril - AI Audio Tools";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0a0a0f",
          gap: 20,
        }}
      >
        {/* AudioLines icon */}
        <svg
          width="64"
          height="64"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#8249DF"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2 10v3" />
          <path d="M6 6v11" />
          <path d="M10 3v18" />
          <path d="M14 8v7" />
          <path d="M18 5v13" />
          <path d="M22 10v3" />
        </svg>
        <span
          style={{
            fontSize: 64,
            fontWeight: 700,
            color: "#fafafa",
            letterSpacing: "-0.02em",
          }}
        >
          Soundril
        </span>
      </div>
    ),
    { ...size }
  );
}
