const MAX_DIMENSION = 2800;
const JPEG_QUALITY = 0.92
const MAX_UPLOAD_BYTES = 7 * 1024 * 1024;

/**
 * Re-encodes a picked/captured photo to a size-capped JPEG before upload. This normalizes iOS
 * HEIC photos (Safari is the one common browser that can decode HEIC into a canvas) into a
 * universally-accepted format and keeps the upload well under the server's size limit. Falls
 * back to the original file if the browser can't decode it — the server's mime check then
 * produces a clear "unsupported file type" error instead of this failing silently.
 */
export async function reencodeReceiptImage(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, width, height);

    // Keep text crisp: high quality first, stepping down only if the result nears the server cap.
    let blob: Blob | null = null;
    for (const quality of [JPEG_QUALITY, 0.85, 0.75]) {
      blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
      if (!blob || blob.size <= MAX_UPLOAD_BYTES) break;
    }
    if (!blob) return file;
    return new File([blob], "receipt.jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}
