'use client';

import React, { useState } from 'react';
import { SpectatorMiniArena, ArenaSlotData } from './SpectatorMiniArena';
import { LayoutGrid, Minimize2 } from 'lucide-react';

interface SpectatorGridProps {
  slots: ArenaSlotData[];
}

export const SpectatorGrid: React.FC<SpectatorGridProps> = ({ slots }) => {
  const [spotlightSlotId, setSpotlightSlotId] = useState<number | null>(null);

  const handleToggleSpotlight = (slotId: number) => {
    setSpotlightSlotId(prev => (prev === slotId ? null : slotId));
  };

  const spotlightSlot = spotlightSlotId ? slots.find(s => s.slotId === spotlightSlotId) : null;
  const otherSlots = spotlightSlotId ? slots.filter(s => s.slotId !== spotlightSlotId) : slots;

  return (
    <div className="w-full flex flex-col items-center">
      {/* Spotlight Active View */}
      {spotlightSlot ? (
        <div className="w-full flex flex-col gap-6 items-center">
          <div className="w-full flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 rounded-full bg-sky-400 animate-pulse shadow-sm shadow-sky-400" />
              <h3 className="text-sm font-bold tracking-wide text-sky-400 uppercase">
                Cámara Principal (Spotlight): Slot #{spotlightSlot.slotId} - {spotlightSlot.name}
              </h3>
            </div>
            <button
              onClick={() => setSpotlightSlotId(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Volver a Grilla 6
            </button>
          </div>

          <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Big Spotlight Arena */}
            <div className="lg:col-span-7 flex justify-center">
              <div className="w-full max-w-xl">
                <SpectatorMiniArena
                  slot={spotlightSlot}
                  isSpotlight={true}
                  onToggleSpotlight={handleToggleSpotlight}
                />
              </div>
            </div>

            {/* Other 5 slots sidebar */}
            <div className="lg:col-span-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-3">
              {otherSlots.map(slot => (
                <SpectatorMiniArena
                  key={slot.slotId}
                  slot={slot}
                  isSpotlight={false}
                  onToggleSpotlight={handleToggleSpotlight}
                />
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Full 6-Grid View */
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {slots.map(slot => (
            <SpectatorMiniArena
              key={slot.slotId}
              slot={slot}
              isSpotlight={false}
              onToggleSpotlight={handleToggleSpotlight}
            />
          ))}
        </div>
      )}
    </div>
  );
};
