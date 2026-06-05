import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { BlobField } from "@/components/glass";

// Admin pages are auth-gated and read live DB/cache per request — they must
// never be statically prerendered. Forcing dynamic on the layout cascades to
// every /admin/* route, so a build no longer fetches the DB at prerender (which
// made builds fail on any transient Atlas/Upstash blip).
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login?role=admin");
  if (session.user.role !== "admin")
    redirect(session.user.role === "recruiter" ? "/recruiter/command" : "/dashboard");

  return (
    <div className="min-h-screen relative flex">
      <BlobField />
      <AdminSidebar />
      <main className="flex-1 overflow-x-hidden">{children}</main>
    </div>
  );
}
