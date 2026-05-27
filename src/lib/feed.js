import { supabase } from './supabase.js';

/**
 * Fetch the feed visible to the current user.
 * Returns an array of post objects with author + quest info pre-joined.
 */
export async function getFeed({ limit = 50, offset = 0 } = {}) {
  const { data, error } = await supabase.rpc('get_feed', { _limit: limit, _offset: offset });
  if (error) {
    console.error('getFeed', error);
    return [];
  }
  return data || [];
}

/**
 * Fetch only the current user's own posts (for memories/profile view).
 */
export async function getMyPosts(userId) {
  const { data, error } = await supabase
    .from('quest_posts')
    .select('*, quest:quests(template:quest_templates(*))')
    .eq('author_id', userId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('getMyPosts', error);
    return [];
  }
  return data || [];
}

/**
 * Fetch all geotagged posts visible to the user for the map view.
 */
export async function getMapPins(userId = null) {
  const { data, error } = await supabase.rpc('get_map_pins', { _user_id: userId });
  if (error) {
    console.error('getMapPins', error);
    return [];
  }
  return data || [];
}

/**
 * Toggle a reaction on a post. Returns true if added, false if removed.
 */
export async function toggleReaction(postId, emoji) {
  const { data, error } = await supabase.rpc('toggle_reaction', { _post_id: postId, _emoji: emoji });
  if (error) throw error;
  return data;
}

/**
 * Get comments for a post (author info included).
 */
export async function getPostComments(postId) {
  const { data, error } = await supabase.rpc('get_post_comments', { _post_id: postId });
  if (error) {
    console.error('getPostComments', error);
    return [];
  }
  return data || [];
}

/**
 * Add a comment to a post.
 */
export async function addComment(postId, body) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const { data, error } = await supabase
    .from('post_comments')
    .insert({ post_id: postId, author_id: user.id, body: body.trim() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Delete one of your own posts. Cascades to reactions and comments via FK.
 */
export async function deletePost(postId) {
  const { error } = await supabase.from('quest_posts').delete().eq('id', postId);
  if (error) throw error;
}
