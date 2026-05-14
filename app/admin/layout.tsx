import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/admin-login");
  if (session.user.role !== "admin")
    redirect(session.user.role === "recruiter" ? "/recruiter/command" : "/dashboard");

  return (
    <div className="min-h-screen bg-bg-base bg-arcade-grid flex">
      <AdminSidebar />
      <main className="flex-1 overflow-x-hidden">{children}</main>
    </div>
  );
}
