import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { isCloudinaryConfigured, uploadBuffer } from "@/lib/cloudinary";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

/* POST /api/admin/upload — multipart form-data with a `file` field.
   Uploads the image to Cloudinary and returns { url }.
   Admin-only: an open upload endpoint would let anyone spend the owner's
   Cloudinary quota. */
export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  if (!isCloudinaryConfigured()) {
    return NextResponse.json(
      { error: "Image uploads are not configured yet (missing CLOUDINARY_* variables)." },
      { status: 503 }
    );
  }
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form-data." }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "No file attached." }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Only image files can be uploaded." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image must be under 8 MB." }, { status: 400 });
  }
  const folder = typeof form.get("folder") === "string" && (form.get("folder") as string).trim()
    ? `sofora/${(form.get("folder") as string).trim()}`
    : "sofora/uploads";
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const name = (file as File).name || "upload.jpg";
    const url = await uploadBuffer(buf, name, folder);
    return NextResponse.json({ url });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upload failed." },
      { status: 502 }
    );
  }
}
