import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./polish.css";
import "./atelier.css";
import "./cinematic.css";
import "./workspace-editorial.css";
import "./motion-system.css";
import CinematicExperience from "@/components/CinematicExperience";
import GlobalMotion from "@/components/GlobalMotion";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "StudySpace — Your second brain for student life",
    template: "%s | StudySpace",
  },
  description:
    "The second brain for students running 40 open tabs. Keep courses, notes, deadlines and study tools together — and survive midterms with a little less chaos.",
  applicationName: "StudySpace",
  keywords: [
    "student planner",
    "assignment tracker",
    "study planner",
    "course organizer",
    "student dashboard",
    "study tools",
    "flashcards",
  ],
  openGraph: {
    title: "StudySpace — Your second brain for student life",
    description:
      "Built for cramming, keeping track, and surviving midterms.",
    siteName: "StudySpace",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "StudySpace — Your second brain for student life",
    description:
      "Your courses, notes, deadlines and study tools. One place to land.",
  },
  icons: { icon: "/icon.svg", shortcut: "/icon.svg", apple: "/icon.svg" },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col"><CinematicExperience><a className="ss-skip-link" href="#main-content">Skip to content</a><GlobalMotion>{children}</GlobalMotion></CinematicExperience></body>
    </html>
  );
}