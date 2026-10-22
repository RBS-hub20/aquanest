import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { getAdminSupabase } from "@/lib/supabase/server";

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "aquanest";
const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/heic", "image/heif"];
const MAX_BYTES = 6 * 1024 * 1024;
let bucketChecked = false;

/** Uploads an image to Supabase Storage (or ./uploads in demo mode) and returns a public URL. */
export async function uploadImage(file: File, folder: string) {
  if (!file || typeof file === "string" || file.size === 0) throw new Error("No file");
  if (file.size > MAX_BYTES) throw new Error("File too large (max 6MB)");
  if (file.type && !ALLOWED.includes(file.type)) throw new Error("Only images are allowed");

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const safeFolder = folder.replace(/[^a-z0-9-]/gi, "");
  const name = `${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY ? getAdminSupabase() : null;
  if (supabase) {
    if (!bucketChecked) {
      const { data } = await supabase.storage.getBucket(BUCKET);
      if (!data) await supabase.storage.createBucket(BUCKET, { public: true });
      bucketChecked = true;
    }
    const key = `${safeFolder}/${name}`;
    const { error } = await supabase.storage.from(BUCKET).upload(key, bytes, { contentType: file.type || "image/jpeg", upsert: false });
    if (error) throw new Error(error.message);
    return supabase.storage.from(BUCKET).getPublicUrl(key).data.publicUrl;
  }

  const dir = path.join(process.cwd(), "uploads", safeFolder);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), bytes);
  return `/api/files/${safeFolder}/${name}`;
}
