import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { BlobField, GlassNavbar } from "@/components/glass";
import { BootcampEditor } from "@/components/instructor/BootcampEditor";
import { getBootcampById } from "@/server/store";

export default async function StudioEditorPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect(`/login?next=/instructor/studio/${params.id}`);
  if (session.user.role !== "instructor") redirect("/");

  const bc = await getBootcampById(params.id);
  if (!bc) notFound();
  if (bc.instructorId !== session.user.id) {
    redirect("/instructor/studio");
  }

  return (
    <main className="relative min-h-screen">
      <BlobField />
      <GlassNavbar />
      <div className="mx-auto max-w-4xl px-4 pt-6 pb-12">
        <BootcampEditor bootcamp={bc} />
      </div>
    </main>
  );
}
