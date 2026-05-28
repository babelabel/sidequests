-- ===========================================================
-- Sidequest — Wave 4 migration
-- Adds: global leaderboard, profile customization (pfp/title/badge),
-- badge storage sync, minimum-duration timer enforcement,
-- new trendy quests + removal of boring ones.
-- Run AFTER wave3_5_migration.sql. Safe to re-run.
-- ===========================================================

-- -----------------------------------------------------------
-- 1. PROFILE CUSTOMIZATION columns
-- -----------------------------------------------------------
alter table profiles
  add column if not exists avatar_emoji text default '🙂',
  add column if not exists avatar_color text default '#fbbf24',
  add column if not exists display_title text default 'drifter',
  add column if not exists featured_badge text;

-- -----------------------------------------------------------
-- 2. TIMER: add min_duration to quests + templates
-- min_seconds = the minimum time that must elapse before completion is allowed.
-- For "spend 3 hours with family" this would be 3*3600.
-- We derive it from the template's estimated_minutes by default.
-- -----------------------------------------------------------
alter table quest_templates
  add column if not exists min_duration_minutes int default 0;

alter table quests
  add column if not exists unlock_at timestamptz;  -- when completion becomes allowed

-- Update start_quest to also set unlock_at based on the template's min_duration
create or replace function start_quest(_quest_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  _est_minutes int;
  _min_minutes int;
  _deadline timestamptz;
  _unlock timestamptz;
  _owner_id uuid;
  _group_id uuid;
  _all_confirmed boolean;
begin
  select q.owner_id, q.group_id, qt.estimated_minutes, coalesce(qt.min_duration_minutes, 0)
  into _owner_id, _group_id, _est_minutes, _min_minutes
  from quests q
  join quest_templates qt on qt.id = q.template_id
  where q.id = _quest_id;

  if not (
    _owner_id = auth.uid()
    or (_group_id is not null and is_group_member(_group_id, auth.uid()))
  ) then
    raise exception 'Not authorized to start this quest';
  end if;

  if _group_id is not null then
    select bool_and(has_confirmed) into _all_confirmed
    from quest_participants where quest_id = _quest_id;
    if not _all_confirmed then
      raise exception 'Waiting for all group members to confirm';
    end if;
  end if;

  -- Deadline: max(min_duration, 3x estimate), bounded 60 min .. 72 h
  _deadline := now() + (greatest(60, least(greatest(_min_minutes, _est_minutes * 3), 72 * 60)) || ' minutes')::interval;
  -- Unlock: cannot complete until min_duration elapses
  _unlock := now() + (_min_minutes || ' minutes')::interval;

  update quests
  set started_at = now(),
      deadline_at = _deadline,
      unlock_at = _unlock,
      status = 'started'
  where id = _quest_id;

  return _deadline;
end;
$$;

grant execute on function start_quest(uuid) to authenticated;

-- has_quest_photo stays the same; add a completion guard that also checks unlock_at
create or replace function can_complete_quest(_quest_id uuid, _user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select
    -- photo exists
    exists (
      select 1 from quest_posts
      where quest_id = _quest_id and author_id = _user_id and photo_url is not null
    )
    -- and the unlock time has passed (or no unlock set)
    and exists (
      select 1 from quests
      where id = _quest_id
        and (unlock_at is null or unlock_at <= now())
        and status = 'started'
    );
$$;

grant execute on function can_complete_quest(uuid, uuid) to authenticated;

-- -----------------------------------------------------------
-- 3. GLOBAL LEADERBOARD — top players by total XP
-- Returns top N with their customization so the UI can render avatars/titles.
-- -----------------------------------------------------------
create or replace function get_global_leaderboard(_limit int default 10)
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_emoji text,
  avatar_color text,
  display_title text,
  total_xp bigint,
  rank_position bigint
)
language sql
security definer
set search_path = public
as $$
  select
    p.id, p.username, p.display_name, p.avatar_emoji, p.avatar_color, p.display_title,
    (coalesce(p.xp_adventure,0) + coalesce(p.xp_social,0) + coalesce(p.xp_fitness,0)
      + coalesce(p.xp_creativity,0) + coalesce(p.xp_exploration,0))::bigint as total_xp,
    row_number() over (order by
      (coalesce(p.xp_adventure,0) + coalesce(p.xp_social,0) + coalesce(p.xp_fitness,0)
        + coalesce(p.xp_creativity,0) + coalesce(p.xp_exploration,0)) desc
    ) as rank_position
  from profiles p
  order by total_xp desc
  limit _limit;
$$;

grant execute on function get_global_leaderboard(int) to authenticated;

-- Get the caller's own rank position (even if not in top 10)
create or replace function get_my_rank()
returns bigint
language sql
security definer
set search_path = public
as $$
  with ranked as (
    select p.id,
      row_number() over (order by
        (coalesce(p.xp_adventure,0) + coalesce(p.xp_social,0) + coalesce(p.xp_fitness,0)
          + coalesce(p.xp_creativity,0) + coalesce(p.xp_exploration,0)) desc
      ) as pos
    from profiles p
  )
  select pos from ranked where id = auth.uid();
$$;

grant execute on function get_my_rank() to authenticated;

-- -----------------------------------------------------------
-- 4. BADGE storage already exists (user_badges table from Wave 1).
-- Add a helper to sync earned badges. The client computes which badges
-- are earned and calls this to persist new ones.
-- -----------------------------------------------------------
create or replace function award_badge(_badge_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into user_badges (user_id, badge_id)
  values (auth.uid(), _badge_id)
  on conflict do nothing;
  return found;
end;
$$;

grant execute on function award_badge(text) to authenticated;

-- Get all stats needed to compute badges for the current user
create or replace function get_my_badge_stats()
returns table (
  completed_count bigint,
  photo_count bigint,
  rare_count bigint,
  epic_count bigint,
  legendary_count bigint,
  group_completed_count bigint,
  night_count bigint,
  morning_count bigint,
  friend_count bigint,
  reactions_received bigint
)
language sql
security definer
set search_path = public
as $$
  select
    (select count(*) from quests q where q.owner_id = auth.uid() and q.status = 'completed'),
    (select count(*) from quest_posts qp where qp.author_id = auth.uid() and qp.photo_url is not null),
    (select count(*) from quests q join quest_templates qt on qt.id = q.template_id
       where q.owner_id = auth.uid() and q.status = 'completed' and qt.rarity = 'rare'),
    (select count(*) from quests q join quest_templates qt on qt.id = q.template_id
       where q.owner_id = auth.uid() and q.status = 'completed' and qt.rarity = 'epic'),
    (select count(*) from quests q join quest_templates qt on qt.id = q.template_id
       where q.owner_id = auth.uid() and q.status = 'completed' and qt.rarity = 'legendary'),
    (select count(*) from quests q where q.owner_id = auth.uid() and q.status = 'completed' and q.group_id is not null),
    (select count(*) from quests q join quest_templates qt on qt.id = q.template_id
       where q.owner_id = auth.uid() and q.status = 'completed' and 'nighttime' = any(qt.tags)),
    (select count(*) from quests q join quest_templates qt on qt.id = q.template_id
       where q.owner_id = auth.uid() and q.status = 'completed' and 'morning' = any(qt.tags)),
    (select count(*) from friendships f where f.user_id = auth.uid() and f.status = 'accepted'),
    (select count(*) from post_reactions r join quest_posts qp on qp.id = r.post_id where qp.author_id = auth.uid());
$$;

grant execute on function get_my_badge_stats() to authenticated;

-- -----------------------------------------------------------
-- 5. CONTENT: remove boring quests, add trendy/actiony ones
-- -----------------------------------------------------------

-- Remove the slow/boring ones. We delete by title to be safe.
delete from quest_templates where title in (
  'Family time',
  'Könyvtár nap',
  'Egy hely, egy óra',
  'Régi barát',
  'No-Phone Lunch',
  'Old-school játék',
  'Múzeum tour'
);

-- Set sensible min_duration on remaining time-investment quests
update quest_templates set min_duration_minutes = 20 where title = 'Yoga in the park';
update quest_templates set min_duration_minutes = 30 where title = 'Reggeli futás';
update quest_templates set min_duration_minutes = 60 where title = 'Strand & úszás';

-- Add new trendy quests
insert into quest_templates (title, description, category, mode, difficulty, rarity, xp_reward, estimated_minutes, min_duration_minutes, location_hint, tags, weather_pref) values
('Sunset chase', 'Find the highest spot you can reach in 30 minutes and watch the sunset. Post the view.', 'adventure', 'solo', 'easy', 'rare', 130, 60, 30, 'Bárhol magaslat', array['outdoors','sunset','photo','views','spontaneous'], 'sunny'),
('Parkour a lépcsőn', 'Find the longest staircase near you and run up it 3 times. Film the last one.', 'fitness', 'solo', 'medium', 'common', 110, 30, 0, 'Bárhol', array['fitness','outdoors','daytime'], 'any'),
('Stranger''s recommendation', 'Ask a stranger for their favorite spot in the city. Go there within the hour.', 'social', 'solo', 'hard', 'epic', 220, 90, 0, 'Belváros', array['social','spontaneous','exploration'], 'any'),
('Golden hour portrait', 'Take a cinematic portrait of a friend during golden hour. Make it magazine-worthy.', 'creativity', 'duo', 'medium', 'rare', 150, 45, 0, 'Bárhol', array['photo','creative','duo','sunset'], 'sunny'),
('Late night food run', 'After 22:00, find open street food and try something you have never eaten.', 'adventure', 'duo', 'easy', 'common', 100, 60, 0, 'Belváros', array['nighttime','food','social','duo'], 'any'),
('Rooftop hunt', 'Find a publicly accessible rooftop with a view. Stay for the city lights.', 'exploration', 'solo', 'hard', 'epic', 240, 90, 0, 'Belváros', array['nighttime','views','exploration','photo'], 'any'),
('Speed friend', 'Meet someone new and get a photo together within 30 minutes. Go.', 'social', 'solo', 'hard', 'rare', 160, 30, 0, 'Bárhol', array['social','spontaneous'], 'any'),
('Bike the bridges', 'Rent a MOL Bubi and cross 3 different Danube bridges in one ride.', 'fitness', 'solo', 'medium', 'rare', 150, 60, 30, 'Duna-hidak', array['fitness','outdoors','exploration'], 'sunny'),
('Hidden courtyard', 'Find a hidden inner courtyard in a Pest building. Photograph the architecture.', 'exploration', 'solo', 'medium', 'rare', 130, 60, 0, 'Pest belváros', array['exploration','photo','daytime'], 'any'),
('Midnight challenge', 'Be somewhere iconic at exactly midnight. Capture the moment.', 'adventure', 'duo', 'medium', 'epic', 230, 60, 0, 'Bárhol ikonikus', array['nighttime','photo','spontaneous','duo'], 'any'),
('Flash mob energy', 'Do something spontaneous and slightly chaotic in public with friends. Film it.', 'social', 'group', 'medium', 'rare', 180, 45, 0, 'Köztér', array['social','chaotic','group_bonus','daytime'], 'any'),
('Color hunt', 'Photograph 5 things that match today''s "color of the day" — you pick it. Post the set.', 'creativity', 'solo', 'easy', 'common', 90, 45, 0, 'Bárhol', array['photo','creative','daytime'], 'any'),
('Sprint finish', 'Run as far as you can in 15 minutes. Screenshot your distance.', 'fitness', 'solo', 'medium', 'common', 100, 15, 15, 'Bárhol', array['fitness','outdoors'], 'any'),
('Street performer tip', 'Find a street performer. Watch a full song and tip them. Post the vibe.', 'social', 'solo', 'easy', 'common', 80, 30, 0, 'Belváros', array['social','music','daytime'], 'sunny'),
('Abandoned beauty', 'Find a forgotten or abandoned-looking spot in the city. Make it look cinematic.', 'creativity', 'solo', 'hard', 'epic', 210, 90, 0, 'Bárhol', array['photo','creative','exploration','urbex'], 'any');

-- -----------------------------------------------------------
-- Done.
-- -----------------------------------------------------------
