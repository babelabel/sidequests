import React, { useEffect, useState } from 'react';
import { Plus, ArrowLeft, Copy, LogOut, Crown } from 'lucide-react';
import {
  createGroup, joinGroupByCode, getMyGroups, getGroupMembers, leaveGroup, acceptQuestForGroup
} from '../lib/friends.js';
import { supabase } from '../lib/supabase.js';
import QuestCard from '../components/QuestCard.jsx';
import { totalXP } from '../lib/xp.js';

const serif = { fontFamily: "'Instrument Serif', serif", fontStyle: 'italic' };

export default function GroupsScreen({ profile, onOpenQuest }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeGroup, setActiveGroup] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  const reload = async () => {
    setLoading(true);
    const g = await getMyGroups(profile.id);
    setGroups(g);
    setLoading(false);
  };

  useEffect(() => { reload(); }, [profile.id]);

  // ---- Group detail view ----
  if (activeGroup) {
    return (
      <GroupDetail
        group={activeGroup}
        profile={profile}
        onClose={() => { setActiveGroup(null); reload(); }}
        onOpenQuest={onOpenQuest}
      />
    );
  }

  return (
    <div className="space-y-4 pb-4">
      <div className="pt-2 flex items-start justify-between">
        <div>
          <h1 style={serif} className="text-4xl">Groups</h1>
          <p className="text-sm" style={{ color: '#a1a1aa' }}>Adventures are better together.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-2xl py-3 flex items-center justify-center gap-2 text-sm font-medium"
          style={{ background: 'linear-gradient(135deg, #fbbf24, #f97316)', color: '#0a0a0b' }}
        >
          <Plus size={16} strokeWidth={2.5} /> Create
        </button>
        <button
          onClick={() => setShowJoin(true)}
          className="rounded-2xl py-3 text-sm font-medium"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          Join by code
        </button>
      </div>

      {loading ? (
        <p className="text-sm" style={{ color: '#71717a' }}>Loading…</p>
      ) : groups.length === 0 ? (
        <div className="rounded-3xl p-8 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="text-6xl mb-3">👥</div>
          <p style={serif} className="text-2xl mb-2">No groups yet</p>
          <p className="text-sm max-w-xs mx-auto" style={{ color: '#a1a1aa' }}>
            Create one for your summer crew or join with a friend's invite code.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {groups.map(g => (
            <button
              key={g.id}
              onClick={() => setActiveGroup(g)}
              className="w-full text-left rounded-2xl p-4 flex items-center gap-3 transition-transform active:scale-[0.98]"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div className="text-3xl">{g.emoji}</div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{g.name}</p>
                <p className="text-xs" style={{ color: '#71717a' }}>
                  Code <span style={{ fontFamily: 'monospace' }}>{g.invite_code}</span>
                  {g.myRole === 'owner' && <span className="ml-2" style={{ color: '#fbbf24' }}>· owner</span>}
                </p>
              </div>
              <span className="text-xl" style={{ color: '#71717a' }}>›</span>
            </button>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateGroupModal
          onClose={() => setShowCreate(false)}
          onCreated={async (g) => { setShowCreate(false); await reload(); setActiveGroup(g); }}
        />
      )}
      {showJoin && (
        <JoinGroupModal
          onClose={() => setShowJoin(false)}
          onJoined={async () => { setShowJoin(false); await reload(); }}
        />
      )}
    </div>
  );
}

