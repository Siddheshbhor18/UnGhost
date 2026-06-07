"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, Loader2, UserPlus } from "lucide-react";
import { GlassBadge, GlassButton, GlassCard } from "@/components/glass";

interface RecruiterLite {
  id: string;
  name: string;
  email: string;
}
interface CompanyLite {
  id: string;
  name: string;
  domain: string;
}

const NEW = "__new__";

export function AssignRecruiterPanel({
  recruiters,
  companies,
}: {
  recruiters: RecruiterLite[];
  companies: CompanyLite[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState(recruiters);

  if (rows.length === 0) {
    return (
      <GlassCard className="!p-5">
        <p className="text-sm text-brand-muted inline-flex items-center gap-2">
          <Check size={15} className="text-emerald-600" />
          Every recruiter is linked to a company.
        </p>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="!p-5 space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-display font-bold text-brand-ink inline-flex items-center gap-2">
          <UserPlus size={16} /> Unlinked recruiters
          <GlassBadge tone="warn">{rows.length}</GlassBadge>
        </p>
      </div>
      <p className="text-xs text-brand-muted">
        These recruiters signed up but aren&apos;t attached to a company, so they
        can&apos;t post jobs. Assign each to an existing company or create one.
      </p>
      <div className="divide-y divide-brand-ink/5">
        {rows.map((r) => (
          <AssignRow
            key={r.id}
            recruiter={r}
            companies={companies}
            onDone={() => {
              setRows((rs) => rs.filter((x) => x.id !== r.id));
              router.refresh();
            }}
          />
        ))}
      </div>
    </GlassCard>
  );
}

function AssignRow({
  recruiter,
  companies,
  onDone,
}: {
  recruiter: RecruiterLite;
  companies: CompanyLite[];
  onDone: () => void;
}) {
  // Default selection: a company whose domain matches the recruiter's email
  // domain, else the first existing company, else "create new".
  const emailDomain = recruiter.email.split("@")[1]?.toLowerCase() ?? "";
  const domainMatch = companies.find((c) => c.domain === emailDomain);
  const [companyId, setCompanyId] = useState<string>(
    domainMatch?.id ?? companies[0]?.id ?? NEW,
  );
  const [newName, setNewName] = useState("");
  const [newDomain, setNewDomain] = useState(emailDomain);
  const [makeAdmin, setMakeAdmin] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const creating = companyId === NEW;
  const canSubmit = creating
    ? newName.trim().length >= 2 && /^[a-z0-9.-]+\.[a-z]{2,}$/.test(newDomain.trim().toLowerCase())
    : Boolean(companyId);

  async function assign() {
    setBusy(true);
    setErr(null);
    try {
      const body = creating
        ? { recruiterId: recruiter.id, newCompany: { name: newName.trim(), domain: newDomain.trim().toLowerCase() }, makeAdmin }
        : { recruiterId: recruiter.id, companyId, makeAdmin };
      const res = await fetch("/api/admin/recruiters/assign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setErr(data?.error ?? "Couldn't assign. Try again.");
        return;
      }
      onDone();
    } catch {
      setErr("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="py-3 flex flex-wrap items-center gap-3">
      <div className="min-w-[180px]">
        <p className="text-sm font-semibold text-brand-ink">{recruiter.name}</p>
        <p className="text-xs text-brand-muted">{recruiter.email}</p>
      </div>

      <select
        value={companyId}
        onChange={(e) => setCompanyId(e.target.value)}
        disabled={busy}
        className="bg-white/70 border border-brand-ink/10 rounded-lg px-2.5 py-2 text-sm text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
      >
        {companies.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
        <option value={NEW}>＋ Create new company…</option>
      </select>

      {creating && (
        <div className="flex items-center gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Company name"
            disabled={busy}
            className="bg-white/70 border border-brand-ink/10 rounded-lg px-2.5 py-2 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
          />
          <input
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            placeholder="domain.com"
            disabled={busy}
            className="bg-white/70 border border-brand-ink/10 rounded-lg px-2.5 py-2 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
          />
        </div>
      )}

      <label className="text-xs text-brand-muted inline-flex items-center gap-1.5 cursor-pointer">
        <input
          type="checkbox"
          checked={makeAdmin}
          onChange={(e) => setMakeAdmin(e.target.checked)}
          disabled={busy}
        />
        Company admin
      </label>

      <GlassButton
        variant="brand"
        onClick={assign}
        disabled={!canSubmit || busy}
        className="ml-auto"
      >
        {busy ? <Loader2 size={13} className="animate-spin" /> : <Building2 size={13} />}
        Assign
      </GlassButton>

      {err && <p className="text-xs text-rose-600 w-full">{err}</p>}
    </div>
  );
}
