import React, { useEffect, useState } from 'react';
import { ArrowLeft, Copy, Check, X, Plus, UserCheck } from 'lucide-react';
import {
  findUserByFriendCode, sendFriendRequest, acceptFriendRequest,
  removeFriend, getFriends, getIncomingRequests
} from '../lib/friends.js';
import { totalXP, getRank } from '../lib/xp.js';

const serif = { fontFamily: "'Instrument Serif', serif", fontStyle: 'italic' };

export default function FriendsScreen({ profile, onClose }) {
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [copied, setCopied] = useState(false);

  const reload = async () => {
    setLoading(true);
    const [f, r] = await Promise.all([
      getFriends(profile.id),
      getIncomingRequests(profile.id)
    ]);
    setFriends(f);
    setRequests(r);
    setLoading(false);
  };

  useEffect(() => { reload(); }, [profile.id]);

  const handleCopyCode = () => {
    try {
      navigator.clipboard.writeText(profile.friend_code || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const handleAccept = async (requesterId) => {
    try { await acceptFriendRequest(requesterId); await reload(); }
    catch (e) { alert('Could not accept: ' + e.message); }
  };

  const handleDecline = async (requesterId) => {
    try { await removeFriend(requesterId); await reload(); }
    catch (e) { alert(e.message); }
  };

  const handleRemove = async (friendId) => {
    if (!confirm('Remove this friend?')) return;
    try { await removeFriend(friendId); await reload(); }
    catch (e) { alert(e.message); }
  };

  // Sort friends by XP descending — mini leaderboard
  const ranked = [...friends].sort((a, b) => totalXP(b) - totalXP(a));

  return (
    <div className="space-y-4 pb-4">
      <button onClick={onClose} className="flex items-center gap-1 text-sm" style={{ color: '#a1a1aa' }}>
        <ArrowLeft size={16} /> Profile
      </button>

      <div className="pt-2">
        <h1 style={serif} className="text-4xl">Friends</h1>
        <p className="text-sm" style={{ color: '#a1a1aa' }}>Your real-life crew.</p>
      </div>

      {/* My friend code */}
      <button
        onClick={handleCopyCode}
        className="w-full rounded-2xl p-4 flex items-center justify-between"
        style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}
      >
        <div className="text-left">
          <p className="text-[10px] uppercase tracking-widest" style={{ color: '#fbbf24' }}>Your code</p>
          <p style={{ fontFamily: 'monospace', fontSize: '1.4rem', letterSpacing: '0.15em' }}>
            {profile.friend_code || '------'}
          </p>
        </div>
        <div className="flex items-center gap-1 text-xs" style={{ color: '#fbbf24' }}>
          <Copy size={14} /> {copied ? 'Copied!' : 'Share'}
        </div>
      </button>

      <button
        onClick={() => setShowAdd(true)}
        className="w-full rounded-2xl py-3 flex items-center justify-center gap-2 text-sm font-medium"
        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <Plus size={16} /> Add by code
      </button>

      {/* Incoming requests */}
      {requests.length > 0 && (
        <section>
          <h2 className="text-xs uppercase tracking-[0.2em] mb-2 px-1" style={{ color: '#fbbf24' }}>
            Pending ({requests.length})
          </h2>
          <div className="space-y-2">
            {requests.map(r => (
              <div key={r.id} className="rounded-xl p-3 flex items-center gap-3"
                style={{ background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.15)' }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  {(r.display_name || r.username)[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{r.display_name || r.username}</p>
                  <p className="text-[10px]" style={{ color: '#71717a' }}>@{r.username}</p>
                </div>
                <button
                  onClick={() => handleAccept(r.id)}
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: '#10b981', color: '#fff' }}
                >
                  <Check size={16} strokeWidth={2.5} />
                </button>
                <button
                  onClick={() => handleDecline(r.id)}
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.05)', color: '#a1a1aa' }}
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Friends list */}
      <section>
        <h2 className="text-xs uppercase tracking-[0.2em] mb-2 px-1" style={{ color: '#71717a' }}>
          Friends ({friends.length})
        </h2>
        {loading ? (
          <p className="text-sm" style={{ color: '#71717a' }}>Loading…</p>
        ) : friends.length === 0 ? (
          <div className="rounded-2xl p-6 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="text-4xl mb-2">👀</div>
            <p className="text-sm" style={{ color: '#a1a1aa' }}>
              Share your code or add someone by their code.
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {ranked.map((f, i) => {
              const xp = totalXP(f);
              const rank = getRank(xp);
              return (
                <div key={f.id} className="rounded-xl p-3 flex items-center gap-3"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ ...serif, color: i === 0 ? '#fbbf24' : '#71717a' }} className="text-lg w-5 text-center">
                    {i + 1}
                  </span>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    {(f.display_name || f.username)[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{f.display_name || f.username}</p>
                    <p className="text-[10px]" style={{ color: rank.color }}>★ {rank.name}</p>
                  </div>
                  <p style={serif} className="text-lg">{xp.toLocaleString()}</p>
                  <button onClick={() => handleRemove(f.id)} className="opacity-50 hover:opacity-100 text-xs" style={{ color: '#a1a1aa' }}>
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {showAdd && (
        <AddFriendModal onClose={() => setShowAdd(false)} onAdded={reload} />
      )}
    </div>
  );
}

function AddFriendModal({ onClose, onAdded }) {
  const [code, setCode] = useState('');
  const [found, setFound] = useState(null);
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const search = async () => {
    const cleaned = code.trim().toUpperCase();
    if (cleaned.length < 4) return;
    setSearching(true);
    setError('');
    setFound(null);
    const user = await findUserByFriendCode(cleaned);
    setSearching(false);
    if (!user) {
      setError('No user with that code');
      return;
    }
    setFound(user);
  };

  const send = async () => {
    setSending(true);
    try {
      await sendFriendRequest(found.id);
      setSent(true);
      setTimeout(() => { onAdded(); onClose(); }, 1200);
    } catch (e) {
      setError(e.message);
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5"
        style={{ background: '#0a0a0b', border: '1px solid rgba(255,255,255,0.1)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 style={serif} className="text-2xl">Add a friend</h2>
          <button onClick={onClose} className="text-2xl" style={{ color: '#71717a' }}>×</button>
        </div>

        {!found ? (
          <>
            <p className="text-sm mb-3" style={{ color: '#a1a1aa' }}>
              Ask them for their 6-character friend code.
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
              onClick={search}
              disabled={code.trim().length < 4 || searching}
              className="w-full py-3 rounded-full font-medium text-sm disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #fbbf24, #f97316)', color: '#0a0a0b' }}
            >
              {searching ? 'Searching…' : 'Search'}
            </button>
          </>
        ) : sent ? (
          <div className="text-center py-4">
            <UserCheck size={48} style={{ color: '#10b981' }} className="mx-auto mb-2" />
            <p style={serif} className="text-2xl">Request sent!</p>
          </div>
        ) : (
          <>
            <div className="rounded-2xl p-4 mb-4 flex items-center gap-3" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg" style={{ background: 'rgba(255,255,255,0.05)' }}>
                {(found.display_name || found.username)[0].toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="font-medium">{found.display_name || found.username}</p>
                <p className="text-xs" style={{ color: '#71717a' }}>@{found.username}</p>
              </div>
            </div>
            <button
              onClick={send}
              disabled={sending}
              className="w-full py-3 rounded-full font-medium text-sm disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #fbbf24, #f97316)', color: '#0a0a0b' }}
            >
              {sending ? 'Sending…' : 'Send friend request'}
            </button>
            {error && <p className="text-xs text-center mt-2" style={{ color: '#ef4444' }}>{error}</p>}
            <button onClick={() => { setFound(null); setCode(''); }} className="w-full mt-2 text-xs" style={{ color: '#71717a' }}>
              Search again
            </button>
          </>
        )}
      </div>
    </div>
  );
}
