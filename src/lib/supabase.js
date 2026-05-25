import { createClient } from '@supabase/supabase-js';

// The Supabase project URL and anon key are read from Vite env variables.
// You set these in two places:
//   1. Locally: a .env file at the project root with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
//   2. On Vercel: Project Settings → Environment Variables → add the same two
// The anon key is safe to expose — RLS policies in the database enforce access control.
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Missing Supabase env vars. Did you create a .env file?');
}

export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
});
