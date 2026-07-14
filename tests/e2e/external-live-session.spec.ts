import path from "node:path";
import { config as loadEnv } from "dotenv";
import mongoose from "mongoose";
import { expect, test, type Page } from "@playwright/test";
import { hashPassword } from "../../server/auth/password";

loadEnv({ path: path.join(process.cwd(), ".env.local") });
loadEnv({ path: path.join(process.cwd(), ".env") });

/**
 * External-platform live session — the full user-visible flow:
 *
 *   1. Instructor schedules a session with "External platform" (Zoho Meet),
 *      link validated https-only, row shows the External badge.
 *   2. Enrolled student opens the bootcamp room, sees the session card with
 *      the "Enter live session" CTA — and the raw meeting URL appears
 *      NOWHERE in the served document (the leak invariant, end-to-end).
 *   3. The CTA points at the masked /api/live/[id]/join route, which answers
 *      with a 302 whose Location is the meeting URL — the only place it
 *      ever surfaces.
 *
 * Self-seeded and self-cleaning: all entities are namespaced `*_e2e_ext*`
 * so the suite stays hermetic on any database.
 */

const INSTRUCTOR_ID = "usr_e2e_ext_instructor";
const STUDENT_ID = "usr_e2e_ext_student";
const BOOTCAMP_ID = "bc_e2e_ext";
const INSTRUCTOR_EMAIL = "ext-instructor@e2e.test";
const STUDENT_EMAIL = "ext-student@e2e.test";
const PASSWORD = "demo";
const MEETING_URL = "https://meet.zoho.com/e2e-secret-room-999";
const SESSION_TITLE = "E2E Zoho Masterclass";

