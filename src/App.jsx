import React, { useState, useEffect } from 'react';
import { useAuth, signOut } from './lib/auth.js';
import AuthScreen from './screens/AuthScreen.jsx';
import HomeScreen from './screens/HomeScreen.jsx';
import QuestDetailScreen from './screens/QuestDetailScreen.jsx';
import ProfileScreen from './screens/ProfileScreen.jsx';
import FriendsScreen from './screens/FriendsScreen.jsx';
import ExploreScreen from './screens/ExploreScreen.jsx';
import GroupsScreen from './screens/GroupsScreen.jsx';
import FeedScreen from './screens/FeedScreen.jsx';
import BottomNav from './components/BottomNav.jsx';

// Inject Google Fonts once
function useFonts() {
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&display=swap';
    document.head.appendChild(link);
    return () => { try { document.head.removeChild(link); } catch {} };
  }, []);
}

export default function App() {
  useFonts();
  const { user, profile, loading, refreshProfile } = useAuth();
  const [view, setView] = useState('home');
  const [activeQuestId, setActiveQuestId] = useState(null);
  const [showFriends, setShowFriends] = useState(false);

  // Wrap signOut to also reset local view state — prevents UI getting stuck
  const handleSignOut = async () => {
    await signOut();
    setView('home');
    setActiveQuestId(null);
    setShowFriends(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0b', color: '#fafaf9' }}>
        <p style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic' }} className="text-3xl">
          loading…
        </p>
      </div>
    );
  }

  if (!user) return <AuthScreen />;

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0b', color: '#fafaf9' }}>
        <p style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic' }} className="text-3xl">
          setting up your profile…
        </p>
      </div>
    );
  }

  // Quest detail is a full-screen overlay
  if (activeQuestId) {
    return (
      <QuestDetailScreen
        questId={activeQuestId}
        profile={profile}
        onClose={() => setActiveQuestId(null)}
        onCompleted={async () => { await refreshProfile(); setActiveQuestId(null); }}
      />
    );
  }

  // Friends screen is a sub-page of Profile
  if (showFriends) {
    return (
      <div className="min-h-screen pb-20" style={{ background: '#0a0a0b', color: '#fafaf9' }}>
        <div className="max-w-2xl mx-auto px-4 pt-4">
          <FriendsScreen profile={profile} onClose={() => setShowFriends(false)} />
        </div>
        <BottomNav view={view} setView={(v) => { setShowFriends(false); setView(v); }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20" style={{ background: '#0a0a0b', color: '#fafaf9' }}>
      <div className="max-w-2xl mx-auto px-4 pt-4">
        {view === 'home' && <HomeScreen profile={profile} onOpenQuest={setActiveQuestId} />}
        {view === 'explore' && <ExploreScreen profile={profile} onOpenQuest={setActiveQuestId} />}
        {view === 'groups' && <GroupsScreen profile={profile} onOpenQuest={setActiveQuestId} />}
        {view === 'feed' && <FeedScreen profile={profile} />}
        {view === 'profile' && (
          <ProfileScreen
            profile={profile}
            onSignOut={handleSignOut}
            onOpenFriends={() => setShowFriends(true)}
          />
        )}
      </div>
      <BottomNav view={view} setView={setView} />
    </div>
  );
}
