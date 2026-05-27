import React, { useEffect, useState } from 'react';
import { Users, User } from 'lucide-react';
import { CATEGORY_META } from '../lib/xp.js';
import { getMyGroups } from '../lib/friends.js';
import { acceptQuest } from '../lib/quests.js';

const serif = { fontFamily: "'Instrument Serif', serif", fontStyle: 'italic' };

/**
 * AcceptQuestModal — appears when user taps a non-accepted quest.
 * Lets them choose: solo, or with one of their groups.
 * If user is in zero groups, skip the modal and accept solo directly.
 */
export default function AcceptQuestModal({ template, profile, onAccepted, onClose }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const meta = CATEGORY_META[template.category] || CATEGORY_META.adventure;

  useEffect(() => {
    (async () => {
      const g = await getMyGroups(profile.id);
      setGroups(g);
      setLoading(false);

      // If no groups, just accept solo immediately — no need for the modal
      if (g.length === 0) {
        try {
          const q = await acceptQuest({ templateId: template.id, ownerId: profile.id });
          onAccepted(q);
        } catch (e) {
          alert('Could not accept: ' + (e?.message || 'unknown'));
          onClose();
        }
      }
    })();
  }, [profile.id]);

  const accept = async (groupId = null) => {
    setAccepting(true);
    try {
      const q = await acceptQuest({
        templateId: template.id,
        ownerId: profile.id,
        groupId
      });
      onAccepted(q);
    } catch (e) {
      alert('Could not accept: ' + (e?.message || 'unknown'));
      setAccepting(false);
    }
  };

  // Don't render anything while we're checking for groups
  if (loading || groups.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 max-h-[80vh] overflow-y-auto"
        style={{ background: '#0a0a0b', border: '1px solid rgba(255,255,255,0.1)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          <p className="text-[10px] uppercase tracking-[0.2em]" style={{ color: meta.color }}>
            {meta.icon} {meta.label}
          </p>
          <button onClick={onClose} className="text-2xl" style={{ color: '#71717a' }}>×</button>
        </div>
        <h2 style={serif} className="text-3xl mb-1 leading-tight">{template.title}</h2>
        <p className="text-sm mb-5" style={{ color: '#a1a1aa' }}>Do it with…</p>

        {/* Solo option */}
        <button
          onClick={() => accept(null)}
          disabled={accepting}
          className="w-full rounded-2xl p-4 flex items-center gap-3 mb-2 transition-transform active:scale-[0.98]"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <User size={18} />
          </div>
          <div className="flex-1 text-left">
            <p style={serif} className="text-xl">Solo</p>
            <p className="text-xs" style={{ color: '#71717a' }}>Just you. +{template.xp_reward} XP</p>
          </div>
        </button>

        {/* Group options */}
        {groups.map(g => (
          <button
            key={g.id}
            onClick={() => accept(g.id)}
            disabled={accepting}
            className="w-full rounded-2xl p-4 flex items-center gap-3 mb-2 transition-transform active:scale-[0.98]"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="text-3xl">{g.emoji}</div>
            <div className="flex-1 text-left">
              <p style={serif} className="text-xl">{g.name}</p>
              <p className="text-xs" style={{ color: '#fbbf24' }}>
                +25% group bonus · everyone gets XP
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
