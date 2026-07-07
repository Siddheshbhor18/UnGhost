/**
 * SiteFooter — shared marketing footer.
 *
 * Extracted verbatim from the landing page so every public marketing surface
 * (landing, /instructors, ...) shares one footer instead of duplicating the
 * markup. Presentational only; no data or business logic.
 */
import Link from "next/link";
import { Instagram, Linkedin, Mail } from "lucide-react";
import { Logo } from "@/components/glass";

export function SiteFooter(): React.ReactElement {
  return (
    <footer className="border-t border-neutral-200 mt-10 pt-8 pb-8">
      <div className="mx-auto max-w-content px-4 grid grid-cols-2 md:grid-cols-6 gap-8">
        <div className="col-span-2">
          <Logo size="sm" />
          <p className="text-body-xs text-neutral-900 mt-3 max-w-xs leading-relaxed">
            India-first hiring platform with anti-ghosting SLAs and embedded
            skill bootcamps. Built in Pune. DPDP Act compliant.
          </p>
          <div className="flex gap-2 mt-4">
            <a
              href="https://www.linkedin.com/company/unghost"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="unGhost on LinkedIn"
              className="social-icon grid place-items-center w-8 h-8 rounded-lg bg-neutral-100 text-brand-500 hover:bg-brand-500 hover:text-white transition"
            >
              <Linkedin size={14} />
            </a>
            <a
              href="https://www.instagram.com/unghost.in/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="unGhost on Instagram"
              className="social-icon grid place-items-center w-8 h-8 rounded-lg bg-neutral-100 text-brand-500 hover:bg-brand-500 hover:text-white transition"
            >
              <Instagram size={14} />
            </a>
            <a
              href="mailto:hello@unghost.in"
              aria-label="Email unGhost"
              className="social-icon grid place-items-center w-8 h-8 rounded-lg bg-neutral-100 text-brand-500 hover:bg-brand-500 hover:text-white transition"
            >
              <Mail size={14} />
            </a>
          </div>
        </div>
        <FootCol
          title="For Students"
          links={[
            ["Find Jobs", "/signup?next=/student/jobs"],
            ["Bootcamps", "/bootcamps"],
            ["AI Coach", "/signup?next=/student/coach"],
            ["Pricing", "/upgrade"],
          ]}
        />
        <FootCol
          title="For Recruiters"
          links={[
            ["Post Job", "/signup?role=recruiter"],
            ["Database Search", "/signup?role=recruiter"],
            ["Sponsorship", "/recruiters"],
            ["Anti-Ghost SLA", "/how-it-works"],
          ]}
        />
        <FootCol
          title="Company"
          links={[
            ["About", "/about"],
            ["Contact", "/contact"],
            ["Careers", "/careers"],
            ["Press", "/press"],
          ]}
        />
        <FootCol
          title="Legal"
          links={[
            ["Privacy", "/privacy"],
            ["Terms", "/terms"],
            ["Refund Policy", "/refund-policy"],
            ["DPDP", "/dpdp"],
          ]}
        />
      </div>
      <div className="mx-auto max-w-content px-4 mt-10 pt-6 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-3 text-body-xs text-neutral-900">
        <p>
          © {new Date().getFullYear()} unGhost Technologies Pvt Ltd · Pune,
          India
        </p>
        <p>Data residency: ap-south-1 · Made in Pune, India</p>
      </div>
    </footer>
  );
}

function FootCol({
  title,
  links,
}: {
  title: string;
  links: Array<[string, string]>;
}): React.ReactElement {
  return (
    <div>
      <p className="font-display font-semibold text-body-sm text-neutral-900 mb-3">
        {title}
      </p>
      <ul className="space-y-2">
        {links.map(([label, href]) => (
          <li key={label}>
            <Link
              href={href}
              className="text-body-xs text-neutral-900 hover:text-brand-500 transition"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
