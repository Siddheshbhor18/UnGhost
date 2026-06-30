import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { getUserById } from "@/server/store";
import { effectivePlan } from "@/server/lib/quota";
import { GlassNavbar } from "@/components/glass";
import { BackdropMesh } from "@/components/ui";
import { CourseCheckoutClient } from "@/components/courses/CourseCheckoutClient";
import { isCourseId } from "@/shared/lib/courses";
import { ROOMS, type BootcampCategory } from "@/shared/rooms";
import { PLAN_LIMITS } from "@/shared/types";
export const dynamic = "force-dynamic";

interface Props {
  searchParams: { course?: string; success?: string };
}

/**
 * /bootcamps/checkout — bootcamp course cart + checkout (students only).
 *
 * Server shell: authenticates the buyer and hands the persisted client cart to
 * `CourseCheckoutClient`, which resolves pricing through the bundle engine and
 * runs the Razorpay flow. A `?course=<id>` preselects that course; `?success=1`
 * renders the post-payment thank-you and clears the cart.
 */
export default async function CourseCheckoutPage({ searchParams }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login?next=/bootcamps/checkout");
  }
  if (session.user.role !== "student") {
    redirect(
      session.user.role === "recruiter" ? "/recruiter/command" : "/admin/metrics",
    );
  }
  const user = await getUserById(session.user.id);
  if (!user) redirect("/login");

  const preselect =
    searchParams.course && isCourseId(searchParams.course)
      ? searchParams.course
      : null;
  const success = searchParams.success === "1";

  // Owned-course set the picker + cart view use to hide what the buyer
  // already holds. Grandfathered premium (`bootcampsIncluded`) owns
  // everything; otherwise it's the unexpired entries on `ownedCourses`.
  const nowMs = Date.now();
  const ownsAll = PLAN_LIMITS[effectivePlan(user)].bootcampsIncluded;
  const ownedCourses: BootcampCategory[] = ownsAll
    ? ROOMS.map((r) => r.id)
    : (user.ownedCourses ?? [])
        .filter((g) => Date.parse(g.expiresAt) > nowMs)
        .map((g) => g.course);

  return (
    <main className="relative min-h-screen">
      <BackdropMesh />
      <GlassNavbar />
      <div className="mx-auto max-w-content px-4 pt-8 pb-16">
        <CourseCheckoutClient
          preselect={preselect}
          success={success}
          ownedCourses={ownedCourses}
          prefill={{
            name: user.name ?? undefined,
            email: user.email ?? undefined,
            contact: user.profile?.contactPhone ?? undefined,
          }}
        />
      </div>
    </main>
  );
}
