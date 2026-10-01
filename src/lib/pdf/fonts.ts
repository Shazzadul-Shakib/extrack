import path from "node:path";
import { Font } from "@react-pdf/renderer";

/**
 * Font family stack for the statement. Noto Sans covers Latin text, Noto Sans Bengali covers
 * বাংলা, digits in Bangla and the ৳ sign (which Noto Sans lacks) — react-pdf walks the stack
 * glyph by glyph, so a mixed line renders correctly. The PDF built-in fonts have neither.
 *
 * Paths are written out literally from `process.cwd()` so Next's file tracing bundles the font
 * files into the serverless function.
 */
export const STATEMENT_FONT: string[] = ["Noto Sans", "Noto Sans Bengali"];

let registered = false;

export function registerStatementFonts() {
  if (registered) return;
  registered = true;

  Font.register({
    family: "Noto Sans",
    fonts: [
      { src: path.join(process.cwd(), "src/lib/pdf/fonts/NotoSans-Regular.ttf"), fontWeight: 400 },
      { src: path.join(process.cwd(), "src/lib/pdf/fonts/NotoSans-Bold.ttf"), fontWeight: 700 },
    ],
  });
  Font.register({
    family: "Noto Sans Bengali",
    fonts: [
      { src: path.join(process.cwd(), "src/lib/pdf/fonts/NotoSansBengali-Regular.ttf"), fontWeight: 400 },
      { src: path.join(process.cwd(), "src/lib/pdf/fonts/NotoSansBengali-Bold.ttf"), fontWeight: 700 },
    ],
  });
  // Never insert hyphens mid-word — in a money table it reads as a minus sign.
  Font.registerHyphenationCallback((word) => [word]);
}
