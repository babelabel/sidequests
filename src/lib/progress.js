import { supabase } from './supabase.js';
import { computeEarnedBadges } from './badges.js';

// ============================================================
// LEADERBOARD
// ============================================================

export async function getGlobalLeaderboard(limit = 10) {
  const { data, error } = await supabase.rpc('get_global_leaderboard', { _limit: limit });
  if (error) {
    console.error('leaderboard', error);
    return [];
  }
  return data || [];
}

export async function getMyRank() {
  const { data, error } = await supabase.rpc('get_my_rank');
  if (error) {
    console.error('my rank', error);
    return null;
  }
  return data;
}

// ============================================================
// BADGES
// ============================================================

/**
 * Compute the player's current badge stats, figure out which badges are
 * newly earned, persist them, and return the full earned set.
 */
export async function syncBadges(profile) {
  // Pull stats from the server
  const { data: statsRows, error } = await supabase.rpc('get_my_badge_stats');
  if (error) {
    console.error('badge stats', error);
    return [];
  }
  const row = (statsRows && statsRows[0]) || {};

  const stats = {
    completedCount: Number(row.completed_count || 0),
    photoCount: Number(row.photo_count || 0),
    rareCount: Number(row.rare_count || 0),
    epicCount: Number(row.epic_count || 0),
    legendaryCount: Number(row.legendary_count || 0),
    groupCompletedCount: Number(row.group_completed_count || 0),
    nightCount: Number(row.night_count || 0),
    morningCount: Number(row.morning_count || 0),
    friendCount: Number(row.friend_count || 0),
    reactionsReceived: Number(row.reactions_received || 0),
    bestStreak: profile.best_streak || 0,
    xp: {
      adventure: profile.xp_adventure || 0,
      social: profile.xp_social || 0,
      fitness: profile.xp_fitness || 0,
      creativity: profile.xp_creativity || 0,
      exploration: profile.xp_exploration || 0
    }
  };

  const earned = computeEarnedBadges(stats);

  // Persist each earned badge (award_badge is idempotent)
  await Promise.all(earned.map(badgeId =>
    supabase.rpc('award_badge', { _badge_id: badgeId }).then(() => {}, () => {})
  ));

  return earned;
}

/**
 * Get badges already persisted for a user.
 */
export async function getEarnedBadges(userId) {
  const { data, error } = await supabase
    .from('user_badges')
    .select('badge_id, earned_at')
    .eq('user_id', userId);
  if (error) {
    console.error('earned badges', error);
    return [];
  }
  return (data || []).map(r => r.badge_id);
}

// ============================================================
// PROFILE CUSTOMIZATION
// ============================================================

export async function updateProfileCustomization(userId, { avatar_emoji, avatar_color, display_title, featured_badge }) {
  const patch = {};
  if (avatar_emoji !== undefined) patch.avatar_emoji = avatar_emoji;
  if (avatar_color !== undefined) patch.avatar_color = avatar_color;
  if (display_title !== undefined) patch.display_title = display_title;
  if (featured_badge !== undefined) patch.featured_badge = featured_badge;

  const { error } = await supabase.from('profiles').update(patch).eq('id', userId);
  if (error) throw error;
}
