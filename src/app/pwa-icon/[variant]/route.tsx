import { ImageResponse } from "next/og";

const SIZES: Record<string, { px: number; maskable: boolean }> = {
  "192": { px: 192, maskable: false },
  "512": { px: 512, maskable: false },
  // Maskable icons are cropped to a circle/squircle by the OS: full-bleed background, glyph inside the safe zone.
  maskable: { px: 512, maskable: true },
};

export async function GET(_req: Request, { params }: { params: Promise<{ variant: string }> }) {
  const { variant } = await params;
  const cfg = SIZES[variant];
  if (!cfg) return new Response("Not found", { status: 404 });

  const { px, maskable } = cfg;
  const glyph = Math.round(px * (maskable ? 0.5 : 0.69));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1c3a5e",
          borderRadius: maskable ? 0 : Math.round(px * 0.22),
        }}
      >
        <svg width={glyph} height={glyph} viewBox="0 0 24 24" fill="none">
          <path d="M5 17 L10.5 9.5 L14.5 14 L19 6" stroke="#ffffff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M19 6 L19 10.5" stroke="#ffffff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M19 6 L14.5 6" stroke="#ffffff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    ),
    { width: px, height: px },
  );
}
