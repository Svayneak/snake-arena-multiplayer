'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Trophy, Download, Trash2, X, Flame, Apple } from 'lucide-react';
import { scoreManager, HighScoreEntry, PlayerStats } from '@/lib/storage';
import { arenaNet } from '@/lib/network';

interface LeaderboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ isOpen, onClose }) => {
  const [filter, setFilter] = useState<string>('all');
  const [scores, setScores] = useState<HighScoreEntry[]>([]);
  const [stats, setStats] = useState<PlayerStats>({
    gamesPlayed: 0,
    totalApples: 0,
    highestScore: 0,
    goldenApplesEaten: 0,
  });
  const [confirmClearOpen, setConfirmClearOpen] = useState<boolean>(false);

  const loadData = useCallback(() => {
    setScores(scoreManager.getScores(filter));
    setStats(scoreManager.getStats());
  }, [filter]);

  useEffect(() => {
    if (isOpen) {
      loadData();
      arenaNet.requestHighScores();
    }
    scoreManager.onChange(loadData);
    return () => {
      scoreManager.offChange(loadData);
    };
  }, [isOpen, loadData]);

  if (!isOpen) return null;

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(scoreManager.exportScoresJSON());
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `snake_scores_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExportCSV = () => {
    const dataStr = 'data:text/csv;charset=utf-8,' + encodeURIComponent(scoreManager.exportScoresCSV());
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `snake_scores_${Date.now()}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleClear = () => {
    scoreManager.clearScores();
    arenaNet.clearHighScores();
    setConfirmClearOpen(false);
    loadData();
  };

  const filters = [
    { id: 'all', label: 'Todas' },
    { id: 'portal', label: '🌀 Atraviesa' },
    { id: 'classic', label: '🧱 Clásico' },
    { id: 'easy', label: 'Fácil' },
    { id: 'normal', label: 'Normal' },
    { id: 'hard', label: 'Difícil' },
    { id: 'insane', label: 'Insano' },
  ];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in duration-200"
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
        backgroundColor: 'rgba(2, 6, 23, 0.85)',
        backdropFilter: 'blur(8px)'
      }}
    >
      <div 
        className="relative w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl text-slate-100 max-h-[90vh] flex flex-col"
        style={{
          backgroundColor: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '16px',
          padding: '24px',
          maxWidth: '640px',
          width: '100%',
          maxHeight: '90vh'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-amber-400" />
            <h2 className="text-xl font-bold tracking-wide text-amber-400">Tabla de Puntuaciones</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar modal"
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Global Stats */}
        <div className="grid grid-cols-4 gap-2 my-4">
          <div className="rounded-xl bg-slate-800/60 border border-slate-700/60 p-2.5 text-center">
            <div className="text-xs text-slate-400">Partidas</div>
            <div className="text-lg font-bold text-sky-400">{stats.gamesPlayed}</div>
          </div>
          <div className="rounded-xl bg-slate-800/60 border border-slate-700/60 p-2.5 text-center">
            <div className="text-xs text-slate-400">Manzanas</div>
            <div className="text-lg font-bold text-rose-400 flex items-center justify-center gap-1">
              <Apple className="h-4 w-4" />
              {stats.totalApples}
            </div>
          </div>
          <div className="rounded-xl bg-slate-800/60 border border-slate-700/60 p-2.5 text-center">
            <div className="text-xs text-slate-400">Doradas</div>
            <div className="text-lg font-bold text-amber-400 flex items-center justify-center gap-1">
              <Flame className="h-4 w-4" />
              {stats.goldenApplesEaten}
            </div>
          </div>
          <div className="rounded-xl bg-slate-800/60 border border-slate-700/60 p-2.5 text-center">
            <div className="text-xs text-slate-400">Récord Max</div>
            <div className="text-lg font-bold text-emerald-400">{stats.highestScore}</div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-1.5 pb-3">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                filter === f.id
                  ? 'bg-amber-400/20 text-amber-300 border border-amber-400/50'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Scores Table */}
        <div className="flex-1 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/50">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-slate-900 border-b border-slate-800 text-xs text-slate-400">
              <tr>
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3">Piloto</th>
                <th className="py-2.5 px-3 text-right">Puntos</th>
                <th className="py-2.5 px-3">Modo</th>
                <th className="py-2.5 px-3">Dificultad</th>
                <th className="py-2.5 px-3">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-slate-300">
              {scores.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No hay puntuaciones registradas para este filtro.
                  </td>
                </tr>
              ) : (
                scores.map((item, idx) => {
                  let medal = null;
                  if (idx === 0) medal = '🥇';
                  else if (idx === 1) medal = '🥈';
                  else if (idx === 2) medal = '🥉';

                  return (
                    <tr key={item.id || idx} className="hover:bg-slate-800/30 transition">
                      <td className="py-2 px-3 font-semibold text-slate-400">
                        {medal ? <span className="text-base mr-1">{medal}</span> : idx + 1}
                      </td>
                      <td className="py-2 px-3 font-medium text-slate-200 flex items-center gap-1.5">
                        {item.name}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-amber-300">
                        {item.score}
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-[11px] font-semibold ${
                            item.gameMode === 'portal'
                              ? 'bg-sky-500/20 text-sky-400'
                              : 'bg-rose-500/20 text-rose-400'
                          }`}
                        >
                          {item.gameMode === 'portal' ? '🌀 Atraviesa' : '🧱 Clásico'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-xs capitalize text-slate-400">
                        {item.difficulty}
                      </td>
                      <td className="py-2 px-3 text-xs text-slate-500 whitespace-nowrap">
                        {item.date}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Actions */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={handleExportJSON}
              className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 transition"
            >
              <Download className="h-3.5 w-3.5 text-sky-400" />
              JSON
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 transition"
            >
              <Download className="h-3.5 w-3.5 text-emerald-400" />
              CSV / Excel
            </button>
          </div>

          <button
            onClick={() => setConfirmClearOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-rose-500/10 px-3 py-1.5 text-xs text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 transition"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Limpiar Tabla
          </button>
        </div>

        {/* Confirm Clear Modal */}
        {confirmClearOpen && (
          <div className="absolute inset-0 bg-slate-950/90 rounded-2xl flex items-center justify-center p-6 z-10 animate-in fade-in">
            <div className="text-center space-y-4 max-w-sm">
              <h3 className="text-lg font-bold text-rose-400">¿Borrar todos los récords?</h3>
              <p className="text-xs text-slate-400">
                Esta acción eliminará todas las puntuaciones guardadas de forma irreversible.
              </p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => setConfirmClearOpen(false)}
                  className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleClear}
                  className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500"
                >
                  Sí, eliminar todo
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
