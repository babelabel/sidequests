import { useEffect, useState } from 'react';
import { supabase } from './supabase.js';

/**
 * useAuth — React hook that tracks the current Supabase session and
 * the associated profile row. Returns { user, profile, loading }.
 * User is null when signed out; profile is null until the profile
 * row has been fetched.
 */
export function useAuth() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // 1) Pull current session on mount
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    // 2) Subscribe to auth changes (sign in / out / token refresh)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Fetch (or create) the profile row whenever the user changes
  useEffect(() => {
    if (!user) { setProfile(null); return; }
    (async () => {
      let { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      if (error) {
        console.error('profile fetch', error);
        return;
      }
      if (!data) {
        // First time signing in — create a default profile
        const defaultUsername = 'user_' + Math.random().toString(36).slice(2, 8);
        const { data: created } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            username: defaultUsername,
            display_name: user.email?.split('@')[0] || defaultUsername
          })
          .select()
          .single();
        data = created;
      }
      setProfile(data);
    })();
  }, [user]);

  return { user, profile, loading, refreshProfile: async () => {
    if (!user) return;
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    setProfile(data);
  }};
}

export async function signInWithEmail(email) {
  // Magic link — Supabase sends an email with a sign-in link. No passwords.
  return supabase.auth.signInWithOtp({
    email,
    options: {
      // Returns user to current origin after they click the email link
      emailRedirectTo: window.location.origin
    }
  });
}

export async function signOut() {
  return supabase.auth.signOut();
}
