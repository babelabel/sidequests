import React, { useState } from 'react';
import { signInWithEmail } from '../lib/auth.js';

const serif = { fontFamily: "'Instrument Serif', serif", fontStyle: 'italic' };

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim() || loading) return;
    setLoading(true);
    setError('');
    const { error } = await signInWithEmail(email.trim());
    setLoading(false);
    if (error) { setError(error.message); return; }
    setSent(true);
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{
        background: 'radial-gradient(ellipse at top, #1a0a2e 0%, #0a0a0b 50%)',
        color: '#fafaf9'
      }}
    >
      <div className="text-center mb-10 max-w-sm">
        <p className="text-xs uppercase tracking-[0.3em] mb-3" style={{ color: '#fbbf24' }}>summer · 2026</p>
        <h1 style={serif} className="text-7xl leading-none mb-3">sidequest</h1>
        <p className="text-base" style={{ color: '#a1a1aa' }}>
          Real-life adventures with friends. Skip the doomscroll. Go outside.
        </p>
      </div>

      {sent ? (
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-3">📬</div>
          <p style={serif} className="text-2xl mb-2">Check your email</p>
          <p className="text-sm" style={{ color: '#a1a1aa' }}>
            We sent a sign-in link to <span style={{ color: '#fafaf9' }}>{email}</span>. Click it to enter.
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="w-full max-w-sm">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            className="w-full rounded-2xl px-4 py-3.5 text-sm mb-3 focus:outline-none"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#fafaf9'
            }}
          />
          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="w-full rounded-2xl py-3.5 font-medium text-sm transition-transform active:scale-95 disabled:opacity-40"
            style={{
              background: 'linear-gradient(135deg, #fbbf24, #f97316)',
              color: '#0a0a0b'
            }}
          >
            {loading ? 'Sending…' : 'Send magic link'}
          </button>
          {error && <p className="text-xs mt-3 text-center" style={{ color: '#ef4444' }}>{error}</p>}
          <p className="text-[10px] text-center mt-4" style={{ color: '#71717a' }}>
            No password needed. We email you a sign-in link.
          </p>
        </form>
      )}
    </div>
  );
}
