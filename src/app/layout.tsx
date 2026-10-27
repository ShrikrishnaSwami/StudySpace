import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ThemeBootstrap from "@/components/ThemeBootstrap";

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
    default: "StudySpace — Make room for what matters",
    template: "%s | StudySpace",
  },
  description:
    "A calmer home for student life. Organize courses, assignments, deadlines, notes, quizzes and study sessions in one workspace.",
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
    title: "StudySpace — Make room for what matters",
    description:
      "Your courses, deadlines, notes and study tools — organized in one calm workspace.",
    siteName: "StudySpace",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "StudySpace — Make room for what matters",
    description:
      "A calmer home for courses, assignments, deadlines and study sessions.",
  },
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
      <body className="min-h-full flex flex-col"><a className="ss-skip-link" href="#main-content">Skip to content</a><ThemeBootstrap />{children}</body>
    </html>
  );
}