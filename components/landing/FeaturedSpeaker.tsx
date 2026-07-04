/**
 * FeaturedSpeaker — dark glass "speaker spotlight" panel.
 *
 * A near-black glass card on the platform's brand-blue accent system (border,
 * vignette, headline accent, eyebrow pill, accolade icons, workshop banner),
 * with the inner strips built as true glassmorphism (backdrop-blur frosting
 * the blue light behind them). A portrait emerges from the right of the panel
 * via a soft mask + edge fade. The portrait asset
 * lives in `/public/abhinav-ranka.jpg` and is rendered via next/image so
 * Next can serve responsive sizes + AVIF/WebP (sharp on hi-DPI screens).
 *
 * Workshop cadence is evergreen: sessions are announced inside the WhatsApp
 * community, so the panel carries no fixed date that can go stale.
 */

import Image from "next/image";
import { Award, Calendar, Star, Trophy } from "lucide-react";
import { EnrollViaWhatsApp } from "./EnrollViaWhatsApp";

const BLUE = "#0191FC"; // brand-500 — canonical platform accent
const BLUE_LIGHT = "#6DB6F9"; // brand-300 — legible on dark
const PANEL_BG = "#080B12"; // cool near-black, tuned to the void section above



const ACCOLADES = [
  { icon: Trophy, title: "CA Business Leader", sub: "40 Under 40" },
  { icon: Award, title: "BW Finance", sub: "40 Under 40" },
  { icon: Star, title: "CFO100", sub: "Recognized Leader" },
] as const;

