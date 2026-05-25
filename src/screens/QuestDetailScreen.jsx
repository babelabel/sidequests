import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import { completeQuest } from '../lib/quests.js';
import { CATEGORY_META } from '../lib/xp.js';

const serif = { fontFamily: "'Instrument Serif', serif", fontStyle: 'italic' };

export default function QuestDetailScreen({ questId, profile, onClose, onCompleted }) {
  const [quest, setQuest] = useState(null);
  const [completing, setCompleting] = useState(false);
  const [xpEarned, setXpEarned] = useState(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('quests')
        .select('*, template:quest_templates(*)')
        .eq('id', questId)
        .single();
      setQuest(data);
    })();
  }, [questId]);

  if (!quest) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: '#0a0a0b', color: '#fafaf9' }}>
        <p style={serif} className="text-2xl">loading…</p>
      </div>
    );
  }

  const t = quest.template;
  const meta = CATEGORY_META[t.category] || CATEGORY_META.adventure;

  const handleComplete = async () => {
    setCompleting(true);
    try {
      const earned = await completeQuest({ quest, userId: profile.id, profile });
      setXpEarned(earned);
      setTimeout(() => onCompleted(), 2000);
    } catch (e) {
      console.error(e);
      alert('Could not complete quest. Check console.');
      setCompleting(false);
    }
  };

  // Success screen after completion
  if (xpEarned !== null) {
    return (
      <div
        className="fixed inset-0 flex flex-col items-center justify-center px-6"
        style={{
          background: meta.gradient,
          color: '#fff'
        }}
      >
        <div className="text-7xl mb-4">✨</div>
        <h1 style={serif} className="text-5xl mb-2 text-center">Quest complete</h1>
        <p style={serif} className="text-3xl mb-1">+{xpEarned} XP</p>
        <p className="text-sm text-white/80">{meta.label}</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 overflow-y-auto" style={{ background: '#0a0a0b', color: '#fafaf9' }}>
      {/* Hero section with category gradient */}
      <div className="px-5 pt-6 pb-8" style={{ background: meta.gradient, position: 'relative' }}>
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.3)', color: '#fff' }}
        >
          <X size={18} />
        </button>

        <span className="text-[10px] uppercase tracking-[0.3em] px-2 py-1 rounded-full" style={{ background: 'rgba(0,0,0,0.3)' }}>
          {meta.icon} {meta.label}
        </span>

        {t.rarity !== 'common' && (
          <span
            className="ml-2 text-[10px] uppercase tracking-[0.3em] px-2 py-1 rounded-full"
            style={{
              background: t.rarity === 'legendary' ? '#fbbf24' : t.rarity === 'epic' ? '#a855f7' : '#0ea5e9',
              color: t.rarity === 'legendary' ? '#0a0a0b' : '#fff'
            }}
          >
            {t.rarity}
          </span>
        )}

        <h1 style={serif} className="text-5xl leading-tight mt-4 text-white">{t.title}</h1>
      </div>

      {/* Body */}
      <div className="px-5 py-6 max-w-2xl mx-auto space-y-5">
        <p className="text-base leading-relaxed">{t.description}</p>

        {t.location_hint && (
          <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="text-[10px] uppercase tracking-[0.2em] mb-1" style={{ color: '#71717a' }}>Where</p>
            <p className="text-sm">📍 {t.location_hint}</p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <p className="text-[10px] uppercase tracking-widest" style={{ color: '#71717a' }}>Time</p>
            <p style={serif} className="text-2xl mt-1">{t.estimated_minutes}m</p>
          </div>
          <div className="rounded-2xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <p className="text-[10px] uppercase tracking-widest" style={{ color: '#71717a' }}>XP</p>
            <p style={serif} className="text-2xl mt-1" >+{t.xp_reward}</p>
          </div>
          <div className="rounded-2xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <p className="text-[10px] uppercase tracking-widest" style={{ color: '#71717a' }}>Mode</p>
            <p style={serif} className="text-2xl mt-1">{t.mode}</p>
          </div>
        </div>

        {t.tags && t.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {t.tags.map(tag => (
              <span key={tag} className="text-[10px] px-2 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.05)', color: '#a1a1aa' }}>
                #{tag}
              </span>
            ))}
          </div>
        )}

        <button
          onClick={handleComplete}
          disabled={completing}
          className="w-full py-4 rounded-2xl font-medium transition-transform active:scale-95 disabled:opacity-50"
          style={{ background: meta.gradient, color: '#fff' }}
        >
          {completing ? 'Completing…' : '✓ Mark as completed'}
        </button>

        <p className="text-[10px] text-center" style={{ color: '#71717a' }}>
          Photo upload + group sync coming in Wave 3.
        </p>
      </div>
    </div>
  );
}
