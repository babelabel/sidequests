// Badge + title definitions. Pure data, no React.
// Badges are achievements. Titles are display names unlocked by achievements.

export const BADGES = [
  // Getting started
  { id: 'first_quest',   name: 'First Step',       icon: '👣', desc: 'Complete your first quest', check: s => s.completedCount >= 1 },
  { id: 'first_photo',   name: 'Say Cheese',       icon: '📸', desc: 'Post your first quest photo', check: s => s.photoCount >= 1 },

  // Volume
  { id: 'quests_10',     name: 'Getting Serious',  icon: '🎯', desc: 'Complete 10 quests', check: s => s.completedCount >= 10 },
  { id: 'quests_25',     name: 'Quest Machine',    icon: '⚙️', desc: 'Complete 25 quests', check: s => s.completedCount >= 25 },
  { id: 'quests_50',     name: 'Unstoppable',      icon: '🚀', desc: 'Complete 50 quests', check: s => s.completedCount >= 50 },

  // Category mastery
  { id: 'adventure_5',   name: 'Urban Explorer',   icon: '🏙️', desc: '1000 Adventure XP', check: s => s.xp.adventure >= 1000 },
  { id: 'social_5',      name: 'Social Beast',     icon: '🦁', desc: '1000 Social XP', check: s => s.xp.social >= 1000 },
  { id: 'fitness_5',     name: 'Iron Will',        icon: '🏋️', desc: '1000 Fitness XP', check: s => s.xp.fitness >= 1000 },
  { id: 'creative_5',    name: 'Frame Catcher',    icon: '🎞️', desc: '1000 Creativity XP', check: s => s.xp.creativity >= 1000 },
  { id: 'explore_5',     name: 'Café Hunter',      icon: '☕', desc: '1000 Exploration XP', check: s => s.xp.exploration >= 1000 },

  // Streaks
  { id: 'streak_7',      name: 'A Week of Yes',    icon: '🔥', desc: '7-day streak', check: s => s.bestStreak >= 7 },
  { id: 'streak_30',     name: 'Summer Loyalist',  icon: '☀️', desc: '30-day streak', check: s => s.bestStreak >= 30 },

  // Rarity
  { id: 'rare_1',        name: 'Lucky',            icon: '🍀', desc: 'Complete a Rare quest', check: s => s.rareCount >= 1 },
  { id: 'epic_1',        name: 'Epic Moment',      icon: '💎', desc: 'Complete an Epic quest', check: s => s.epicCount >= 1 },
  { id: 'legendary_1',   name: 'Touched by Legend',icon: '⭐', desc: 'Complete a Legendary quest', check: s => s.legendaryCount >= 1 },

  // Social graph
  { id: 'friends_5',     name: 'Squad Assembled',  icon: '👥', desc: 'Have 5 friends', check: s => s.friendCount >= 5 },
  { id: 'group_quest',   name: 'Team Player',      icon: '🤝', desc: 'Complete a group quest', check: s => s.groupCompletedCount >= 1 },

  // Time of day
  { id: 'night_owl',     name: 'Night Walker',     icon: '🌙', desc: 'Complete 5 nighttime quests', check: s => s.nightCount >= 5 },
  { id: 'early_bird',    name: 'Dawn Chaser',      icon: '🌅', desc: 'Complete 3 morning quests', check: s => s.morningCount >= 3 },

  // Reactions received
  { id: 'popular_1',     name: 'Crowd Favorite',   icon: '💫', desc: 'Get 25 reactions on your posts', check: s => s.reactionsReceived >= 25 }
];

// Titles — unlocked by earning specific badges, displayable on profile.
// Each maps to a badge id (or a special condition).
export const TITLES = [
  { id: 'drifter',        label: 'Drifter',          requires: null },          // default, always available
  { id: 'urban_explorer', label: 'Urban Explorer',   requires: 'adventure_5' },
  { id: 'social_beast',   label: 'Social Beast',     requires: 'social_5' },
  { id: 'iron_will',      label: 'Iron Will',        requires: 'fitness_5' },
  { id: 'frame_catcher',  label: 'Frame Catcher',    requires: 'creative_5' },
  { id: 'cafe_hunter',    label: 'Café Hunter',      requires: 'explore_5' },
  { id: 'night_walker',   label: 'Night Walker',     requires: 'night_owl' },
  { id: 'dawn_chaser',    label: 'Dawn Chaser',      requires: 'early_bird' },
  { id: 'quest_machine',  label: 'Quest Machine',    requires: 'quests_25' },
  { id: 'unstoppable',    label: 'Unstoppable',      requires: 'quests_50' },
  { id: 'summer_loyalist',label: 'Summer Loyalist',  requires: 'streak_30' },
  { id: 'legend',         label: 'Touched by Legend',requires: 'legendary_1' },
  { id: 'crowd_favorite', label: 'Crowd Favorite',   requires: 'popular_1' }
];

/**
 * Given a player's stats, return the list of badge ids they qualify for.
 */
export function computeEarnedBadges(stats) {
  return BADGES.filter(b => {
    try { return b.check(stats); } catch { return false; }
  }).map(b => b.id);
}

/**
 * Given the set of earned badge ids, return the title ids the player can use.
 */
export function availableTitles(earnedBadgeIds) {
  const earned = new Set(earnedBadgeIds);
  return TITLES.filter(t => t.requires === null || earned.has(t.requires));
}

export function getBadgeById(id) {
  return BADGES.find(b => b.id === id);
}

export function getTitleById(id) {
  return TITLES.find(t => t.id === id);
}
