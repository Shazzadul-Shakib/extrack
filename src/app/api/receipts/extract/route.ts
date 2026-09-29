import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getActiveLlmCredential, extractReceiptExpenses, LlmExtractionError } from "@/lib/llm";

export const maxDuration = 60;

const MAX_BYTES = 8 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

// getCurrentUser(), not requireUser() — requireUser() redirects to /login on no session, which
// a fetch()-based client call would follow and receive an HTML page where JSON was expected.
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const credential = await getActiveLlmCredential(user.id);
  if (!credential) return NextResponse.json({ error: "no_provider_configured" }, { status: 400 });

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("image");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "missing_image" }, { status: 400 });
  }
  if (!ACCEPTED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "unsupported_type" }, { status: 415 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "file_too_large" }, { status: 413 });
  }

  // Lives only in this function's memory — never written to disk, DB, or any blob store.
  const imageBase64 = Buffer.from(await file.arrayBuffer()).toString("base64");

  try {
    const result = await extractReceiptExpenses(credential.provider, credential.apiKey, imageBase64, file.type);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof LlmExtractionError) {
      const status =
        error.code === "invalid_key"
          ? 401
          : error.code === "rate_limited"
            ? 429
            : error.code === "quota_exceeded"
              ? 402
              : 502;
      return NextResponse.json({ error: error.code, message: error.message }, { status });
    }
    console.error("[receipts/extract] unexpected error:", error);
    return NextResponse.json({ error: "unknown_error" }, { status: 500 });
  }
}
