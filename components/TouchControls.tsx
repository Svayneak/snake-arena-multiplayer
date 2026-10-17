'use client';

import React from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Play, Pause, RotateCcw } from 'lucide-react';

interface TouchControlsProps {
  onDirection: (dir: { x: number; y: number }) => void;
  onPauseToggle: () => void;
  onRestart: () => void;
  isPaused: boolean;
  controlType: 'cursor' | 'wasd';
  onToggleControlType: () => void;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  onDirection,
  onPauseToggle,
  onRestart,
  isPaused,
  controlType,
  onToggleControlType
}) => {
  const triggerDir = (e: React.TouchEvent | React.MouseEvent, dir: { x: number; y: number }) => {
    e.preventDefault();
    onDirection(dir);
  };

  return (
    <div className="w-full max-w-md mx-auto mt-3 px-2 flex flex-col items-center gap-3 select-none touch-none">
      {/* Mode Switcher Banner */}
      <div className="w-full flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-1.5 text-xs">
        <span className="text-slate-400 font-semibold flex items-center gap-1.5">
          <span>📱 Modo Táctil:</span>
          <span className="text-emerald-400 font-bold">
            {controlType === 'cursor' ? 'Seguidor de Dedo' : 'D-Pad / Botones'}
          </span>
        </span>

        <button
          onClick={onToggleControlType}
          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-200 border border-slate-700 transition"
        >
          Cambiar a {controlType === 'cursor' ? 'D-Pad' : 'Dedo'}
        </button>
      </div>

      {/* D-Pad controls (Only active in WASD/D-Pad mode) */}
      {controlType === 'wasd' && (
        <div className="flex items-center justify-between w-full max-w-sm px-4 py-2 bg-slate-900/60 backdrop-blur-sm border border-slate-800/80 rounded-2xl shadow-xl">
          {/* Virtual D-Pad Cross */}
          <div className="grid grid-cols-3 gap-2 w-36 h-36">
            <div />
            <button
              onTouchStart={(e) => triggerDir(e, { x: 0, y: -1 })}
              onMouseDown={(e) => triggerDir(e, { x: 0, y: -1 })}
              className="h-11 w-11 rounded-xl bg-slate-800/90 hover:bg-emerald-500 active:bg-emerald-400 active:text-slate-950 text-slate-200 flex items-center justify-center border border-slate-700/80 shadow-md shadow-slate-950/40 transition"
              aria-label="Arriba"
            >
              <ArrowUp className="h-6 w-6 stroke-[2.5]" />
            </button>
            <div />

            <button
              onTouchStart={(e) => triggerDir(e, { x: -1, y: 0 })}
              onMouseDown={(e) => triggerDir(e, { x: -1, y: 0 })}
              className="h-11 w-11 rounded-xl bg-slate-800/90 hover:bg-emerald-500 active:bg-emerald-400 active:text-slate-950 text-slate-200 flex items-center justify-center border border-slate-700/80 shadow-md shadow-slate-950/40 transition"
              aria-label="Izquierda"
            >
              <ArrowLeft className="h-6 w-6 stroke-[2.5]" />
            </button>
            <div className="flex items-center justify-center text-[10px] text-slate-600 font-mono font-bold">
              🕹️
            </div>
            <button
              onTouchStart={(e) => triggerDir(e, { x: 1, y: 0 })}
              onMouseDown={(e) => triggerDir(e, { x: 1, y: 0 })}
              className="h-11 w-11 rounded-xl bg-slate-800/90 hover:bg-emerald-500 active:bg-emerald-400 active:text-slate-950 text-slate-200 flex items-center justify-center border border-slate-700/80 shadow-md shadow-slate-950/40 transition"
              aria-label="Derecha"
            >
              <ArrowRight className="h-6 w-6 stroke-[2.5]" />
            </button>

            <div />
            <button
              onTouchStart={(e) => triggerDir(e, { x: 0, y: 1 })}
              onMouseDown={(e) => triggerDir(e, { x: 0, y: 1 })}
              className="h-11 w-11 rounded-xl bg-slate-800/90 hover:bg-emerald-500 active:bg-emerald-400 active:text-slate-950 text-slate-200 flex items-center justify-center border border-slate-700/80 shadow-md shadow-slate-950/40 transition"
              aria-label="Abajo"
            >
              <ArrowDown className="h-6 w-6 stroke-[2.5]" />
            </button>
            <div />
          </div>

          {/* Quick Action Side Buttons (Pause & Restart) */}
          <div className="flex flex-col gap-2">
            <button
              onTouchStart={(e) => { e.preventDefault(); onPauseToggle(); }}
              onClick={onPauseToggle}
              className={`h-11 px-3 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-bold transition shadow-md ${
                isPaused
                  ? 'bg-emerald-500 border-emerald-400 text-slate-950 shadow-emerald-500/20'
                  : 'bg-slate-800 border-slate-700 text-slate-300'
              }`}
            >
              {isPaused ? <Play className="h-4 w-4 fill-current" /> : <Pause className="h-4 w-4" />}
              <span>{isPaused ? 'Reanudar' : 'Pausa'}</span>
            </button>

            <button
              onTouchStart={(e) => { e.preventDefault(); onRestart(); }}
              onClick={onRestart}
              className="h-11 px-3 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-slate-300 flex items-center justify-center gap-1.5 text-xs font-bold transition shadow-md"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Reiniciar</span>
            </button>
          </div>
        </div>
      )}

      {/* Guide text for touch follower mode */}
      {controlType === 'cursor' && (
        <div className="text-[11px] text-slate-400 text-center bg-slate-900/40 border border-slate-800/60 rounded-xl px-4 py-2">
          👉 <span className="font-semibold text-emerald-300">Modo Táctil Continuo:</span> Desliza o mantén tu dedo en la arena y la víbora te seguirá suavemente en tiempo real.
        </div>
      )}
    </div>
  );
};