// ============================================================
// GROUP DETAIL — members + active group quests + leaderboard
// ============================================================
function GroupDetail({ group, profile, onClose, onOpenQuest }) {
  const [members, setMembers] = useState([]);
  const [activeQuests, setActiveQuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      const [m, q] = await Promise.all([
        getGroupMembers(group.id),
        supabase
          .from('quests')
          .select('*, template:quest_templates(*)')
          .eq('group_id', group.id)
          .eq('status', 'active')
          .then(r => r.data || [])
      ]);
      setMembers(m);
      setActiveQuests(q);
      setLoading(false);
    })();
  }, [group.id]);

  const handleCopy = () => {
    try {
      navigator.clipboard.writeText(group.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const handleLeave = async () => {
    try {
      await leaveGroup(group.id);
      onClose();
    } catch (e) {
      alert('Could not leave: ' + e.message);
    }
  };

  // Sort members by total XP descending = leaderboard
  const ranked = [...members].sort((a, b) => totalXP(b) - totalXP(a));

  return (
    <div className="space-y-4 pb-4">
      <button onClick={onClose} className="flex items-center gap-1 text-sm" style={{ color: '#a1a1aa' }}>
        <ArrowLeft size={16} /> Back
      </button>

      <div className="text-center pt-2">
        <div className="text-6xl mb-2">{group.emoji}</div>
        <h1 style={serif} className="text-4xl">{group.name}</h1>
        <p className="text-sm mt-1" style={{ color: '#a1a1aa' }}>
          {members.length} member{members.length === 1 ? '' : 's'}
        </p>
      </div>

      {/* Invite code */}
      <button
        onClick={handleCopy}
        className="w-full rounded-2xl p-4 flex items-center justify-between"
        style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}
      >
        <div className="text-left">
          <p className="text-[10px] uppercase tracking-widest" style={{ color: '#fbbf24' }}>Invite code</p>
          <p style={{ fontFamily: 'monospace', fontSize: '1.4rem', letterSpacing: '0.15em' }}>{group.invite_code}</p>
        </div>
        <div className="flex items-center gap-1 text-xs" style={{ color: '#fbbf24' }}>
          <Copy size={14} /> {copied ? 'Copied!' : 'Tap to copy'}
        </div>
      </button>

      {/* Leaderboard */}
      <section>
        <h2 className="text-xs uppercase tracking-[0.2em] mb-2 px-1" style={{ color: '#71717a' }}>
          Leaderboard
        </h2>
        {loading ? (
          <p className="text-sm" style={{ color: '#71717a' }}>Loading…</p>
        ) : (
          <div className="space-y-1.5">
            {ranked.map((m, i) => {
              const xp = totalXP(m);
              const isMe = m.id === profile.id;
              return (
                <div
                  key={m.id}
                  className="rounded-xl p-3 flex items-center gap-3"
                  style={{
                    background: isMe ? 'rgba(251,191,36,0.08)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${isMe ? 'rgba(251,191,36,0.2)' : 'rgba(255,255,255,0.06)'}`
                  }}
                >
                  <span style={{ ...serif, color: i === 0 ? '#fbbf24' : '#71717a' }} className="text-xl w-6 text-center">
                    {i + 1}
                  </span>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    {(m.display_name || m.username)[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">
                      {m.display_name || m.username}
                      {m.role === 'owner' && <Crown size={12} className="inline ml-1 mb-0.5" style={{ color: '#fbbf24' }} />}
                      {isMe && <span className="text-[10px] ml-1" style={{ color: '#fbbf24' }}>you</span>}
                    </p>
                    <p className="text-[10px]" style={{ color: '#71717a' }}>@{m.username}</p>
                  </div>
                  <p style={serif} className="text-lg">{xp.toLocaleString()}</p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Active group quests */}
      {activeQuests.length > 0 && (
        <section>
          <h2 className="text-xs uppercase tracking-[0.2em] mb-2 px-1" style={{ color: '#71717a' }}>
            Active group quests
          </h2>
          <div className="space-y-3">
            {activeQuests.map(q => (
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

      {/* Leave button */}
      <div className="pt-4">
        {!confirmLeave ? (
          <button
            onClick={() => setConfirmLeave(true)}
            className="w-full py-3 rounded-full text-sm flex items-center justify-center gap-2"
            style={{ background: 'transparent', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}
          >
            <LogOut size={14} /> Leave group
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-center" style={{ color: '#a1a1aa' }}>Sure? You'll need a new invite to rejoin.</p>
            <div className="flex gap-2">
              <button onClick={handleLeave} className="flex-1 py-2 rounded-full text-sm" style={{ background: '#ef4444', color: '#fff' }}>
                Yes, leave
              </button>
              <button onClick={() => setConfirmLeave(false)} className="flex-1 py-2 rounded-full text-sm" style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)' }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// MODALS
// ============================================================
function CreateGroupModal({ onClose, onCreated }) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🌅');
  const [creating, setCreating] = useState(false);
  const emojiOptions = ['🌅','🔥','⚡','🌊','🏔️','🍕','🎮','📸','🎵','🌙','🚀','💀','🎉','🌴'];

  const submit = async () => {
    if (!name.trim() || creating) return;
    setCreating(true);
    try {
      const g = await createGroup({ name, emoji });
      onCreated(g);
    } catch (e) {
      alert('Could not create: ' + e.message);
      setCreating(false);
    }
  };

  return (
    <ModalShell title="New group" onClose={onClose}>
      <input
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Group name (e.g., Summer 2026)"
        autoFocus
        className="w-full rounded-xl px-3 py-2.5 text-sm mb-3 focus:outline-none"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fafaf9' }}
      />
      <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: '#71717a' }}>Emoji</p>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {emojiOptions.map(e => (
          <button
            key={e}
            onClick={() => setEmoji(e)}
            className="w-10 h-10 rounded-xl text-xl"
            style={{
              background: emoji === e ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${emoji === e ? '#fbbf24' : 'rgba(255,255,255,0.08)'}`
            }}
          >
            {e}
          </button>
        ))}
      </div>
      <button
        onClick={submit}
        disabled={!name.trim() || creating}
        className="w-full py-3 rounded-full font-medium text-sm disabled:opacity-40"
        style={{ background: 'linear-gradient(135deg, #fbbf24, #f97316)', color: '#0a0a0b' }}
      >
        {creating ? 'Creating…' : 'Create group'}
      </button>
    </ModalShell>
  );
}

function JoinGroupModal({ onClose, onJoined }) {
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    const cleaned = code.trim().toUpperCase();
    if (cleaned.length < 4 || joining) return;
    setJoining(true);
    setError('');
    try {
      const result = await joinGroupByCode(cleaned);
      if (!result) throw new Error('Group not found');
      onJoined();
    } catch (e) {
      setError(e.message || 'Could not join');
      setJoining(false);
    }
  };

  return (
    <ModalShell title="Join a group" onClose={onClose}>
      <p className="text-sm mb-3" style={{ color: '#a1a1aa' }}>
        Ask the group owner for the 6-character invite code.
      </p>
      <input
        value={code}
        onChange={e => setCode(e.target.value.toUpperCase())}
        placeholder="ABCD23"
        autoFocus
        maxLength={8}
        className="w-full rounded-xl px-4 py-3 mb-3 focus:outline-none text-center"
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          color: '#fafaf9',
          fontFamily: 'monospace',
          fontSize: '1.4rem',
          letterSpacing: '0.25em'
        }}
      />
      {error && <p className="text-xs text-center mb-3" style={{ color: '#ef4444' }}>{error}</p>}
      <button
        onClick={submit}
        disabled={code.trim().length < 4 || joining}
        className="w-full py-3 rounded-full font-medium text-sm disabled:opacity-40"
        style={{ background: 'linear-gradient(135deg, #fbbf24, #f97316)', color: '#0a0a0b' }}
      >
        {joining ? 'Joining…' : 'Join'}
      </button>
    </ModalShell>
  );
}

function ModalShell({ children, title, onClose }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5"
        style={{ background: '#0a0a0b', border: '1px solid rgba(255,255,255,0.1)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 style={serif} className="text-2xl">{title}</h2>
          <button onClick={onClose} className="text-2xl" style={{ color: '#71717a' }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
