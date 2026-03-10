import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Header } from "@/components/header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = "https://korb.guru";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Korb Guru — Meal planning & shared shopping",
    template: "%s | Korb Guru",
  },
  description:
    "Meal planning and shared shopping for households. Get the app for iOS and Android.",
  openGraph: {
    type: "website",
    locale: "en",
    url: SITE_URL,
    siteName: "Korb Guru",
  },
  twitter: {
    card: "summary_large_image",
  },
  robots: "index, follow",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Apple Smart Banner: replace APPLE_ITUNES_APP_ID when app is on App Store */}
        {/* <meta name="apple-itunes-app" content="app-id=APPLE_ITUNES_APP_ID" /> */}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen antialiased`}
      >
        <Header />
        {children}
      </body>
    </html>
  );
}
