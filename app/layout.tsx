import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Press_Start_2P } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/shared/Providers";
import { DemoModeBadge } from "@/components/glass";

/**
 * Inter — used for both body and display. The variable axis "opsz" gives us
 * "Inter Display"-equivalent letterforms at headline sizes for free.
 * If the budget ever supports it, swap `--font-inter-display` to Söhne Breit.
 */
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-inter",
  display: "swap",
});

// Same Inter, exposed as the display variable. Tailwind's font-display points
// to this var first; swap this binding when adopting a paid display face.
const interDisplay = Inter({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-inter-display",
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
      className={`${inter.variable} ${interDisplay.variable} ${mono.variable} ${pixel.variable}`}
    >
      <body>
        <Providers>{children}</Providers>
        <DemoModeBadge />
      </body>
    </html>
  );
}
