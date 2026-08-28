import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export type Bucket = "avatars" | "memories" | "world" | "little-things";

const urlCache = new Map<string, { url: string; expires: number }>();

/** Every storage bucket is private — resolve a stored path to a short-lived signed URL. */
export async function getSignedUrl(
  supabase: SupabaseClient<Database>,
  bucket: Bucket,
  path: string | null | undefined,
  expiresInSeconds = 3600
): Promise<string | null> {
  if (!path) return null;
  const cacheKey = `${bucket}/${path}`;
  const cached = urlCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) return cached.url;

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds);

  if (error || !data) return null;

  urlCache.set(cacheKey, {
    url: data.signedUrl,
    expires: Date.now() + (expiresInSeconds - 60) * 1000,
  });
  return data.signedUrl;
}

export async function getSignedUrls(
  supabase: SupabaseClient<Database>,
  bucket: Bucket,
  paths: (string | null | undefined)[]
): Promise<Record<string, string>> {
  const entries = await Promise.all(
    paths.filter(Boolean).map(async (p) => [p as string, await getSignedUrl(supabase, bucket, p)] as const)
  );
  return Object.fromEntries(entries.filter(([, url]) => url)) as Record<string, string>;
}

export function buildStoragePath(userId: string, file: File) {
  const ext = file.name.split(".").pop() || "bin";
  const rand = Math.random().toString(36).slice(2, 10);
  return `${userId}/${Date.now()}-${rand}.${ext}`;
}

export async function uploadFile(
  supabase: SupabaseClient<Database>,
  bucket: Bucket,
  userId: string,
  file: File
) {
  const path = buildStoragePath(userId, file);
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  return path;
}
