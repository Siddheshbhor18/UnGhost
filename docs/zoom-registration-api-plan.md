# Zoom Registration API — implementation plan

**Status:** deferred. Ship Solution 2 (rotating-link) or just external Zoom for v1. Revisit when concurrent live attendees regularly exceed 50 OR when the share-the-link leak becomes a real abuse vector.

**Problem we are solving:** anyone with a Zoom join URL can join. Free-tier students share with non-paying friends, stealing seats from paying students.

**Outcome:** every enrolled student gets a personal, email-bound join URL. Sharing the URL fails at Zoom's registration check.

---

## Architecture overview

```
unGhost
   │
   ├──► Student schedules live class
   │       │
   │       ▼
   │   POST /api/live  ─────────►  Zoom REST API
   │                                  │
   │                                  ▼
   │                            Meeting created with
   │                            { registration_type: 1 }
   │
   ├──► For every enrolled Premium student:
   │       │
   │       ▼
   │   POST /api/live/[id]/register  ─────►  Zoom registrants endpoint
   │                                            │
   │                                            ▼
   │                                       Personal join_url
   │                                       returned per email
   │
   ├──► Stored in LiveRegistration collection
   │       { sessionId, studentId, zoomRegistrantId, joinUrl }
   │
   ├──► Student dashboard
   │       │
   │       ▼
   │   GET /api/student/live/[sessionId]/join-url
   │   returns the student's own personal join_url
   │
   ├──► Student clicks "Join class"
   │       │
   │       ▼
   │   Opens https://zoom.us/j/123?tk=<student-token>
   │   Zoom checks token + email
   │   ──► registered student lets in
   │   ──► friend with same URL but different email rejected
   │
   ├──► Class ends. Zoom Cloud Recording completes.
   │       │
   │       ▼
   │   Zoom webhook ─────► /api/webhooks/zoom
   │                          │
   │                          ▼
   │                       Downloads recording from Zoom
   │                       Uploads to R2
   │                       Inserts SessionRecording row (status: pending_review)
   │                       Instructor sees it in /instructor/recordings
   │                       Clicks Keep → published to bootcamp Past Sessions
```

---

## Why this works against link sharing

| Attack vector | Defense |
|---|---|
| Student copy-pastes URL to friend | URL contains a token bound to student's email. Friend's email differs → Zoom blocks |
| Friend with same email | Zoom enforces single concurrent session per registration. Original student gets kicked. |
| Bot brute-forces meeting IDs | Meeting created with `password_required: true`, password sent only inside the personal URL |
| Off-platform Zoom client join with raw meeting ID | Meeting set to "Only authenticated users" + waiting room manually admits |

---

## Prerequisites (before implementation)

### Zoom plan required

| Plan | Attendees | Cost | Use case |
|---|---|---|---|
| Zoom Pro | 100 | ₹1,500/mo per host | NOT enough for 500-person sessions |
| Zoom Business | 300 | ₹2,000/mo per host | Sufficient for most bootcamps |
| Zoom Business + Large Meetings 500 add-on | 500 | ₹2,000 + ₹4,000 = ₹6,000/mo per host | For mass cohort kickoffs |
| Zoom Webinar 500 | 500 | ₹6,500/mo per host | If broadcast-only (instructor talks, no student video) |
| Zoom Webinar 1000 | 1000 | ₹14,000/mo per host | Major event tier |

**Recommend Zoom Business + Large Meetings 500 add-on** for unGhost — combined ₹6,000/mo per instructor account.

### Zoom API credentials

Server-to-Server OAuth app required. Created at `https://marketplace.zoom.us`:

1. Sign in with your Zoom account
2. **Develop → Build App → Server-to-Server OAuth**
3. App name: `unghost-prod`
4. Information tab: fill basic details, company name, support email
5. **Feature** tab: enable **Event Subscriptions** → add URL `https://www.unghost.in/api/webhooks/zoom`
   - Subscribe to events: `recording.completed`, `meeting.ended`, `meeting.participant_joined`, `meeting.participant_left`
6. **Scopes** tab — add:
   - `meeting:read:admin` — read meetings + registrants
   - `meeting:write:admin` — create meetings + add registrants
   - `recording:read:admin` — fetch cloud recordings
   - `report:read:admin` — attendance reports
