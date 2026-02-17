"use client";

import Link from "next/link";
import clsx from "clsx";
import { usePathname } from "next/navigation";
import styles from "@/styles/shell.module.css";

const navItems = [
  { href: "/", label: "Library" },
  { href: "/studio", label: "Studio" },
  { href: "/studio/new", label: "New Card" },
  { href: "/profile", label: "Profile" },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Link href="/" className={styles.brand}>
          <strong>Coffee Brew Lab</strong>
          <span>Interactive Cards + Guided Sessions</span>
        </Link>
        <nav className={styles.nav}>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(styles.navLink, pathname === item.href && styles.navLinkActive)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
