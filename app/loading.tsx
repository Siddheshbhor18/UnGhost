/**
 * Root loading.tsx — shown immediately while ANY route in the app is
 * compiling (dev) or fetching server data (prod). Without this, the
 * browser shows a blank white screen during navigation, which reads as
 * "the platform is slow" even when total wait is under a second.
 *
 * Keep it minimal — no images, no client JS. The point is INSTANT paint.
 * Each nested route can override this with its own `loading.tsx` for a
 * shape-of-page skeleton tailored to that route.
 */
export default function RootLoading() {
  return (
    <main className="min-h-screen grid place-items-center bg-white">
      <div className="flex flex-col items-center gap-4">
        {/* Brand-tinted spinner — no external SVG to keep payload tiny. */}
        <div
          className="w-10 h-10 rounded-full border-[3px] border-brand-primary/15 border-t-brand-primary animate-spin"
          aria-label="Loading"
        />
        <p className="text-[11px] uppercase tracking-widest font-semibold text-brand-muted">
          un<span className="text-brand-primary">Ghost</span>
        </p>
      </div>
    </main>
  );
}
