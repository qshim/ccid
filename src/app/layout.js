import "./globals.css";
import "./multilingual.css";
import HideDevIndicator from "./HideDevIndicator";
// import { Inter } from "next/font/google";
import { pxGrotesk, spectral } from "@/fonts/fonts";


export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://c-c-i-d.kr"),
  title: "Center for Creative Intelligence Design",
  description: "사람을 이해하고, 기술을 탐구하며, 아직 오지 않은 경험을 디자인합니다.",
  keywords: "CCID, creative, intelligence, karts, design, ai, lab, convergence",
  openGraph: {
    title: "Center for Creative Intelligence Design",
    description: "사람을 이해하고, 기술을 탐구하며, 아직 오지 않은 경험을 디자인합니다.",
    images: [
      {
        url: "/img/og800.png",
        width: 800,
        height: 400,
        alt: "CCID",
      },
    ],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1.0,
  minimumScale: 1.0,
  // Allow pinch-zoom (WCAG 1.4.4). Locking zoom to 1.0 blocks low-vision users.
  maximumScale: 5.0,
  userScalable: "yes",
};

export default function RootLayout({ children }) {
  

  return (
    <html lang="ko" className={`${pxGrotesk.className} ${spectral.variable}`}>
      <body className={`overflow-x-hidden w-[100%] scrollbar-hide antialiased`}>
        <HideDevIndicator />
        {children}
      </body>
    </html>
  );
}
