import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { Inbox, MessageCircle } from "lucide-react";
import { authOptions } from "@/server/auth";
import {
  BlobField,
  GlassBadge,
  GlassCard,
  GlassNavbar,
} from "@/components/glass";
import { listMessageThreadsForUser } from "@/server/store";

export const dynamic = "force-dynamic";

export default async function StudentMessagesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login?next=/student/messages");
  if (session.user.role !== "student") redirect("/");

  const threads = await listMessageThreadsForUser(session.user.id);
  // Newest activity first.
  threads.sort(
    (a, b) =>
      new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
  );

  return (
    <main className="relative min-h-screen">
      <BlobField />
      <GlassNavbar />
      <div className="mx-auto max-w-3xl px-4 pt-6 pb-12">
        <div className="mb-6">
          <GlassBadge tone="brand">
            <MessageCircle size={11} /> Messages
          </GlassBadge>
          <h1 className="font-display font-extrabold text-3xl md:text-4xl text-brand-ink mt-2">
            Your conversations
          </h1>
          <p className="text-sm text-brand-muted mt-1">
            Threads opened from accepted InMails and advanced applications.
          </p>
        </div>

        {threads.length === 0 ? (
          <GlassCard className="text-center !py-12">
            <Inbox size={28} className="mx-auto text-brand-muted mb-3" />
            <p className="font-display font-bold text-brand-ink">No messages yet</p>
            <p className="text-sm text-brand-muted mt-2 max-w-md mx-auto">
              Threads appear here once you accept an InMail or once a recruiter
              advances you past stage 1 on an application.
            </p>
          </GlassCard>
        ) : (
          <ul className="space-y-2">
            {threads.map((t) => (
              <li key={t.id}>
                <Link href={`/student/messages/${t.id}`}>
                  <GlassCard interactive className="!p-4">
                    <div className="flex items-start gap-3">
                      <div className="grid place-items-center w-10 h-10 rounded-xl bg-brand-gradient text-white shadow-brand-glow shrink-0">
                        <MessageCircle size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-display font-bold text-brand-ink truncate">
                            {t.companyName}
                          </p>
                          {t.unreadForStudent > 0 ? (
                            <GlassBadge tone="brand">
                              {t.unreadForStudent} new
                            </GlassBadge>
                          ) : null}
                        </div>
                        <p className="text-xs text-brand-muted truncate mt-0.5">
                          {t.jobTitle ?? "Conversation"}
                        </p>
                        <p className="text-sm text-brand-ink/85 mt-2 line-clamp-1">
                          {t.lastPreview}
                        </p>
                      </div>
                      <p className="text-[10px] text-brand-muted shrink-0">
                        {new Date(t.lastMessageAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                      </p>
                    </div>
                  </GlassCard>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