7. **Activate** app
8. **App Credentials** tab — copy:
   - Account ID
   - Client ID
   - Client Secret
   - Verification Token + Secret Token (for webhook signature verification)

Add to `.env`:

```
ZOOM_ACCOUNT_ID=xxxxxxxx
ZOOM_CLIENT_ID=xxxxxxxx
ZOOM_CLIENT_SECRET=xxxxxxxx
ZOOM_WEBHOOK_SECRET=xxxxxxxx
```

---

## Code plan

### 1. Type additions — `shared/types/index.ts`

Extend `LiveSession`:

```ts
export interface LiveSession {
  // ... existing fields
  zoomMeetingId?: string;     // numeric 11-digit meeting id
  zoomPassword?: string;      // meeting password
  zoomHostJoinUrl?: string;   // for the instructor only
}
```

New collection type:

```ts
export interface LiveRegistration {
  id: string;
  sessionId: string;
  studentId: string;
  email: string;
  zoomRegistrantId: string;
  joinUrl: string;            // student-specific URL with token
  createdAt: string;
  joinedAt?: string;          // populated from webhook
  leftAt?: string;
}
```

### 2. Mongo model — `server/db/models.ts`

```ts
const LiveRegistrationSchema = withJsonTransform(
  new Schema(
    {
      _id: { type: String, required: true },
      sessionId: { type: String, required: true, index: true },
      studentId: { type: String, required: true, index: true },
      email: { type: String, required: true },
      zoomRegistrantId: String,
      joinUrl: String,
      createdAt: { type: String, required: true },
      joinedAt: String,
      leftAt: String,
    },
    { versionKey: false },
  ),
);
LiveRegistrationSchema.index(
  { sessionId: 1, studentId: 1 },
  { unique: true },
);

export const LiveRegistrationModel: Model<LiveRegistration> =
  (mongoose.models.LiveRegistration as Model<LiveRegistration>) ||
  mongoose.model<LiveRegistration>("LiveRegistration", LiveRegistrationSchema);
```

### 3. Zoom adapter — `server/integrations/zoom/index.ts`

Methods:

```ts
export interface ZoomMeeting {
  id: string;
  password: string;
  hostJoinUrl: string;
}

/**
 * Mint a fresh Zoom OAuth access token using server-to-server creds.
 * Cached in-memory for 50 min (Zoom tokens live 1h).
 */
async function getAccessToken(): Promise<string>

/**
 * POST /v2/users/{userId}/meetings  with:
 *   {
 *     topic, start_time, duration,
 *     settings: {
 *       approval_type: 0,
 *       registration_type: 1,            // automatic approval, one-time URL per email
 *       authentication_option: "signIn", // require signed-in Zoom account
 *       waiting_room: true,
 *       host_video: true,
 *       participant_video: false,
 *       mute_upon_entry: true,
 *       auto_recording: "cloud",
 *     }
 *   }
 */
export async function createMeeting(input: {
  topic: string;
  startsAt: string;
  durationMin: number;
  hostEmail: string;          // your platform Zoom account email
}): Promise<{ ok: boolean; meeting?: ZoomMeeting; error?: string }>

/**
 * POST /v2/meetings/{meetingId}/registrants
 *   { email, first_name, last_name }
 * Returns the unique join_url for this student.
 */
export async function registerAttendee(input: {
  meetingId: string;
  email: string;
  firstName: string;
  lastName: string;
}): Promise<{ ok: boolean; registrantId?: string; joinUrl?: string; error?: string }>

/** DELETE /v2/meetings/{meetingId}/registrants/{registrantId}/status with action=cancel */
export async function removeAttendee(meetingId: string, registrantId: string)

/** GET /v2/meetings/{meetingId}/recordings  — fetch cloud recording URL. */
export async function getRecording(meetingId: string)

/** Webhook signature verification. */
export function verifyZoomWebhookSignature(rawBody: string, headers: Headers): boolean
```

### 4. Store helpers — `server/store.ts`

