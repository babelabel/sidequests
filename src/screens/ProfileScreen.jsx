import React, { useState, useEffect } from 'react';
import { Users, Copy, Trophy, Palette } from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import { CATEGORY_META, totalXP, getRank, getNextRank } from '../lib/xp.js';
import { getEarnedBadges, syncBadges } from '../lib/progress.js';
import { getBadgeById, getTitleById } from '../lib/badges.js';

const serif = { fontFamily: "'Instrument Serif', serif", fontStyle: 'italic' };

export default function ProfileScreen({
  profile,
  onSignOut,
  onOpenFriends,
  onOpenLeaderboard,
  onOpenCustomize
}) {
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profile.display_name || '');
  const [username, setUsername] = useState(profile.username);
  const [bio, setBio] = useState(profile.bio || '');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [myBadges, setMyBadges] = useState([]);

  const aura = totalXP(profile);
  const rank = getRank(aura);
  const nextRank = getNextRank(aura);

  const avatarColor = profile.avatar_color || rank.color;
  const avatarEmoji = profile.avatar_emoji || '🙂';
  const title = getTitleById(profile.display_title) || { label: rank.name };
  const featured = profile.featured_badge ? getBadgeById(profile.featured_badge) : null;

  // Sync + load badges on mount (computes newly earned ones, persists them)
  useEffect(() => {
    (async () => {
      await syncBadges(profile);
      const earned = await getEarnedBadges(profile.id);
      setMyBadges(earned);
    })();
  }, [profile.id]);

  const copyCode = () => {
    try {
      navigator.clipboard.writeText(profile.friend_code || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const saveProfile = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName.trim(), username: username.trim(), bio: bio.trim() })
      .eq('id', profile.id);
    setSaving(false);
    if (error) { alert(error.message); return; }
    setEditing(false);
    window.location.reload();
  };

  return (
    <div className="space-y-5 pb-4">
      <div className="pt-2 text-center">
        <div
          className="w-24 h-24 rounded-full mx-auto mb-3 flex items-center justify-center text-5xl relative"
          style={{ background: avatarColor, border: `3px solid ${avatarColor}` }}
        >
          {avatarEmoji}
          {featured && (
            <div className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full flex items-center justify-center text-lg" style={{ background: '#0a0a0b', border: '2px solid ' + avatarColor }}>
              {featured.icon}
            </div>
          )}
        </div>

        {!editing ? (
          <>
            <h1 style={serif} className="text-3xl">{profile.display_name || profile.username}</h1>
            <p className="text-xs" style={{ color: '#a1a1aa' }}>@{profile.username}</p>
            <p className="text-[10px] uppercase tracking-[0.2em] mt-2" style={{ color: avatarColor }}>
              {title.label}
            </p>
            {profile.bio && <p className="text-sm mt-3 max-w-xs mx-auto" style={{ color: '#a1a1aa' }}>{profile.bio}</p>}
            <div className="flex gap-2 justify-center mt-3">
              <button
                onClick={() => setEditing(true)}
                className="text-xs px-3 py-1.5 rounded-full"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                Edit info
              </button>
              <button
                onClick={onOpenCustomize}
                className="text-xs px-3 py-1.5 rounded-full flex items-center gap-1"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <Palette size={12} /> Customize
              </button>
            </div>
          </>
        ) : (
          <div className="max-w-sm mx-auto space-y-2 mt-3">
            <input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Display name"
              className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fafaf9' }}
            />
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="username"
              className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fafaf9' }}
            />
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="Bio"
              rows={3}
              className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none resize-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fafaf9' }}
            />
            <div className="flex gap-2">
              <button onClick={saveProfile} disabled={saving} className="flex-1 py-2 rounded-full text-sm" style={{ background: '#fafaf9', color: '#0a0a0b' }}>
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => setEditing(false)} className="flex-1 py-2 rounded-full text-sm" style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)' }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Total XP card */}
      <div className="rounded-3xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-xs uppercase tracking-widest" style={{ color: '#71717a' }}>Total XP</p>
        <p style={serif} className="text-5xl mt-1">{aura.toLocaleString()}</p>
        {nextRank && (
          <p className="text-xs mt-2" style={{ color: '#a1a1aa' }}>
            {(nextRank.min - aura).toLocaleString()} XP to {nextRank.name}
          </p>
        )}
      </div>

      {/* Per-category breakdown */}
      <div className="space-y-2">
        {Object.entries(CATEGORY_META).map(([key, meta]) => {
          const v = profile['xp_' + key] || 0;
          return (
            <div key={key} className="rounded-2xl p-4 flex items-center gap-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="text-2xl">{meta.icon}</div>
              <div className="flex-1">
                <p className="text-sm font-medium">{meta.label}</p>
                <div className="h-1 rounded-full overflow-hidden mt-1" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, (v / 2000) * 100)}%`, background: meta.color }} />
                </div>
              </div>
              <p style={serif} className="text-xl">{v}</p>
            </div>
          );
        })}
      </div>

      {/* Badges grid */}
      <section>
        <p className="text-xs uppercase tracking-[0.2em] mb-2 px-1" style={{ color: '#71717a' }}>
          Badges ({myBadges.length})
        </p>
        {myBadges.length === 0 ? (
          <div className="rounded-2xl p-5 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-sm" style={{ color: '#71717a' }}>Complete quests to earn badges.</p>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {myBadges.map(bid => {
              const badge = getBadgeById(bid);
              if (!badge) return null;
              return (
                <div key={bid} className="rounded-2xl p-2 flex flex-col items-center text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <span className="text-2xl mb-1">{badge.icon}</span>
                  <span className="text-[9px] leading-tight" style={{ color: '#a1a1aa' }}>{badge.name}</span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Leaderboard + Friends + code */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={onOpenLeaderboard}
          className="rounded-2xl p-3 text-left flex flex-col justify-between"
          style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}
        >
          <Trophy size={20} style={{ color: '#fbbf24' }} />
          <p style={serif} className="text-xl">Leaderboard</p>
        </button>
        <button
          onClick={onOpenFriends}
          className="rounded-2xl p-3 text-left flex flex-col justify-between"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <Users size={20} style={{ color: '#a1a1aa' }} />
          <p style={serif} className="text-xl">Friends</p>
        </button>
      </div>

      <button
        onClick={copyCode}
        className="w-full rounded-2xl p-3 flex items-center justify-between"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="text-left">
          <p className="text-[10px] uppercase tracking-widest" style={{ color: '#71717a' }}>Your friend code</p>
          <p style={{ fontFamily: 'monospace', fontSize: '1.2rem', letterSpacing: '0.15em' }}>{profile.friend_code || '------'}</p>
        </div>
        <span className="text-xs flex items-center gap-1" style={{ color: '#a1a1aa' }}>
          <Copy size={12} /> {copied ? 'copied' : 'copy'}
        </span>
      </button>

      <button
        onClick={onSignOut}
        className="w-full py-3 rounded-full text-sm"
        style={{ background: 'transparent', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}
      >
        Sign out
      </button>
    </div>
  );
}
