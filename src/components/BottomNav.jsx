import React from 'react';
import { Home, Compass, Users, Image, User } from 'lucide-react';

export default function BottomNav({ view, setView }) {
  const items = [
    { id: 'home',    icon: Home,    label: 'Today' },
    { id: 'explore', icon: Compass, label: 'Explore' },
    { id: 'groups',  icon: Users,   label: 'Groups' },
    { id: 'feed',    icon: Image,   label: 'Feed' },
    { id: 'profile', icon: User,    label: 'Profile' }
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30"
      style={{
        background: 'rgba(10,10,11,0.9)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        paddingBottom: 'env(safe-area-inset-bottom)'
      }}
    >
      <div className="max-w-2xl mx-auto flex items-center justify-around py-2 px-2">
        {items.map(({ id, icon: Icon, label }) => {
          const active = view === id;
          return (
            <button
              key={id}
              onClick={() => setView(id)}
              className="flex flex-col items-center gap-1 px-3 py-1.5"
              style={{ color: active ? '#fafaf9' : '#71717a' }}
            >
              <Icon size={20} strokeWidth={active ? 2.4 : 1.6} />
              <span className="text-[10px]">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
