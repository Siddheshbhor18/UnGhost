/**
 * Migration: extend existing Bootcamp documents with the new fields the
 * QR-payment + Meet flow needs. ADDITIVE only — never overwrites existing
 * data, so a re-run is safe.
 *
 * What it does, per Bootcamp document:
 *   1. priceInPaise        ← priceINR * 100 (skipped if priceInPaise already set)
 *   2. gstPercent          ← 18 (skipped if already set)
 *   3. maxStudents         ← 495 (skipped if already set; Google Meet caps at 500)
 *   4. enrollmentOpensAt   ← null (admin must fill before publishing)
 *   5. enrollmentClosesAt  ← null
 *   6. startsAt / endsAt   ← null
 *   7. currentSubmissionCount ← 0 (used for atomic capacity check)
 *   8. sessions[]          ← initialised from existing liveSlots[] if non-empty,
 *                            else left as []. Each session gets a default
 *                            90-min duration and null meetUrl/calendarEventId.
 *
 * Usage:
 *
 *   npx tsx scripts/migrate-bootcamps-to-paise.ts            # dry run (default)
 *   npx tsx scripts/migrate-bootcamps-to-paise.ts --apply    # actually write
 *
 * Dry run prints exactly what would change per document without touching
 * the DB. Run it first in staging, eyeball the output, then re-run with
 * --apply.
 *
 * IMPORTANT: schema fields added by this migration must also be added to
 * `server/db/models.ts → BootcampSchema` in the same PR. Otherwise Mongoose
 * will strip them on the next .save() call.
 */

import { config as loadEnv } from "dotenv";
import mongoose from "mongoose";
import { randomUUID } from "crypto";

// Match Next.js's env-loading order: .env.local wins over .env in dev.
loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

const APPLY = process.argv.includes("--apply");
const URI = process.env.MONGODB_URI;
if (!URI) {
  // eslint-disable-next-line no-console
  console.error("Missing MONGODB_URI in env.");
  process.exit(1);
}

interface LegacyBootcamp {
  _id: string;
  title?: string;
  priceINR?: number;
  priceInPaise?: number;
  gstPercent?: number;
  maxStudents?: number;
  enrollmentOpensAt?: Date | null;
  enrollmentClosesAt?: Date | null;
  startsAt?: Date | null;
  endsAt?: Date | null;
  currentSubmissionCount?: number;
  liveSlots?: string[];
  sessions?: Array<{
    _id: string;
    title?: string;
    scheduledFor?: Date;
    durationMinutes?: number;
    meetUrl?: string | null;
    calendarEventId?: string | null;
    recordingUrl?: string | null;
  }>;
}

async function main(): Promise<void> {
  await mongoose.connect(URI!);
  // eslint-disable-next-line no-console
  console.log(`Connected. Mode: ${APPLY ? "APPLY (writes)" : "DRY RUN (read-only)"}`);

  // Don't import the typed BootcampModel — its schema might not yet contain
  // the new fields when this script runs (chicken/egg). Operate via the
  // raw collection so we can set anything.
  const coll = mongoose.connection.collection("bootcamps");
  const cursor = coll.find({});

  let scanned = 0;
  let toUpdate = 0;
  let updated = 0;
  let skipped = 0;
  const errors: Array<{ id: string; err: string }> = [];

  while (await cursor.hasNext()) {
    const doc = (await cursor.next()) as LegacyBootcamp | null;
    if (!doc) continue;
    scanned++;

    const updates: Record<string, unknown> = {};

    // 1. Price in paise — convert from priceINR if not already set.
    if (doc.priceInPaise === undefined || doc.priceInPaise === null) {
      if (typeof doc.priceINR === "number" && doc.priceINR > 0) {
        updates.priceInPaise = Math.round(doc.priceINR * 100);
      } else {
        // No priceINR either — flag for admin to fill manually. Leave null.
        updates.priceInPaise = 0;
      }
    }

    // 2. GST default
    if (doc.gstPercent === undefined || doc.gstPercent === null) {
      updates.gstPercent = 18;
    }

    // 3. Capacity default
    if (doc.maxStudents === undefined || doc.maxStudents === null) {
      updates.maxStudents = 495;
    }

    // 4–7. Date fields — initialise to null if missing. Admin fills via UI.
    if (doc.enrollmentOpensAt === undefined) updates.enrollmentOpensAt = null;
    if (doc.enrollmentClosesAt === undefined) updates.enrollmentClosesAt = null;
    if (doc.startsAt === undefined) updates.startsAt = null;
    if (doc.endsAt === undefined) updates.endsAt = null;

    // 8. Atomic capacity counter — initialise to 0.
    if (
      doc.currentSubmissionCount === undefined ||
      doc.currentSubmissionCount === null
    ) {
      updates.currentSubmissionCount = 0;
    }

    // 9. Sessions array — seed from legacy liveSlots[] if non-empty and no
    //    sessions yet. Each liveSlot string is treated as a session title.
    //    scheduledFor is left null so admin fills the real time later.
    if (!doc.sessions || doc.sessions.length === 0) {
      if (Array.isArray(doc.liveSlots) && doc.liveSlots.length > 0) {
        updates.sessions = doc.liveSlots.map((label, idx) => ({
          _id: randomUUID(),
          title: label || `Session ${idx + 1}`,
          scheduledFor: null,
          durationMinutes: 90,
          meetUrl: null,
          calendarEventId: null,
          recordingUrl: null,
        }));
      } else {
        updates.sessions = [];
      }
    }

    if (Object.keys(updates).length === 0) {
      skipped++;
      continue;
    }
    toUpdate++;

    // eslint-disable-next-line no-console
    console.log(
      `\n[${scanned}] ${doc._id} · ${doc.title ?? "(untitled)"}\n` +
        Object.entries(updates)
          .map(
            ([k, v]) =>
              `   + ${k}: ${
                Array.isArray(v) ? `[${v.length} items]` : JSON.stringify(v)
              }`,
          )
          .join("\n"),
    );

    if (APPLY) {
      try {
        await coll.updateOne({ _id: doc._id as never }, { $set: updates });
        updated++;
      } catch (e) {
        errors.push({
          id: doc._id,
          err: e instanceof Error ? e.message : String(e),
        });
      }
    }
  }

  // eslint-disable-next-line no-console
  console.log(
    `\n──────────────────────────────────────────────\n` +
      `Scanned:      ${scanned}\n` +
      `Need updates: ${toUpdate}\n` +
      `Skipped:      ${skipped} (already migrated)\n` +
      (APPLY
        ? `Updated:      ${updated}\n` +
          (errors.length ? `Errors:       ${errors.length}\n` : "")
        : `(dry run — re-run with --apply to write)\n`),
  );

  if (errors.length) {
    // eslint-disable-next-line no-console
    console.error("Errors:", errors);
  }

  await mongoose.disconnect();
  process.exit(errors.length ? 1 : 0);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
