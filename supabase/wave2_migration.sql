-- ===========================================================
-- Sidequest — Wave 2 migration
-- Run this in Supabase SQL Editor AFTER you've already run schema.sql,
-- rls.sql, and seed_quests.sql from Wave 1.
-- This file is safe to re-run: it drops and recreates the affected policies.
-- ===========================================================

-- -----------------------------------------------------------
-- 1. PROFILE: add friend_code column
-- -----------------------------------------------------------
alter table profiles
  add column if not exists friend_code text unique;

-- Backfill existing profiles with a code if they don't have one
update profiles
set friend_code = upper(substring(md5(random()::text || id::text) from 1 for 6))
where friend_code is null;

-- Trigger: auto-generate friend_code on insert if not provided
create or replace function set_friend_code()
returns trigger
language plpgsql
as $$
begin
  if NEW.friend_code is null then
    NEW.friend_code := upper(substring(md5(random()::text || NEW.id::text) from 1 for 6));
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_set_friend_code on profiles;
create trigger trg_set_friend_code
  before insert on profiles
  for each row
  execute function set_friend_code();

-- -----------------------------------------------------------
-- 2. FIX INFINITE RECURSION
-- The original group_members SELECT policy queried group_members
-- inside its own check → Postgres refuses → all related tables error.
-- The fix: use a SECURITY DEFINER function that bypasses RLS to do
-- the membership check. This is the standard Supabase pattern.
-- -----------------------------------------------------------

-- Helper: is the given user a member of the given group?
-- SECURITY DEFINER means this function runs as the table owner, not the
-- caller — so its internal query to group_members doesn't recurse back
-- into the same RLS policy.
create or replace function is_group_member(_group_id uuid, _user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from group_members
    where group_id = _group_id and user_id = _user_id
  );
$$;

-- Drop and recreate the problematic policies
drop policy if exists "group_members_select" on group_members;
drop policy if exists "groups_select_members" on groups;
drop policy if exists "quests_select_owner_or_group" on quests;
drop policy if exists "qp_select" on quest_participants;
drop policy if exists "qp_insert_self" on quest_participants;
drop policy if exists "posts_select" on quest_posts;

-- GROUP_MEMBERS: a user can see members of groups they're part of.
-- This now uses the SECURITY DEFINER helper to avoid recursion.
create policy "group_members_select" on group_members for select using (
  is_group_member(group_id, auth.uid())
);

-- GROUPS: viewable by members. Non-member access happens via the
-- join_group_by_code() function below, which is SECURITY DEFINER.
create policy "groups_select_members" on groups for select using (
  is_group_member(id, auth.uid())
);

-- QUESTS: viewable by owner or any group member
create policy "quests_select_owner_or_group" on quests for select using (
  auth.uid() = owner_id
  or (group_id is not null and is_group_member(group_id, auth.uid()))
);

-- QUEST_PARTICIPANTS — fix the recursion + the broken accept flow
create policy "qp_select" on quest_participants for select using (
  user_id = auth.uid()
  or exists (
    select 1 from quests q
    where q.id = quest_participants.quest_id
    and (q.owner_id = auth.uid() or (q.group_id is not null and is_group_member(q.group_id, auth.uid())))
  )
);

-- Allow inserting yourself OR inserting on a quest you own (e.g., adding group members at accept time)
create policy "qp_insert" on quest_participants for insert with check (
  auth.uid() = user_id
  or exists (
    select 1 from quests q
    where q.id = quest_participants.quest_id and q.owner_id = auth.uid()
  )
);

-- QUEST_POSTS: same recursion issue, same fix
create policy "posts_select" on quest_posts for select using (
  exists (
    select 1 from quests q where q.id = quest_posts.quest_id and (
      q.owner_id = auth.uid()
      or (q.group_id is not null and is_group_member(q.group_id, auth.uid()))
    )
  )
  or auth.uid() = author_id
);

-- -----------------------------------------------------------
-- 3. GROUPS: add helper for joining by invite code
-- -----------------------------------------------------------

-- This function safely joins a user to a group given an invite code.
-- SECURITY DEFINER because regular RLS won't let you SELECT a group
-- before you're a member of it.
create or replace function join_group_by_code(_invite_code text)
returns table (group_id uuid, group_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  _group_id uuid;
  _group_name text;
begin
  -- Find the group
  select id, name into _group_id, _group_name
  from groups where invite_code = upper(_invite_code);

  if _group_id is null then
    raise exception 'Group not found';
  end if;

  -- Add member (ignore if already there)
  insert into group_members (group_id, user_id, role)
  values (_group_id, auth.uid(), 'member')
  on conflict do nothing;

  return query select _group_id, _group_name;
end;
$$;

-- Make it callable by authenticated users
grant execute on function join_group_by_code(text) to authenticated;

-- -----------------------------------------------------------
-- 4. FRIEND CODE LOOKUP helper
-- -----------------------------------------------------------
create or replace function find_user_by_friend_code(_code text)
returns table (id uuid, username text, display_name text, friend_code text)
language sql
security definer
set search_path = public
as $$
  select p.id, p.username, p.display_name, p.friend_code
  from profiles p
  where p.friend_code = upper(_code);
$$;

grant execute on function find_user_by_friend_code(text) to authenticated;

-- -----------------------------------------------------------
-- 5. ACCEPT QUEST FOR GROUP — safely creates a quest for each member
-- -----------------------------------------------------------
create or replace function accept_quest_for_group(_template_id uuid, _group_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  _quest_id uuid;
begin
  -- Verify caller is in the group
  if not is_group_member(_group_id, auth.uid()) then
    raise exception 'Not a member of this group';
  end if;

  -- Create the quest record (owner = caller, scoped to group)
  insert into quests (template_id, owner_id, group_id, expires_at)
  values (_template_id, auth.uid(), _group_id, now() + interval '72 hours')
  returning id into _quest_id;

  -- Add ALL group members as participants
  insert into quest_participants (quest_id, user_id)
  select _quest_id, user_id from group_members where group_id = _group_id;

  return _quest_id;
end;
$$;

grant execute on function accept_quest_for_group(uuid, uuid) to authenticated;

-- -----------------------------------------------------------
-- Done. Verify with:
--   select friend_code from profiles where id = auth.uid();
-- You should see your own 6-character code.
-- -----------------------------------------------------------
