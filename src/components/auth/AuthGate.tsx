"use client";

import { FormEvent, useState } from "react";
import { useAuthState } from "@/components/auth/useAuthState";
import styles from "@/styles/form.module.css";

interface AuthGateProps {
  title: string;
  subtitle?: string;
}

export function AuthGate({ title, subtitle }: AuthGateProps) {
  const { user, isLoading, isSupabaseEnabled, signInWithMagicLink } = useAuthState();
  const [email, setEmail] = useState("");
  const [isSent, setIsSent] = useState(false);

  if (isLoading) {
    return <p className={styles.message}>Loading authentication...</p>;
  }

  if (user) {
    return null;
  }

  if (!isSupabaseEnabled) {
    return (
      <section className={styles.authCard}>
        <h2>{title}</h2>
        <p>{subtitle}</p>
        <p className={styles.message}>
          Supabase env vars are not set, so the app is running in local author mode.
        </p>
      </section>
    );
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void signInWithMagicLink(email).then(() => setIsSent(true));
  }

  return (
    <section className={styles.authCard}>
      <h2>{title}</h2>
      <p>{subtitle}</p>
      <form onSubmit={onSubmit} className={styles.formStack}>
        <label htmlFor="magic-email">Email</label>
        <input
          id="magic-email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@coffee.club"
        />
        <button type="submit">Send Magic Link</button>
      </form>
      {isSent ? <p className={styles.message}>Check your inbox for your sign-in link.</p> : null}
    </section>
  );
}
