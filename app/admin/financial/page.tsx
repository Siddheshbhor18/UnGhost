import {
  IndianRupee,
  TrendingUp,
  RefreshCcw,
  GraduationCap,
  Handshake,
} from "lucide-react";
import { GlassBadge, GlassCard } from "@/components/glass";
import { computeFinancialRollup } from "@/server/store";
import { paymentsMode } from "@/server/integrations/payments";

export default async function AdminFinancialPage() {
  const r = await computeFinancialRollup();
  const totalGrossPaise = r.bootcampRevenuePaise + r.sponsorshipRevenuePaise;
  const totalNetPaise = totalGrossPaise - r.refundsIssuedPaise;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="flex items-end justify-between flex-wrap gap-3 mb-6">
        <div>
          <GlassBadge tone="brand">
            <IndianRupee size={11} /> Financial
          </GlassBadge>
          <h1 className="font-display font-extrabold text-3xl md:text-4xl text-brand-ink mt-2">
            Revenue + refunds
          </h1>
          <p className="text-sm text-brand-muted mt-1">
            Bootcamp enrolment + recruiter sponsorship inflow, minus SLA-breach refunds.
            Payments via{" "}
            <span className={paymentsMode() === "live" ? "text-emerald-700 font-semibold" : "text-amber-700 font-semibold"}>
              PhonePe ({paymentsMode()})
            </span>
            .
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-3 mb-6">
        <BigKpi
          icon={<TrendingUp size={16} />}
          label="Gross revenue"
          value={paise(totalGrossPaise)}
          sub="bootcamp + sponsorship"
          tone="brand"
        />
        <BigKpi
          icon={<RefreshCcw size={16} />}
          label="Refunds issued"
          value={paise(r.refundsIssuedPaise)}
          sub={`${r.refundCount} SLA-breach refund${r.refundCount === 1 ? "" : "s"}`}
          tone="warn"
        />
        <BigKpi
          icon={<IndianRupee size={16} />}
          label="Net revenue"
          value={paise(totalNetPaise)}
          sub="gross − refunds"
          tone="success"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <GlassCard className="!p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold inline-flex items-center gap-1.5">
              <GraduationCap size={11} /> Bootcamps
            </p>
            <span className="text-xs text-brand-muted">
              {r.bootcampEnrolments} enrolments
            </span>
          </div>
          <p className="font-display text-4xl font-bold text-brand-primary">
            {paise(r.bootcampRevenuePaise)}
          </p>
          <p className="text-xs text-brand-muted mt-2">
            Sum of enrolledStudentIds × bootcamp price. Refunds tracked separately.
          </p>
        </GlassCard>

        <GlassCard className="!p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold inline-flex items-center gap-1.5">
              <Handshake size={11} /> Recruiter sponsorships
            </p>
            <span className="text-xs text-brand-muted">
              {r.sponsorshipCount} active
            </span>
          </div>
          <p className="font-display text-4xl font-bold text-brand-primary">
            {paise(r.sponsorshipRevenuePaise)}
          </p>
          <p className="text-xs text-brand-muted mt-2">
            Bootcamp seats sponsored by recruiters for promising candidates.
          </p>
        </GlassCard>
      </div>

      <GlassCard className="!p-5 mt-4">
        <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold mb-3">
          Anti-ghost guarantee
        </p>
        <p className="text-sm text-brand-ink/85 leading-relaxed">
          Every SLA breach triggers an automatic ₹250 student wallet credit. This
          is what keeps the platform&apos;s anti-ghost promise honest. Current
          refund tally:{" "}
          <span className="text-rose-700 font-semibold">{r.refundCount} refunds</span>{" "}
          ·{" "}
          <span className="text-rose-700 font-semibold">
            {paise(r.refundsIssuedPaise)}
          </span>{" "}
          paid out.
        </p>
      </GlassCard>
    </div>
  );
}

function paise(p: number): string {
  const rupees = p / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(rupees);
}

function BigKpi({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  tone: "brand" | "success" | "warn" | "danger";
}) {
  const cls =
    tone === "success"
      ? "text-emerald-600"
      : tone === "warn"
      ? "text-amber-600"
      : tone === "danger"
      ? "text-rose-600"
      : "text-brand-primary";
  return (
    <GlassCard className="!p-5">
      <div className="flex items-center justify-between mb-2">
        <span className={cls}>{icon}</span>
        <span className="text-[10px] uppercase tracking-wider text-brand-muted">
          {label}
        </span>
      </div>
      <p className={`font-display text-3xl font-bold ${cls}`}>{value}</p>
      <p className="text-[11px] text-brand-muted mt-1">{sub}</p>
    </GlassCard>
  );
}
