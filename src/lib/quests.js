import { supabase } from './supabase.js';
import { computeXP } from './xp.js';

/**
 * Get today's quest picks for a user.
 * Strategy:
 *   - Filter out quest templates the user has already completed in last 30 days
 *   - Prefer categories where the user's XP is lowest (to encourage balance)
 *   - Time-of-day weighting: nighttime quests after 18:00, morning ones before 10:00
 *   - Returns 3 quests, deterministic for the day so refreshing doesn't shuffle
 */
export async function getDailyQuests(profile) {
  if (!profile) return [];

  // Pull all curated templates
  const { data: templates, error } = await supabase
    .from('quest_templates')
    .select('*')
    .eq('is_curated', true);

  if (error || !templates) {
    console.error('quest templates fetch', error);
    return [];
  }

  // Find what they've completed recently
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const { data: recent } = await supabase
    .from('quests')
    .select('template_id')
    .eq('owner_id', profile.id)
    .eq('status', 'completed')
    .gte('completed_at', since);
  const recentTemplateIds = new Set((recent || []).map(r => r.template_id));

  // Score each template
  const hour = new Date().getHours();
  const isNight = hour >= 18 || hour < 6;
  const isMorning = hour >= 5 && hour < 10;

  // Find user's weakest category
  const cats = ['adventure','social','fitness','creativity','exploration'];
  const xps = cats.map(c => ({ cat: c, xp: profile['xp_' + c] || 0 }));
  xps.sort((a,b) => a.xp - b.xp);
  const weakest = xps[0].cat;

  const scored = templates
    .filter(t => !recentTemplateIds.has(t.id))
    .map(t => {
      let score = 0;
      if (t.category === weakest) score += 30;
      if (isNight && t.tags?.includes('nighttime')) score += 25;
      if (isMorning && t.tags?.includes('morning')) score += 25;
      if (!isNight && t.tags?.includes('nighttime')) score -= 40;
      // Light randomness, seeded by date so it's stable per day
      const dateSeed = new Date().toISOString().slice(0,10).split('-').reduce((a,b)=>a+parseInt(b,10),0);
      const idHash = t.id.split('').reduce((s,c) => s + c.charCodeAt(0), 0);
      score += ((idHash + dateSeed) % 50);
      return { template: t, score };
    });

  scored.sort((a,b) => b.score - a.score);

  // Take top 3 ensuring some category diversity
  const picks = [];
  const usedCategories = new Set();
  for (const { template } of scored) {
    if (picks.length >= 3) break;
    if (picks.length < 2 && usedCategories.has(template.category)) continue;
    picks.push(template);
    usedCategories.add(template.category);
  }
  // Fill if we ended up short
  while (picks.length < 3 && scored.length > picks.length) {
    const next = scored[picks.length].template;
    if (!picks.find(p => p.id === next.id)) picks.push(next);
  }

  return picks;
}

/**
 * Accept a quest — creates a `quests` row for the user (and optionally a group).
 * Expires in 48 hours by default.
 */
export async function acceptQuest({ templateId, ownerId, groupId = null, expiresInHours = 48 }) {
  const expiresAt = new Date(Date.now() + expiresInHours * 3600 * 1000).toISOString();
  const { data, error } = await supabase
    .from('quests')
    .insert({ template_id: templateId, owner_id: ownerId, group_id: groupId, expires_at: expiresAt })
    .select('*, template:quest_templates(*)')
    .single();
  if (error) throw error;

  // Add the owner as a participant
  await supabase
    .from('quest_participants')
    .insert({ quest_id: data.id, user_id: ownerId });

  return data;
}

/**
 * Get user's active (in-progress) quests.
 */
export async function getActiveQuests(userId) {
  const { data, error } = await supabase
    .from('quests')
    .select('*, template:quest_templates(*)')
    .eq('owner_id', userId)
    .eq('status', 'active')
    .order('accepted_at', { ascending: false });
  if (error) {
    console.error('active quests', error);
    return [];
  }
  return data || [];
}

/**
 * Complete a quest — marks the quest done, awards XP to all participants.
 * Returns total XP earned by the calling user.
 */
export async function completeQuest({ quest, userId, profile }) {
  const template = quest.template;
  const xpEarned = computeXP({
    baseReward: template.xp_reward,
    rarity: template.rarity,
    streak: profile.current_streak || 0,
    groupSize: quest.group_id ? 3 : 1 // TODO: fetch actual member count
  });

  // Mark quest completed
  await supabase
    .from('quests')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', quest.id);

  // Award XP to the profile in the relevant category
  const xpField = 'xp_' + template.category;
  const currentXP = profile[xpField] || 0;
  await supabase
    .from('profiles')
    .update({
      [xpField]: currentXP + xpEarned,
      last_active_date: new Date().toISOString().slice(0,10)
    })
    .eq('id', userId);

  // TODO: streak update logic, badge checks, group-member XP propagation
  return xpEarned;
}