export function FeaturedSpeaker() {
  return (
    <div
      className="relative isolate overflow-hidden rounded-[28px] shadow-[0_24px_80px_-24px_rgba(0,0,0,0.55)]"
      style={{ background: PANEL_BG }}
    >
      {/* Hairline gold gradient border */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[28px]"
        style={{
          background: `linear-gradient(140deg, ${BLUE}66 0%, transparent 35%, transparent 65%, ${BLUE}3D 100%)`,
          padding: "1px",
          WebkitMask:
            "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
        }}
      />

      {/* Brand-blue spotlight vignette — three wells of light so the frosted
          inner cards have something to blur, left column included. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background: `radial-gradient(95% 70% at 55% 0%, ${BLUE}26, transparent 65%),
                       radial-gradient(70% 55% at 12% 48%, ${BLUE}1A, transparent 68%),
                       radial-gradient(80% 60% at 100% 100%, ${BLUE}1F, transparent 70%)`,
        }}
      />

      <div className="grid lg:grid-cols-12 gap-0 min-h-[640px]">
        {/* ── Text column ────────────────────────────────────────────── */}
        <div className="lg:col-span-7 relative z-10 p-7 sm:p-10 lg:p-14 flex flex-col justify-center">
          <span
            className="inline-flex items-center self-start rounded-full px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] mb-7"
            style={{
              color: BLUE_LIGHT,
              background: `${BLUE}1F`,
              border: `1px solid ${BLUE}40`,
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
            }}
          >
            Featured Speaker
          </span>

          <h2 className="font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl text-white tracking-tight leading-[1.04] mb-3">
            <span style={{ color: BLUE_LIGHT }}>Abhinav</span>{" "}
            <span className="text-white">Jain Ranka</span>
          </h2>
          <p className="text-lg sm:text-xl mb-5" style={{ color: BLUE_LIGHT }}>
            Founder, Poem Capital
          </p>
          <div
            aria-hidden
            className="h-px w-24 mb-7"
            style={{ background: `linear-gradient(90deg, ${BLUE}, transparent)` }}
          />

          <div className="space-y-4 text-white/75 text-[15px] leading-relaxed max-w-2xl">
            <p>
              Abhinav Jain Ranka is the Founder of Poem Capital and a seasoned
              finance leader with over a decade of experience across startups,
              healthcare, fintech, and investments.
            </p>
            <p>
              A Chartered Accountant (CA) and Company Secretary (CS), he
              played a key leadership role in building two of India&apos;s
              unicorn companies, PharmEasy and CoinDCX.
            </p>
            <p>
              Recognized among India&apos;s top finance leaders with accolades
              including CA Business Leader 40 Under 40, BW Finance 40 Under
              40, and CFO100, Abhinav actively mentors founders and invests in
              high-potential startups.
            </p>
            <p>
              In this free online workshop, he&apos;ll share practical
              insights on business, fundraising, investments, and the
              financial mindset needed to build scalable companies.
            </p>
          </div>

          {/* Unicorn pedigree strip — the two companies where he led finance.
              Logos are recoloured to a single soft white so they cohere with
              the gold-on-dark theme instead of fighting it with their native
              palettes (CoinDCX two-tone, PharmEasy teal). */}
          <div
            className="mt-8 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-7 py-5 border-y"
            style={{ borderColor: "rgba(255,255,255,0.08)" }}
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/45 shrink-0">
              Previously led finance at
            </p>
            <div className="flex items-center gap-7 sm:gap-9 text-white/85">
              <PharmEasyLogo className="h-7 w-auto" />
              <span
                aria-hidden
                className="h-5 w-px"
                style={{ background: "rgba(255,255,255,0.15)" }}
              />
              <CoinDCXLogo className="h-3.5 w-auto" />
            </div>
          </div>

          {/* Accolades strip */}
          <div
            className="mt-9 rounded-2xl p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-3 gap-4"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: `1px solid ${BLUE}33`,
              backdropFilter: "blur(16px) saturate(150%)",
              WebkitBackdropFilter: "blur(16px) saturate(150%)",
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.08), 0 8px 32px rgba(0,0,0,0.25)",
            }}
          >
            {ACCOLADES.map(({ icon: Icon, title, sub }) => (
              <div key={title} className="flex items-center gap-3">
                <span
                  className="grid place-items-center w-9 h-9 rounded-lg shrink-0"
                  style={{
                    color: BLUE_LIGHT,
                    background: `${BLUE}14`,
                    border: `1px solid ${BLUE}33`,
                  }}
                >
                  <Icon size={16} />
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-white leading-tight">
                    {title}
                  </p>
                  <p className="text-[12px] text-white/55 leading-tight mt-0.5">
                    {sub}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Workshop banner */}
          <div
            className="mt-4 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center gap-3 md:gap-6"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: `1px solid ${BLUE}33`,
              backdropFilter: "blur(16px) saturate(150%)",
              WebkitBackdropFilter: "blur(16px) saturate(150%)",
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.08), 0 8px 32px rgba(0,0,0,0.25)",
            }}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span
                className="grid place-items-center w-9 h-9 rounded-lg shrink-0"
                style={{
                  color: BLUE_LIGHT,
                  background: `${BLUE}14`,
                  border: `1px solid ${BLUE}33`,
                }}
              >
                <Calendar size={16} />
              </span>
              <div className="min-w-0">
                <p
                  className="text-[11px] font-bold uppercase tracking-[0.18em] leading-tight"
                  style={{ color: BLUE_LIGHT }}
                >
                  Free Online Workshop
                </p>
                <p className="text-[13px] text-white/70 mt-1 leading-snug">
                  Insights on Business, Fundraising &amp; Financial Mindset
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[13px] text-white/80 md:border-l md:border-white/10 md:pl-6 shrink-0">
              <Calendar size={13} style={{ color: BLUE_LIGHT }} />
              <span>New sessions announced in the community</span>
            </div>
          </div>

          {/* Enrollment controls — form → WhatsApp DM, plus a share link that
              scrolls invitees back to this section. */}
          <EnrollViaWhatsApp />
        </div>

        {/* ── Portrait column ────────────────────────────────────────── */}
        <div
          className="relative lg:col-span-5 min-h-[380px] lg:min-h-full order-first lg:order-last"
          aria-hidden
        >
          {/* Sharp render via next/image — server picks the right pixel size
              and serves AVIF/WebP. `priority` because the section is
              above-fold-ish on long viewports and the photo is the focal
              element of this band. */}
          <Image
            src="/abhinav.png"
            alt="Abhinav Jain Ranka, Founder of Poem Capital"
            fill
            priority
            sizes="(min-width: 1024px) 42vw, 100vw"
            className="object-cover object-[55%_25%]"
            style={{
              WebkitMaskImage:
                "radial-gradient(ellipse 130% 95% at 70% 42%, #000 38%, transparent 82%)",
              maskImage:
                "radial-gradient(ellipse 130% 95% at 70% 42%, #000 38%, transparent 82%)",
            }}
          />
          {/* Left-edge dark fade so the photo blends into the panel */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(to right, rgba(8,11,18,0.94) 0%, rgba(8,11,18,0.32) 22%, transparent 34%)",
            }}
          />
          {/* Subtle bottom shadow */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-24"
            style={{
              background: "linear-gradient(to top, rgba(8,11,18,0.6), transparent)",
            }}
          />
          {/* Faint gold rim catching the right edge */}
          <div
            aria-hidden
            className="pointer-events-none absolute right-0 top-1/4 bottom-1/4 w-px opacity-30"
            style={{
              background: `linear-gradient(to bottom, transparent, ${BLUE}, transparent)`,
            }}
          />
        </div>
      </div>
    </div>
  );
}


