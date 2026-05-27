-- ===========================================================
-- Sidequest — Wave 3 migration
-- Adds: photo storage bucket, feed view, location columns on places.
-- Run AFTER wave2_migration.sql.
-- Safe to re-run.
-- ===========================================================

-- -----------------------------------------------------------
-- 1. STORAGE BUCKET for quest photos
-- -----------------------------------------------------------

-- Create public bucket if it doesn't exist
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('quest_photos', 'quest_photos', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg','image/png','image/webp'];

-- Storage RLS — only authenticated users can upload, only to their own folder
drop policy if exists "Quest photo upload own folder" on storage.objects;
create policy "Quest photo upload own folder"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'quest_photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Quest photos publicly readable" on storage.objects;
create policy "Quest photos publicly readable"
on storage.objects for select to public
using (bucket_id = 'quest_photos');

drop policy if exists "Quest photo delete own" on storage.objects;
create policy "Quest photo delete own"
on storage.objects for delete to authenticated
using (
  bucket_id = 'quest_photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- -----------------------------------------------------------
-- 2. FEED QUERY — get posts visible to current user
-- A post is visible if:
--   - You are the author
--   - You are friends with the author
--   - You are in the same group as the post's quest
-- Implemented as a SECURITY DEFINER function for performance.
-- -----------------------------------------------------------

create or replace function get_feed(_limit int default 50, _offset int default 0)
returns table (
  post_id uuid,
  quest_id uuid,
  author_id uuid,
  author_username text,
  author_display_name text,
  photo_url text,
  caption text,
  location_name text,
  lat float,
  lng float,
  created_at timestamptz,
  quest_title text,
  quest_category text,
  quest_xp_reward int,
  reaction_count int,
  comment_count int,
  my_reactions text[]
)
language sql
security definer
set search_path = public
as $$
  select
    qp.id as post_id,
    qp.quest_id,
    qp.author_id,
    p.username as author_username,
    p.display_name as author_display_name,
    qp.photo_url,
    qp.caption,
    qp.location_name,
    qp.lat,
    qp.lng,
    qp.created_at,
    qt.title as quest_title,
    qt.category as quest_category,
    qt.xp_reward as quest_xp_reward,
    (select count(*)::int from post_reactions r where r.post_id = qp.id) as reaction_count,
    (select count(*)::int from post_comments c where c.post_id = qp.id) as comment_count,
    coalesce(
      array(select emoji from post_reactions r where r.post_id = qp.id and r.user_id = auth.uid()),
      '{}'::text[]
    ) as my_reactions
  from quest_posts qp
  join profiles p on p.id = qp.author_id
  join quests q on q.id = qp.quest_id
  join quest_templates qt on qt.id = q.template_id
  where
    -- visible to me: I'm the author
    qp.author_id = auth.uid()
    -- or I'm friends with the author
    or exists (
      select 1 from friendships f
      where f.user_id = auth.uid() and f.friend_id = qp.author_id and f.status = 'accepted'
    )
    -- or I'm in the same group as the quest
    or (q.group_id is not null and is_group_member(q.group_id, auth.uid()))
  order by qp.created_at desc
  limit _limit
  offset _offset;
$$;

grant execute on function get_feed(int, int) to authenticated;

-- -----------------------------------------------------------
-- 3. MAP QUERY — return all posts with location for my viewable feed
-- -----------------------------------------------------------

create or replace function get_map_pins(_user_id uuid default null)
returns table (
  post_id uuid,
  quest_id uuid,
  author_id uuid,
  author_username text,
  photo_url text,
  caption text,
  location_name text,
  lat float,
  lng float,
  created_at timestamptz,
  quest_title text,
  quest_category text
)
language sql
security definer
set search_path = public
as $$
  select
    qp.id, qp.quest_id, qp.author_id, p.username,
    qp.photo_url, qp.caption, qp.location_name, qp.lat, qp.lng, qp.created_at,
    qt.title, qt.category
  from quest_posts qp
  join profiles p on p.id = qp.author_id
  join quests q on q.id = qp.quest_id
  join quest_templates qt on qt.id = q.template_id
  where qp.lat is not null and qp.lng is not null
  and (
    case
      when _user_id is not null then qp.author_id = _user_id
      else (
        qp.author_id = auth.uid()
        or exists (select 1 from friendships f where f.user_id = auth.uid() and f.friend_id = qp.author_id and f.status = 'accepted')
        or (q.group_id is not null and is_group_member(q.group_id, auth.uid()))
      )
    end
  )
  order by qp.created_at desc;
$$;

grant execute on function get_map_pins(uuid) to authenticated;

-- -----------------------------------------------------------
-- 4. TOGGLE REACTION — add or remove a reaction atomically
-- -----------------------------------------------------------

create or replace function toggle_reaction(_post_id uuid, _emoji text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  _exists boolean;
begin
  select exists(
    select 1 from post_reactions
    where post_id = _post_id and user_id = auth.uid() and emoji = _emoji
  ) into _exists;

  if _exists then
    delete from post_reactions
    where post_id = _post_id and user_id = auth.uid() and emoji = _emoji;
    return false;
  else
    insert into post_reactions (post_id, user_id, emoji)
    values (_post_id, auth.uid(), _emoji);
    return true;
  end if;
end;
$$;

grant execute on function toggle_reaction(uuid, text) to authenticated;

-- -----------------------------------------------------------
-- 5. GET COMMENTS FOR A POST (with author info)
-- -----------------------------------------------------------

create or replace function get_post_comments(_post_id uuid)
returns table (
  id uuid,
  author_id uuid,
  author_username text,
  author_display_name text,
  body text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select c.id, c.author_id, p.username, p.display_name, c.body, c.created_at
  from post_comments c
  join profiles p on p.id = c.author_id
  where c.post_id = _post_id
  order by c.created_at asc;
$$;

grant execute on function get_post_comments(uuid) to authenticated;

-- -----------------------------------------------------------
-- Done. Verify with:
--   select * from get_feed(10, 0);
-- Should return 0 rows initially (no posts yet) but no errors.
-- -----------------------------------------------------------
