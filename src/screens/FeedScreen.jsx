import React, { useEffect, useState, useRef } from 'react';
import { Map as MapIcon, Grid3x3, Layers, ChevronLeft, ChevronRight, MessageCircle, X, Send, MapPin } from 'lucide-react';
import { getFeed, getMapPins, toggleReaction, getPostComments, addComment } from '../lib/feed.js';
import { CATEGORY_META } from '../lib/xp.js';

const serif = { fontFamily: "'Instrument Serif', serif", fontStyle: 'italic' };

const REACTION_EMOJIS = ['🔥', '⭐', '👏', '❤️', '🤯'];

export default function FeedScreen({ profile }) {
  const [view, setView] = useState('stories'); // 'stories' | 'grid' | 'map'
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeStoryIndex, setActiveStoryIndex] = useState(null);
  const [commentsForPost, setCommentsForPost] = useState(null);

  // Load feed posts (used by stories + grid)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await getFeed({ limit: 50 });
      if (!cancelled) {
        setPosts(data);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-4 pb-4">
      <div className="pt-2 flex items-end justify-between">
        <div>
          <h1 style={serif} className="text-4xl">Feed</h1>
          <p className="text-sm" style={{ color: '#a1a1aa' }}>What your crew is up to.</p>
        </div>
      </div>

      {/* View toggle */}
      <div className="flex gap-1 p-1 rounded-full" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <ToggleBtn active={view === 'stories'} onClick={() => setView('stories')} icon={Layers} label="Stories" />
        <ToggleBtn active={view === 'grid'} onClick={() => setView('grid')} icon={Grid3x3} label="Grid" />
        <ToggleBtn active={view === 'map'} onClick={() => setView('map')} icon={MapIcon} label="Map" />
      </div>

      {loading && view !== 'map' ? (
        <p className="text-sm py-4" style={{ color: '#71717a' }}>Loading…</p>
      ) : view === 'stories' ? (
        posts.length === 0 ? <EmptyState /> :
          <StoryStrip
            posts={posts}
            onOpen={(idx) => setActiveStoryIndex(idx)}
          />
      ) : view === 'grid' ? (
        posts.length === 0 ? <EmptyState /> :
          <GridFeed posts={posts} onOpen={(idx) => { setView('stories'); setActiveStoryIndex(idx); }} />
      ) : (
        <MapView profile={profile} />
      )}

      {/* Story viewer overlay */}
      {activeStoryIndex !== null && (
        <StoryViewer
          posts={posts}
          startIndex={activeStoryIndex}
          profile={profile}
          onClose={() => setActiveStoryIndex(null)}
          onOpenComments={(post) => setCommentsForPost(post)}
          onUpdatePost={(updatedPost) => {
            setPosts(p => p.map(x => x.post_id === updatedPost.post_id ? updatedPost : x));
          }}
        />
      )}

      {/* Comments sheet */}
      {commentsForPost && (
        <CommentsSheet
          post={commentsForPost}
          profile={profile}
          onClose={() => setCommentsForPost(null)}
        />
      )}
    </div>
  );
}

// ============================================================
// EMPTY STATE
// ============================================================
function EmptyState() {
  return (
    <div className="rounded-3xl p-10 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="text-6xl mb-3">📸</div>
      <p style={serif} className="text-2xl mb-2">No posts yet</p>
      <p className="text-sm max-w-xs mx-auto" style={{ color: '#a1a1aa' }}>
        Complete a quest and share a photo. Friends' posts will appear here.
      </p>
    </div>
  );
}

function ToggleBtn({ active, onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 py-2 rounded-full text-xs font-medium flex items-center justify-center gap-1.5 transition-all"
      style={{
        background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
        color: active ? '#fafaf9' : '#71717a'
      }}
    >
      <Icon size={14} /> {label}
    </button>
  );
}

