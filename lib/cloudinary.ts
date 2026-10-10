/* Server-only Cloudinary upload helper (signed uploads).
   Secrets stay on the server: the browser never sees them. The admin UI
   posts files to /api/admin/upload, which calls uploadBuffer() below. */

import crypto from "crypto";

function creds() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) return null;
  return { cloudName, apiKey, apiSecret };
}

export function isCloudinaryConfigured(): boolean {
  return creds() !== null;
}

/** Upload an image buffer to Cloudinary; resolves to the secure URL. */
export async function uploadBuffer(
  buf: Buffer,
  filename: string,
  folder = "sofora/uploads"
): Promise<string> {
  const c = creds();
  if (!c) throw new Error("Cloudinary is not configured (CLOUDINARY_* env vars missing).");
  const timestamp = Math.floor(Date.now() / 1000);
  const params = `folder=${folder}&timestamp=${timestamp}`;
  const signature = crypto.createHash("sha1").update(params + c.apiSecret).digest("hex");
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(buf)]), filename);
  form.append("api_key", c.apiKey);
  form.append("timestamp", String(timestamp));
  form.append("folder", folder);
  form.append("signature", signature);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${c.cloudName}/image/upload`, {
    method: "POST",
    body: form,
  });
  const data = (await res.json().catch(() => ({}))) as { secure_url?: string; error?: { message?: string } };
  if (!res.ok || !data.secure_url) {
    throw new Error(data.error?.message || `Cloudinary upload failed (${res.status}).`);
  }
  return data.secure_url;
}
