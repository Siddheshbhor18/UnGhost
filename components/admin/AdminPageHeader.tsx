import { GlassBadge } from "@/components/glass";

type BadgeTone = React.ComponentProps<typeof GlassBadge>["tone"];

/**
 * AdminPageHeader — the one header every /admin page uses.
 *
 * Before this existed each page hand-rolled its own block (three competing
 * title scales, arcade-era copy like "Every Student on the Grid"). One
 * component keeps the scale, spacing, and voice identical everywhere and
 * gives pages a single slot for header-level actions (e.g. "New session").
 */
export function AdminPageHeader({
  badge,
  badgeTone = "brand",
  title,
  subtitle,
  actions,
}: {
  /** Short section label rendered as the eyebrow badge, e.g. "Students". */
  badge: string;
  badgeTone?: BadgeTone;
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <GlassBadge tone={badgeTone}>{badge}</GlassBadge>
        <h1 className="mt-3 font-display text-3xl font-extrabold text-brand-ink md:text-4xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 max-w-2xl text-sm text-brand-muted">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
