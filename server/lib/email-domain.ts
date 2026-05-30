/**
 * Email-domain helpers used by recruiter anti-abuse gates.
 *
 * Why: recruiter accounts post jobs that reach every student instantly. To stop
 * pranksters signing up with a throwaway personal inbox and posting fake roles,
 * recruiter signup is gated to *work* email (a company-owned domain), and a
 * recruiter's email domain is matched against their company's domain to decide
 * whether a posted job goes live instantly or waits for admin approval.
 */

/** Well-known free / personal mailbox providers. Recruiters must use a work
 *  address, so signups on these domains are rejected for role=recruiter.
 *  Disposable-mail domains are included since they are the obvious bypass. */
const FREE_EMAIL_DOMAINS = new Set<string>([
  // Mainstream consumer
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.in",
  "ymail.com",
  "rocketmail.com",
  "outlook.com",
  "hotmail.com",
  "hotmail.co.uk",
  "live.com",
  "msn.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "pm.me",
  "zoho.com",
  "zohomail.com",
  "gmx.com",
  "gmx.net",
  "mail.com",
  "yandex.com",
  "yandex.ru",
  "tutanota.com",
  "fastmail.com",
  // India consumer ISPs
  "rediffmail.com",
  "rediff.com",
  // Common disposable / throwaway
  "mailinator.com",
  "guerrillamail.com",
  "10minutemail.com",
  "tempmail.com",
  "temp-mail.org",
  "trashmail.com",
  "yopmail.com",
  "getnada.com",
  "dispostable.com",
  "sharklasers.com",
  "throwawaymail.com",
]);

/** Extract the lowercase domain from an email address. Returns null if the
 *  string isn't a parseable `local@domain`. */
export function emailDomain(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at <= 0 || at === email.length - 1) return null;
  return email.slice(at + 1).trim().toLowerCase();
}

/** True when the email uses a known free/personal/disposable provider. */
export function isFreeEmailDomain(email: string): boolean {
  const domain = emailDomain(email);
  if (!domain) return false;
  return FREE_EMAIL_DOMAINS.has(domain);
}

/** True when the email's domain matches the company's registered domain.
 *  Tolerant of a leading `www.` and surrounding whitespace/case on either
 *  side. Returns false if either input is missing/unparseable. */
export function emailMatchesCompanyDomain(
  email: string,
  companyDomain: string | undefined | null,
): boolean {
  const domain = emailDomain(email);
  if (!domain || !companyDomain) return false;
  const normalisedCompany = companyDomain
    .trim()
    .toLowerCase()
    .replace(/^www\./, "");
  const normalisedEmail = domain.replace(/^www\./, "");
  if (!normalisedCompany) return false;
  return normalisedEmail === normalisedCompany;
}
