import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "exam-helper — Study from your own documents";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          background: "#fafaf7",
          fontFamily: "Georgia, serif",
        }}
      >
        <div
          style={{
            fontSize: 24,
            color: "#b8854a",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <span>exam-helper</span>
        </div>
        <div
          style={{
            fontSize: 88,
            color: "#111111",
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            maxWidth: "900px",
          }}
        >
          Study from your own documents. Retain more.
        </div>
        <div
          style={{
            fontSize: 28,
            color: "#55534e",
            fontFamily: "system-ui, sans-serif",
            maxWidth: "800px",
          }}
        >
          Flashcards, notes, and a study guide — from the AI model of your choice.
        </div>
      </div>
    ),
    { ...size }
  );
}
