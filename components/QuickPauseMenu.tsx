'use client';

import React from 'react';
import { Play, RotateCcw, Shield, Zap, Compass, Monitor, BarChart2, Download, X } from 'lucide-react';
import { cursorTracker } from '@/lib/tracker';

interface QuickPauseMenuProps {
  isOpen: boolean;
  gameMode: 'classic' | 'portal';
  difficulty: 'easy' | 'normal' | 'hard' | 'insane';
  controlType: 'cursor' | 'wasd';
  isWidescreen: boolean;
  onResume: () => void;
  onRestart: () => void;
  onModeChange: (mode: 'classic' | 'portal') => void;
  onDifficultyChange: (diff: 'easy' | 'normal' | 'hard' | 'insane') => void;
  onControlChange: (control: 'cursor' | 'wasd') => void;
  onToggleArena: () => void;
  onOpenLeaderboard: () => void;
  onClose: () => void;
}

export const QuickPauseMenu: React.FC<QuickPauseMenuProps> = ({
  isOpen,
  gameMode,
  difficulty,
  controlType,
  isWidescreen,
  onResume,
  onRestart,
  onModeChange,
  onDifficultyChange,
  onControlChange,
  onToggleArena,
  onOpenLeaderboard,
  onClose,
}) => {
  if (!isOpen) return null;

  const handleDownloadTelemetryJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(cursorTracker.exportJSON());
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `telemetry_flight_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(2, 6, 23, 0.80)',
        backdropFilter: 'blur(6px)'
      }}
    >
      <div 
        className="relative w-full max-w-lg rounded-2xl border border-sky-500/40 bg-slate-900/95 p-6 shadow-2xl shadow-sky-950/60 text-slate-100"
        style={{
          backgroundColor: '#0f172a',
          border: '1px solid rgba(56, 189, 248, 0.4)',
          borderRadius: '16px',
          padding: '24px',
          maxWidth: '480px',
          width: '100%'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-sky-400 animate-pulse shadow-sm shadow-sky-400" />
            <h2 className="text-xl font-bold tracking-wide text-sky-400">Menú Rápido de Pausa</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar menú"
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-4 space-y-4">
          {/* Main Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onResume}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-3 font-semibold text-slate-950 shadow-lg shadow-emerald-500/20 hover:brightness-110 active:scale-[0.98] transition"
            >
              <Play className="h-5 w-5 fill-current" />
              Reanudar (Zero-Jump)
            </button>
            <button
              onClick={onRestart}
              className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-3 font-semibold text-slate-200 hover:bg-slate-700 active:scale-[0.98] transition border border-slate-700"
            >
              <RotateCcw className="h-5 w-5" />
              Nueva Partida
            </button>
          </div>

          {/* Mode Selector */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
              Modo de Paredes
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onModeChange('portal')}
                className={`flex items-center justify-center gap-2 rounded-lg py-2.5 px-3 text-sm font-medium border transition ${
                  gameMode === 'portal'
                    ? 'bg-sky-500/20 border-sky-400 text-sky-300 shadow-sm shadow-sky-500/20'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <Zap className="h-4 w-4 text-sky-400" />
                🌀 Atraviesa (Portal)
              </button>
              <button
                onClick={() => onModeChange('classic')}
                className={`flex items-center justify-center gap-2 rounded-lg py-2.5 px-3 text-sm font-medium border transition ${
                  gameMode === 'classic'
                    ? 'bg-rose-500/20 border-rose-400 text-rose-300 shadow-sm shadow-rose-500/20'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <Shield className="h-4 w-4 text-rose-400" />
                🧱 Clásico (Mortal)
              </button>
            </div>
          </div>

          {/* Controls and Difficulty in Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                Control
              </label>
              <select
                value={controlType}
                onChange={(e) => onControlChange(e.target.value as 'cursor' | 'wasd')}
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500"
              >
                <option value="cursor">🖱️ Cursor Libre</option>
                <option value="wasd">⌨️ Teclado WASD</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                Dificultad
              </label>
              <select
                value={difficulty}
                onChange={(e) => onDifficultyChange(e.target.value as 'easy' | 'normal' | 'hard' | 'insane')}
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500"
              >
                <option value="easy">Fácil</option>
                <option value="normal">Normal</option>
                <option value="hard">Difícil</option>
                <option value="insane">🔥 Insano</option>
              </select>
            </div>
          </div>

          {/* Arena & Utility Options */}
          <div className="pt-2 border-t border-slate-800 flex flex-wrap gap-2">
            <button
              onClick={onToggleArena}
              className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700 border border-slate-700 transition"
            >
              <Monitor className="h-4 w-4 text-sky-400" />
              {isWidescreen ? 'Arena Estándar' : '🖥️ Arena Widescreen'}
            </button>
            <button
              onClick={() => cursorTracker.toggleHud()}
              className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700 border border-slate-700 transition"
            >
              <Compass className="h-4 w-4 text-emerald-400" />
              📡 Alternar HUD (T)
            </button>
            <button
              onClick={onOpenLeaderboard}
              className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700 border border-slate-700 transition"
            >
              <BarChart2 className="h-4 w-4 text-amber-400" />
              🏆 Récords
            </button>
            <button
              onClick={handleDownloadTelemetryJSON}
              className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700 border border-slate-700 transition"
            >
              <Download className="h-4 w-4 text-purple-400" />
              Exportar Telemetría
            </button>
          </div>
        </div>

        {/* Footer tip */}
        <p className="mt-4 text-center text-xs text-slate-500">
          Tip: El juego sincroniza la cabeza al cursor directamente al reanudar para evitar saltos bruscos.
        </p>
      </div>
    </div>
  );
};
