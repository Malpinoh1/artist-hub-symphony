import React from 'react';
import { createRoot } from 'react-dom/client';
import MilestonePromoCard from '@/components/achievements/MilestonePromoCard';

export function mount(milestone = 10000) {
  const el = document.createElement('div');
  document.body.appendChild(el);
  createRoot(el).render(
    <MilestonePromoCard
      open
      onOpenChange={() => {}}
      data={{
        milestone,
        streamsAtAward: 12480,
        awardedAt: new Date().toISOString(),
        releaseTitle: 'Midnight Frequencies (Deluxe Edition)',
        coverUrl: null,
        artistName: 'Malpinoh',
      }}
    />,
  );
}
