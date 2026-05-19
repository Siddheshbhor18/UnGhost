/**
 * Video adapter — 100ms in prod, mock-room in dev.
 *
 * 100ms is India-first, low-latency, and integrates via a server-issued
 * JWT auth token + client-side React SDK (@100mslive/react-sdk).
 *
 * Required env for live mode:
 *   HMS_ACCESS_KEY       — API access key from 100ms dashboard
 *   HMS_APP_SECRET       — App secret used to sign auth tokens
 *   HMS_TEMPLATE_ID      — Room template (defines audio/video tracks, roles)
 *   HMS_REGION           — `in` for India, `us` for US, etc.
 *
 * The room creation REST API (https://api.100ms.live/v2/rooms) is called
 * from `createRoom` when a live session starts. The room id is stored on
 * the LiveSession document so participants share the same room.
 */
import { createHmac, randomBytes } from "node:crypto";

export type VideoMode = "100ms" | "mock";

export function videoMode(): VideoMode {
  return process.env.HMS_ACCESS_KEY && process.env.HMS_APP_SECRET
    ? "100ms"
    : "mock";
}

export interface VideoRoom {
  /** Provider room id — stable across joins. */
  roomId: string;
  /** Provider-native room code (used by the SDK in some flows). */
  roomCode?: string;
}

export interface VideoAuthToken {
  /** Short-lived JWT the client passes to the 100ms SDK on join. */
  token: string;
  /** UTC ISO timestamp the token expires. */
  expiresAt: string;
  /** The provider room id this token is scoped to. */
  roomId: string;
  /** Role the joiner has (host / guest / viewer). */
  role: "host" | "guest" | "viewer";
}

const TOKEN_TTL_SEC = 60 * 60 * 4; // 4-hour join window

/** Create (or reuse) a video room for a live session. */
export async function createRoom(input: {
  name: string;
  description?: string;
}): Promise<VideoRoom> {
  if (videoMode() === "mock") {
    return {
      roomId: `mock-room-${randomBytes(4).toString("hex")}`,
      roomCode: `mock-${randomBytes(3).toString("hex")}`,
    };
  }
  const accessKey = process.env.HMS_ACCESS_KEY!;
  const secret = process.env.HMS_APP_SECRET!;
  const templateId = process.env.HMS_TEMPLATE_ID;
  const region = process.env.HMS_REGION ?? "in";
  const managementToken = signManagementToken(accessKey, secret);

  const res = await fetch("https://api.100ms.live/v2/rooms", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${managementToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: input.name,
      description: input.description,
      template_id: templateId,
      region,
    }),
  });
  if (!res.ok) {
    throw new Error(`100ms.createRoom failed: ${res.status}`);
  }
  const data = (await res.json()) as { id?: string; enabled?: boolean };
  if (!data.id) throw new Error("100ms.createRoom: no room id in response");
  return { roomId: data.id };
}

/** Issue a participant join token for a 100ms room. */
export function issueAuthToken(input: {
  roomId: string;
  userId: string;
  role: "host" | "guest" | "viewer";
}): VideoAuthToken {
  if (videoMode() === "mock") {
    return {
      token: `mock-token-${input.userId}-${Date.now()}`,
      expiresAt: new Date(Date.now() + TOKEN_TTL_SEC * 1000).toISOString(),
      roomId: input.roomId,
      role: input.role,
    };
  }
  const accessKey = process.env.HMS_ACCESS_KEY!;
  const secret = process.env.HMS_APP_SECRET!;
  const now = Math.floor(Date.now() / 1000);
  const exp = now + TOKEN_TTL_SEC;
  const payload = {
    access_key: accessKey,
    room_id: input.roomId,
    user_id: input.userId,
    role: input.role,
    type: "app",
    version: 2,
    iat: now,
    exp,
    jti: randomBytes(8).toString("hex"),
    nbf: now,
  };
  return {
    token: signJwt(payload, secret),
    expiresAt: new Date(exp * 1000).toISOString(),
    roomId: input.roomId,
    role: input.role,
  };
}

// ── JWT signing helpers (HS256, no extra deps) ──────────────────────────
function b64url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function signJwt(payload: Record<string, unknown>, secret: string): string {
  const header = b64url(Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const body = b64url(Buffer.from(JSON.stringify(payload)));
  const data = `${header}.${body}`;
  const sig = b64url(createHmac("sha256", secret).update(data).digest());
  return `${data}.${sig}`;
}

function signManagementToken(accessKey: string, secret: string): string {
  // Management tokens have a slightly different shape per the 100ms docs.
  const now = Math.floor(Date.now() / 1000);
  return signJwt(
    {
      access_key: accessKey,
      type: "management",
      version: 2,
      iat: now,
      exp: now + 60 * 60,
      jti: randomBytes(8).toString("hex"),
      nbf: now,
    },
    secret,
  );
}

// ── Recording APIs ─────────────────────────────────────────────────────────
export interface RecordingAsset {
  ok: boolean;
  assetId?: string;
  playbackUrl?: string;
  thumbnailUrl?: string;
  durationSec?: number;
  sizeBytes?: number;
  error?: string;
}

/**
 * Fetch the recording metadata for a finished 100ms room. In mock mode
 * returns a synthetic asset so dev flows can exercise the publish/delete UI
 * end-to-end without external service calls.
 */
export async function getRoomRecording(
  videoRoomId: string,
): Promise<RecordingAsset> {
  if (videoMode() === "mock") {
    return {
      ok: true,
      assetId: `mock_asset_${videoRoomId}`,
      playbackUrl: `https://mock.100ms.live/recordings/${videoRoomId}.mp4`,
      thumbnailUrl: `https://mock.100ms.live/thumbs/${videoRoomId}.jpg`,
      durationSec: 1800,
      sizeBytes: 240_000_000,
    };
  }
  try {
    const accessKey = process.env.HMS_ACCESS_KEY!;
    const secret = process.env.HMS_APP_SECRET!;
    const token = signManagementToken(accessKey, secret);
    const res = await fetch(
      `https://api.100ms.live/v2/recording-assets?room_id=${encodeURIComponent(
        videoRoomId,
      )}&limit=1`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) {
      return { ok: false, error: `100ms ${res.status}` };
    }
    const data = (await res.json()) as {
      data?: Array<{
        id?: string;
        path?: string;
        thumbnails?: string[];
        duration?: number;
        size?: number;
      }>;
    };
    const a = data.data?.[0];
    if (!a) return { ok: false, error: "no_recording" };
    return {
      ok: true,
      assetId: a.id,
      playbackUrl: a.path,
      thumbnailUrl: a.thumbnails?.[0],
      durationSec: a.duration,
      sizeBytes: a.size,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "unknown",
    };
  }
}

/**
 * Delete a stored recording. Called when the instructor presses "Delete" on
 * /instructor/recordings — frees provider storage and prevents anyone from
 * fetching the playbackUrl later.
 */
export async function deleteRoomRecording(
  assetId: string,
): Promise<{ ok: boolean; error?: string }> {
  if (videoMode() === "mock") {
    return { ok: true };
  }
  try {
    const accessKey = process.env.HMS_ACCESS_KEY!;
    const secret = process.env.HMS_APP_SECRET!;
    const token = signManagementToken(accessKey, secret);
    const res = await fetch(
      `https://api.100ms.live/v2/recording-assets/${encodeURIComponent(
        assetId,
      )}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    if (!res.ok && res.status !== 404) {
      return { ok: false, error: `100ms ${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "unknown" };
  }
}
