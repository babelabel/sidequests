import React from 'react';
import { CATEGORY_META } from '../lib/xp.js';

const serif = { fontFamily: "'Instrument Serif', serif", fontStyle: 'italic' };

/**
 * QuestCard — the visual unit for a quest template.
 * Used on the home screen (today's picks), explore screen, and lists.
 * If `quest` is provided (an instance), shows the instance state.
 */
export default function QuestCard({ template, quest, onClick }) {
  const t = template;
  const meta = CATEGORY_META[t.category] || CATEGORY_META.adventure;
  const isCompleted = quest?.status === 'completed';
  const isStarted = quest?.status === 'started';
  const isPending = quest?.status === 'pending_group_consent';
  const isExpired = quest?.status === 'expired';

  // Compute time remaining for started quests
  let remainingLabel = null;
  if (isStarted && quest?.deadline_at) {
    const ms = new Date(quest.deadline_at).getTime() - Date.now();
    if (ms > 0) {
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      remainingLabel = h > 0 ? `${h}h ${m}m left` : `${m}m left`;
    } else {
      remainingLabel = 'Expired';
    }
  }

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-3xl overflow-hidden transition-transform active:scale-[0.98] block"
      style={{
        background: meta.gradient,
        boxShadow: `0 12px 32px -8px ${meta.color}40`,
        opacity: isCompleted || isExpired ? 0.5 : 1
      }}
    >
      <div
        className="p-5 relative"
        style={{
          background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.45) 100%)',
          minHeight: '180px'
        }}
      >
        {/* Top row: category chip + status */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] uppercase tracking-[0.2em] px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)' }}>
            {meta.icon} {meta.label}
          </span>
          {isStarted && remainingLabel ? (
            <span className="text-[10px] uppercase tracking-[0.2em] px-2 py-0.5 rounded-full font-medium" style={{ background: '#fbbf24', color: '#0a0a0b' }}>
              ⏱ {remainingLabel}
            </span>
          ) : isPending ? (
            <span className="text-[10px] uppercase tracking-[0.2em] px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(255,255,255,0.9)', color: '#0a0a0b' }}>
              awaiting group
            </span>
          ) : isExpired ? (
            <span className="text-[10px] uppercase tracking-[0.2em] px-2 py-0.5 rounded-full font-medium" style={{ background: '#7f1d1d', color: '#fff' }}>
              expired
            </span>
          ) : t.rarity && t.rarity !== 'common' && (
            <span
              className="text-[10px] uppercase tracking-[0.2em] px-2 py-0.5 rounded-full font-medium"
              style={{
                background: t.rarity === 'legendary' ? '#fbbf24' : t.rarity === 'epic' ? '#a855f7' : '#0ea5e9',
                color: t.rarity === 'legendary' ? '#0a0a0b' : '#fff'
              }}
            >
              {t.rarity}
            </span>
          )}
        </div>

        <h3 style={serif} className="text-3xl leading-tight mb-2 text-white">
          {t.title}
        </h3>

        <p className="text-sm leading-snug mb-4 text-white/85 line-clamp-2">
          {t.description}
        </p>

        <div className="flex items-center gap-3 text-[11px] text-white/90">
          <span className="flex items-center gap-1">⏱ {t.estimated_minutes}min</span>
          <span className="flex items-center gap-1">✨ +{t.xp_reward} XP</span>
          {t.mode !== 'solo' && (
            <span className="px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.18)' }}>
              {t.mode === 'duo' ? 'duo' : 'group'}
            </span>
          )}
        </div>

        {isCompleted && (
          <div className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center bg-white text-black font-bold">
            ✓
          </div>
        )}
      </div>
    </button>
  );
}
