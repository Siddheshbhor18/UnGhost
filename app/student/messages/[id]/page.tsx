import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import {
  BlobField,
  GlassBadge,
  GlassNavbar,
} from "@/components/glass";
import { getMessageThreadById } from "@/server/store";
import { MessageThread } from "@/components/shared/MessageThread";

export const dynamic = "force-dynamic";

export default async function StudentThreadPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login?next=/student/messages/" + params.id);
  if (session.user.role !== "student") redirect("/");

  const thread = await getMessageThreadById(params.id);
  if (!thread) notFound();
  // Authorisation — only the participant student can view.
  if (thread.studentId !== session.user.id) {
    redirect("/student/messages");
  }

  return (
    <main className="relative min-h-screen">
      <BlobField />
      <GlassNavbar />
      <div className="mx-auto max-w-3xl px-4 pt-6 pb-12">
        <Link
          href="/student/messages"
          className="inline-flex items-center gap-1 text-sm text-brand-primary font-semibold mb-3"
        >
          <ChevronLeft size={14} /> Inbox
        </Link>

        <div className="mb-4">
          <GlassBadge tone="brand">
            {thread.context.type === "application" ? "Application" : "InMail"}{" "}
            · {thread.companyName}
          </GlassBadge>
          <h1 className="font-display font-extrabold text-2xl md:text-3xl text-brand-ink mt-2">
            {thread.jobTitle ?? "Conversation"}
          </h1>
        </div>

        <MessageThread thread={thread} />
      </div>
    </main>
  );
}
