import React, { useEffect, useState } from 'react';
import QuestCard from '../components/QuestCard.jsx';
import { getDailyQuests, getActiveQuests, acceptQuest } from '../lib/quests.js';
import { totalXP, getRank, getNextRank, CATEGORY_META } from '../lib/xp.js';

const serif = { fontFamily: "'Instrument Serif', serif", fontStyle: 'italic' };

export default function HomeScreen({ profile, onOpenQuest }) {
  const [picks, setPicks] = useState([]);
  const [active, setActive] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pull today's picks and any in-progress quests on mount and when profile changes
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [p, a] = await Promise.all([
        getDailyQuests(profile),
        getActiveQuests(profile.id)
      ]);
      if (!cancelled) {
        setPicks(p);
        setActive(a);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [profile.id]);

  const aura = totalXP(profile);
  const rank = getRank(aura);
  const nextRank = getNextRank(aura);
  const progressPct = nextRank
    ? ((aura - rank.min) / (nextRank.min - rank.min)) * 100
    : 100;

  const handleAccept = async (template) => {
    try {
      const newQuest = await acceptQuest({ templateId: template.id, ownerId: profile.id });
      setActive(a => [newQuest, ...a]);
      onOpenQuest(newQuest.id);
    } catch (e) {
      console.error('accept quest', e);
      alert('Could not accept quest: ' + (e?.message || 'unknown error'));
    }
  };

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 11) return 'Good morning';
    if (h < 17) return 'Afternoon';
    if (h < 22) return 'Evening';
    return 'Late night';
  })();

  return (
    <div className="space-y-6 pb-4">
      {/* Header */}
      <div className="pt-2">
        <p className="text-sm" style={{ color: '#a1a1aa' }}>
          {greeting}, {profile.display_name || profile.username}
        </p>
        <p className="text-[10px] uppercase tracking-[0.2em] mt-1" style={{ color: rank.color }}>
          ★ {rank.name}
        </p>
      </div>

      {/* XP hero */}
      <div
        className="rounded-3xl p-5"
        style={{
          background: 'linear-gradient(135deg, rgba(251,191,36,0.08), rgba(249,115,22,0.04))',
          border: '1px solid rgba(255,255,255,0.06)'
        }}
      >
        <div className="flex items-baseline gap-2 mb-3">
          <span style={serif} className="text-5xl leading-none">{aura.toLocaleString()}</span>
          <span className="text-xs uppercase tracking-widest" style={{ color: '#a1a1aa' }}>total xp</span>
        </div>
        <div className="h-1 rounded-full overflow-hidden mb-1" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progressPct}%`, background: rank.color }} />
        </div>
        <p className="text-[10px]" style={{ color: '#71717a' }}>
          {nextRank ? `${(nextRank.min - aura).toLocaleString()} XP to ${nextRank.name}` : 'MAX RANK'}
        </p>

        {/* Mini category dots */}
        <div className="flex gap-1.5 mt-4">
          {Object.entries(CATEGORY_META).map(([key, meta]) => {
            const v = profile['xp_' + key] || 0;
            return (
              <div key={key} className="flex-1 text-center">
                <div className="text-base mb-0.5">{meta.icon}</div>
                <p className="text-[10px]" style={{ color: '#71717a' }}>{v}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active quests */}
      {active.length > 0 && (
        <section>
          <h2 className="text-xs uppercase tracking-[0.2em] mb-3 px-1" style={{ color: '#71717a' }}>
            In progress
          </h2>
          <div className="space-y-3">
            {active.map(q => (
              <QuestCard
                key={q.id}
                template={q.template}
                quest={q}
                onClick={() => onOpenQuest(q.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Today's picks */}
      <section>
        <h2 className="text-xs uppercase tracking-[0.2em] mb-3 px-1" style={{ color: '#71717a' }}>
          Today's quests
        </h2>
        {loading ? (
          <p className="text-sm" style={{ color: '#71717a' }}>Loading…</p>
        ) : picks.length === 0 ? (
          <p className="text-sm" style={{ color: '#71717a' }}>
            No quests available — make sure seed_quests.sql was run on your Supabase project.
          </p>
        ) : (
          <div className="space-y-3">
            {picks.map(t => (
              <QuestCard key={t.id} template={t} onClick={() => handleAccept(t)} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
