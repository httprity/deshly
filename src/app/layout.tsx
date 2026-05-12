import type { Metadata } from "next";
import { Inter, Instrument_Serif, Tiro_Bangla } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";

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
      className={`${inter.variable} ${instrumentSerif.variable} ${tiroBangla.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}