import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Press_Start_2P } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/shared/Providers";
import { CRTOverlay } from "@/components/arcade/CRTOverlay";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains" });
const pixel = Press_Start_2P({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-press-start",
});

export const metadata: Metadata = {
  title: "NoGhost — Stop being a ghost. Start being a hire.",
  description:
    "AI-powered hiring missions, gated assessments, and bootcamps. Recruiters answer in 24-72 hours, guaranteed. Built for India, deployed on PhonePe.",
  themeColor: "#0a0a0f",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable} ${pixel.variable}`}>
      <body className="crt-flicker">
        <Providers>{children}</Providers>
        <CRTOverlay />
      </body>
    </html>
  );
}
