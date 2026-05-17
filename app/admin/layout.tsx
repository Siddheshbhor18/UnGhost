import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { BlobField } from "@/components/glass";

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
