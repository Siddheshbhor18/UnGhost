import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";

// Instructor pages read live session state per request — never prerender.
export const dynamic = "force-dynamic";

/**
 * /instructor — dedicated instructor sign-in entry.
 *
 * The public /login card only offers Student + Recruiter tabs; instructors are
 * provisioned accounts, so they enter here. Unauthenticated visitors land on
 * the role-locked login (`?role=instructor`), signed-in instructors go to their
 * console, and any other signed-in role is sent to its own home.
 */
export default async function InstructorEntry() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login?role=instructor");
  if (session.user.role !== "instructor") {
    redirect(
      session.user.role === "student"
        ? "/dashboard"
        : session.user.role === "recruiter"
        ? "/recruiter/command"
        : "/admin/today",
    );
  }
  redirect("/instructor/today");
}
