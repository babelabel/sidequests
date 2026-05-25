// XP/rank/badge logic — pure functions, no React.

export const CATEGORIES = ['adventure', 'social', 'fitness', 'creativity', 'exploration'];

export const CATEGORY_META = {
  adventure:   { label: 'Adventure',   icon: '⚡', color: '#f97316', gradient: 'linear-gradient(135deg, #f97316, #ef4444)' },
  social:      { label: 'Social',      icon: '🔥', color: '#f43f5e', gradient: 'linear-gradient(135deg, #f43f5e, #ec4899)' },
  fitness:     { label: 'Fitness',     icon: '💪', color: '#10b981', gradient: 'linear-gradient(135deg, #10b981, #06b6d4)' },
  creativity:  { label: 'Creativity',  icon: '🎨', color: '#a855f7', gradient: 'linear-gradient(135deg, #a855f7, #6366f1)' },
  exploration: { label: 'Exploration', icon: '🧭', color: '#0ea5e9', gradient: 'linear-gradient(135deg, #0ea5e9, #8b5cf6)' }
};

export const RANKS = [
  { min: 0,      name: 'Drifter',             color: '#71717a' },
  { min: 500,    name: 'Wanderer',            color: '#10b981' },
  { min: 1500,   name: 'Trailblazer',         color: '#0ea5e9' },
  { min: 4000,   name: 'Voyager',             color: '#a855f7' },
  { min: 10000,  name: 'Pathfinder',          color: '#f59e0b' },
  { min: 25000,  name: 'Sovereign of Summer', color: '#fbbf24' }
];

export const RARITY_MULTIPLIER = {
  common: 1,
  rare: 1.5,
  epic: 2.5,
  legendary: 5
};

export function totalXP(profile) {
  if (!profile) return 0;
  return (profile.xp_adventure || 0)
    + (profile.xp_social || 0)
    + (profile.xp_fitness || 0)
    + (profile.xp_creativity || 0)
    + (profile.xp_exploration || 0);
}

export function getRank(xp) {
  for (let i = RANKS.length - 1; i >= 0; i--) if (xp >= RANKS[i].min) return RANKS[i];
  return RANKS[0];
}

export function getNextRank(xp) {
  const next = RANKS.find(r => xp < r.min);
  return next || null;
}

// Streak multiplier — kicks in at 7 days
export function streakMultiplier(streak) {
  if (streak >= 30) return 2.0;
  if (streak >= 14) return 1.5;
  if (streak >= 7)  return 1.2;
  return 1.0;
}

/**
 * Compute final XP for completing a quest.
 * Takes base reward, applies rarity, streak, and group bonus.
 */
export function computeXP({ baseReward, rarity = 'common', streak = 0, groupSize = 1 }) {
  let xp = baseReward * (RARITY_MULTIPLIER[rarity] || 1);
  xp *= streakMultiplier(streak);
  if (groupSize >= 3) xp *= 1.25;
  return Math.round(xp);
}
