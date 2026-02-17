"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import shell from "@/styles/shell.module.css";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const [status, setStatus] = useState("Completing sign in...");

  useEffect(() => {
    const supabase = getBrowserSupabaseClient();
    if (!supabase) {
      setStatus("Local mode active. Supabase is not configured.");
      return;
    }

    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setStatus("Sign in successful.");
      } else {
        setStatus("Magic link processed, but no active session was found.");
      }
    });
  }, []);

  return (
    <section className={shell.panel}>
      <h1>Authentication</h1>
      <p>{status}</p>
      <p>
        <Link href="/studio">Go to Studio</Link>
      </p>
    </section>
  );
}
