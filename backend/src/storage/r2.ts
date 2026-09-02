import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Cloudflare R2 access via the S3-compatible API — R2 isn't AWS, but its API
 * surface is a drop-in match for the subset used here, so the standard AWS
 * SDK works unmodified pointed at R2's endpoint instead of S3's.
 *
 * Lazily constructed (not at module load) so the rest of the app keeps
 * working with storage simply unavailable when these env vars aren't set
 * yet — real for local dev before credentials exist, and a much better
 * failure mode than crashing every server boot on a missing bucket.
 */
let client: S3Client | null = null;

function getEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value : undefined;
}

export function isStorageConfigured(): boolean {
  return !!(getEnv("R2_ACCOUNT_ID") && getEnv("R2_ACCESS_KEY_ID") && getEnv("R2_SECRET_ACCESS_KEY") && getEnv("R2_BUCKET_NAME"));
}

function getClient(): S3Client {
  if (client) return client;
  const accountId = getEnv("R2_ACCOUNT_ID");
  const accessKeyId = getEnv("R2_ACCESS_KEY_ID");
  const secretAccessKey = getEnv("R2_SECRET_ACCESS_KEY");
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "R2 storage isn't configured — set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME (see backend/.env.example).",
    );
  }
  client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  return client;
}

function getBucket(): string {
  const bucket = getEnv("R2_BUCKET_NAME");
  if (!bucket) throw new Error("R2_BUCKET_NAME isn't set (see backend/.env.example).");
  return bucket;
}

/** One key per org, so a bucket listing alone reveals tenant boundaries —
 * not a substitute for access control (every read still goes through a
 * signed URL scoped to a specific key, per `getDownloadUrl`), just hygiene. */
export function buildStorageKey(orgId: string, assetId: string, filename: string): string {
  const ext = filename.includes(".") ? filename.slice(filename.lastIndexOf(".")) : "";
  return `${orgId}/${assetId}${ext}`;
}

/**
 * A short-lived URL the browser uploads directly to — the file's bytes
 * never pass through this server. Callers must already have verified the
 * caller may write into this org (see `content.ts` router), since anyone
 * holding this URL can PUT to that exact key for the next few minutes.
 */
export async function getUploadUrl(storageKey: string, contentType: string): Promise<string> {
  const command = new PutObjectCommand({ Bucket: getBucket(), Key: storageKey, ContentType: contentType });
  return getSignedUrl(getClient(), command, { expiresIn: 5 * 60 });
}

/** Short-lived read URL — assets are private in the bucket; every playback
 * link is minted fresh per request rather than the bucket being public, so
 * access still runs through this app's own permission checks first. */
export async function getDownloadUrl(storageKey: string): Promise<string> {
  const command = new GetObjectCommand({ Bucket: getBucket(), Key: storageKey });
  return getSignedUrl(getClient(), command, { expiresIn: 60 * 60 });
}

export async function deleteObject(storageKey: string): Promise<void> {
  await getClient().send(new DeleteObjectCommand({ Bucket: getBucket(), Key: storageKey }));
}