/**
 * PharmEasy wordmark — inlined from public/pharmeasy-logo.svg with native
 * fills swapped to `currentColor` so the parent's text colour drives the
 * logo. The source artwork already preserves the brand's "P" mark glyph.
 */
function PharmEasyLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 148 41"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="PharmEasy"
      role="img"
      className={className}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M15.946 40.002c-.621-.033-1.208-.37-1.502-1.08-.294-.696-.18-1.374.374-1.924l2.544-2.478c.284-.261.317-.417.024-.697l-3.918-3.814c-.294-.294-.455-.237-.715.024l-2.539 2.478c-1.085.99-2.757.474-3.051-.933a1.56 1.56 0 0 1 .441-1.497l4.235-4.131a1.7 1.7 0 0 1 2.407.009l7.31 7.125c.677.663.677 1.653.009 2.331l-4.235 4.131c-.332.322-.763.469-1.383.455zm10.483-19.19c-.024 1.824-.497 3.525-1.525 5.031-.284.417-.213.621.123.91.497.426.947.91 1.412 1.374.725.744.749 1.758.081 2.478-.659.687-1.786.786-2.497.133l-3.269-3.188c-.687-.706-.597-1.71.171-2.463a6.06 6.06 0 0 0 1.829-3.582c.441-3.16-1.999-6.258-5.207-6.604-2.08-.223-3.852.37-5.344 1.848L3.244 25.48c-.45.45-.971.72-1.616.644-.725-.09-1.265-.46-1.516-1.17s-.081-1.341.45-1.857l4.562-4.444 4.889-4.747c5.377-5.017 14.312-2.445 16.132 4.638a9.54 9.54 0 0 1 .284 2.269z"
      />
      <path d="M36.701 16.598h6.173c1.526 0 2.762.469 3.709 1.412s1.421 2.175 1.421 3.71c0 1.516-.488 2.748-1.469 3.681s-2.25 1.402-3.814 1.402H39.8v4.596h-3.098v-14.8zm3.098 2.539v5.15h2.246c.895 0 1.587-.223 2.075-.659s.734-1.075.734-1.905-.242-1.473-.73-1.919-1.175-.668-2.075-.668H39.8zm10.025 12.267V15.77h2.933v6.173h.185a3.17 3.17 0 0 1 1.289-1.525c.592-.365 1.303-.55 2.127-.55 1.222 0 2.175.37 2.857 1.109s1.023 1.786 1.023 3.141V31.4h-2.985v-6.571c0-.782-.175-1.369-.535-1.777s-.872-.606-1.549-.606c-.739 0-1.317.223-1.734.673s-.625 1.047-.625 1.791v6.495h-2.985zm15.982.176c-1.094 0-1.985-.313-2.672-.933s-1.033-1.445-1.033-2.473c0-1.019.379-1.824 1.132-2.407s1.838-.919 3.245-1l2.738-.166v-.924c0-.474-.166-.839-.493-1.094s-.801-.384-1.416-.384c-1.109 0-1.786.351-2.042 1.047h-2.748c.095-1.047.592-1.876 1.483-2.487s2.051-.919 3.473-.919c1.492 0 2.644.336 3.463 1.004s1.227 1.616 1.227 2.833v7.727h-2.89v-1.478h-.185c-.294.521-.734.924-1.312 1.218s-1.236.436-1.971.436zm.985-2.246c.692 0 1.27-.194 1.734-.587s.696-.872.696-1.445v-.829l-2.288.142c-1.274.09-1.909.545-1.909 1.364 0 .417.161.749.488.99s.753.365 1.279.365zm7.887 2.07V20.091h2.89v1.805h.185c.152-.573.493-1.052 1.033-1.426s1.161-.564 1.871-.564c.512 0 .9.047 1.17.142v2.719c-.318-.123-.787-.185-1.417-.185-.829 0-1.492.227-1.995.687s-.753 1.08-.753 1.867v6.268h-2.985zm8.871 0V20.09h2.89v1.848h.185c.232-.649.625-1.161 1.184-1.535s1.208-.559 1.942-.559c.787 0 1.45.185 1.985.549s.919.881 1.142 1.544h.185c.265-.635.706-1.142 1.312-1.526s1.308-.568 2.094-.568c1.127 0 2.023.341 2.677 1.028s.985 1.606.985 2.771v7.765h-2.984V24.43c0-1.341-.63-2.009-1.886-2.009-.602 0-1.085.194-1.445.573s-.545.881-.545 1.488v6.926h-2.876v-7.097c0-.597-.166-1.061-.493-1.388s-.786-.498-1.374-.498a1.84 1.84 0 0 0-1.435.616c-.374.412-.564.929-.564 1.559v6.813l-2.98-.009zm29.164-2.654v2.648h-9.807V16.594h9.807v2.648h-6.708V22.7h6.329v2.449h-6.329v3.601h6.708zm5.22 2.83c-1.094 0-1.985-.313-2.672-.933s-1.032-1.445-1.032-2.473c0-1.019.379-1.824 1.132-2.407s1.838-.919 3.245-1l2.738-.166v-.924c0-.474-.165-.839-.492-1.094s-.801-.384-1.417-.384c-1.108 0-1.786.351-2.042 1.047h-2.748c.095-1.047.593-1.876 1.483-2.487s2.052-.919 3.473-.919c1.492 0 2.644.336 3.463 1.004s1.227 1.616 1.227 2.833v7.727h-2.89v-1.478h-.185c-.293.521-.734.924-1.312 1.218s-1.236.436-1.971.436zm.986-2.246c.691 0 1.269-.194 1.734-.587s.696-.872.696-1.445v-.829l-2.288.142c-1.275.09-1.909.545-1.909 1.364 0 .417.161.749.488.99s.753.365 1.279.365zm7.216-5.922a3.08 3.08 0 0 1 1.298-2.591c.867-.653 2.004-.981 3.411-.981 1.436 0 2.563.289 3.378.872s1.265 1.412 1.35 2.492h-2.762a1.28 1.28 0 0 0-.62-.867c-.337-.209-.782-.313-1.332-.313-.54 0-.985.114-1.331.336s-.521.512-.521.867c0 .275.123.502.37.682s.63.332 1.16.445l2.123.464c1.099.242 1.904.606 2.416 1.099s.763 1.161.763 1.999c0 1.123-.46 2.023-1.374 2.71-.919.682-2.118 1.028-3.61 1.028s-2.672-.294-3.539-.881-1.355-1.426-1.46-2.511h2.914c.242.81.952 1.208 2.146 1.208.583 0 1.052-.114 1.417-.336s.545-.512.545-.876a.83.83 0 0 0-.337-.682c-.227-.175-.587-.317-1.089-.426l-2.052-.464c-1.099-.242-1.919-.625-2.459-1.166s-.805-1.236-.805-2.108zm12.4 12.108c-.635 0-1.014-.01-1.137-.028V33.09c.066.014.294.019.678.019.568 0 1.013-.099 1.331-.294s.545-.502.668-.928l.104-.408-3.97-11.389h3.293l2.378 8.575h.185l2.378-8.575h3.16l-3.899 11.489c-.479 1.45-1.104 2.468-1.881 3.056s-1.871.886-3.288.886zM37.715 9.793h-1.194l1.923-8.248H35.62l.227-.948h6.846l-.208.948h-2.838l-1.933 8.248zm7.208-7.02a2.12 2.12 0 0 1 1.142.313c.332.208.592.507.777.895h.076l.464-1.08h.881l-1.62 6.893h-.924l.18-1.312h-.057c-.829.962-1.706 1.44-2.62 1.44-.644 0-1.151-.208-1.516-.621s-.55-.985-.55-1.706c0-.872.166-1.682.493-2.426s.782-1.331 1.364-1.753 1.218-.644 1.909-.644zm-1.322 6.273c.45 0 .895-.194 1.341-.583s.805-.895 1.085-1.516.417-1.246.417-1.871c0-.431-.128-.777-.388-1.033s-.602-.384-1.023-.384c-.483 0-.929.18-1.345.54s-.739.848-.976 1.464a5.38 5.38 0 0 0-.355 1.952c0 .478.109.834.327 1.071s.526.36.919.36zm7.143-2.769l3.657-3.378h1.398L52.54 5.836l2.051 3.956h-1.298l-1.634-3.297-1.056.772-.569 2.52h-1.18L51.147 0h1.18l-.895 3.785-.711 2.482h.024v.009zm7.762 3.641c-.853 0-1.521-.227-2.009-.687s-.73-1.09-.73-1.9a5.21 5.21 0 0 1 .516-2.269c.346-.725.801-1.289 1.374-1.687a3.19 3.19 0 0 1 1.886-.602c.711 0 1.241.137 1.601.417s.535.668.535 1.165c0 .753-.384 1.345-1.156 1.777s-1.871.644-3.302.644h-.227l-.028.502c0 .55.142.976.426 1.289s.725.464 1.322.464a3.75 3.75 0 0 0 .9-.114c.308-.076.692-.213 1.151-.417v.919a6.81 6.81 0 0 1-1.156.388c-.336.075-.701.109-1.104.109zm.967-6.244c-.479 0-.924.199-1.346.592s-.739.943-.962 1.644h.085c1.056 0 1.867-.123 2.43-.374s.843-.611.843-1.085a.7.7 0 0 0-.256-.554c-.171-.147-.431-.223-.796-.223zm6.8 6.13h-1.166l1.625-6.893h1.166l-1.625 6.893zm.782-8.66c0-.237.076-.426.223-.573s.341-.223.578-.223c.407 0 .611.19.611.564a.79.79 0 0 1-.232.583c-.156.161-.336.237-.54.237-.185 0-.336-.052-.46-.156-.118-.095-.18-.242-.18-.431zm3.999 7.911c.256 0 .587-.052 1-.166v.81a3.66 3.66 0 0 1-.583.152 3.17 3.17 0 0 1-.554.062c-.578 0-1.023-.123-1.331-.374s-.464-.621-.464-1.118c0-.275.043-.592.123-.943l.881-3.785h-1.194l.099-.46 1.284-.493.867-1.435h.682l-.384 1.587h1.904l-.18.801h-1.9l-.895 3.8c-.085.365-.123.64-.123.829 0 .237.066.417.204.54.137.133.322.194.564.194zm7.895.863c-.853 0-1.521-.227-2.009-.687s-.73-1.09-.73-1.9a5.21 5.21 0 0 1 .516-2.269c.346-.725.801-1.289 1.374-1.687a3.19 3.19 0 0 1 1.886-.602c.711 0 1.241.137 1.601.417s.535.668.535 1.165c0 .753-.384 1.345-1.156 1.777s-1.871.644-3.302.644h-.227l-.029.502c0 .55.142.976.426 1.289s.725.464 1.322.464a3.75 3.75 0 0 0 .9-.114c.308-.076.692-.213 1.151-.417v.919a6.81 6.81 0 0 1-1.156.388c-.336.075-.701.109-1.104.109zm.966-6.244c-.478 0-.924.199-1.345.592s-.739.943-.962 1.644h.085c1.056 0 1.867-.123 2.43-.374s.843-.611.843-1.085a.7.7 0 0 0-.256-.554c-.171-.147-.436-.223-.796-.223zm6.904-.901a2.12 2.12 0 0 1 1.142.313c.332.208.592.507.777.895h.076l.464-1.08h.881l-1.62 6.893h-.924l.18-1.312h-.057c-.829.962-1.701 1.44-2.62 1.44-.644 0-1.151-.208-1.516-.621s-.55-.985-.55-1.706a5.97 5.97 0 0 1 .493-2.426c.327-.749.782-1.331 1.364-1.753s1.218-.644 1.909-.644zm-1.322 6.273c.45 0 .895-.194 1.341-.583s.805-.895 1.085-1.516.417-1.246.417-1.871c0-.431-.128-.777-.388-1.033s-.602-.384-1.023-.384c-.483 0-.929.18-1.346.54s-.739.848-.976 1.464a5.38 5.38 0 0 0-.355 1.952c0 .478.109.834.327 1.071s.526.36.919.36zm10.035-1.209c0 .654-.256 1.165-.767 1.53s-1.232.55-2.165.55c-.782 0-1.492-.147-2.122-.436v-.995a4.45 4.45 0 0 0 1.052.407c.379.095.725.147 1.042.147.583 0 1.023-.104 1.322-.313s.445-.479.445-.805a.82.82 0 0 0-.242-.602c-.161-.161-.512-.388-1.052-.673-.602-.308-1.028-.606-1.279-.9s-.374-.64-.374-1.042a1.66 1.66 0 0 1 .701-1.398c.469-.351 1.085-.531 1.848-.531.791 0 1.559.156 2.293.464l-.374.862-.389-.156c-.469-.18-.976-.27-1.53-.27-.431 0-.767.09-1.014.275s-.37.417-.37.706a.82.82 0 0 0 .246.602c.165.166.502.384 1.019.649.498.251.853.469 1.066.649s.374.374.483.583c.104.199.161.436.161.696zm1.751-4.939h1.17l.516 3.43c.047.289.09.715.137 1.279l.066 1.364h.043l.606-1.26.536-.981 2.26-3.833h1.236l-4.847 8.068c-.431.72-.857 1.222-1.279 1.502s-.929.422-1.521.422c-.336 0-.658-.043-.971-.133v-.848a3.62 3.62 0 0 0 .91.114c.379 0 .706-.104.976-.317s.535-.526.791-.938l.531-.858-1.161-7.012z"
      />
    </svg>
  );
}

