import React, { useEffect, useState } from 'react';
import { ArrowLeft, Check, Lock } from 'lucide-react';
import { updateProfileCustomization, getEarnedBadges } from '../lib/progress.js';
import { BADGES, TITLES, availableTitles, getBadgeById } from '../lib/badges.js';

const serif = { fontFamily: "'Instrument Serif', serif", fontStyle: 'italic' };

const EMOJI_OPTIONS = ['🙂','😎','🔥','⚡','🌙','🌅','🏔️','🌊','🎮','📸','🎸','🚀','💀','👑','🦊','🐺','🦅','🌴','🍕','🎯','🧗','🏃'];
const COLOR_OPTIONS = ['#fbbf24','#f97316','#ef4444','#f43f5e','#ec4899','#a855f7','#8b5cf6','#6366f1','#0ea5e9','#06b6d4','#10b981','#84cc16'];

export default function ProfileCustomizeScreen({ profile, onClose, onRefresh }) {
  const [emoji, setEmoji] = useState(profile.avatar_emoji || '🙂');
  const [color, setColor] = useState(profile.avatar_color || '#fbbf24');
  const [titleId, setTitleId] = useState(profile.display_title || 'drifter');
  const [featuredBadge, setFeaturedBadge] = useState(profile.featured_badge || null);
  const [earnedBadges, setEarnedBadges] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const earned = await getEarnedBadges(profile.id);
      setEarnedBadges(earned);
      setLoading(false);
    })();
  }, [profile.id]);

  const usableTitles = availableTitles(earnedBadges);
  const usableTitleIds = new Set(usableTitles.map(t => t.id));

  const save = async () => {
    setSaving(true);
    try {
      await updateProfileCustomization(profile.id, {
        avatar_emoji: emoji,
        avatar_color: color,
        display_title: titleId,
        featured_badge: featuredBadge
      });
      await onRefresh();
      onClose();
    } catch (e) {
      alert('Could not save: ' + e.message);
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 pb-4">
      <button onClick={onClose} className="flex items-center gap-1 text-sm" style={{ color: '#a1a1aa' }}>
        <ArrowLeft size={16} /> Back
      </button>

      <div className="pt-2">
        <h1 style={serif} className="text-4xl">Customize</h1>
        <p className="text-sm" style={{ color: '#a1a1aa' }}>Make it yours.</p>
      </div>

      {/* Live preview */}
      <div className="rounded-3xl p-6 flex flex-col items-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="w-24 h-24 rounded-full flex items-center justify-center text-5xl mb-3" style={{ background: color }}>
          {emoji}
        </div>
        <p style={serif} className="text-2xl">{profile.display_name || profile.username}</p>
        <p className="text-[10px] uppercase tracking-[0.2em] mt-1" style={{ color }}>
          {usableTitles.find(t => t.id === titleId)?.label || 'Drifter'}
        </p>
      </div>

      {/* Avatar emoji */}
      <section>
        <p className="text-xs uppercase tracking-[0.2em] mb-2 px-1" style={{ color: '#71717a' }}>Avatar</p>
        <div className="grid grid-cols-8 gap-1.5">
          {EMOJI_OPTIONS.map(e => (
            <button
              key={e}
              onClick={() => setEmoji(e)}
              className="aspect-square rounded-xl text-xl flex items-center justify-center"
              style={{
                background: emoji === e ? color + '30' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${emoji === e ? color : 'rgba(255,255,255,0.08)'}`
              }}
            >
              {e}
            </button>
          ))}
        </div>
      </section>

      {/* Color */}
      <section>
        <p className="text-xs uppercase tracking-[0.2em] mb-2 px-1" style={{ color: '#71717a' }}>Color</p>
        <div className="flex flex-wrap gap-2">
          {COLOR_OPTIONS.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className="w-10 h-10 rounded-full transition-transform"
              style={{
                background: c,
                transform: color === c ? 'scale(1.15)' : 'scale(1)',
                outline: color === c ? '2px solid #fafaf9' : 'none',
                outlineOffset: '2px'
              }}
            />
          ))}
        </div>
      </section>

      {/* Title selection */}
      <section>
        <p className="text-xs uppercase tracking-[0.2em] mb-2 px-1" style={{ color: '#71717a' }}>Title</p>
        <p className="text-[10px] mb-2 px-1" style={{ color: '#71717a' }}>Unlock more by earning badges.</p>
        <div className="space-y-1.5">
          {TITLES.map(t => {
            const unlocked = usableTitleIds.has(t.id);
            const selected = titleId === t.id;
            return (
              <button
                key={t.id}
                onClick={() => unlocked && setTitleId(t.id)}
                disabled={!unlocked}
                className="w-full rounded-xl p-3 flex items-center justify-between text-left"
                style={{
                  background: selected ? color + '20' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${selected ? color : 'rgba(255,255,255,0.06)'}`,
                  opacity: unlocked ? 1 : 0.4
                }}
              >
                <span className="text-sm">{t.label}</span>
                {!unlocked ? (
                  <Lock size={14} style={{ color: '#71717a' }} />
                ) : selected ? (
                  <Check size={16} style={{ color }} />
                ) : null}
              </button>
            );
          })}
        </div>
      </section>

      {/* Featured badge */}
      <section>
        <p className="text-xs uppercase tracking-[0.2em] mb-2 px-1" style={{ color: '#71717a' }}>Featured badge</p>
        {loading ? (
          <p className="text-sm" style={{ color: '#71717a' }}>Loading…</p>
        ) : earnedBadges.length === 0 ? (
          <p className="text-sm px-1" style={{ color: '#71717a' }}>Complete quests to earn badges to feature here.</p>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => setFeaturedBadge(null)}
              className="aspect-square rounded-xl flex flex-col items-center justify-center"
              style={{
                background: featuredBadge === null ? color + '20' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${featuredBadge === null ? color : 'rgba(255,255,255,0.06)'}`
              }}
            >
              <span className="text-xs" style={{ color: '#71717a' }}>None</span>
            </button>
            {earnedBadges.map(bid => {
              const badge = getBadgeById(bid);
              if (!badge) return null;
              const selected = featuredBadge === bid;
              return (
                <button
                  key={bid}
                  onClick={() => setFeaturedBadge(bid)}
                  className="aspect-square rounded-xl flex flex-col items-center justify-center p-1"
                  style={{
                    background: selected ? color + '20' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${selected ? color : 'rgba(255,255,255,0.06)'}`
                  }}
                >
                  <span className="text-2xl">{badge.icon}</span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <button
        onClick={save}
        disabled={saving}
        className="w-full py-3.5 rounded-2xl font-medium text-sm disabled:opacity-40"
        style={{ background: 'linear-gradient(135deg, #fbbf24, #f97316)', color: '#0a0a0b' }}
      >
        {saving ? 'Saving…' : 'Save profile'}
      </button>
    </div>
  );
}
