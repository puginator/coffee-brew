"use client";

import { useEffect, useMemo, useState } from "react";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/config";
import type { Session } from "@supabase/supabase-js";
import type { UserProfile } from "@/lib/types";

const localUser: UserProfile = {
  id: "local-brewer",
  email: "local@coffeebrew.dev",
};

interface AuthState {
  user: UserProfile | null;
  session: Session | null;
  isLoading: boolean;
  isSupabaseEnabled: boolean;
  signInWithMagicLink: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export function useAuthState(): AuthState {
  const [user, setUser] = useState<UserProfile | null>(isSupabaseConfigured ? null : localUser);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    const supabase = getBrowserSupabaseClient();
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    let ignore = false;

    void supabase.auth.getSession().then(({ data }) => {
      if (ignore) return;
      setSession(data.session);
      setUser(
        data.session?.user
          ? { id: data.session.user.id, email: data.session.user.email ?? "unknown@coffee.dev" }
          : null,
      );
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (ignore) return;
      setSession(nextSession);
      setUser(
        nextSession?.user
          ? { id: nextSession.user.id, email: nextSession.user.email ?? "unknown@coffee.dev" }
          : null,
      );
      setIsLoading(false);
    });

    return () => {
      ignore = true;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      session,
      isLoading,
      isSupabaseEnabled: isSupabaseConfigured,
      signInWithMagicLink: async (email: string) => {
        const supabase = getBrowserSupabaseClient();
        if (!supabase) {
          setUser(localUser);
          return;
        }

        await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
      },
      signOut: async () => {
        const supabase = getBrowserSupabaseClient();
        if (!supabase) {
          setUser(localUser);
          return;
        }

        await supabase.auth.signOut();
      },
    }),
    [isLoading, session, user],
  );

  return value;
}