test.describe.serial("External live session flow", () => {
  test.beforeAll(async () => {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGODB_URI missing — cannot seed E2E data");
    await mongoose.connect(uri);
    const db = mongoose.connection;
    const passwordHash = await hashPassword(PASSWORD);
    const now = new Date().toISOString();
    const inYear = new Date(Date.now() + 365 * 86400_000).toISOString();

    await db.collection("users").updateOne(
      { _id: INSTRUCTOR_ID as never },
      {
        $set: {
          email: INSTRUCTOR_EMAIL,
          name: "E2E Ext Instructor",
          role: "instructor",
          passwordHash,
          emailVerified: now,
          status: "active",
          createdAt: now,
        },
      },
      { upsert: true },
    );
    await db.collection("users").updateOne(
      { _id: STUDENT_ID as never },
      {
        $set: {
          email: STUDENT_EMAIL,
          name: "E2E Ext Student",
          role: "student",
          passwordHash,
          emailVerified: now,
          status: "active",
          ownedCourses: [{ course: "ai", expiresAt: inYear }],
          profile: {
            alias: "e2e-ext",
            skills: [],
            verifiedSkills: [],
            enrolledBootcamps: [BOOTCAMP_ID],
            history: [],
            joinedAt: now,
            lastActiveAt: now,
          },
          createdAt: now,
        },
      },
      { upsert: true },
    );
    await db.collection("bootcamps").updateOne(
      { _id: BOOTCAMP_ID as never },
      {
        $set: {
          skill: "AI Agents",
          category: "ai",
          title: "E2E External Session Cohort",
          description: "Hermetic cohort for the external-session E2E spec.",
          priceInPaise: 0,
          gstPercent: 18,
          durationWeeks: 2,
          instructorId: INSTRUCTOR_ID,
          videos: [],
          liveSlots: [],
          enrolledStudentIds: [STUDENT_ID],
          rating: 5,
          coverColor: "blue",
          status: "published",
          currentSubmissionCount: 0,
          sessions: [],
        },
      },
      { upsert: true },
    );
    // Stale sessions from a previous aborted run would break the serial flow.
    await db.collection("livesessions").deleteMany({ instructorId: INSTRUCTOR_ID });
  });

  test.afterAll(async () => {
    const db = mongoose.connection;
    if (db.readyState === 1) {
      const sessions = await db
        .collection("livesessions")
        .find({ instructorId: INSTRUCTOR_ID })
        .project({ _id: 1 })
        .toArray();
      const sessionIds = sessions.map((s) => String(s._id));
      await Promise.all([
        db.collection("users").deleteMany({ _id: { $in: [INSTRUCTOR_ID, STUDENT_ID] } as never }),
        db.collection("bootcamps").deleteMany({ _id: BOOTCAMP_ID as never }),
        db.collection("livesessions").deleteMany({ instructorId: INSTRUCTOR_ID }),
        db.collection("livesessionattendees").deleteMany({ sessionId: { $in: sessionIds } }),
        db.collection("auditlogs").deleteMany({ actorId: INSTRUCTOR_ID }),
      ]);
      await mongoose.disconnect();
    }
  });

  async function login(
    page: Page,
    email: string,
    landing: RegExp,
    role: "student" | "instructor" = "student",
  ): Promise<void> {
    // The login door defaults to the Student card; instructor sign-ins must
    // arrive via ?role=instructor or the credentials post is role-mismatched.
    await page.goto(role === "instructor" ? "/login?role=instructor" : "/login");
    await page.waitForLoadState("networkidle");
    const emailField = page.getByLabel(/email/i);
    const pwField = page.getByLabel(/^password$/i);
    await emailField.fill("");
    await emailField.pressSequentially(email, { delay: 20 });
    await pwField.fill("");
    await pwField.pressSequentially(PASSWORD, { delay: 20 });
    await page.getByRole("button", { name: /^sign in$/i }).click();
    await page.waitForURL(landing, { timeout: 25_000 });
  }

  test("instructor schedules an external session", async ({ page }) => {
    await login(page, INSTRUCTOR_EMAIL, /\/instructor\//, "instructor");
    await page.goto("/instructor/live");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: /schedule session/i }).click();
    await page.getByRole("radio", { name: /external platform/i }).click();

    await page
      .getByPlaceholder(/week 3 q&a/i)
      .pressSequentially(SESSION_TITLE, { delay: 15 });

    // Start in 5 minutes so the student card is inside the joinable window.
    const d = new Date(Date.now() + 5 * 60_000);
    const pad = (n: number) => String(n).padStart(2, "0");
    await page
      .locator('input[type="datetime-local"]')
      .fill(
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`,
      );

    const scheduleBtn = page.getByRole("button", { name: /^schedule$/i });
    await expect(scheduleBtn).toBeDisabled(); // no link yet

    await page
      .getByPlaceholder(/meet\.zoho\.com/i)
      .pressSequentially(MEETING_URL, { delay: 10 });
    await expect(scheduleBtn).toBeEnabled();
    await scheduleBtn.click();

    await expect(page.getByText(SESSION_TITLE)).toBeVisible();
    await expect(page.getByText(/link hidden from students/i)).toBeVisible();
    await expect(page.getByText(/^external$/i)).toBeVisible();
  });

  test("student sees the card — and the DOM never contains the meeting URL", async ({
    page,
  }) => {
    await login(page, STUDENT_EMAIL, /\/dashboard/);
    await page.goto(`/bootcamp/${BOOTCAMP_ID}`);
    await page.waitForLoadState("networkidle");

    await expect(page.getByText(/live workshops/i)).toBeVisible();
    await expect(page.getByText(SESSION_TITLE)).toBeVisible();
    await expect(
      page.getByRole("link", { name: /enter live session/i }),
    ).toBeVisible();

    // THE LEAK INVARIANT — the raw meeting URL must not exist anywhere in
    // the served document: not in hrefs, data attributes, or the RSC payload.
    const html = await page.content();
    expect(html).not.toContain("meet.zoho.com");
  });

  test("join CTA 302s through the masked route to the meeting", async ({
    page,
  }) => {
    await login(page, STUDENT_EMAIL, /\/dashboard/);
    await page.goto(`/bootcamp/${BOOTCAMP_ID}`);

    const cta = page.getByRole("link", { name: /enter live session/i });
    const href = await cta.getAttribute("href");
    expect(href).toMatch(/^\/api\/live\/.+\/join$/);

    // page.request shares the student's auth cookies. maxRedirects: 0 lets
    // us read the raw 302 instead of following it to the external site.
    const res = await page.request.get(href!, { maxRedirects: 0 });
    expect(res.status()).toBe(302);
    expect(res.headers()["location"]).toBe(MEETING_URL);
  });
});