```ts
export async function createLiveSessionWithZoom(input: {
  bootcampId: string;
  instructorId: string;
  title: string;
  startsAt: string;
  durationMin: number;
}): Promise<LiveSession>
// Inside: createMeeting() → save meetingId/password on LiveSession row.

export async function registerStudentForLiveSession(input: {
  sessionId: string;
  studentId: string;
}): Promise<LiveRegistration | { error: string }>
// Inside: lookup student email → registerAttendee() → save LiveRegistration row.

export async function bulkRegisterEnrolledForLiveSession(sessionId: string)
// Inside: list all enrolled Premium students in the bootcamp → iterate registerStudentForLiveSession.

export async function getStudentJoinUrl(sessionId: string, studentId: string): Promise<string | undefined>
```

### 5. API routes

**`POST /api/live` (already exists — extend):**
- Accept `useZoom: true` flag
- After saving LiveSession row, call `createLiveSessionWithZoom`
- Background job (await Promise.all): call `bulkRegisterEnrolledForLiveSession`

**`GET /api/student/live/[id]/join-url`:**
- Auth: student must own a LiveRegistration row for this session
- Returns `{ joinUrl, opensAt }` (opensAt = startsAt - 10 min)

**`POST /api/webhooks/zoom`:**
- Verify signature via `verifyZoomWebhookSignature`
- Switch on event type:
  - `endpoint.url_validation` → echo back the encrypted token (Zoom's webhook handshake)
  - `recording.completed` → download recording from `payload.object.recording_files[0].download_url`, upload to R2, insert SessionRecording row
  - `meeting.participant_joined` → update `LiveRegistration.joinedAt`
  - `meeting.participant_left` → update `LiveRegistration.leftAt`
  - `meeting.ended` → flip `LiveSession.status = "ended"`

### 6. UI changes

**`/instructor/live/new`:**
- Existing form — add "Use Zoom" toggle (defaults ON when ZOOM_* env vars present)
- On submit, server creates Zoom meeting + auto-registers enrolled students

**`/bootcamp/[id]` (student view):**
- Existing "Upcoming sessions" card
- Each session row now shows:
  - "Join class" button — calls `GET /api/student/live/[id]/join-url`, opens returned URL in new tab
  - Disabled until 10 min before scheduled start

**`/instructor/live/[id]` (instructor's session detail):**
- Show **Host join URL** (separate from student URLs)
- Show registered student count: `12 / 25 registered`
- Manual "Register late enrollee" button — pick student, server registers them on the fly

### 7. Webhook handshake — Zoom URL validation

Zoom's webhook setup requires a one-time challenge response. Implement at the top of `/api/webhooks/zoom`:

```ts
if (payload.event === "endpoint.url_validation") {
  const hashForValidate = crypto
    .createHmac("sha256", process.env.ZOOM_WEBHOOK_SECRET!)
    .update(payload.payload.plainToken)
    .digest("hex");
  return NextResponse.json({
    plainToken: payload.payload.plainToken,
    encryptedToken: hashForValidate,
  });
}
```

### 8. Late-enrollee flow

If a student enrols in a bootcamp AFTER the live session was scheduled:

```ts
// inside enrollStudentInBootcamp()
const upcomingSessions = await LiveSessionModel.find({
  bootcampId,
  status: "scheduled",
  startsAt: { $gte: new Date().toISOString() },
});
for (const s of upcomingSessions) {
  await registerStudentForLiveSession({
    sessionId: s.id,
    studentId,
  }).catch((err) => logger.warn({ err, sessionId: s.id }, "late-register-failed"));
}
```

### 9. Capacity tracking

Add to `LiveSession`:

```ts
zoomCapacity?: number;     // max attendees Zoom plan allows
zoomRegisteredCount?: number;
```

Increment `zoomRegisteredCount` after each successful register. Refuse new registrations if `>= zoomCapacity`.

---

## Testing plan

### Local

1. Set Zoom test creds in `.env.local`
2. `POST /api/live` with `useZoom: true` → confirm meeting created in Zoom dashboard
3. Open student dashboard as alice → click Join → opens Zoom with her personal URL
4. Copy alice's URL → open in incognito with different Zoom account → rejected
5. Open as instructor → see host join URL works
6. End meeting → Zoom uploads recording → webhook fires → SessionRecording row created → instructor's `/instructor/recordings` shows it

### Staging

1. Use Zoom dev account (free, limited)
2. Run a real 5-min meeting with 2 test student accounts
3. Verify webhook arrives via Better Stack monitor
4. Verify recording URL works in `/bootcamp/[id]` Past Sessions

### Production

1. Spend ₹6,000 for Zoom Business + Large Meetings add-on
2. Move webhook URL to `https://www.unghost.in/api/webhooks/zoom`
3. Run a "soft launch" mini-bootcamp with 10 students
4. Confirm registration URLs work end-to-end
5. Confirm recording flow back to platform

---

## Cost summary

| Component | Cost |
|---|---|
| Zoom Business + Large Meetings 500 add-on | ₹6,000/mo per instructor |
| Cloud Recording storage (Zoom) | included up to 5 GB then $1.50/GB |
| Engineer time to build (this plan) | ~3 hours |
| Operations time post-ship | ~2 hr/mo |

At 5 instructors all needing live: **₹30,000/mo** in Zoom subscriptions. At 1 master instructor account everyone shares: **₹6,000/mo**.

For unGhost in early stage → start with 1 shared instructor Zoom account, schedule all sessions through it. Move to per-instructor accounts when ≥ 3 instructors clash on scheduling.

---

## Decision points to revisit when implementing

1. **Single shared Zoom account vs per-instructor account?** Shared = cheaper but creates scheduling conflicts. Decide based on simultaneous live sessions per week.

2. **Auto-record cloud vs local?** Cloud = expensive ($1.50/GB after 5GB) but webhook-driven, automatic upload. Local = free but instructor must manually upload.

3. **Suppress Zoom's "you are registered" email?** Recommend yes — students should see unGhost branding only. Pass `send_confirmation_email: false` to registrants endpoint.

4. **Authentication strictness:**
   - `signIn` (require Zoom account) — strictest
   - `none` — registration-token only — laxer, but lets students who don't have Zoom accounts join
   - Recommend `signIn` for paid Premium audience

5. **Replace 100ms entirely or run in parallel?** If you ever do small interactive sessions (5-10 students), 100ms's free tier might still be useful. But the duplication adds complexity. **Recommend: rip out 100ms, use Zoom universally.**

---

## Migration from current 100ms code

Files to delete after Zoom is wired:

- `server/integrations/video/index.ts` — replaced by `server/integrations/zoom/index.ts`
- `components/live/LiveRoom.tsx` — no in-platform WebRTC anymore
- `app/live/[code]/page.tsx` — replaced with redirect to Zoom (or kept as a "session detail" page that shows the Join button)
- `app/api/webhooks/100ms/route.ts` — replaced by Zoom webhook
- `env.example` HMS_* keys

Files that stay unchanged (work for both providers):

- `SessionRecordingModel` + `/instructor/recordings` page — recording capture is provider-agnostic
- `/bootcamp/[id]` Past Sessions sidebar
- The Premium plan gate for bootcamp access

---

## When to actually build this

**Pre-conditions (any one):**

- A real student reports their Zoom seat was taken by a non-paying friend
- You're paying for Zoom Business plan anyway (Pro doesn't support registration API)
- You hit 50+ regular attendees per session
- You start running paid mass cohorts (>100 attendees)

**Until any of those happen:** ship Solution 2 (rotating link in-app + waiting room). Zero new infra.

---

## Open questions for future implementation

- [ ] Confirm Zoom Webinar vs Meeting fits the use case better. Webinar is broadcast-only (instructor talks, attendees in listener mode, raise-hand for Q&A). Meeting is fully interactive.
- [ ] Decide on session capacity per bootcamp. Hard-cap in code so Zoom never returns "max registrants exceeded".
- [ ] Whether to send our own "class starting in 15 min" reminder email (Resend) vs let Zoom send the reminder.
- [ ] Mobile experience: Zoom mobile apps handle registration URLs differently. Test on iOS Safari + Android Chrome before launch.

---

## References

- Zoom Server-to-Server OAuth: https://developers.zoom.us/docs/internal-apps/s2s-oauth/
- Meeting Registrants API: https://developers.zoom.us/docs/api/meetings/#tag/meetings/POST/meetings/{meetingId}/registrants
- Webhook events catalog: https://developers.zoom.us/docs/api/webhooks/
- Recording API: https://developers.zoom.us/docs/api/recordings/

---

**Owner when this is built:** assign to backend lead. Estimated 3 days end-to-end including QA.
