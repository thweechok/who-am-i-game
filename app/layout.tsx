import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WHO AM I? — เกมทายตัวตน Multiplayer",
  description:
    "เกมทายตัวตนออนไลน์แบบกลุ่ม — ถาม yes/no วนกันไปจนรู้ว่าคำตอบบนหัวคุณคืออะไร รองรับ 3-6 คน",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-game">{children}</body>
    </html>
  );
}
