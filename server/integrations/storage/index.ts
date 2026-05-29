/**
 * Object storage adapter — Cloudflare R2 in prod, on-disk mock in dev.
 *
 * R2 is S3-compatible, so we sign requests with AWS Signature V4. The wire
 * format matches S3 exactly. The mock writes files to `.uploads/` so the
 * full flow (presigned PUT → upload → download URL) works offline.
 *
 * Required env for live mode:
 *   R2_ACCOUNT_ID
 *   R2_ACCESS_KEY_ID
 *   R2_SECRET_ACCESS_KEY
 *   R2_BUCKET            e.g. unghost-uploads
 *   R2_PUBLIC_BASE_URL   e.g. https://uploads.unghost.com
 */
import { createHash, createHmac, randomBytes } from "node:crypto";
import { mkdir, writeFile, readFile, unlink } from "node:fs/promises";
import path from "node:path";

export type StorageMode = "r2" | "mock";

export function storageMode(): StorageMode {
  return process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID
    ? "r2"
    : "mock";
}

export interface PresignedUpload {
  key: string;
  /** URL the client PUTs the file to. */
  uploadUrl: string;
  /** URL to read the file back (public CDN URL in prod, file:// in mock). */
  publicUrl: string;
  /** Required headers the client must send on the PUT (mock only sends Content-Type). */
  headers: Record<string, string>;
  expiresInSec: number;
}

const LOCAL_BUCKET = path.join(process.cwd(), ".uploads");
const PRESIGN_TTL_SEC = 60 * 15; // 15-minute upload window

function objectKey(prefix: string, ext: string): string {
  const id = randomBytes(8).toString("hex");
  return `${prefix}/${new Date().toISOString().slice(0, 10)}/${id}${ext}`;
}

// ── Mock — writes to disk under .uploads/ ────────────────────────────────
async function presignMock(
  prefix: string,
  ext: string,
  contentType: string,
): Promise<PresignedUpload> {
  await mkdir(LOCAL_BUCKET, { recursive: true });
  const key = objectKey(prefix, ext);
  const filePath = path.join(LOCAL_BUCKET, key);
  await mkdir(path.dirname(filePath), { recursive: true });
  return {
    key,
    uploadUrl: `mock://upload/${key}`,
    publicUrl: `mock://read/${key}`,
    headers: { "content-type": contentType },
    expiresInSec: PRESIGN_TTL_SEC,
  };
}

// ── R2 (AWS SigV4) ───────────────────────────────────────────────────────
async function sha256Hex(value: string): Promise<string> {
  return createHash("sha256").update(value).digest("hex");
}

function hmacSha256(key: Buffer | string, data: string): Buffer {
  return createHmac("sha256", key).update(data).digest();
}

function presignR2(
  prefix: string,
  ext: string,
  contentType: string,
): PresignedUpload {
  const accountId = process.env.R2_ACCOUNT_ID!;
  const accessKey = process.env.R2_ACCESS_KEY_ID!;
  const secretKey = process.env.R2_SECRET_ACCESS_KEY!;
  const bucket = process.env.R2_BUCKET!;
  const publicBase = process.env.R2_PUBLIC_BASE_URL ?? "";
  const region = "auto";
  const service = "s3";
  const host = `${accountId}.r2.cloudflarestorage.com`;

  const key = objectKey(prefix, ext);
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const credential = `${accessKey}/${dateStamp}/${region}/${service}/aws4_request`;
  const signedHeaders = "host";
  const expiresIn = PRESIGN_TTL_SEC;

  const params = new URLSearchParams({
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": credential,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(expiresIn),
    "X-Amz-SignedHeaders": signedHeaders,
  });

  const canonicalUri = `/${bucket}/${encodeURI(key)}`;
  const canonicalRequest = [
    "PUT",
    canonicalUri,
    params.toString(),
    `host:${host}\n`,
    signedHeaders,
    "UNSIGNED-PAYLOAD",
  ].join("\n");

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    `${dateStamp}/${region}/${service}/aws4_request`,
    createHash("sha256").update(canonicalRequest).digest("hex"),
  ].join("\n");

  const kDate = hmacSha256(`AWS4${secretKey}`, dateStamp);
  const kRegion = hmacSha256(kDate, region);
  const kService = hmacSha256(kRegion, service);
  const kSigning = hmacSha256(kService, "aws4_request");
  const signature = createHmac("sha256", kSigning)
    .update(stringToSign)
    .digest("hex");

  params.set("X-Amz-Signature", signature);
  // Note: avoid `sha256Hex` async helper since this fn is sync.
  void sha256Hex;

  const uploadUrl = `https://${host}${canonicalUri}?${params.toString()}`;
  const publicUrl = publicBase ? `${publicBase}/${encodeURI(key)}` : uploadUrl;

  return {
    key,
    uploadUrl,
    publicUrl,
    headers: { "content-type": contentType },
    expiresInSec: expiresIn,
  };
}

/**
 * Generate a presigned upload URL. Client PUTs the file directly to the
 * returned `uploadUrl` with the returned headers, then stores `key`/`publicUrl`
 * in our DB (e.g. on the user.resumeUrl field).
 */
export async function presignUpload(input: {
  prefix: "resumes" | "logos" | "avatars" | "bootcamp-cover" | "bootcamp-video";
  contentType: string;
  filename?: string;
}): Promise<PresignedUpload> {
  const extFromName = input.filename ? path.extname(input.filename) : "";
  const ext = extFromName || extFromContentType(input.contentType) || "";
  if (storageMode() === "mock") {
    return presignMock(input.prefix, ext, input.contentType);
  }
  return presignR2(input.prefix, ext, input.contentType);
}

