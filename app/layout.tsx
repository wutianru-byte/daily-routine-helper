import type { Metadata } from "next";
import { Nav } from "@/components/ui/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Daily Routine Helper",
  description: "An adaptive daily planning companion.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-neutral-50">
        <Nav />
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
