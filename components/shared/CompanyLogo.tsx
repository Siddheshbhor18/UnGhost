"use client";

import { useState } from "react";

/**
 * Company logo with a graceful letter-initial fallback.
 *
 * `logoUrl` may be empty (no logo set) or a hotlinked domain logo
 * (logo.clearbit.com/<domain>) that 404s for companies the service doesn't
 * know. In both cases we render the first letter of the company name on the
 * brand gradient — the same look the app used before logos existed.
 */
export function CompanyLogo({
  name,
  logoUrl,
  size = 64,
  rounded = "rounded-2xl",
  className = "",
}: {
  name: string;
  logoUrl?: string | null;
  /** px — the square side length. */
  size?: number;
  /** Tailwind rounding class. */
  rounded?: string;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  const showImg = !!logoUrl && !broken;

  const box = `grid place-items-center shrink-0 overflow-hidden ${rounded} ${className}`;

  if (showImg) {
    return (
      <div
        className={`${box} bg-white border border-black/5`}
        style={{ width: size, height: size }}
      >
        {/* Plain <img>: logos come from many external hosts and may 404;
            onError flips us to the initial without Next/Image's loader. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoUrl!}
          alt={`${name} logo`}
          width={size}
          height={size}
          loading="lazy"
          onError={() => setBroken(true)}
          className="w-full h-full object-contain p-1.5"
        />
      </div>
    );
  }

  return (
    <div
      className={`${box} bg-brand-gradient text-white shadow-brand-glow font-display font-extrabold`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
    >
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}
