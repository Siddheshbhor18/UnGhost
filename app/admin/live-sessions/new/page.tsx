import { NewSessionForm } from "./NewSessionForm";

export const dynamic = "force-dynamic";

export default function NewLiveSessionPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-8 py-10">
      <header className="mb-6">
        <p className="text-[10px] uppercase tracking-widest font-semibold text-brand-muted mb-1">
          New live session
        </p>
        <h1 className="font-display font-extrabold text-3xl text-brand-ink">
          Schedule a session
        </h1>
        <p className="text-sm text-brand-muted mt-1 max-w-lg">
          Fill in the basics now — paste the YouTube video ID later when the
          instructor goes live on the broadcast.
        </p>
      </header>
      <NewSessionForm />
    </div>
  );
}
