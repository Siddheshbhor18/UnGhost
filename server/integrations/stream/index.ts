/**
 * Live-streaming adapter — Cloudflare Stream in prod, mock in dev.
 *
 * Cloudflare Stream Live lets instructors push RTMP from OBS. We create
 * a "Live Input" per session, hand the RTMP URL + stream key to the
 * instructor, and serve students a signed playback URL (RS256 JWT) so
 * the stream can't be watched outside the platform.
 *
 * Required env for live mode:
 *   R2_ACCOUNT_ID                        (shared — already set for R2)
 *   CLOUDFLARE_STREAM_API_TOKEN
 *   CLOUDFLARE_STREAM_SIGNING_KEY_ID
 *   CLOUDFLARE_STREAM_SIGNING_KEY_PEM    (base64-encoded RSA PEM)
 *   CLOUDFLARE_STREAM_CUSTOMER_CODE      (playback subdomain)
 */
import { createSign, randomBytes } from "node:crypto";

// ── Mode detection ──────────────────────────────────────────────────────

export type StreamMode = "cloudflare" | "mock";

export function streamMode(): StreamMode {
  return process.env.CLOUDFLARE_STREAM_API_TOKEN &&
    process.env.R2_ACCOUNT_ID
    ? "cloudflare"
    : "mock";
}

// ── Types ───────────────────────────────────────────────────────────────

export interface LiveInputResult {
  uid: string;
  rtmpUrl: string;
  streamKey: string;
}

// ── Cloudflare API helpers ──────────────────────────────────────────────

const CF_API = "https://api.cloudflare.com/client/v4";

function cfHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${process.env.CLOUDFLARE_STREAM_API_TOKEN}`,
    "Content-Type": "application/json",
  };
}

function accountId(): string {
  return process.env.R2_ACCOUNT_ID!;
}

// ── Create Live Input ───────────────────────────────────────────────────

async function createLiveInputCF(
  name: string,
): Promise<LiveInputResult> {
  const res = await fetch(
    `${CF_API}/accounts/${accountId()}/stream/live_inputs`,
    {
      method: "POST",
      headers: cfHeaders(),
      body: JSON.stringify({
        meta: { name },
        recording: { mode: "automatic", requireSignedURLs: true },
        defaultCreator: "unghost-platform",
      }),
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`CF Stream createLiveInput failed: ${res.status} ${text}`);
  }
  const json = (await res.json()) as {
    result: {
      uid: string;
      rtmps: { url: string; streamKey: string };
    };
  };
  const r = json.result;
  return {
    uid: r.uid,
    rtmpUrl: r.rtmps.url,
    streamKey: r.rtmps.streamKey,
  };
}

function createLiveInputMock(name: string): LiveInputResult {
  const uid = `mock_live_${randomBytes(8).toString("hex")}`;
  return {
    uid,
    rtmpUrl: `rtmps://mock.local:443/live/${name}`,
    streamKey: `mock_key_${randomBytes(12).toString("hex")}`,
  };
}

export async function createLiveInput(
  name: string,
): Promise<LiveInputResult> {
  if (streamMode() === "mock") return createLiveInputMock(name);
  return createLiveInputCF(name);
}

// ── Delete Live Input ───────────────────────────────────────────────────

async function deleteLiveInputCF(uid: string): Promise<void> {
  const res = await fetch(
    `${CF_API}/accounts/${accountId()}/stream/live_inputs/${uid}`,
    { method: "DELETE", headers: cfHeaders() },
  );
  if (!res.ok && res.status !== 404) {
    throw new Error(`CF Stream deleteLiveInput failed: ${res.status}`);
  }
}

export async function deleteLiveInput(uid: string): Promise<void> {
  if (streamMode() === "mock") return;
  return deleteLiveInputCF(uid);
}

// ── Signed Playback Token (RS256 JWT) ───────────────────────────────────

function base64url(buf: Buffer | string): string {
  const b = typeof buf === "string" ? Buffer.from(buf) : buf;
  return b.toString("base64url");
}

function generateTokenCF(videoUid: string, ttlSec: number): string {
  const keyId = process.env.CLOUDFLARE_STREAM_SIGNING_KEY_ID!;
  const pemB64 = process.env.CLOUDFLARE_STREAM_SIGNING_KEY_PEM!;
  const pem = Buffer.from(pemB64, "base64").toString("utf8");

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", kid: keyId };
  const payload = {
    sub: videoUid,
    kid: keyId,
    exp: now + ttlSec,
    nbf: now - 60,
    accessRules: [
      { type: "any", action: "allow" },
    ],
  };

  const segments = [
    base64url(JSON.stringify(header)),
    base64url(JSON.stringify(payload)),
  ];
  const signingInput = segments.join(".");
  const signer = createSign("RSA-SHA256");
  signer.update(signingInput);
  const signature = signer.sign(pem);
  segments.push(base64url(signature));
  return segments.join(".");
}

function generateTokenMock(videoUid: string): string {
  return `mock-token-${videoUid}-${Date.now()}`;
}

export function generateSignedPlaybackToken(
  videoUid: string,
  ttlSec = 3600,
): string {
  if (streamMode() === "mock") return generateTokenMock(videoUid);
  return generateTokenCF(videoUid, ttlSec);
}

// ── Playback URL ────────────────────────────────────────────────────────

export function getPlaybackUrl(token: string): string {
  if (streamMode() === "mock") {
    return `mock://stream/${token}`;
  }
  const customerCode = process.env.CLOUDFLARE_STREAM_CUSTOMER_CODE!;
  return `https://customer-${customerCode}.cloudflarestream.com/${token}/iframe`;
}
