import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Righteous } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const righteous = Righteous({
  weight: "400",
  variable: "--font-righteous",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LexiSpark",
  description: "Know your words",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${righteous.variable} antialiased bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-100`}
      >
        {children}
      </body>
    </html>
  );
}
