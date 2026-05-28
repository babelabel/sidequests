import React, { useEffect, useState } from 'react';
import { ArrowLeft, Crown } from 'lucide-react';
import { getGlobalLeaderboard, getMyRank } from '../lib/progress.js';
import { getTitleById } from '../lib/badges.js';
import { getRank } from '../lib/xp.js';

const serif = { fontFamily: "'Instrument Serif', serif", fontStyle: 'italic' };

export default function LeaderboardScreen({ profile, onClose }) {
  const [players, setPlayers] = useState([]);
  const [myRank, setMyRank] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [top, rank] = await Promise.all([
        getGlobalLeaderboard(10),
        getMyRank()
      ]);
      setPlayers(top);
      setMyRank(rank);
      setLoading(false);
    })();
  }, []);

  const medalColor = (pos) => pos === 1 ? '#fbbf24' : pos === 2 ? '#d4d4d8' : pos === 3 ? '#d97706' : '#71717a';
  const amInTop10 = players.some(p => p.id === profile.id);

  return (
    <div className="space-y-4 pb-4">
      <button onClick={onClose} className="flex items-center gap-1 text-sm" style={{ color: '#a1a1aa' }}>
        <ArrowLeft size={16} /> Back
      </button>

      <div className="text-center pt-2">
        <div className="text-5xl mb-2">🏆</div>
        <h1 style={serif} className="text-4xl">Leaderboard</h1>
        <p className="text-sm" style={{ color: '#a1a1aa' }}>Top adventurers this summer</p>
      </div>

      {loading ? (
        <p className="text-sm text-center py-6" style={{ color: '#71717a' }}>Loading…</p>
      ) : (
        <>
          {/* Podium for top 3 */}
          {players.length >= 3 && (
            <div className="flex items-end justify-center gap-2 pt-4 pb-2">
              {[players[1], players[0], players[2]].map((p, i) => {
                const realPos = i === 0 ? 2 : i === 1 ? 1 : 3;
                const height = realPos === 1 ? 'h-28' : realPos === 2 ? 'h-20' : 'h-16';
                return (
                  <div key={p.id} className="flex flex-col items-center" style={{ width: '33%' }}>
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center text-2xl mb-1 relative"
                      style={{ background: p.avatar_color || '#fbbf24', border: `2px solid ${medalColor(realPos)}` }}
                    >
                      {p.avatar_emoji || '🙂'}
                      {realPos === 1 && <Crown size={16} className="absolute -top-3" style={{ color: '#fbbf24' }} />}
                    </div>
                    <p className="text-xs font-medium truncate max-w-full px-1">{p.display_name || p.username}</p>
                    <p style={{ ...mono(), color: medalColor(realPos) }} className="text-[10px]">{Number(p.total_xp).toLocaleString()}</p>
                    <div
                      className={`${height} w-full rounded-t-xl mt-1 flex items-start justify-center pt-1`}
                      style={{ background: `linear-gradient(180deg, ${medalColor(realPos)}40, ${medalColor(realPos)}10)`, border: `1px solid ${medalColor(realPos)}30` }}
                    >
                      <span style={serif} className="text-2xl" >{realPos}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Full list */}
          <div className="space-y-1.5">
            {players.map(p => {
              const isMe = p.id === profile.id;
              const pos = Number(p.rank_position);
              const title = getTitleById(p.display_title);
              return (
                <div
                  key={p.id}
                  className="rounded-2xl p-3 flex items-center gap-3"
                  style={{
                    background: isMe ? 'rgba(251,191,36,0.1)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${isMe ? 'rgba(251,191,36,0.3)' : 'rgba(255,255,255,0.06)'}`
                  }}
                >
                  <span style={{ ...serif, color: medalColor(pos) }} className="text-2xl w-7 text-center">{pos}</span>
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                    style={{ background: p.avatar_color || '#fbbf24' }}
                  >
                    {p.avatar_emoji || '🙂'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">
                      {p.display_name || p.username}
                      {isMe && <span className="text-[10px] ml-1" style={{ color: '#fbbf24' }}>you</span>}
                    </p>
                    {title && <p className="text-[10px]" style={{ color: '#a1a1aa' }}>{title.label}</p>}
                  </div>
                  <p style={serif} className="text-xl">{Number(p.total_xp).toLocaleString()}</p>
                </div>
              );
            })}
          </div>

          {/* Your rank if outside top 10 */}
          {!amInTop10 && myRank && (
            <div className="rounded-2xl p-3 flex items-center gap-3 mt-2" style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)' }}>
              <span style={{ ...serif, color: '#fbbf24' }} className="text-2xl w-7 text-center">{myRank}</span>
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg" style={{ background: profile.avatar_color || '#fbbf24' }}>
                {profile.avatar_emoji || '🙂'}
              </div>
              <div className="flex-1">
                <p className="text-sm">{profile.display_name || profile.username} <span className="text-[10px]" style={{ color: '#fbbf24' }}>you</span></p>
                <p className="text-[10px]" style={{ color: '#a1a1aa' }}>Keep questing to climb!</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function mono() {
  return { fontFamily: "'JetBrains Mono', ui-monospace, monospace" };
}
