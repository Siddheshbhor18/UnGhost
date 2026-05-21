/**
 * One-off: clear test enrollments for alice@demo.test and reset the
 * currentSubmissionCount on bootcamps she touched. Used during Phase 2
 * smoke testing — should NOT run in prod.
 */
import { config as loadEnv } from "dotenv";
import mongoose from "mongoose";
loadEnv({ path: ".env.local" });

async function main(): Promise<void> {
  await mongoose.connect(process.env.MONGODB_URI!);
  const subs = mongoose.connection.collection("paymentsubmissions");
  const bootcamps = mongoose.connection.collection("bootcamps");

  const toDelete = await subs.find({ userId: "usr_alice" }).toArray();
  console.log(`Found ${toDelete.length} test submission(s) for usr_alice`);
  const bcIds = [...new Set(toDelete.map((s) => s.bootcampId))];

  await subs.deleteMany({ userId: "usr_alice" });
  for (const bcId of bcIds) {
    await bootcamps.updateOne(
      { _id: bcId as never },
      { $set: { currentSubmissionCount: 0 } },
    );
    console.log(`Reset counter on ${bcId}`);
  }
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
