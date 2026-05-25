# Sidequest

Real-life adventure app for friends. Budapest summer 2026.

This is **Wave 1** of the build — auth, daily quest picks, quest detail with completion, XP system, profile. Friends/groups (Wave 2), photo feed (Wave 3), AI + maps + memories (Wave 4), and polish (Wave 5) come next.

## What works in Wave 1

- ✅ Email magic-link sign in (no passwords)
- ✅ 40+ Hungary-specific seed quests in 5 categories
- ✅ Smart daily quest picks (filters by category balance + time of day + recency)
- ✅ Quest cards with rarity, XP, mode, tags
- ✅ Accept quest → complete quest → award XP flow
- ✅ Per-category XP and rank progression (6 ranks: Drifter → Sovereign of Summer)
- ✅ Streak multiplier hooks (1.2× / 1.5× / 2× at 7/14/30 days)
- ✅ Profile edit (username, display name, bio)
- ✅ PWA — installable to phone home screen
- ✅ Full Row-Level Security so multi-user data is safe

## What's stubbed (intentionally)

- ⏳ Groups & friend system → Wave 2
- ⏳ Photo uploads, reactions, feed → Wave 3
- ⏳ AI quest generation (Gemini), maps (Leaflet), memory timeline → Wave 4
- ⏳ Push-style notifications, polish, animations → Wave 5

---

## Setup — 4 phases

### Phase 1 — Supabase (10 min)

1. Go to **supabase.com** and sign up (free).
2. Click "New project." Pick any name (e.g., "sidequest"). Pick a strong DB password and save it somewhere. Region: pick closest to you (Frankfurt is closest to Hungary).
3. Wait ~2 min for the project to provision.
4. Once ready, in the left sidebar click **SQL Editor** → **New query**.
5. Open `supabase/schema.sql` in this repo. Copy ALL of it. Paste into the SQL editor. Click **Run** (bottom right).
6. Open `supabase/rls.sql`. Same: copy → paste → Run.
7. Open `supabase/seed_quests.sql`. Same: copy → paste → Run. You should see "INSERT 0 42" or similar.
8. In the left sidebar, click **Project Settings** (gear icon) → **API**.
9. Copy two values somewhere safe:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon public** key (long string starting with `eyJ`)
10. Still in Project Settings, click **Authentication** → **URL Configuration**. Set Site URL to your eventual Vercel URL (you can come back and fix this later — for now use `http://localhost:5173`).

### Phase 2 — Local test (5 min — optional but recommended)

1. Install Node.js 18+ from nodejs.org if you don't have it.
2. From this folder, run:
   ```
   npm install
   ```
3. Copy `.env.example` to `.env` and paste your Supabase URL + anon key into it.
4. Run:
   ```
   npm run dev
   ```
5. Open `http://localhost:5173` in a browser. Sign in with your email. Check your inbox for the magic link.
6. After signing in you should see the home screen with 3 quests.

### Phase 3 — Deploy to Vercel (10 min)

Same as Life OS:

1. Push this folder to a new GitHub repo (call it `sidequest`).
2. On vercel.com → "Add New" → "Project" → import your `sidequest` repo.
3. **Before deploying, click "Environment Variables"** and add:
   - `VITE_SUPABASE_URL` = your Supabase URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
4. Click Deploy.
5. After it deploys, go back to **Supabase → Auth → URL Configuration** and set Site URL to your new Vercel URL (e.g., `https://sidequest-xyz.vercel.app`). Save.
6. Add the same URL to "Redirect URLs" if not already there.

### Phase 4 — Install on your Pixel

1. Open your Vercel URL in Chrome on the Pixel.
2. Three-dot menu → "Install app."
3. Icon appears on home screen. Tap, sign in, you're in.

---

## Project structure

```
sidequest/
├── package.json
├── vite.config.js          PWA enabled
├── tailwind.config.js
├── .env.example            env vars template
├── supabase/
│   ├── schema.sql          all tables + indexes
│   ├── rls.sql             security policies
│   └── seed_quests.sql     42 Hungary quests
├── public/
│   └── icon.svg
└── src/
    ├── main.jsx
    ├── App.jsx             auth gate + nav
    ├── index.css
    ├── lib/
    │   ├── supabase.js     client
    │   ├── auth.js         useAuth hook + sign in
    │   ├── quests.js       daily picks, accept, complete
    │   └── xp.js           ranks, categories, math
    ├── components/
    │   ├── QuestCard.jsx
    │   └── BottomNav.jsx
    └── screens/
        ├── AuthScreen.jsx
        ├── HomeScreen.jsx
        ├── QuestDetailScreen.jsx
        ├── ExploreScreen.jsx
        ├── ProfileScreen.jsx
        ├── GroupsScreen.jsx    (Wave 2 stub)
        └── FeedScreen.jsx      (Wave 3 stub)
```

---

## How to ask Claude for Wave 2

Just say: **"Build Wave 2: friend system and groups."** Claude will edit GroupsScreen.jsx, add a Friends component, set up the friendship and group tables (already in schema.sql), and wire it up.

Same pattern for Wave 3, 4, 5.

---

## Troubleshooting

**"loading…" screen never goes away**
Open browser DevTools → Console. Probably missing env vars. Check `.env` or Vercel env vars.

**Magic link email never arrives**
Check spam folder. Or in Supabase → Auth → Email templates, ensure your project's email settings are active. Free tier sends emails via Supabase's domain by default.

**"Could not accept quest" errors**
Check that you ran all three SQL files (schema, rls, seed). The Network tab in DevTools will show the exact error.

**Quest cards are blank / nothing shows on home**
You skipped seed_quests.sql. Run it.

**Profile says "user_xxxxx" weird username**
That's the auto-generated one. Tap Profile → Edit profile to change it.