function extFromContentType(ct: string): string {
  switch (ct) {
    case "application/pdf":
      return ".pdf";
    case "image/png":
      return ".png";
    case "image/jpeg":
      return ".jpg";
    case "image/webp":
      return ".webp";
    case "image/svg+xml":
      return ".svg";
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return ".docx";
    case "video/mp4":
      return ".mp4";
    case "video/webm":
      return ".webm";
    case "video/quicktime":
      return ".mov";
    case "application/vnd.apple.mpegurl":
      return ".m3u8";
    default:
      return "";
  }
}

/** Mock-only — write bytes to the local bucket (lets dev "upload" work). */
export async function mockWrite(key: string, body: Uint8Array): Promise<void> {
  const filePath = path.join(LOCAL_BUCKET, key);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, body);
}

/** Mock-only — read a previously written object. */
export async function mockRead(key: string): Promise<Uint8Array | null> {
  try {
    const filePath = path.join(LOCAL_BUCKET, key);
    return await readFile(filePath);
  } catch {
    return null;
  }
}

/**
 * Server-side upload — used when the file is already in-process (e.g.
 * `/api/parse-resume` receives a multipart form). Skips the browser
 * presign + PUT round-trip and writes directly through the adapter:
 *
 *   • R2 mode  → presign + same-process PUT to the signed URL (the R2
 *                edge endpoint accepts SigV4-authenticated writes from
 *                anywhere, not just the original browser).
 *   • Mock mode → `mockWrite()` lands on `.uploads/` for inspection.
 *
 * Returns the canonical `publicUrl` to store on the user record. The
 * caller never needs to know which mode is live.
 */
export async function uploadObject(input: {
  prefix: "resumes" | "logos" | "avatars" | "bootcamp-cover" | "bootcamp-video";
  contentType: string;
  filename: string;
  body: Uint8Array;
}): Promise<{ publicUrl: string; key: string }> {
  const presigned = await presignUpload({
    prefix: input.prefix,
    contentType: input.contentType,
    filename: input.filename,
  });

  if (storageMode() === "mock") {
    // Write through the disk-backed bucket so dev users can actually
    // download the file later. The presignMock URL is a placeholder —
    // mockRead resolves the matching key on demand.
    await mockWrite(presigned.key, input.body);
    return { publicUrl: presigned.publicUrl, key: presigned.key };
  }

  // R2 mode — PUT to the signed URL with the matching headers. fetch's
  // `body` typing predates the modern Uint8Array<ArrayBuffer> overload,
  // so we wrap in a Blob (zero-copy on Node 18+) to satisfy BodyInit.
  const res = await fetch(presigned.uploadUrl, {
    method: "PUT",
    headers: presigned.headers,
    body: new Blob([input.body as unknown as ArrayBuffer]),
  });
  if (!res.ok) {
    throw new Error(
      `R2 upload failed: HTTP ${res.status} ${res.statusText}`,
    );
  }
  return { publicUrl: presigned.publicUrl, key: presigned.key };
}

/** Delete an object (works for both R2 and mock). */
export async function deleteObject(key: string): Promise<void> {
  if (storageMode() === "mock") {
    await unlink(path.join(LOCAL_BUCKET, key)).catch(() => {});
    return;
  }

  // R2 (S3-compatible) DELETE via AWS SigV4. Required for DPDP § 13 erasure —
  // a soft-deleted user's uploaded artefacts (resumes, avatars) must be purged
  // from object storage on hard-delete, not just dereferenced in Mongo.
  const accountId = process.env.R2_ACCOUNT_ID!;
  const accessKey = process.env.R2_ACCESS_KEY_ID!;
  const secretKey = process.env.R2_SECRET_ACCESS_KEY!;
  const bucket = process.env.R2_BUCKET!;
  const region = "auto";
  const service = "s3";
  const host = `${accountId}.r2.cloudflarestorage.com`;

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const credential = `${accessKey}/${dateStamp}/${region}/${service}/aws4_request`;
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const emptyHash = createHash("sha256").update("").digest("hex");

  const canonicalUri = `/${bucket}/${encodeURI(key)}`;
  const canonicalHeaders =
    `host:${host}\n` +
    `x-amz-content-sha256:${emptyHash}\n` +
    `x-amz-date:${amzDate}\n`;
  const canonicalRequest = [
    "DELETE",
    canonicalUri,
    "",
    canonicalHeaders,
    signedHeaders,
    emptyHash,
  ].join("\n");

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    `${dateStamp}/${region}/${service}/aws4_request`,
    createHash("sha256").update(canonicalRequest).digest("hex"),
  ].join("\n");

  const kDate = hmacSha256(`AWS4${secretKey}`, dateStamp);
  const kRegion = hmacSha256(kDate, region);
  const kService = hmacSha256(kRegion, service);
  const kSigning = hmacSha256(kService, "aws4_request");
  const signature = createHmac("sha256", kSigning)
    .update(stringToSign)
    .digest("hex");

  const authHeader =
    `AWS4-HMAC-SHA256 Credential=${credential}, ` +
    `SignedHeaders=${signedHeaders}, ` +
    `Signature=${signature}`;

  const res = await fetch(`https://${host}${canonicalUri}`, {
    method: "DELETE",
    headers: {
      host,
      "x-amz-date": amzDate,
      "x-amz-content-sha256": emptyHash,
      authorization: authHeader,
    },
  });
  // S3 returns 204 on successful delete, 404 if missing. Treat 404 as idempotent
  // success — repeated hard-deletes shouldn't throw.
  if (!res.ok && res.status !== 404) {
    throw new Error(
      `R2 delete failed: HTTP ${res.status} ${res.statusText}`,
    );
  }
}
