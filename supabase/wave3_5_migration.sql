-- ===========================================================
-- Sidequest — Wave 3.5 migration
-- Run AFTER wave3_migration.sql.
-- Fixes: group creation RLS, adds quest start/timer, group consent,
-- friend last-seen locations.
-- Safe to re-run.
-- ===========================================================

-- -----------------------------------------------------------
-- 1. FIX: groups insert RLS was too strict
-- The original policy required `created_by = auth.uid()`, but the
-- client wasn't setting that field before insert in some paths.
-- Solution: drop the constraint and use a trigger to auto-set it.
-- ALSO: the .select().single() after insert was failing RLS because
-- the user wasn't yet a member at that moment. We add a SECURITY DEFINER
-- function for the atomic create-group-and-add-owner pattern.
-- -----------------------------------------------------------

drop policy if exists "groups_insert_any" on groups;

create policy "groups_insert_authenticated" on groups for insert to authenticated
with check (auth.uid() is not null);

-- Trigger auto-sets created_by if not provided
create or replace function set_group_created_by()
returns trigger
language plpgsql
as $$
begin
  if NEW.created_by is null then
    NEW.created_by := auth.uid();
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_set_group_created_by on groups;
create trigger trg_set_group_created_by
  before insert on groups
  for each row
  execute function set_group_created_by();

