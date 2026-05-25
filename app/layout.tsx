import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Press_Start_2P } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/shared/Providers";
import { RefCapture } from "@/components/attribution/RefCapture";
import { DemoModeBadge } from "@/components/glass";

/**
 * Inter — single instance, exposes both `--font-inter` (body) and
 * `--font-inter-display` (headlines) variables. Previously we initialised
 * `Inter()` twice with different weight subsets, which produced a second
 * `<link rel=preload>` + duplicate CSS rules on every page (~30 KB
 * over-the-wire on first load, doubled font-loading shifts). Same font
 * file at runtime — collapse the import.
 *
 * The widest weight set covers both body (400/500/600/700) and display
 * (600/700/800) uses. Swap `--font-inter-display` to a paid face like
 * Söhne Breit by initialising a second font there only.
 */
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-inter",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

// Legacy arcade font — kept until those pages are migrated
const pixel = Press_Start_2P({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-press-start",
  display: "swap",
});

export const metadata: Metadata = {
  title: "unGhost — We don't ghost. We unghost.",
  description:
    "AI-powered hiring missions, gated assessments, and bootcamps. Recruiters answer in 24–72 hours, guaranteed. Built for India.",
  icons: {
    icon: "/symbol.svg",
    shortcut: "/symbol.svg",
    apple: "/symbol.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#0191FC",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      // Both --font-inter and --font-inter-display resolve to the same
      // Inter instance via the style tag below — single network fetch,
      // both CSS variables available to Tailwind's font-display + font-body.
      className={`${inter.variable} ${mono.variable} ${pixel.variable}`}
      style={
        {
          // Alias the display variable to the same font family. Cheaper than
          // a second Inter() call which double-loads the .woff2.
          ["--font-inter-display" as never]: "var(--font-inter)",
        } as React.CSSProperties
      }
    >
      <body>
        <Providers>{children}</Providers>
        <RefCapture />
        <DemoModeBadge />
      </body>
    </html>
  );
}
