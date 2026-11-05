import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { flushQueue } from "@/lib/offline-queue";
import { errorMessage } from "@/lib/errors";
import { PUBLIC_URL } from "@/lib/publicUrl";

// Every auth email (magic link, signup confirmation, password reset) must
// redirect back to THIS deployment; otherwise the link in the inbox lands
// on Supabase's default (typically `localhost:3000`) and the session can't
// hydrate. PUBLIC_URL is the CF Workers subdomain in production, falls back
// to the current origin in local dev.
const AUTH_REDIRECT = `${PUBLIC_URL}/`;

interface AuthState {
  session: Session | null;
  loading: boolean;
  signInWithEmail: (email: string) => Promise<{ error: string | null }>;
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithPassword: (email: string, password: string) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession) {
        void flushQueue();
        void attachStashedReferral(newSession.user.id);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signInWithEmail = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: AUTH_REDIRECT },
    });
    return { error: error ? errorMessage(error) : null };
  };

  const signInWithPassword = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? errorMessage(error) : null };
  };

  const signUpWithPassword = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: AUTH_REDIRECT },
    });
    if (error) return { error: errorMessage(error), needsConfirmation: false };
    const needsConfirmation = data.session === null && data.user !== null;
    return { error: null, needsConfirmation };
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: AUTH_REDIRECT,
    });
    return { error: error ? errorMessage(error) : null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{
      session, loading,
      signInWithEmail, signInWithPassword, signUpWithPassword, resetPassword,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

async function attachStashedReferral(userId: string) {
  try {
    const code = localStorage.getItem("motopulse:referred_by");
    if (!code) return;
    const { data } = await supabase
      .from("user_profiles")
      .select("referred_by_code")
      .eq("user_id", userId)
      .maybeSingle();

    if (data && !data.referred_by_code) {
      await supabase
        .from("user_profiles")
        .update({ referred_by_code: code })
        .eq("user_id", userId);
    }
    localStorage.removeItem("motopulse:referred_by");
  } catch {
    /* best effort */
  }
}