/**
 * CoinDCX wordmark — inlined from public/coindcx-logo.svg with native fills
 * swapped to `currentColor`. The brand uses a two-tone palette (navy + red);
 * we render mono-white here to fit the gold-on-dark theme.
 */
function CoinDCXLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 20"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="CoinDCX"
      role="img"
      className={className}
    >
      <path d="M15.0711 13.885L17.5974 16.0517C17.1141 16.7268 16.5302 17.325 15.8656 17.8259C15.0391 18.4728 14.1208 18.9948 13.1403 19.375C12.0552 19.7959 10.8989 20.0064 9.73388 19.995C7.96241 20.0259 6.21586 19.578 4.68135 18.6992C3.23515 17.8572 2.04759 16.6399 1.24637 15.1784C0.398043 13.624 -0.0307243 11.8783 0.00171283 10.1109C-0.0098737 8.7829 0.229707 7.46454 0.708026 6.22421C1.17388 5.0329 1.86809 3.94251 2.75222 3.01338C3.62361 2.08908 4.67659 1.3517 5.84622 0.846712C7.1103 0.310191 8.47333 0.0414032 9.8481 0.0575456C11.4896 -0.00307245 13.1171 0.376341 14.5597 1.15588C15.7538 1.84505 16.7885 2.77575 17.5965 3.88755L15.0426 6.14088C14.4756 5.30811 13.7528 4.59098 12.9135 4.02838C11.9929 3.47033 10.926 3.19596 9.8481 3.24005C8.69821 3.20652 7.56661 3.53116 6.61216 4.16838C5.69748 4.80099 4.97204 5.66706 4.51254 6.67505C4.0159 7.73403 3.76342 8.88956 3.77347 10.0575C3.76071 11.1976 4.01334 12.3252 4.5117 13.3525C4.96831 14.3062 5.67274 15.122 6.55253 15.7159C7.47107 16.3109 8.54991 16.6154 9.64654 16.5892C10.5701 16.6286 11.4909 16.465 12.3433 16.11C12.9561 15.8362 13.5138 15.4545 13.9894 14.9834L15.0678 13.885" />
      <path d="M18.5922 12.815C18.5796 11.5738 18.8928 10.3506 19.5009 9.26586C20.1068 8.19341 20.9883 7.29945 22.0557 6.67502C23.2132 6.04679 24.5114 5.71753 25.8308 5.71753C27.1502 5.71753 28.4484 6.04679 29.6059 6.67502C30.6733 7.29945 31.5548 8.19341 32.1608 9.26586C32.7568 10.3552 33.069 11.5751 33.069 12.8146C33.069 14.0541 32.7568 15.274 32.1608 16.3634C31.5145 17.4583 30.5913 18.3669 29.4825 18.9992C28.3738 19.6315 27.1178 19.9656 25.839 19.9685C24.5601 19.9713 23.3027 19.6428 22.1911 19.0155C21.0794 18.3882 20.1521 17.4838 19.5009 16.3917C18.8929 15.3071 18.5798 14.0843 18.5922 12.8434V12.815ZM25.8023 17.0684C26.5653 17.0975 27.3158 16.8693 27.9313 16.4209C28.4931 15.996 28.9334 15.433 29.2087 14.7875C29.48 14.1745 29.6248 13.5137 29.6345 12.8442C29.6279 12.1743 29.483 11.513 29.2087 10.9009C28.9322 10.2561 28.4921 9.69333 27.9313 9.26752C27.3028 8.84535 26.5612 8.61971 25.8023 8.61971C25.0433 8.61971 24.3017 8.84535 23.6732 9.26752C23.1258 9.68809 22.6959 10.2406 22.4244 10.8725C22.1501 11.4846 22.0052 12.146 21.9986 12.8159C22.0037 13.495 22.1486 14.1659 22.4244 14.7875C22.6986 15.4336 23.1391 15.9969 23.7018 16.4209C24.3173 16.8693 25.0678 17.0975 25.8308 17.0684" />
      <path d="M33.7485 0.506592H37.1264V4.05576H33.7485V0.506592ZM33.7485 6.13993H37.1264V19.5183H33.7485V6.13993Z" />
      <path d="M38.46 19.5181V6.16813H41.6959L41.7799 7.68896C42.2259 7.22975 42.7318 6.83178 43.2841 6.50562C44.0591 6.06251 44.9452 5.84747 45.8389 5.88562C46.5489 5.84039 47.2602 5.95065 47.9224 6.20857C48.5847 6.46649 49.1817 6.86578 49.6711 7.37813C50.6077 8.50787 51.0839 9.94479 51.0056 11.4056V19.5173H47.5992V11.434C47.6206 11.0749 47.5687 10.7152 47.4468 10.3764C47.3248 10.0376 47.1353 9.72673 46.8895 9.46229C46.6518 9.22735 46.3677 9.04356 46.0552 8.92241C45.7426 8.80125 45.4082 8.74533 45.0729 8.75813C44.6337 8.7465 44.1972 8.83139 43.7949 9.00672C43.3926 9.18205 43.0343 9.44348 42.7457 9.77229C42.1339 10.4636 41.8091 11.3594 41.837 12.279V19.5173L38.46 19.5181Z" />
      <path d="M92.7351 9.32237L98.698 0.5032H93.0492L89.9552 5.43237L86.7722 0.5032H80.5271L80.8109 0.897367L80.6119 0.814034C79.1348 0.258481 77.5655 -0.0165737 75.986 0.00320033C74.1656 -0.0305009 72.3702 0.42719 70.7915 1.32737C69.6641 1.98306 68.6874 2.86558 67.9243 3.9182C67.0952 2.88699 66.0227 2.07442 64.8017 1.55237C63.1332 0.850197 61.3346 0.503549 59.5224 0.534867H52.1704V19.5182H59.4939C61.3084 19.5476 63.1083 19.1922 64.7732 18.4757C65.986 17.953 67.0562 17.1518 67.8957 16.1382C68.6713 17.2002 69.6684 18.0839 70.8193 18.729C72.3987 19.5956 74.1807 20.0329 75.9852 19.9965C77.6931 20.0268 79.3845 19.6604 80.9243 18.9265L80.5271 19.5182H86.0902L89.8091 13.6849L93.6413 19.5182H99.9998L92.7351 9.32237ZM63.1859 13.6557C62.6738 14.141 62.0666 14.5165 61.4019 14.7588C60.7373 15.0011 60.0294 15.105 59.3226 15.064H57.2515V4.92903H59.3234C60.0488 4.86804 60.779 4.9622 61.4645 5.20516C62.1501 5.44811 62.7752 5.83421 63.2976 6.33737C64.177 7.35242 64.6338 8.66173 64.575 9.99903C64.6027 10.6708 64.4938 11.3411 64.2549 11.9702C64.016 12.5993 63.6518 13.1742 63.1842 13.6607L63.1859 13.6557ZM83.5362 15.0407L81.1234 12.7907C80.558 13.518 79.866 14.1389 79.08 14.624C78.2396 15.055 77.2997 15.259 76.3547 15.2157C75.4195 15.2384 74.4962 15.0046 73.6865 14.5399C72.9283 14.0919 72.3161 13.437 71.9228 12.6532C71.4981 11.8051 71.2839 10.8685 71.298 9.92153C71.2798 8.99526 71.4842 8.07801 71.8943 7.2457C72.2828 6.4688 72.8827 5.81527 73.626 5.35903C74.4581 4.87062 75.4127 4.62644 76.3791 4.65487C77.2741 4.63699 78.1571 4.8608 78.9339 5.30237C79.6916 5.74854 80.349 6.34414 80.8655 7.05237L83.3918 4.5457L87.0821 9.81237L83.5362 15.0407Z" />
    </svg>
  );
}
