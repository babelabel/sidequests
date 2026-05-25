import React from 'react';

const serif = { fontFamily: "'Instrument Serif', serif", fontStyle: 'italic' };

export default function FeedScreen({ profile }) {
  return (
    <div className="space-y-4 pb-4">
      <div className="pt-2">
        <h1 style={serif} className="text-4xl">Feed</h1>
        <p className="text-sm" style={{ color: '#a1a1aa' }}>Your friends' adventures.</p>
      </div>

      <div className="rounded-3xl p-8 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="text-6xl mb-3">📸</div>
        <p style={serif} className="text-2xl mb-2">Coming in Wave 3</p>
        <p className="text-sm max-w-xs mx-auto" style={{ color: '#a1a1aa' }}>
          Photo uploads, captions, reactions, and the memory timeline. Ships after friends/groups are in.
        </p>
      </div>
    </div>
  );
}
