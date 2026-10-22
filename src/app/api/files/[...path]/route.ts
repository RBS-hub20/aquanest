import { readFile } from "node:fs/promises";
import path from "node:path";

const TYPES: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif", heic: "image/heic" };

/** Serves demo-mode uploads from ./uploads (Supabase Storage URLs are used when configured). */
export async function GET(_req: Request, { params }: { params: { path: string[] } }) {
  const root = path.join(process.cwd(), "uploads");
  const file = path.normalize(path.join(root, ...params.path));
  if (!file.startsWith(root + path.sep)) return new Response("Not found", { status: 404 });
  try {
    const data = await readFile(file);
    const ext = file.split(".").pop()?.toLowerCase() ?? "";
    return new Response(data, { headers: { "Content-Type": TYPES[ext] ?? "application/octet-stream", "Cache-Control": "public, max-age=31536000, immutable" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
