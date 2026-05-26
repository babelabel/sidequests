import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { CATEGORY_META } from '../lib/xp.js';
import QuestCard from '../components/QuestCard.jsx';
import { acceptQuest } from '../lib/quests.js';

const serif = { fontFamily: "'Instrument Serif', serif", fontStyle: 'italic' };

export default function ExploreScreen({ profile, onOpenQuest }) {
  const [templates, setTemplates] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('quest_templates')
        .select('*')
        .order('rarity', { ascending: false });
      setTemplates(data || []);
      setLoading(false);
    })();
  }, []);

  const filtered = filter === 'all'
    ? templates
    : templates.filter(t => t.category === filter);

  const handleAccept = async (template) => {
    try {
      const q = await acceptQuest({ templateId: template.id, ownerId: profile.id });
      onOpenQuest(q.id);
    } catch (e) {
      console.error('accept quest', e);
      alert('Could not accept: ' + (e?.message || 'unknown error'));
    }
  };

  return (
    <div className="space-y-4 pb-4">
      <div className="pt-2">
        <h1 style={serif} className="text-4xl">Explore</h1>
        <p className="text-sm" style={{ color: '#a1a1aa' }}>Pick your own quest.</p>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        <FilterChip active={filter === 'all'} onClick={() => setFilter('all')} label="All" />
        {Object.entries(CATEGORY_META).map(([key, meta]) => (
          <FilterChip
            key={key}
            active={filter === key}
            onClick={() => setFilter(key)}
            label={`${meta.icon} ${meta.label}`}
            color={meta.color}
          />
        ))}
      </div>

      {loading ? (
        <p className="text-sm" style={{ color: '#71717a' }}>Loading…</p>
      ) : (
        <div className="space-y-3">
          {filtered.map(t => (
            <QuestCard key={t.id} template={t} onClick={() => handleAccept(t)} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({ active, onClick, label, color }) {
  return (
    <button
      onClick={onClick}
      className="text-xs px-3 py-1.5 rounded-full whitespace-nowrap flex-shrink-0"
      style={{
        background: active ? (color || '#fafaf9') : 'rgba(255,255,255,0.05)',
        color: active ? (color ? '#fff' : '#0a0a0b') : '#a1a1aa',
        border: '1px solid rgba(255,255,255,0.08)'
      }}
    >
      {label}
    </button>
  );
}
