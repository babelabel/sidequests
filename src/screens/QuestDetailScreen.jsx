import React, { useEffect, useState, useRef } from 'react';
import { X, Camera, MapPin, Sparkles, Clock, Users, Check } from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import { completeQuest, startQuest, confirmParticipation } from '../lib/quests.js';
import { CATEGORY_META } from '../lib/xp.js';
import { getCurrentLocation, createQuestPost } from '../lib/photos.js';
import { getBadgeById } from '../lib/badges.js';

const serif = { fontFamily: "'Instrument Serif', serif", fontStyle: 'italic' };

/**
 * Quest detail with full lifecycle:
 *   accepted (active) → user taps Start → started (timer running)
 *   pending_group_consent → all members confirm → started
 *   started → user uploads photo → completed
 *
 * Phases this screen handles:
 *   'detail'   — show description + lifecycle action button
 *   'post'     — photo upload (required to complete)
 *   'success'  — XP burst animation
 */
export default function QuestDetailScreen({ questId, profile, onClose, onCompleted }) {
  const [quest, setQuest] = useState(null);
  const [participants, setParticipants] = useState([]);  // group members + their confirm status
  const [phase, setPhase] = useState('detail');
  const [completing, setCompleting] = useState(false);
  const [starting, setStarting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [xpEarned, setXpEarned] = useState(null);
  const [newlyGrantedBadges, setNewlyGrantedBadges] = useState([]);
  const [tick, setTick] = useState(0); // forces re-render for countdown

  // Load quest + participants
  const loadQuest = async () => {
    const { data: q } = await supabase
      .from('quests')
      .select('*, template:quest_templates(*)')
      .eq('id', questId)
      .single();
    setQuest(q);

    if (q?.group_id) {
      const { data: parts } = await supabase
        .from('quest_participants')
        .select('user_id, has_confirmed, member:profiles!quest_participants_user_id_fkey(username, display_name)')
        .eq('quest_id', questId);
      setParticipants(parts || []);
    }
  };

  useEffect(() => { loadQuest(); }, [questId]);

  // Tick every second to update countdown
  useEffect(() => {
    if (quest?.status !== 'started') return;
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [quest?.status]);

  if (!quest) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: '#0a0a0b', color: '#fafaf9' }}>
        <p style={serif} className="text-2xl">loading…</p>
      </div>
    );
  }

  const t = quest.template;
  const meta = CATEGORY_META[t.category] || CATEGORY_META.adventure;
  const myConfirmRow = participants.find(p => p.user_id === profile.id);
  const myHasConfirmed = myConfirmRow?.has_confirmed ?? true;
  const allConfirmed = participants.length > 0 && participants.every(p => p.has_confirmed);

  // Compute time remaining for 'started' quests
  const computeRemaining = () => {
    if (!quest.deadline_at) return null;
    const ms = new Date(quest.deadline_at).getTime() - Date.now();
    if (ms <= 0) return { expired: true };
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return { h, m, s, expired: false };
  };
  const remaining = computeRemaining();

  // Compute time until completion unlocks (the minimum-duration gate)
  const computeUnlock = () => {
    if (!quest.unlock_at) return { locked: false };
    const ms = new Date(quest.unlock_at).getTime() - Date.now();
    if (ms <= 0) return { locked: false };
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return { locked: true, h, m, s };
  };
  const unlock = computeUnlock();

  // ---- ACTIONS ----

  const handleStart = async () => {
    setStarting(true);
    try {
      await startQuest(quest.id);
      await loadQuest();
    } catch (e) {
      alert('Could not start: ' + e.message);
    } finally {
      setStarting(false);
    }
  };

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      const started = await confirmParticipation(quest.id);
      await loadQuest();
      if (started) {
        // Quest auto-started because we were the last to confirm
      }
    } catch (e) {
      alert('Could not confirm: ' + e.message);
    } finally {
      setConfirming(false);
    }
  };

  const handleGoToPost = () => {
    // The "Complete with photo" button only renders once the unlock time has
    // passed (handled in LifecycleButton), so we can go straight to the post phase.
    setPhase('post');
  };

  const handleCompleteAfterPost = async () => {
    setCompleting(true);
    try {
      const { xpEarned: earned, newBadges } = await completeQuest({ quest, userId: profile.id, profile });
      setXpEarned(earned);
      setNewlyGrantedBadges(newBadges || []);
      setPhase('success');
      // Longer dwell if badges to celebrate
      const dwell = (newBadges?.length > 0) ? 3500 : 2200;
      setTimeout(() => onCompleted(), dwell);
    } catch (e) {
      alert('Could not complete: ' + e.message);
      setCompleting(false);
    }
  };

  // -------- PHASE: success burst --------
  if (phase === 'success') {
    return (
      <div
        className="fixed inset-0 flex flex-col items-center justify-center px-6"
        style={{ background: meta.gradient, color: '#fff' }}
      >
        <div className="text-7xl mb-4 animate-bounce">✨</div>
        <h1 style={serif} className="text-5xl mb-2 text-center">Quest complete</h1>
        <p style={serif} className="text-3xl mb-1">+{xpEarned} XP</p>
        <p className="text-sm text-white/80">{meta.label}</p>

        {newlyGrantedBadges.length > 0 && (
          <div className="mt-8 w-full max-w-sm">
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/80 text-center mb-3">
              {newlyGrantedBadges.length === 1 ? 'Badge unlocked' : `${newlyGrantedBadges.length} badges unlocked`}
            </p>
            <div className="space-y-2">
              {newlyGrantedBadges.map(b => {
                const badgeId = b.badge_id || b;  // handle both shapes
                const cfg = getBadgeById(badgeId);
                if (!cfg) return null;
                return (
                  <div key={badgeId} className="rounded-2xl px-4 py-3 flex items-center gap-3" style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(12px)' }}>
                    <div className="text-3xl">{cfg.icon}</div>
                    <div className="flex-1 text-left">
                      <p style={serif} className="text-xl text-white leading-tight">{cfg.name}</p>
                      <p className="text-[10px] text-white/70">{cfg.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // -------- PHASE: photo upload (required) --------
  if (phase === 'post') {
    return (
      <PostCreationScreen
        quest={quest}
        profile={profile}
        meta={meta}
        onPosted={handleCompleteAfterPost}
        onCancel={() => setPhase('detail')}
        completing={completing}
      />
    );
  }

  // -------- PHASE: main detail screen --------
  return (
    <div className="fixed inset-0 overflow-y-auto" style={{ background: '#0a0a0b', color: '#fafaf9' }}>
      {/* Hero */}
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

        {/* Status-specific UI */}
        {quest.status === 'started' && remaining && !remaining.expired && (
          <CountdownCard remaining={remaining} meta={meta} />
        )}

        {/* Minimum-duration lock: show how long until completion unlocks */}
        {quest.status === 'started' && unlock.locked && (
          <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.25)' }}>
            <span className="text-2xl">🔒</span>
            <div className="flex-1">
              <p className="text-[10px] uppercase tracking-[0.2em]" style={{ color: '#f43f5e' }}>
                Locked — keep going
              </p>
              <p style={serif} className="text-2xl leading-tight">
                {unlock.h > 0 && `${unlock.h}h `}{String(unlock.m).padStart(2,'0')}m {String(unlock.s).padStart(2,'0')}s
              </p>
              <p className="text-xs" style={{ color: '#a1a1aa' }}>until you can submit proof</p>
            </div>
          </div>
        )}

        {quest.status === 'pending_group_consent' && (
          <GroupConsentCard
            participants={participants}
            myHasConfirmed={myHasConfirmed}
            allConfirmed={allConfirmed}
          />
        )}

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
            <p style={serif} className="text-2xl mt-1">+{t.xp_reward}</p>
          </div>
          <div className="rounded-2xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <p className="text-[10px] uppercase tracking-widest" style={{ color: '#71717a' }}>Mode</p>
            <p style={serif} className="text-2xl mt-1">{t.mode}</p>
          </div>
        </div>

        {/* Lifecycle action button — depends on quest.status */}
        <LifecycleButton
          quest={quest}
          meta={meta}
          myHasConfirmed={myHasConfirmed}
          allConfirmed={allConfirmed}
          starting={starting}
          confirming={confirming}
          onStart={handleStart}
          onConfirm={handleConfirm}
          onGoToPost={handleGoToPost}
          remaining={remaining}
          unlock={unlock}
        />
      </div>
    </div>
  );
}

// ============================================================
// LIFECYCLE BUTTON — picks the right action for the current quest state
// ============================================================
function LifecycleButton({ quest, meta, myHasConfirmed, allConfirmed, starting, confirming, onStart, onConfirm, onGoToPost, remaining, unlock }) {
  // Solo or group already confirmed — show Start
  if (quest.status === 'active') {
    return (
      <button
        onClick={onStart}
        disabled={starting}
        className="w-full py-4 rounded-2xl font-medium transition-transform active:scale-95 disabled:opacity-50"
        style={{ background: meta.gradient, color: '#fff' }}
      >
        {starting ? 'Starting…' : '▶ Start quest'}
      </button>
    );
  }

  // Group consent flow
  if (quest.status === 'pending_group_consent') {
    if (!myHasConfirmed) {
      return (
        <button
          onClick={onConfirm}
          disabled={confirming}
          className="w-full py-4 rounded-2xl font-medium transition-transform active:scale-95 disabled:opacity-50"
          style={{ background: meta.gradient, color: '#fff' }}
        >
          {confirming ? 'Confirming…' : "✓ I'm in"}
        </button>
      );
    }
    return (
      <div className="w-full py-4 rounded-2xl text-center font-medium" style={{ background: 'rgba(255,255,255,0.05)', color: '#a1a1aa' }}>
        Waiting for the others to confirm…
      </div>
    );
  }

  // In progress — show "Complete with photo"
  if (quest.status === 'started') {
    if (remaining?.expired) {
      return (
        <div className="w-full py-4 rounded-2xl text-center font-medium" style={{ background: '#7f1d1d', color: '#fecaca' }}>
          ⏱ Time's up — this quest expired
        </div>
      );
    }

    // Minimum-duration gate: if the unlock time hasn't passed, lock the button.
    if (unlock?.locked) {
      const label = unlock.h > 0
        ? `${unlock.h}h ${String(unlock.m).padStart(2, '0')}m`
        : `${unlock.m}m ${String(unlock.s).padStart(2, '0')}s`;
      return (
        <div className="space-y-2">
          <div className="w-full py-4 rounded-2xl text-center" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#a1a1aa' }}>
            <p className="text-[10px] uppercase tracking-[0.2em] mb-1" style={{ color: '#71717a' }}>🔒 Locked</p>
            <p style={serif} className="text-2xl">{label} until you can submit</p>
          </div>
          <p className="text-[10px] text-center" style={{ color: '#71717a' }}>
            Actually do the quest — you can't submit early.
          </p>
        </div>
      );
    }

    return (
      <button
        onClick={onGoToPost}
        className="w-full py-4 rounded-2xl font-medium transition-transform active:scale-95"
        style={{ background: meta.gradient, color: '#fff' }}
      >
        📸 Complete with photo
      </button>
    );
  }

  if (quest.status === 'expired') {
    return (
      <div className="w-full py-4 rounded-2xl text-center font-medium" style={{ background: '#7f1d1d', color: '#fecaca' }}>
        This quest expired
      </div>
    );
  }

  if (quest.status === 'completed') {
    return (
      <div className="w-full py-4 rounded-2xl text-center font-medium" style={{ background: '#064e3b', color: '#a7f3d0' }}>
        ✓ Completed
      </div>
    );
  }

  return null;
}

// ============================================================
// COUNTDOWN CARD — shows time remaining for started quests
// ============================================================
function CountdownCard({ remaining, meta }) {
  const pad = (n) => String(n).padStart(2, '0');
  return (
    <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: meta.color + '15', border: `1px solid ${meta.color}30` }}>
      <Clock size={20} style={{ color: meta.color }} />
      <div className="flex-1">
        <p className="text-[10px] uppercase tracking-[0.2em]" style={{ color: meta.color }}>Time remaining</p>
        <p style={serif} className="text-3xl leading-tight">
          {remaining.h > 0 && `${remaining.h}h `}{pad(remaining.m)}m {pad(remaining.s)}s
        </p>
      </div>
    </div>
  );
}

// ============================================================
// GROUP CONSENT CARD — shows who's in, who hasn't confirmed yet
// ============================================================
function GroupConsentCard({ participants, myHasConfirmed, allConfirmed }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>
      <div className="flex items-center gap-2 mb-2">
        <Users size={16} style={{ color: '#fbbf24' }} />
        <p className="text-xs uppercase tracking-widest" style={{ color: '#fbbf24' }}>
          {allConfirmed ? 'Everyone confirmed!' : 'Group consent needed'}
        </p>
      </div>
      <p className="text-sm mb-3" style={{ color: '#a1a1aa' }}>
        Everyone in the group has to confirm before the timer starts.
      </p>
      <div className="space-y-1.5">
        {participants.map(p => (
          <div key={p.user_id} className="flex items-center gap-2 text-sm">
            {p.has_confirmed ? (
              <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: '#10b981' }}>
                <Check size={12} strokeWidth={3} className="text-white" />
              </div>
            ) : (
              <div className="w-5 h-5 rounded-full" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }} />
            )}
            <span style={{ color: p.has_confirmed ? '#fafaf9' : '#71717a' }}>
              {p.member?.display_name || p.member?.username || 'Unknown'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// PHOTO POST CREATION — REQUIRED to complete a quest
// ============================================================
function PostCreationScreen({ quest, profile, meta, onPosted, onCancel, completing }) {
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const handlePick = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleTagLocation = async () => {
    setLoadingLocation(true);
    const loc = await getCurrentLocation();
    setLoadingLocation(false);
    if (loc) {
      setLocation({ ...loc, name: quest.template.location_hint || 'Tagged location' });
    } else {
      alert('Could not get location. Permission denied or unavailable.');
    }
  };

  // Photo + caption are required. Posts the photo, then triggers completion.
  const handlePostAndComplete = async () => {
    if (!file) {
      alert('A photo is required to complete the quest.');
      return;
    }
    setUploading(true);
    try {
      await createQuestPost({
        questId: quest.id,
        authorId: profile.id,
        photoFile: file,
        caption,
        locationName: location?.name || '',
        lat: location?.lat || null,
        lng: location?.lng || null
      });
      // After post is created, complete the quest (which will verify the post exists)
      await onPosted();
    } catch (e) {
      console.error('post', e);
      alert('Upload failed: ' + (e?.message || 'unknown'));
      setUploading(false);
    }
  };

  const isBusy = uploading || completing;

  return (
    <div className="fixed inset-0 overflow-y-auto" style={{ background: '#0a0a0b', color: '#fafaf9' }}>
      <div className="px-5 pt-5 pb-4 sticky top-0 z-10" style={{ background: '#0a0a0b', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center justify-between">
          <button onClick={onCancel} disabled={isBusy} className="text-sm" style={{ color: '#a1a1aa' }}>← Back</button>
          <p style={serif} className="text-xl">Prove it</p>
          <button
            onClick={handlePostAndComplete}
            disabled={!file || isBusy}
            className="px-4 py-1.5 rounded-full text-sm font-medium disabled:opacity-40"
            style={{ background: file ? 'linear-gradient(135deg, #fbbf24, #f97316)' : 'rgba(255,255,255,0.1)', color: file ? '#0a0a0b' : '#a1a1aa' }}
          >
            {uploading ? 'Posting…' : completing ? 'Completing…' : 'Post'}
          </button>
        </div>
      </div>

      <div className="px-5 py-4 max-w-2xl mx-auto space-y-3">
        <div className="rounded-2xl p-3 flex items-center gap-2" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <Sparkles size={14} style={{ color: meta.color }} />
          <p className="text-sm">{quest.template.title}</p>
        </div>

        <p className="text-xs px-1" style={{ color: '#fbbf24' }}>
          📸 A photo is required to complete this quest.
        </p>

        {!preview ? (
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full aspect-square rounded-3xl flex flex-col items-center justify-center transition-transform active:scale-[0.98]"
            style={{ background: 'rgba(255,255,255,0.04)', border: '2px dashed rgba(255,255,255,0.15)' }}
          >
            <Camera size={48} style={{ color: '#a1a1aa' }} className="mb-3" />
            <p style={serif} className="text-2xl mb-1">Add a photo</p>
            <p className="text-xs" style={{ color: '#71717a' }}>tap to choose or take one</p>
          </button>
        ) : (
          <div className="relative">
            <img src={preview} alt="" className="w-full aspect-square object-cover rounded-3xl" />
            <button
              onClick={() => { setFile(null); setPreview(null); }}
              className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}
            >
              <X size={16} />
            </button>
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePick}
          className="hidden"
        />

        <textarea
          value={caption}
          onChange={e => setCaption(e.target.value)}
          placeholder="Caption…"
          rows={2}
          maxLength={200}
          className="w-full rounded-2xl px-4 py-3 text-sm focus:outline-none resize-none"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#fafaf9' }}
        />

        <button
          onClick={handleTagLocation}
          disabled={loadingLocation}
          className="w-full rounded-2xl px-4 py-3 flex items-center gap-3 text-left text-sm"
          style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${location ? meta.color + '50' : 'rgba(255,255,255,0.08)'}` }}
        >
          <MapPin size={16} style={{ color: location ? meta.color : '#a1a1aa' }} />
          <span style={{ color: location ? meta.color : '#a1a1aa' }}>
            {loadingLocation ? 'Getting location…'
              : location ? `Tagged: ${location.name}`
              : 'Tag with your location (recommended — shows on map)'}
          </span>
        </button>

        <p className="text-[10px] text-center pt-2" style={{ color: '#71717a' }}>
          Only friends and group members can see your posts.
        </p>
      </div>
    </div>
  );
}
