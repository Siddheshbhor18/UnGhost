import { GlassNavbar } from "@/components/glass";
import { BackdropMesh } from "@/components/ui";
import { Skeleton } from "@/components/ui";

/**
 * Default route-loading skeleton.
 *
 * Rendered by Next.js Suspense whenever a server segment is still resolving —
 * gives users an immediate visual (navbar + skeleton blocks) instead of the
 * previous-route freeze. Lives in components/ui so every section can reuse.
 *
 * Variants:
 *   - "grid"   — 3-col card grid (catalogue / list pages)
 *   - "stack"  — vertical list rows (applications, messages, settings)
 *   - "split"  — sidebar + main (dashboards, kanban)
 *   - "detail" — hero + two-column body (single-item pages)
 */
type Variant = "grid" | "stack" | "split" | "detail";

export function PageLoadingShell({
  variant = "stack",
  title,
}: {
  variant?: Variant;
  title?: string;
}) {
  return (
    <main className="relative min-h-screen">
      <BackdropMesh />
      <GlassNavbar />
      <div className="mx-auto max-w-content px-4 pt-8 pb-16">
        {/* Title bar — keeps page heading stable across nav. */}
        <div className="mb-8 max-w-prose">
          <Skeleton shape="text" width="80px" className="mb-2" />
          <Skeleton
            shape="title"
            width="60%"
            height={36}
            className="mb-2"
            aria-label={title ?? "Loading"}
          />
          <Skeleton shape="text" width="80%" />
        </div>

        {variant === "grid" ? <GridSkeleton /> : null}
        {variant === "stack" ? <StackSkeleton /> : null}
        {variant === "split" ? <SplitSkeleton /> : null}
        {variant === "detail" ? <DetailSkeleton /> : null}
      </div>
    </main>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-neutral-200 bg-white/60 p-5"
        >
          <Skeleton shape="block" height={140} className="mb-4 rounded-xl" />
          <Skeleton shape="title" width="70%" height={20} className="mb-2" />
          <Skeleton shape="text" width="100%" className="mb-1" />
          <Skeleton shape="text" width="85%" className="mb-4" />
          <div className="flex justify-between items-center pt-3 border-t border-neutral-200">
            <Skeleton shape="text" width="40%" />
            <Skeleton shape="text" width="20%" />
          </div>
        </div>
      ))}
    </div>
  );
}

function StackSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 7 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-neutral-200 bg-white/60 p-4 flex items-center gap-4"
        >
          <Skeleton shape="avatar" />
          <div className="flex-1 space-y-2">
            <Skeleton shape="title" width="45%" height={18} />
            <Skeleton shape="text" width="65%" />
          </div>
          <Skeleton shape="text" width="80px" />
        </div>
      ))}
    </div>
  );
}

function SplitSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-neutral-200 bg-white/60 p-5"
          >
            <Skeleton shape="title" width="60%" className="mb-3" />
            <Skeleton shape="text" width="100%" className="mb-1" />
            <Skeleton shape="text" width="80%" />
          </div>
        ))}
      </div>
      <aside className="space-y-3">
        <div className="rounded-2xl border border-neutral-200 bg-white/60 p-5 h-[200px]">
          <Skeleton shape="title" width="50%" className="mb-3" />
          <Skeleton shape="text" width="100%" className="mb-1" />
          <Skeleton shape="text" width="60%" />
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white/60 p-5 h-[150px]">
          <Skeleton shape="title" width="50%" className="mb-3" />
          <Skeleton shape="text" width="100%" className="mb-1" />
          <Skeleton shape="text" width="60%" />
        </div>
      </aside>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-neutral-200 bg-white/60 p-7">
        <Skeleton shape="text" width="20%" className="mb-3" />
        <Skeleton shape="title" width="70%" height={32} className="mb-3" />
        <Skeleton shape="text" width="90%" className="mb-1" />
        <Skeleton shape="text" width="75%" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-neutral-200 bg-white/60 p-5 h-[300px]">
            <Skeleton shape="block" height={260} className="rounded-xl" />
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-white/60 p-5">
            <Skeleton shape="title" width="40%" className="mb-3" />
            <Skeleton shape="text" width="100%" className="mb-1" />
            <Skeleton shape="text" width="100%" className="mb-1" />
            <Skeleton shape="text" width="60%" />
          </div>
        </div>
        <aside className="space-y-3">
          <div className="rounded-2xl border border-neutral-200 bg-white/60 p-5 h-[180px]">
            <Skeleton shape="title" width="60%" className="mb-3" />
            <Skeleton shape="text" width="100%" />
          </div>
        </aside>
      </div>
    </div>
  );
}
