import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Cormorant_Garamond, Press_Start_2P } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/shared/Providers";
import { RefCapture } from "@/components/attribution/RefCapture";
import { DemoModeBadge } from "@/components/glass";
import { EmailVerifyBanner } from "@/components/auth/EmailVerifyBanner";

const mono = GeistMono;

const pixel = Press_Start_2P({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-press-start",
  display: "swap",
});

// Editorial serif reserved for the landing page's "Then nothing." beat —
// light italic only, so the payload stays small.
const editorial = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400"],
  style: ["italic"],
  variable: "--font-editorial",
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
      className={`${GeistSans.variable} ${mono.variable} ${pixel.variable} ${editorial.variable}`}
    >
      <body>
        <Providers>{children}</Providers>
        <EmailVerifyBanner />
        <RefCapture />
        <DemoModeBadge />
      </body>
    </html>
  );
}
