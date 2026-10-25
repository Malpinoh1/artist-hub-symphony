import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const isImage = (name: string, metadata: Record<string, unknown> | null) => {
  const mime = String(metadata?.mimetype ?? metadata?.contentType ?? "").toLowerCase();
  return mime.startsWith("image/") || /\.(png|jpe?g|gif|bmp|tiff?|webp|avif|heic|heif)$/i.test(name);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST required" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) return json({ error: "Server environment is not configured" }, 500);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Authentication required" }, 401);
  const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: userData, error: userError } = await authClient.auth.getUser();
  if (userError || !userData.user) return json({ error: "Valid session required" }, 401);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: roles, error: roleError } = await admin.from("user_roles").select("role").eq("user_id", userData.user.id);
  if (roleError) return json({ error: "Unable to verify admin role" }, 403);
  if (!(roles ?? []).some((row) => row.role === "admin")) return json({ error: "Super-admin access required" }, 403);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const action = String(body.action ?? "");

  if (action === "scan") {
    const { data: bucketRows, error: bucketError } = await admin.storage.listBuckets();
    if (bucketError) return json({ error: `Unable to list buckets: ${bucketError.message}` }, 500);
    const objects: Array<{ bucket: string; path: string; size: number; contentType: string }> = [];
    const buckets = (bucketRows ?? []).map((b) => b.name);
    for (const bucket of buckets) {
      const walk = async (prefix: string): Promise<string | null> => {
        for (let offset = 0; ; offset += 100) {
          const { data, error } = await admin.storage.from(bucket).list(prefix, { limit: 100, offset, sortBy: { column: "name", order: "asc" } });
          if (error) return `${bucket}/${prefix}: ${error.message}`;
          for (const entry of data ?? []) {
            const path = prefix ? `${prefix}/${entry.name}` : entry.name;
            if (entry.id == null && !entry.metadata) {
              const nestedError = await walk(path);
              if (nestedError) return nestedError;
            } else if (isImage(entry.name, entry.metadata as Record<string, unknown> | null)) {
              objects.push({
                bucket,
                path,
                size: Number((entry.metadata as Record<string, unknown> | null)?.size ?? 0),
                contentType: String((entry.metadata as Record<string, unknown> | null)?.mimetype ?? "unknown"),
              });
            }
          }
          if (!data || data.length < 100) break;
        }
        return null;
      };
      const walkError = await walk("");
      if (walkError) return json({ error: `Scan incomplete; no files changed. ${walkError}` }, 500);
    }
    const totalBytes = objects.reduce((sum, item) => sum + item.size, 0);
    return json({ buckets, objects, totalBytes });
  }

  if (action === "signed-url") {
    const bucket = String(body.bucket ?? "");
    const path = String(body.path ?? "");
    if (!bucket || !path) return json({ error: "Bucket and path are required" }, 400);
    const { data: bucketRows, error: bucketError } = await admin.storage.listBuckets();
    if (bucketError || !(bucketRows ?? []).some((b) => b.name === bucket)) return json({ error: "Storage bucket not found" }, 400);
    const { data, error } = await admin.storage.from(bucket).createSignedUrl(path, 180);
    if (error || !data?.signedUrl) return json({ error: `Could not create download URL: ${error?.message ?? "unknown error"}` }, 500);
    return json({ signedUrl: data.signedUrl });
  }

  if (action === "upload") {
    const bucket = String(body.bucket ?? "");
    const originalPath = String(body.originalPath ?? "");
    const newPath = String(body.newPath ?? "");
    const base64 = String(body.base64 ?? "");
    if (!bucket || !originalPath || !newPath || !base64 || newPath === originalPath || !newPath.toLowerCase().endsWith(".webp")) {
      return json({ error: "Invalid upload request" }, 400);
    }
    if (base64.length > 22_000_000) return json({ error: "Converted image is too large for this endpoint; reduce dimensions or quality and retry" }, 413);
    const { data: bucketRows, error: bucketError } = await admin.storage.listBuckets();
    if (bucketError || !(bucketRows ?? []).some((b) => b.name === bucket)) return json({ error: "Storage bucket not found" }, 400);
    const bytesString = atob(base64);
    const bytes = new Uint8Array(bytesString.length);
    for (let i = 0; i < bytesString.length; i++) bytes[i] = bytesString.charCodeAt(i);
    if (!bytes.length || bytes.length > 16_000_000) return json({ error: "Invalid or oversized WebP payload" }, 413);
    // Verify the RIFF/WEBP signature before writing.
    if (bytes.length < 12 || String.fromCharCode(...bytes.slice(0, 4)) !== "RIFF" || String.fromCharCode(...bytes.slice(8, 12)) !== "WEBP") {
      return json({ error: "Payload is not a valid WebP image" }, 400);
    }
    const { error: uploadError } = await admin.storage.from(bucket).upload(newPath, bytes, { contentType: "image/webp", upsert: true, cacheControl: "31536000" });
    if (uploadError) return json({ error: `WebP upload failed: ${uploadError.message}` }, 500);
    return json({ uploaded: true, newPath });
  }

  if (action === "finalize") {
    const bucket = String(body.bucket ?? "");
    const originalPath = String(body.originalPath ?? "");
    const newPath = String(body.newPath ?? "");
    if (!bucket || !originalPath || !newPath || originalPath === newPath || !newPath.toLowerCase().endsWith(".webp")) return json({ error: "Invalid finalize request" }, 400);
    const { data: bucketRows, error: bucketError } = await admin.storage.listBuckets();
    if (bucketError || !(bucketRows ?? []).some((b) => b.name === bucket)) return json({ error: "Storage bucket not found" }, 400);
    const { data: replacement, error: replacementError } = await admin.storage.from(bucket).download(newPath);
    if (replacementError || !replacement) return json({ error: "Replacement cannot be read; original retained" }, 409);
    if (replacement.type !== "image/webp" || replacement.size === 0) return json({ error: "Replacement verification failed; original retained" }, 409);

    const { data: referenceResult, error: referenceError } = await admin.rpc("replace_artwork_storage_path_references", {
      p_old_path: `${bucket}/${originalPath}`,
      p_new_path: `${bucket}/${newPath}`,
    });
    if (referenceError) return json({ error: `Reference update failed; original retained. ${referenceError.message}` }, 500);

    const { error: deleteError } = await admin.storage.from(bucket).remove([originalPath]);
    if (deleteError) return json({ referencesUpdated: true, originalDeleted: false, referencesChanged: referenceResult, error: `References updated but original deletion failed: ${deleteError.message}` }, 500);
    return json({ referencesUpdated: true, originalDeleted: true, referencesChanged: referenceResult });
  }

  return json({ error: "Unsupported action" }, 400);
});
