import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import {
  MessageCircle,
  Inbox,
  Briefcase,
  Mail,
} from "lucide-react";
import { authOptions } from "@/server/auth";
import {
  BlobField,
  GlassBadge,
  GlassCard,
  GlassNavbar,
} from "@/components/glass";
import {
  listMessageThreadsForUser,
} from "@/server/store";

export default async function RecruiterMessagesInbox() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login?role=recruiter");
  if (session.user.role !== "recruiter") {
    redirect(session.user.role === "admin" ? "/admin/today" : "/dashboard");
  }
  const threads = await listMessageThreadsForUser(session.user.id);
  const unreadTotal = threads.reduce(
    (s, t) => s + (t.unreadForRecruiter ?? 0),
    0,
  );

  return (
    <main className="relative min-h-screen">
      <BlobField />
      <GlassNavbar />
      <div className="mx-auto max-w-4xl px-4 pt-6 pb-12">
        <div className="mb-6">
          <GlassBadge tone="brand">
            <Inbox size={11} /> Messages
          </GlassBadge>
          <h1 className="font-display font-extrabold text-3xl md:text-4xl text-brand-ink mt-2">
            Your conversations
          </h1>
          <p className="text-sm text-brand-muted mt-1">
            {threads.length} thread{threads.length === 1 ? "" : "s"} ·{" "}
            <span className="text-brand-ink font-semibold">
              {unreadTotal}
            </span>{" "}
            unread · 6-second poll · read receipts
          </p>
        </div>

        {threads.length === 0 ? (
          <GlassCard className="text-center !py-12">
            <MessageCircle size={28} className="mx-auto text-brand-muted mb-3" />
            <p className="font-display font-bold text-brand-ink">
              No conversations yet
            </p>
            <p className="text-sm text-brand-muted mt-2">
              Advance any candidate past Stage 1 to open a thread.
            </p>
            <Link href="/recruiter/command" className="btn-brand inline-flex mt-5">
              Open pipeline →
            </Link>
          </GlassCard>
        ) : (
          <div className="space-y-3">
            {threads.map((t) => {
              const unread = t.unreadForRecruiter ?? 0;
              return (
                <Link
                  key={t.id}
                  href={`/recruiter/messages/${t.id}`}
                  className={`block rounded-2xl backdrop-blur-xl border shadow-glass p-4 hover:-translate-y-0.5 hover:shadow-glass-hover transition ${
                    unread > 0
                      ? "bg-brand-primary/5 border-brand-primary/20"
                      : "bg-white/55 border-white/60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <GlassBadge tone="neutral">
                          {t.context.type === "application" ? (
                            <>
                              <Briefcase size={9} /> Application
                            </>
                          ) : (
                            <>
                              <Mail size={9} /> InMail
                            </>
                          )}
                        </GlassBadge>
                        {unread > 0 && (
                          <GlassBadge tone="brand">{unread} new</GlassBadge>
                        )}
                      </div>
                      <p className="font-display font-semibold text-brand-ink line-clamp-1">
                        {t.jobTitle ?? "Conversation"}
                      </p>
                      <p className="text-xs text-brand-muted mt-0.5 line-clamp-1">
                        {t.lastPreview}
                      </p>
                    </div>
                    <span className="text-[10px] text-brand-muted font-mono shrink-0">
                      {new Date(t.lastMessageAt).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
