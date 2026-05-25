-- ===========================================================
-- Sidequest — Row-Level Security policies
-- Run AFTER schema.sql in Supabase SQL editor.
-- ===========================================================

-- Enable RLS on all user-data tables
alter table profiles enable row level security;
alter table friendships enable row level security;
alter table groups enable row level security;
alter table group_members enable row level security;
alter table quest_templates enable row level security;
alter table quests enable row level security;
alter table quest_participants enable row level security;
alter table quest_posts enable row level security;
alter table post_reactions enable row level security;
alter table post_comments enable row level security;
alter table user_badges enable row level security;
alter table saved_places enable row level security;

-- PROFILES: everyone can view (so you can find friends), only owner can edit
create policy "profiles_select_all" on profiles for select using (true);
create policy "profiles_insert_own" on profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on profiles for update using (auth.uid() = id);

-- FRIENDSHIPS: you can see your own; insert/update where you're a party
create policy "friendships_select_own" on friendships for select using (
  auth.uid() = user_id or auth.uid() = friend_id
);
create policy "friendships_insert_own" on friendships for insert with check (auth.uid() = user_id);
create policy "friendships_update_own" on friendships for update using (
  auth.uid() = user_id or auth.uid() = friend_id
);
create policy "friendships_delete_own" on friendships for delete using (
  auth.uid() = user_id or auth.uid() = friend_id
);

-- GROUPS: members can view; anyone can insert (becomes owner via trigger)
create policy "groups_select_members" on groups for select using (
  exists (select 1 from group_members where group_id = groups.id and user_id = auth.uid())
);
create policy "groups_insert_any" on groups for insert with check (auth.uid() = created_by);
create policy "groups_update_owner" on groups for update using (auth.uid() = created_by);

-- GROUP MEMBERS: members of a group can see member list
create policy "group_members_select" on group_members for select using (
  exists (select 1 from group_members gm where gm.group_id = group_members.group_id and gm.user_id = auth.uid())
);
create policy "group_members_insert_self" on group_members for insert with check (auth.uid() = user_id);
create policy "group_members_delete_self" on group_members for delete using (auth.uid() = user_id);

-- QUEST TEMPLATES: everyone reads, only authenticated users insert AI-generated
create policy "qt_select_all" on quest_templates for select using (true);
create policy "qt_insert_auth" on quest_templates for insert with check (auth.uid() is not null);

-- QUESTS: viewable by owner or any group member; editable by owner
create policy "quests_select_owner_or_group" on quests for select using (
  auth.uid() = owner_id
  or (group_id is not null and exists (
    select 1 from group_members where group_id = quests.group_id and user_id = auth.uid()
  ))
);
create policy "quests_insert_own" on quests for insert with check (auth.uid() = owner_id);
create policy "quests_update_own" on quests for update using (auth.uid() = owner_id);

-- QUEST PARTICIPANTS: same visibility as the quest
create policy "qp_select" on quest_participants for select using (
  exists (select 1 from quests q where q.id = quest_participants.quest_id and (
    q.owner_id = auth.uid()
    or (q.group_id is not null and exists (select 1 from group_members where group_id = q.group_id and user_id = auth.uid()))
  ))
);
create policy "qp_insert_self" on quest_participants for insert with check (auth.uid() = user_id);
create policy "qp_update_self" on quest_participants for update using (auth.uid() = user_id);

-- POSTS: viewable by anyone with access to the quest; insertable by participants
create policy "posts_select" on quest_posts for select using (
  exists (select 1 from quests q where q.id = quest_posts.quest_id and (
    q.owner_id = auth.uid()
    or (q.group_id is not null and exists (select 1 from group_members where group_id = q.group_id and user_id = auth.uid()))
  ))
  or auth.uid() = author_id
);
create policy "posts_insert_author" on quest_posts for insert with check (auth.uid() = author_id);
create policy "posts_update_author" on quest_posts for update using (auth.uid() = author_id);
create policy "posts_delete_author" on quest_posts for delete using (auth.uid() = author_id);

-- REACTIONS: anyone who can see the post can react
create policy "reactions_select" on post_reactions for select using (true);
create policy "reactions_insert_self" on post_reactions for insert with check (auth.uid() = user_id);
create policy "reactions_delete_self" on post_reactions for delete using (auth.uid() = user_id);

-- COMMENTS: similar to posts
create policy "comments_select" on post_comments for select using (true);
create policy "comments_insert_self" on post_comments for insert with check (auth.uid() = author_id);
create policy "comments_delete_self" on post_comments for delete using (auth.uid() = author_id);

-- BADGES: viewable by all (for profile pages), insertable by system (we'll do this client-side initially)
create policy "badges_select_all" on user_badges for select using (true);
create policy "badges_insert_self" on user_badges for insert with check (auth.uid() = user_id);

-- SAVED PLACES: private to owner
create policy "places_select_own" on saved_places for select using (auth.uid() = user_id);
create policy "places_insert_own" on saved_places for insert with check (auth.uid() = user_id);
create policy "places_update_own" on saved_places for update using (auth.uid() = user_id);
create policy "places_delete_own" on saved_places for delete using (auth.uid() = user_id);
