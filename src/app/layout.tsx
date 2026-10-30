import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./polish.css";
import "./atelier.css";
import "./cinematic.css";
import "./workspace-editorial.css";
import CinematicExperience from "@/components/CinematicExperience";

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
    default: "StudySpace — Courses, notes, deadlines and study tools",
    template: "%s | StudySpace",
  },
  description:
    "StudySpace keeps courses, lecture notes, assignments, deadlines, quizzes and an AI study partner together in one student workspace.",
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
    title: "StudySpace — Courses, notes, deadlines and study tools",
    description:
      "Courses, notes, assignments and study tools in one place.",
    siteName: "StudySpace",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "StudySpace — Courses, notes, deadlines and study tools",
    description:
      "Keep your courses, notes, deadlines and study tools together.",
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
      <body className="min-h-full flex flex-col"><CinematicExperience /><a className="ss-skip-link" href="#main-content">Skip to content</a>{children}</body>
    </html>
  );
}