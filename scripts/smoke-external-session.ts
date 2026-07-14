/**
 * Scratch seed/cleanup for the external-session browser smoke test.
 *
 *   npx tsx scripts/smoke-external-session.ts seed     → upserts smoke entities
 *   npx tsx scripts/smoke-external-session.ts cleanup  → removes them all
 *
 * Everything is namespaced `smoke_ext_*` / `*@smoke.test` so cleanup is a
 * targeted delete and the shared dev database is never polluted.
 */
import path from "node:path";
import { config as loadEnv } from "dotenv";
import mongoose from "mongoose";
import { hashPassword } from "../server/auth/password";

loadEnv({ path: path.join(process.cwd(), ".env.local") });
loadEnv({ path: path.join(process.cwd(), ".env") });

const INSTRUCTOR_ID = "smoke_ext_instructor";
const STUDENT_ID = "smoke_ext_student";
const BOOTCAMP_ID = "smoke_ext_bootcamp";
const PASSWORD = "smoke-demo";

async function main(): Promise<void> {
  const mode = process.argv[2];
  if (mode !== "seed" && mode !== "cleanup") {
    console.error("usage: tsx scripts/smoke-external-session.ts seed|cleanup");
    process.exit(1);
  }
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI missing");
  await mongoose.connect(uri);
  const db = mongoose.connection;

  if (mode === "cleanup") {
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
    console.log(`cleaned up smoke entities (${sessionIds.length} sessions)`);
  } else {
    const passwordHash = await hashPassword(PASSWORD);
    const now = new Date().toISOString();
    const inYear = new Date(Date.now() + 365 * 86400_000).toISOString();
    await db.collection("users").updateOne(
      { _id: INSTRUCTOR_ID as never },
      {
        $set: {
          email: "instructor@smoke.test",
          name: "Smoke Instructor",
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
          email: "student@smoke.test",
          name: "Smoke Student",
          role: "student",
          passwordHash,
          emailVerified: now,
          status: "active",
          // Room ownership drives bootcamp access (ownsCourse).
          ownedCourses: [{ course: "ai", expiresAt: inYear }],
          profile: {
            alias: "smokey",
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
          title: "Smoke Test — AI Agents Cohort",
          description: "Scratch cohort for the external-session smoke test.",
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
    console.log("seeded smoke instructor/student/bootcamp");
    console.log(`  instructor: instructor@smoke.test / ${PASSWORD}`);
    console.log(`  student:    student@smoke.test / ${PASSWORD}`);
    console.log(`  bootcamp:   /bootcamp/${BOOTCAMP_ID}`);
  }
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
