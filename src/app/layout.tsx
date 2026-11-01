import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Swan University", template: "%s · Swan University" },
  description: "Student information system for Swan University: registration, grading, transcripts and records.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
