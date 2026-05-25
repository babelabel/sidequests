-- ===========================================================
-- Sidequest — full database schema
-- Run this in Supabase: Project → SQL Editor → New query → paste → Run
-- ===========================================================

-- Profiles (extends Supabase auth.users)
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique not null,
  display_name text,
  avatar_url text,
  bio text,
  city text default 'Budapest',
  xp_adventure int default 0,
  xp_social int default 0,
  xp_fitness int default 0,
  xp_creativity int default 0,
  xp_exploration int default 0,
  current_streak int default 0,
  best_streak int default 0,
  last_active_date date,
  created_at timestamptz default now()
);

-- Friendships (symmetric, two rows per pair)
create table if not exists friendships (
  user_id uuid references profiles(id) on delete cascade,
  friend_id uuid references profiles(id) on delete cascade,
  status text check (status in ('pending','accepted','blocked')) default 'pending',
  created_at timestamptz default now(),
  primary key (user_id, friend_id)
);

-- Groups
create table if not exists groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  emoji text default '🌅',
  created_by uuid references profiles(id) on delete set null,
  invite_code text unique not null,
  total_xp int default 0,
  created_at timestamptz default now()
);

create table if not exists group_members (
  group_id uuid references groups(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  role text default 'member',
  joined_at timestamptz default now(),
  primary key (group_id, user_id)
);

-- Quest templates (curated + AI-generated)
create table if not exists quest_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text check (category in ('adventure','social','fitness','creativity','exploration')),
  mode text check (mode in ('solo','duo','group')) default 'solo',
  difficulty text check (difficulty in ('easy','medium','hard')) default 'easy',
  rarity text check (rarity in ('common','rare','epic','legendary')) default 'common',
  xp_reward int default 50,
  estimated_minutes int default 30,
  location_hint text,
  tags text[],
  weather_pref text default 'any',
  season text default 'summer',
  region text default 'hungary',
  is_curated boolean default true,
  created_at timestamptz default now()
);

create index if not exists idx_quest_templates_category on quest_templates(category);
create index if not exists idx_quest_templates_tags on quest_templates using gin(tags);

-- Quest instances (accepted quests)
create table if not exists quests (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references quest_templates(id),
  owner_id uuid references profiles(id) on delete cascade,
  group_id uuid references groups(id) on delete set null,
  status text check (status in ('active','completed','abandoned','expired')) default 'active',
  accepted_at timestamptz default now(),
  expires_at timestamptz,
  completed_at timestamptz
);

create index if not exists idx_quests_owner on quests(owner_id, status);
create index if not exists idx_quests_group on quests(group_id, status);

-- Quest participants (for duo/group)
create table if not exists quest_participants (
  quest_id uuid references quests(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  has_completed boolean default false,
  primary key (quest_id, user_id)
);

-- Quest completion posts (photos + captions)
create table if not exists quest_posts (
  id uuid primary key default gen_random_uuid(),
  quest_id uuid references quests(id) on delete cascade,
  author_id uuid references profiles(id) on delete cascade,
  photo_url text,
  caption text,
  location_name text,
  lat float,
  lng float,
  created_at timestamptz default now()
);

create index if not exists idx_posts_author on quest_posts(author_id, created_at desc);

-- Reactions (emoji limited to relevant set)
create table if not exists post_reactions (
  post_id uuid references quest_posts(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  emoji text check (emoji in ('🔥','⭐','👏','❤️','🤯')),
  created_at timestamptz default now(),
  primary key (post_id, user_id, emoji)
);

-- Comments
create table if not exists post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references quest_posts(id) on delete cascade,
  author_id uuid references profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz default now()
);

-- Earned badges
create table if not exists user_badges (
  user_id uuid references profiles(id) on delete cascade,
  badge_id text not null,
  earned_at timestamptz default now(),
  primary key (user_id, badge_id)
);

-- Saved/favorite places (memory map)
create table if not exists saved_places (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  name text not null,
  lat float,
  lng float,
  note text,
  created_at timestamptz default now()
);
