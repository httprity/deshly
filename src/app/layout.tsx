import type { Metadata } from "next";
import { Inter, Instrument_Serif, Tiro_Bangla, JetBrains_Mono, Parkinsans, Noto_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import { cn } from "@/lib/utils";

const playfairDisplayHeading = Playfair_Display({subsets:['latin'],variable:'--font-heading'});

const notoSans = Noto_Sans({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument",
  display: "swap",
});

const tiroBangla = Tiro_Bangla({
  subsets: ["bengali"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-tiro-bangla",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

const parkinsans = Parkinsans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-parkinsans",
  display: "swap",
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: "Deshly — Brand Beyond Borders",
  description:
    "Deshly turns one product into culturally-tailored campaigns for London, Toronto, Dubai, NYC, and beyond — all in your brand voice.",
  keywords: [
    "Bangladeshi diaspora marketing",
    "AI brand voice",
    "diaspora intelligence",
    "MarTech Bangladesh",
    "BuildFest 2026",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(inter.variable, instrumentSerif.variable, tiroBangla.variable, jetbrainsMono.variable, parkinsans.variable, "font-sans", notoSans.variable, playfairDisplayHeading.variable)}
    >
      <body>{children}</body>
    </html>
  );
}