import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { flushQueue } from "@/lib/offline-queue";
import { errorMessage } from "@/lib/errors";

interface AuthState {
  session: Session | null;
  loading: boolean;
  signInWithEmail: (email: string) => Promise<{ error: string | null }>;
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithPassword: (email: string, password: string) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
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
    const { error } = await supabase.auth.signInWithOtp({ email });
    return { error: error ? errorMessage(error) : null };
  };

  const signInWithPassword = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? errorMessage(error) : null };
  };

  const signUpWithPassword = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: errorMessage(error), needsConfirmation: false };
    // If Supabase is configured to require email confirmation, `session` is
    // null until the user clicks the confirmation link in their inbox.
    const needsConfirmation = data.session === null && data.user !== null;
    return { error: null, needsConfirmation };
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/`,
    });
    return { error: error ? errorMessage(error) : null };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google" });
    return { error: error ? errorMessage(error) : null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{
      session, loading,
      signInWithEmail, signInWithPassword, signUpWithPassword, resetPassword,
      signInWithGoogle, signOut,
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
