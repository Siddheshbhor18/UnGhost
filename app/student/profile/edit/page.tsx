import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { BlobField, GlassNavbar } from "@/components/glass";
import { getUserById } from "@/server/store";
import { ProfileEditor } from "@/components/student/ProfileEditor";

export default async function EditProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login?next=/student/profile/edit");
  if (session.user.role !== "student") redirect("/");

  const user = await getUserById(session.user.id);
  if (!user?.profile) redirect("/onboarding");

  return (
    <main className="relative min-h-screen">
      <BlobField />
      <GlassNavbar />
      <div className="mx-auto max-w-3xl px-4 pt-6 pb-12">
        <ProfileEditor user={user} />
      </div>
    </main>
  );
}
