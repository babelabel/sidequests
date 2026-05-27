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
 * Accept a quest — creates a `quests` row.
 * Solo quests start in 'active' status (need to be explicitly started to begin timer).
 * Group quests start in 'pending_group_consent' — all members must confirm before timer starts.
 */
export async function acceptQuest({ templateId, ownerId, groupId = null }) {
  // Group flow: use the RPC that handles members + RLS + consent
  if (groupId) {
    const { data: questId, error } = await supabase.rpc('accept_quest_for_group', {
      _template_id: templateId,
      _group_id: groupId
    });
    if (error) throw error;
    const { data: full } = await supabase
      .from('quests')
      .select('*, template:quest_templates(*)')
      .eq('id', questId)
      .single();
    return full;
  }

  // Solo flow — status 'active' means accepted but not started yet
  const { data, error } = await supabase
    .from('quests')
    .insert({ template_id: templateId, owner_id: ownerId, group_id: null, status: 'active' })
    .select('*, template:quest_templates(*)')
    .single();
  if (error) throw error;

  const { error: pErr } = await supabase
    .from('quest_participants')
    .insert({ quest_id: data.id, user_id: ownerId, has_confirmed: true, confirmed_at: new Date().toISOString() });
  if (pErr) console.warn('quest_participants insert (non-fatal):', pErr);

  return data;
}

/**
 * Start a quest — this begins the timer. Sets started_at and deadline_at.
 * For group quests, this is called automatically when the last member confirms.
 * For solo quests, called when the user taps "Start".
 * Returns the new deadline_at timestamp.
 */
export async function startQuest(questId) {
  const { data, error } = await supabase.rpc('start_quest', { _quest_id: questId });
  if (error) throw error;
  return data;
}

/**
 * Confirm participation in a group quest. Returns true if this confirmation
 * was the final one (quest auto-started); false if still waiting.
 */
export async function confirmParticipation(questId) {
  const { data, error } = await supabase.rpc('confirm_quest_participation', { _quest_id: questId });
  if (error) throw error;
  return data;  // true = started, false = still waiting
}

/**
 * Get user's in-progress quests (all statuses: active, pending_group_consent, started).
 * Auto-expires overdue ones in the background.
 */
export async function getActiveQuests(userId) {
  // Expire overdue quests first (cheap RPC call)
  supabase.rpc('expire_overdue_quests').then(() => {}, () => {});

  // Pull all participating quests, not just owned ones (so group members see them too)
  const { data, error } = await supabase
    .from('quest_participants')
    .select('quest:quests(*, template:quest_templates(*)), has_confirmed')
    .eq('user_id', userId);

  if (error) {
    console.error('active quests', error);
    return [];
  }

  // Filter to in-progress quests only and flatten
  const quests = (data || [])
    .map(row => ({ ...row.quest, my_has_confirmed: row.has_confirmed }))
    .filter(q => q && ['active', 'pending_group_consent', 'started'].includes(q.status))
    .sort((a, b) => (b.started_at || b.accepted_at).localeCompare(a.started_at || a.accepted_at));

  return quests;
}

/**
 * Complete a quest. REQUIRES a photo post to exist for this quest by this user.
 * Returns total XP earned. Throws if no photo exists.
 */
export async function completeQuest({ quest, userId, profile }) {
  // Verify photo exists — server-side check via the helper function
  const { data: hasPhoto, error: chkErr } = await supabase.rpc('has_quest_photo', {
    _quest_id: quest.id, _user_id: userId
  });
  if (chkErr) throw chkErr;
  if (!hasPhoto) throw new Error('Upload a photo first');

  const template = quest.template;
  const xpEarned = computeXP({
    baseReward: template.xp_reward,
    rarity: template.rarity,
    streak: profile.current_streak || 0,
    groupSize: quest.group_id ? 3 : 1
  });

  await supabase
    .from('quests')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', quest.id);

  const xpField = 'xp_' + template.category;
  const currentXP = profile[xpField] || 0;
  await supabase
    .from('profiles')
    .update({
      [xpField]: currentXP + xpEarned,
      last_active_date: new Date().toISOString().slice(0, 10)
    })
    .eq('id', userId);

  return xpEarned;
}