-- Atomic group creation: creates the group AND adds the creator as owner
-- in a single transaction. Avoids the RLS race between insert and select.
create or replace function create_group_with_owner(_name text, _emoji text, _invite_code text)
returns table (id uuid, name text, emoji text, invite_code text, created_by uuid, total_xp int, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  _group_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into groups (name, emoji, invite_code, created_by)
  values (_name, _emoji, _invite_code, auth.uid())
  returning groups.id into _group_id;

  insert into group_members (group_id, user_id, role)
  values (_group_id, auth.uid(), 'owner');

  return query
    select g.id, g.name, g.emoji, g.invite_code, g.created_by, g.total_xp, g.created_at
    from groups g
    where g.id = _group_id;
end;
$$;

grant execute on function create_group_with_owner(text, text, text) to authenticated;

-- -----------------------------------------------------------
-- 2. QUEST TIMER: separate "accepted" from "started"
-- Lifecycle is now:
--   accepted → (for groups: all members confirm) → started → completed
-- expires_at means deadline once started.
-- -----------------------------------------------------------

alter table quests
  add column if not exists started_at timestamptz,
  add column if not exists deadline_at timestamptz;

-- Add 'pending_group_consent' as a valid status
alter table quests
  drop constraint if exists quests_status_check;
alter table quests
  add constraint quests_status_check
  check (status in ('active','pending_group_consent','started','completed','abandoned','expired'));

-- -----------------------------------------------------------
-- 3. GROUP CONSENT: track who has confirmed they want to do the quest
-- -----------------------------------------------------------

alter table quest_participants
  add column if not exists has_confirmed boolean default false,
  add column if not exists confirmed_at timestamptz;

-- -----------------------------------------------------------
-- 4. START QUEST function (for solo + after-group-confirmed)
-- Sets started_at and deadline_at based on the template's estimated_minutes,
-- with a buffer (3x estimated time, min 1 hour, max 72 hours).
-- -----------------------------------------------------------

create or replace function start_quest(_quest_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  _est_minutes int;
  _deadline timestamptz;
  _owner_id uuid;
  _group_id uuid;
  _all_confirmed boolean;
begin
  -- Get quest info
  select q.owner_id, q.group_id, qt.estimated_minutes
  into _owner_id, _group_id, _est_minutes
  from quests q
  join quest_templates qt on qt.id = q.template_id
  where q.id = _quest_id;

  -- Authorization: must be owner or group member
  if not (
    _owner_id = auth.uid()
    or (_group_id is not null and is_group_member(_group_id, auth.uid()))
  ) then
    raise exception 'Not authorized to start this quest';
  end if;

  -- For group quests, require all members to have confirmed
  if _group_id is not null then
    select bool_and(has_confirmed) into _all_confirmed
    from quest_participants
    where quest_id = _quest_id;
    if not _all_confirmed then
      raise exception 'Waiting for all group members to confirm';
    end if;
  end if;

  -- Compute deadline: 3x estimate, but minimum 60 min, maximum 72 hours
  _deadline := now() + (greatest(60, least(_est_minutes * 3, 72 * 60)) || ' minutes')::interval;

  -- Update the quest
  update quests
  set started_at = now(),
      deadline_at = _deadline,
      status = 'started'
  where id = _quest_id;

  return _deadline;
end;
$$;

grant execute on function start_quest(uuid) to authenticated;

-- -----------------------------------------------------------
-- 5. CONFIRM PARTICIPATION (group consent)
-- -----------------------------------------------------------

create or replace function confirm_quest_participation(_quest_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  _group_id uuid;
  _all_confirmed boolean;
begin
  -- Must be a participant
  if not exists (
    select 1 from quest_participants
    where quest_id = _quest_id and user_id = auth.uid()
  ) then
    raise exception 'Not a participant';
  end if;

  -- Mark confirmed
  update quest_participants
  set has_confirmed = true, confirmed_at = now()
  where quest_id = _quest_id and user_id = auth.uid();

  -- Check if all confirmed; if so, auto-start
  select q.group_id into _group_id from quests q where q.id = _quest_id;
  if _group_id is not null then
    select bool_and(has_confirmed) into _all_confirmed
    from quest_participants
    where quest_id = _quest_id;
    if _all_confirmed then
      perform start_quest(_quest_id);
      return true;  -- started
    end if;
  end if;

  return false;  -- still waiting
end;
$$;

grant execute on function confirm_quest_participation(uuid) to authenticated;

-- -----------------------------------------------------------
-- 6. UPDATE accept_quest_for_group to use new lifecycle
-- Sets status to 'pending_group_consent' instead of immediately starting
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
  if not is_group_member(_group_id, auth.uid()) then
    raise exception 'Not a member of this group';
  end if;

  -- Create the quest in pending consent state (no deadline yet — set when started)
  insert into quests (template_id, owner_id, group_id, status)
  values (_template_id, auth.uid(), _group_id, 'pending_group_consent')
  returning id into _quest_id;

  -- Add all group members as participants. The accepter is auto-confirmed.
  insert into quest_participants (quest_id, user_id, has_confirmed, confirmed_at)
  select _quest_id, user_id,
         user_id = auth.uid(),  -- accepter is auto-confirmed
         case when user_id = auth.uid() then now() else null end
  from group_members where group_id = _group_id;

  return _quest_id;
end;
$$;

-- -----------------------------------------------------------
-- 7. PROFILES: add last-seen location for friend map
-- Privacy: only visible to friends. Updated when user opts in.
-- -----------------------------------------------------------

alter table profiles
  add column if not exists location_lat float,
  add column if not exists location_lng float,
  add column if not exists location_updated_at timestamptz,
  add column if not exists location_sharing boolean default false;

-- Function to update one's own location
create or replace function update_my_location(_lat float, _lng float)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update profiles
  set location_lat = _lat,
      location_lng = _lng,
      location_updated_at = now(),
      location_sharing = true
  where id = auth.uid();
end;
$$;

grant execute on function update_my_location(float, float) to authenticated;

-- Function: get friends' last-seen locations (within last 24 hours)
create or replace function get_friend_locations()
returns table (
  id uuid,
  username text,
  display_name text,
  lat float,
  lng float,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select p.id, p.username, p.display_name,
         p.location_lat, p.location_lng, p.location_updated_at
  from profiles p
  join friendships f on f.friend_id = p.id
  where f.user_id = auth.uid()
    and f.status = 'accepted'
    and p.location_sharing = true
    and p.location_lat is not null
    and p.location_updated_at > now() - interval '24 hours';
$$;

grant execute on function get_friend_locations() to authenticated;

-- -----------------------------------------------------------
-- 8. EXPIRE QUESTS: mark started quests past deadline as expired.
-- Call this periodically or before showing the quest list.
-- -----------------------------------------------------------

create or replace function expire_overdue_quests()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  _count int;
begin
  update quests
  set status = 'expired'
  where status = 'started'
    and deadline_at is not null
    and deadline_at < now();
  get diagnostics _count = row_count;
  return _count;
end;
$$;

grant execute on function expire_overdue_quests() to authenticated;

-- -----------------------------------------------------------
-- 9. COMPLETE QUEST guard: now requires a photo post
-- We can't enforce this purely in DB without complex triggers,
-- but the client will enforce it. The check_quest_complete helper
-- here just verifies a post exists.
-- -----------------------------------------------------------

create or replace function has_quest_photo(_quest_id uuid, _user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from quest_posts
    where quest_id = _quest_id
      and author_id = _user_id
      and photo_url is not null
  );
$$;

grant execute on function has_quest_photo(uuid, uuid) to authenticated;

-- -----------------------------------------------------------
-- Done.
-- -----------------------------------------------------------
