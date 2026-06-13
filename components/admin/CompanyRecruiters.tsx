"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";

interface Rec {
  id: string;
  name: string;
  email: string;
  isCompanyAdmin?: boolean;
}

/**
 * Lists a company's recruiters with a per-row "remove from company" action
 * (admin only). Removing clears the recruiter's companyId + the roster; the
 * account stays active but can't post jobs until re-assigned.
 */
export function CompanyRecruiters({ recruiters }: { recruiters: Rec[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(recruiters);
  const [busy, setBusy] = useState<string | null>(null);

  if (rows.length === 0) return null;

  async function remove(id: string, name: string) {
    if (
      !window.confirm(
        `Remove ${name} from this company? Their account stays active but they can't post jobs until re-assigned.`,
      )
    ) {
      return;
    }
    setBusy(id);
    try {
      const res = await fetch("/api/admin/recruiters/unlink", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ recruiterId: id }),
      });
      if (res.ok) {
        setRows((rs) => rs.filter((r) => r.id !== id));
        router.refresh();
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-4">
      <p className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold mb-1">
        Recruiters
      </p>
      <ul className="space-y-0.5 text-xs text-brand-ink/80">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-2">
            <span className="truncate">
              {r.name}
              {r.isCompanyAdmin ? " · admin" : ""}
            </span>
            <span className="flex items-center gap-2 shrink-0">
              <span className="text-brand-muted truncate max-w-[140px]">
                {r.email}
              </span>
              <button
                onClick={() => remove(r.id, r.name)}
                disabled={busy === r.id}
                title="Remove from company"
                className="text-brand-muted hover:text-rose-600 disabled:opacity-50"
              >
                {busy === r.id ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <X size={12} />
                )}
              </button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
