"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuthState } from "@/components/auth/useAuthState";
import styles from "@/styles/form.module.css";
import shell from "@/styles/shell.module.css";

export default function ProfilePage() {
  const { user, signInWithMagicLink, signOut, isSupabaseEnabled, isLoading } = useAuthState();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  if (isLoading) {
    return <p>Loading profile...</p>;
  }

  return (
    <section className={styles.formSection}>
      <div className={shell.introPanel}>
        <h1 className={shell.pageTitle}>Profile</h1>
        <p className={shell.pageSubtitle}>Manage sign-in, session access, and your creator tools.</p>
      </div>
      {user ? (
        <>
          <p>
            Signed in as <strong>{user.email}</strong>
          </p>
          <p>User ID: {user.id}</p>
          <div className={styles.row}>
            <button
              type="button"
              onClick={() => {
                void signOut().then(() => setMessage("Signed out."));
              }}
            >
              Sign Out
            </button>
            <Link href="/studio">Go to Studio</Link>
          </div>
        </>
      ) : (
        <>
          <p>
            {isSupabaseEnabled
              ? "Sign in with an email magic link."
              : "Supabase is not configured. Local mode is enabled."}
          </p>
          {isSupabaseEnabled ? (
            <div className={styles.formStack}>
              <label>
                Email
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  void signInWithMagicLink(email).then(() => setMessage("Magic link sent."));
                }}
              >
                Send Magic Link
              </button>
            </div>
          ) : null}
        </>
      )}
      {message ? <p className={shell.bannerInfo}>{message}</p> : null}
    </section>
  );
}