// ============================================================
// STORIES STRIP — Instagram-style horizontal avatar carousel at top
// + a featured polaroid card preview of the most recent post.
// Tapping any avatar opens the fullscreen story viewer.
// ============================================================
function StoryStrip({ posts, onOpen }) {
  // Group posts by author so each "story" represents a person's recent posts
  const byAuthor = posts.reduce((acc, p) => {
    if (!acc[p.author_id]) acc[p.author_id] = { author: p, posts: [] };
    acc[p.author_id].posts.push(p);
    return acc;
  }, {});
  const authorGroups = Object.values(byAuthor);

  return (
    <div className="space-y-4">
      {/* Avatar carousel */}
      <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {authorGroups.map((group, idx) => {
          const author = group.author;
          const firstPostIdx = posts.findIndex(p => p.post_id === group.posts[0].post_id);
          return (
            <button
              key={author.author_id}
              onClick={() => onOpen(firstPostIdx)}
              className="flex-shrink-0 flex flex-col items-center gap-1.5"
            >
              <div
                className="w-16 h-16 rounded-full p-0.5"
                style={{ background: 'linear-gradient(135deg, #fbbf24, #f97316, #f43f5e)' }}
              >
                <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center" style={{ background: '#0a0a0b', border: '2px solid #0a0a0b' }}>
                  {author.photo_url ? (
                    <img src={author.photo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span style={serif} className="text-2xl">
                      {(author.author_display_name || author.author_username)[0].toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
              <span className="text-[10px] truncate max-w-[64px]" style={{ color: '#a1a1aa' }}>
                {author.author_display_name || author.author_username}
              </span>
            </button>
          );
        })}
      </div>

      {/* Featured polaroid: first/most recent post */}
      {posts[0] && (
        <button
          onClick={() => onOpen(0)}
          className="w-full text-left rounded-3xl overflow-hidden transition-transform active:scale-[0.98] block relative"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 20px 60px -20px rgba(0,0,0,0.5)'
          }}
        >
          {posts[0].photo_url ? (
            <div className="relative aspect-[4/5] overflow-hidden">
              <img src={posts[0].photo_url} alt="" className="w-full h-full object-cover" />
              {/* Gradient overlay for text legibility */}
              <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.85) 100%)' }} />
              {/* Caption at bottom */}
              <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                <p className="text-[10px] uppercase tracking-[0.2em] mb-2 opacity-80">
                  {CATEGORY_META[posts[0].quest_category]?.icon} {posts[0].quest_title}
                </p>
                <p style={serif} className="text-2xl leading-tight">
                  {posts[0].author_display_name || posts[0].author_username}
                </p>
                {posts[0].caption && (
                  <p className="text-sm mt-1 opacity-90">{posts[0].caption}</p>
                )}
              </div>
            </div>
          ) : (
            <PolaroidNoPhoto post={posts[0]} />
          )}
        </button>
      )}

      {/* Recent posts list (smaller, below the featured) */}
      {posts.length > 1 && (
        <div className="space-y-2 pt-2">
          <p className="text-[10px] uppercase tracking-[0.2em] px-1" style={{ color: '#71717a' }}>
            More from your crew
          </p>
          {posts.slice(1, 6).map((post, idx) => (
            <button
              key={post.post_id}
              onClick={() => onOpen(idx + 1)}
              className="w-full text-left rounded-2xl p-3 flex items-center gap-3"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              {post.photo_url ? (
                <img src={post.photo_url} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: CATEGORY_META[post.quest_category]?.gradient }}>
                  <span className="text-2xl">{CATEGORY_META[post.quest_category]?.icon}</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">
                  <span className="font-medium">{post.author_display_name || post.author_username}</span>
                  <span style={{ color: '#71717a' }}> · {post.quest_title}</span>
                </p>
                {post.caption && <p className="text-xs truncate" style={{ color: '#71717a' }}>{post.caption}</p>}
              </div>
              <span className="text-xs" style={{ color: '#71717a' }}>{timeAgo(post.created_at)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PolaroidNoPhoto({ post }) {
  const meta = CATEGORY_META[post.quest_category] || CATEGORY_META.adventure;
  return (
    <div className="aspect-[4/5] p-6 flex flex-col justify-end" style={{ background: meta.gradient }}>
      <p className="text-[10px] uppercase tracking-[0.2em] mb-2 text-white opacity-80">
        {meta.icon} {post.quest_title}
      </p>
      <p style={serif} className="text-2xl leading-tight text-white">
        {post.author_display_name || post.author_username}
      </p>
      {post.caption && <p className="text-sm mt-1 text-white opacity-90">{post.caption}</p>}
    </div>
  );
}

// ============================================================
// GRID FEED — Instagram grid view
// ============================================================
function GridFeed({ posts, onOpen }) {
  return (
    <div className="grid grid-cols-3 gap-1">
      {posts.map((post, idx) => (
        <button
          key={post.post_id}
          onClick={() => onOpen(idx)}
          className="aspect-square overflow-hidden relative active:scale-[0.96] transition-transform"
          style={{ background: CATEGORY_META[post.quest_category]?.gradient }}
        >
          {post.photo_url ? (
            <img src={post.photo_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl">
              {CATEGORY_META[post.quest_category]?.icon}
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

// ============================================================
// STORY VIEWER — fullscreen Instagram-style with tap-to-advance
// ============================================================
function StoryViewer({ posts, startIndex, profile, onClose, onOpenComments, onUpdatePost }) {
  const [index, setIndex] = useState(startIndex);
  const post = posts[index];
  const meta = CATEGORY_META[post?.quest_category] || CATEGORY_META.adventure;

  // Local reactions state — start with what the server gave us
  const [reactions, setReactions] = useState(post?.my_reactions || []);
  const [reactionCount, setReactionCount] = useState(post?.reaction_count || 0);

  // When we navigate to a different post, sync local state
  useEffect(() => {
    setReactions(post?.my_reactions || []);
    setReactionCount(post?.reaction_count || 0);
  }, [post?.post_id]);

  if (!post) return null;

  const goPrev = () => setIndex(i => Math.max(0, i - 1));
  const goNext = () => {
    if (index >= posts.length - 1) onClose();
    else setIndex(i => i + 1);
  };

  // Tap on left third = prev, right two-thirds = next
  const handleTap = (e) => {
    const x = e.clientX;
    const w = window.innerWidth;
    if (x < w / 3) goPrev();
    else goNext();
  };

  const handleReaction = async (emoji) => {
    try {
      const added = await toggleReaction(post.post_id, emoji);
      const newReactions = added
        ? [...reactions, emoji]
        : reactions.filter(e => e !== emoji);
      const newCount = added ? reactionCount + 1 : reactionCount - 1;
      setReactions(newReactions);
      setReactionCount(newCount);
      onUpdatePost({
        ...post,
        my_reactions: newReactions,
        reaction_count: newCount
      });
    } catch (e) {
      console.error('reaction', e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#000' }}>
      {/* Progress bars at top */}
      <div className="absolute top-0 left-0 right-0 z-20 px-2 pt-2 flex gap-1">
        {posts.map((_, i) => (
          <div key={i} className="flex-1 h-0.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.3)' }}>
            <div
              className="h-full rounded-full"
              style={{
                width: i < index ? '100%' : i === index ? '100%' : '0%',
                background: '#fafaf9'
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 px-4 pt-6 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
          <span style={serif} className="text-lg text-white">
            {(post.author_display_name || post.author_username)[0].toUpperCase()}
          </span>
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-white">{post.author_display_name || post.author_username}</p>
          <p className="text-[10px] text-white/70">{timeAgo(post.created_at)}</p>
        </div>
        <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <X size={18} className="text-white" />
        </button>
      </div>

      {/* Photo / content area — tap to advance */}
      <div className="flex-1 relative" onClick={handleTap}>
        {post.photo_url ? (
          <img src={post.photo_url} alt="" className="absolute inset-0 w-full h-full object-contain" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center p-8" style={{ background: meta.gradient }}>
            <p style={serif} className="text-5xl text-white text-center">{post.quest_title}</p>
          </div>
        )}

        {/* Quest tag overlay */}
        <div className="absolute top-20 left-4 right-4 flex">
          <span className="text-[10px] uppercase tracking-[0.2em] px-2.5 py-1 rounded-full text-white" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}>
            {meta.icon} {post.quest_title} · +{post.quest_xp_reward} XP
          </span>
        </div>

        {/* Bottom overlay: caption, location, reactions */}
        <div
          className="absolute bottom-0 left-0 right-0 p-4 pb-6 pointer-events-none"
          style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.9) 100%)' }}
        >
          {post.caption && (
            <p style={serif} className="text-2xl leading-tight text-white mb-2">
              {post.caption}
            </p>
          )}
          {post.location_name && (
            <p className="text-xs text-white/80 mb-3 flex items-center gap-1">
              <MapPin size={12} /> {post.location_name}
            </p>
          )}

          {/* Reactions row — pointer-events re-enabled */}
          <div className="flex items-center gap-2 pointer-events-auto" onClick={e => e.stopPropagation()}>
            {REACTION_EMOJIS.map(emoji => {
              const isActive = reactions.includes(emoji);
              return (
                <button
                  key={emoji}
                  onClick={() => handleReaction(emoji)}
                  className="text-2xl px-2.5 py-1.5 rounded-full transition-transform active:scale-90"
                  style={{
                    background: isActive ? 'rgba(251,191,36,0.25)' : 'rgba(255,255,255,0.1)',
                    border: `1px solid ${isActive ? '#fbbf24' : 'transparent'}`,
                    backdropFilter: 'blur(12px)'
                  }}
                >
                  {emoji}
                </button>
              );
            })}
            <button
              onClick={() => onOpenComments(post)}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs text-white"
              style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)' }}
            >
              <MessageCircle size={14} /> {post.comment_count || 0}
            </button>
          </div>

          {reactionCount > 0 && (
            <p className="text-[10px] text-white/60 mt-2">
              {reactionCount} reaction{reactionCount === 1 ? '' : 's'}
            </p>
          )}
        </div>

        {/* Tap zones (invisible) */}
        <button onClick={(e) => { e.stopPropagation(); goPrev(); }} className="absolute left-0 top-0 bottom-0 w-1/4 opacity-0" aria-label="Previous" />
        <button onClick={(e) => { e.stopPropagation(); goNext(); }} className="absolute right-0 top-0 bottom-0 w-1/4 opacity-0" aria-label="Next" />
      </div>
    </div>
  );
}

// ============================================================
// COMMENTS SHEET — bottom drawer
// ============================================================
function CommentsSheet({ post, profile, onClose }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  const reload = async () => {
    const c = await getPostComments(post.post_id);
    setComments(c);
    setLoading(false);
  };

  useEffect(() => { reload(); }, [post.post_id]);

  const send = async () => {
    if (!body.trim() || sending) return;
    setSending(true);
    try {
      await addComment(post.post_id, body);
      setBody('');
      await reload();
    } catch (e) {
      alert('Could not post comment: ' + e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div
        className="w-full max-h-[80vh] rounded-t-3xl flex flex-col"
        style={{ background: '#0a0a0b', border: '1px solid rgba(255,255,255,0.1)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <h2 style={serif} className="text-2xl">Comments</h2>
          <button onClick={onClose} className="text-2xl" style={{ color: '#71717a' }}>×</button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {loading ? (
            <p className="text-sm" style={{ color: '#71717a' }}>Loading…</p>
          ) : comments.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: '#71717a' }}>Be the first to comment.</p>
          ) : (
            comments.map(c => (
              <div key={c.id} className="flex gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  {(c.author_display_name || c.author_username)[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs">
                    <span className="font-medium">{c.author_display_name || c.author_username}</span>
                    <span className="ml-2" style={{ color: '#71717a' }}>{timeAgo(c.created_at)}</span>
                  </p>
                  <p className="text-sm mt-0.5">{c.body}</p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="px-5 py-3 flex items-center gap-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <input
            value={body}
            onChange={e => setBody(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
            placeholder="Add a comment…"
            className="flex-1 rounded-full px-4 py-2.5 text-sm focus:outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#fafaf9' }}
          />
          <button
            onClick={send}
            disabled={!body.trim() || sending}
            className="w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-30"
            style={{ background: 'linear-gradient(135deg, #fbbf24, #f97316)', color: '#0a0a0b' }}
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MAP VIEW — Bump-style dark map with photo pins
// ============================================================
function MapView({ profile }) {
  const [pins, setPins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPin, setSelectedPin] = useState(null);
  const containerRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    (async () => {
      const data = await getMapPins();
      setPins(data);
      setLoading(false);
    })();
  }, []);

  // Initialize Leaflet map once pins are loaded
  useEffect(() => {
    if (loading || !containerRef.current || mapRef.current) return;

    // Lazy-load Leaflet from CDN to keep main bundle small
    const ensureLeaflet = async () => {
      if (window.L) return window.L;
      // Inject CSS
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(css);
      // Inject JS
      await new Promise((resolve) => {
        const s = document.createElement('script');
        s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        s.onload = resolve;
        document.head.appendChild(s);
      });
      return window.L;
    };

    (async () => {
      const L = await ensureLeaflet();

      // Default center: Budapest if no pins, else first pin
      const center = pins.length > 0 ? [pins[0].lat, pins[0].lng] : [47.4979, 19.0402];

      const map = L.map(containerRef.current, {
        center,
        zoom: 12,
        zoomControl: false,
        attributionControl: false
      });

      // CartoDB DarkMatter tiles — the cohesive dark aesthetic
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        subdomains: 'abcd',
        maxZoom: 19
      }).addTo(map);

      // Add custom pins for each post
      pins.forEach(pin => {
        const meta = CATEGORY_META[pin.quest_category] || CATEGORY_META.adventure;
        // Build a custom DivIcon that looks like a photo thumbnail with category accent
        const html = pin.photo_url
          ? `<div style="
              position: relative;
              width: 48px;
              height: 56px;
            ">
              <div style="
                width: 48px;
                height: 48px;
                border-radius: 50%;
                overflow: hidden;
                border: 2px solid ${meta.color};
                box-shadow: 0 4px 12px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.1);
                background-image: url('${pin.photo_url}');
                background-size: cover;
                background-position: center;
              "></div>
              <div style="
                position: absolute;
                bottom: -4px;
                left: 50%;
                transform: translateX(-50%);
                width: 0;
                height: 0;
                border-left: 6px solid transparent;
                border-right: 6px solid transparent;
                border-top: 8px solid ${meta.color};
              "></div>
            </div>`
          : `<div style="
              width: 32px;
              height: 32px;
              border-radius: 50%;
              background: ${meta.color};
              border: 2px solid white;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 14px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.4);
            ">${meta.icon}</div>`;

        const icon = L.divIcon({
          html,
          className: 'sidequest-pin',
          iconSize: [48, 56],
          iconAnchor: [24, 56]
        });

        L.marker([pin.lat, pin.lng], { icon })
          .addTo(map)
          .on('click', () => setSelectedPin(pin));
      });

      // If we have multiple pins, fit bounds to show all
      if (pins.length > 1) {
        const bounds = L.latLngBounds(pins.map(p => [p.lat, p.lng]));
        map.fitBounds(bounds, { padding: [40, 40] });
      }

      mapRef.current = map;
    })();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [loading, pins]);

  return (
    <div className="space-y-3">
      <div
        ref={containerRef}
        className="w-full rounded-3xl overflow-hidden"
        style={{
          height: '500px',
          background: '#0f0f12',
          border: '1px solid rgba(255,255,255,0.08)'
        }}
      />

      {loading ? (
        <p className="text-sm text-center" style={{ color: '#71717a' }}>Loading map…</p>
      ) : pins.length === 0 ? (
        <p className="text-sm text-center" style={{ color: '#71717a' }}>
          No tagged posts yet. Tag a location when sharing a quest moment.
        </p>
      ) : (
        <p className="text-xs text-center" style={{ color: '#71717a' }}>
          {pins.length} memor{pins.length === 1 ? 'y' : 'ies'} on the map
        </p>
      )}

      {/* Selected pin detail card */}
      {selectedPin && (
        <PinDetailCard pin={selectedPin} onClose={() => setSelectedPin(null)} />
      )}
    </div>
  );
}

function PinDetailCard({ pin, onClose }) {
  const meta = CATEGORY_META[pin.quest_category] || CATEGORY_META.adventure;
  return (
    <div className="fixed inset-x-0 bottom-20 z-40 px-4">
      <div
        className="rounded-2xl p-3 flex items-center gap-3 max-w-md mx-auto"
        style={{
          background: 'rgba(10,10,11,0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 12px 32px rgba(0,0,0,0.6)'
        }}
      >
        {pin.photo_url && (
          <img src={pin.photo_url} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-widest" style={{ color: meta.color }}>
            {meta.icon} {pin.quest_title}
          </p>
          <p className="text-sm font-medium truncate mt-0.5">
            {pin.author_username}
          </p>
          {pin.caption && <p className="text-xs truncate" style={{ color: '#a1a1aa' }}>{pin.caption}</p>}
          {pin.location_name && <p className="text-[10px]" style={{ color: '#71717a' }}>📍 {pin.location_name}</p>}
        </div>
        <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

// ============================================================
// HELPERS
// ============================================================
function timeAgo(iso) {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}
