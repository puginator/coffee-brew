import type { Metadata } from "next";
import Link from "next/link";
import "@fontsource/bungee";
import "@fontsource/source-sans-3/400.css";
import "@fontsource/source-sans-3/500.css";
import "@fontsource/source-sans-3/600.css";
import "@fontsource/source-sans-3/700.css";
import "./globals.css";
import { SiteHeader } from "@/components/layout/SiteHeader";
import styles from "@/styles/shell.module.css";

export const metadata: Metadata = {
  title: "Coffee Brew Lab",
  description: "Interactive brew cards with guided steps, timers, and share links.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className={styles.appBackdrop} />
        <SiteHeader />
        <main className={styles.pageShell}>{children}</main>
        <footer className={styles.footer}>
          <span>Coffee Brew Lab</span>
          <Link href="/profile">Profile</Link>
        </footer>
      </body>
    </html>
  );
}
