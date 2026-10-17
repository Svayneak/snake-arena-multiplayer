'use client';

import React, { useRef, useEffect } from 'react';
import { Maximize2, Minimize2, Flame, Bot, User, Skull } from 'lucide-react';

export interface ArenaSlotData {
  slotId: number;
  connected: boolean;
  isBot: boolean;
  name: string;
  status: 'empty' | 'waiting' | 'ready' | 'playing' | 'eliminated';
  score: number;
  apples: number;
  goldenApples?: number;
  goldenAppleTimer?: number;
  speed?: number;
  alive: boolean;
  head?: { x: number; y: number };
  trail?: Array<{ x: number; y: number }>;
  food?: { x: number; y: number } | null;
  goldenApple?: { x: number; y: number; timer?: number } | null;
}

const SLOT_THEMES = [
  { name: 'Emerald', primary: '#10b981', head: '#34d399', glow: 'rgba(16, 185, 129, 0.4)', border: 'border-emerald-500/40' },
  { name: 'Cyan', primary: '#06b6d4', head: '#38bdf8', glow: 'rgba(6, 182, 212, 0.4)', border: 'border-cyan-500/40' },
  { name: 'Purple', primary: '#a855f7', head: '#c084fc', glow: 'rgba(168, 85, 247, 0.4)', border: 'border-purple-500/40' },
  { name: 'Amber', primary: '#f59e0b', head: '#fbbf24', glow: 'rgba(245, 158, 11, 0.4)', border: 'border-amber-500/40' },
  { name: 'Rose', primary: '#f43f5e', head: '#fb7185', glow: 'rgba(244, 63, 94, 0.4)', border: 'border-rose-500/40' },
  { name: 'Lime', primary: '#84cc16', head: '#a3e635', glow: 'rgba(132, 204, 22, 0.4)', border: 'border-lime-500/40' }
];

interface SpectatorMiniArenaProps {
  slot: ArenaSlotData;
  isSpotlight?: boolean;
  onToggleSpotlight?: (slotId: number) => void;
}

export const SpectatorMiniArena: React.FC<SpectatorMiniArenaProps> = ({
  slot,
  isSpotlight = false,
  onToggleSpotlight
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const theme = SLOT_THEMES[(slot.slotId - 1) % SLOT_THEMES.length];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const scale = w / 540; // Base arena is 540x540

    // Clear background
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, w, h);

    // Subtle grid pattern
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.45)';
    ctx.lineWidth = 1;
    const gridStep = 20 * scale;
    ctx.beginPath();
    for (let x = 0; x < w; x += gridStep) {
      ctx.moveTo(x, 0); ctx.lineTo(x, h);
    }
    for (let y = 0; y < h; y += gridStep) {
      ctx.moveTo(0, y); ctx.lineTo(w, y);
    }
    ctx.stroke();

    // If slot is empty or not alive
    if (slot.status === 'empty' || (!slot.connected && !slot.isBot)) {
      ctx.fillStyle = 'rgba(100, 116, 139, 0.4)';
      ctx.font = `600 ${Math.max(12, Math.round(14 * scale))}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('ESPERANDO JUGADOR', w / 2, h / 2);
      return;
    }

    // 1. Draw Food
    if (slot.food) {
      const fx = (slot.food.x + 0.5) * 20 * scale;
      const fy = (slot.food.y + 0.5) * 20 * scale;
      const r = Math.max(4, 7 * scale);

      ctx.save();
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 8 * scale;
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(fx, fy, r, 0, Math.PI * 2);
      ctx.fill();

      // Stem
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(fx, fy - r * 0.9, r * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 2. Draw Golden Apple if active
    if (slot.goldenApple) {
      const gx = (slot.goldenApple.x + 0.5) * 20 * scale;
      const gy = (slot.goldenApple.y + 0.5) * 20 * scale;
      const gr = Math.max(5, 9 * scale);

      ctx.save();
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 12 * scale;
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(gx, gy, gr, 0, Math.PI * 2);
      ctx.fill();

      // Timer ring
      if (slot.goldenAppleTimer && slot.goldenAppleTimer > 0) {
        const frac = slot.goldenAppleTimer / 8000;
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 2 * scale;
        ctx.beginPath();
        ctx.arc(gx, gy, gr * 1.45, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 3. Draw Snake Trail
    if (slot.trail && slot.trail.length > 0) {
      const segRadius = Math.max(3, 6 * scale);

      for (let i = slot.trail.length - 1; i >= 0; i--) {
        const pt = slot.trail[i];
        const px = pt.x * scale;
        const py = pt.y * scale;

        const progress = 1 - (i / slot.trail.length);
        const radius = Math.max(2, segRadius * (0.65 + progress * 0.35));

        ctx.fillStyle = theme.primary;
        ctx.globalAlpha = Math.max(0.35, progress);
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // 4. Draw Snake Head
    if (slot.head) {
      const hx = slot.head.x * scale;
      const hy = slot.head.y * scale;
      const headRadius = Math.max(4, 7.5 * scale);

      ctx.save();
      ctx.shadowColor = theme.head;
      ctx.shadowBlur = 10 * scale;
      ctx.fillStyle = theme.head;
      ctx.beginPath();
      ctx.arc(hx, hy, headRadius, 0, Math.PI * 2);
      ctx.fill();

      // Simple Eyes
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(hx - headRadius * 0.35, hy - headRadius * 0.35, headRadius * 0.28, 0, Math.PI * 2);
      ctx.arc(hx + headRadius * 0.35, hy - headRadius * 0.35, headRadius * 0.28, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(hx - headRadius * 0.35, hy - headRadius * 0.35, headRadius * 0.15, 0, Math.PI * 2);
      ctx.arc(hx + headRadius * 0.35, hy - headRadius * 0.35, headRadius * 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 5. Eliminated Overlay
    if (slot.status === 'eliminated' || (slot.connected && !slot.alive)) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#ef4444';
      ctx.font = `bold ${Math.max(12, Math.round(15 * scale))}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('ELIMINADO', w / 2, h / 2);
    }
  }, [slot, theme]);

  const canvasDim = isSpotlight ? 480 : 250;

  return (
    <div
      className={`relative flex flex-col rounded-2xl bg-slate-900/90 border transition-all duration-200 overflow-hidden shadow-lg ${
        slot.status === 'playing' ? theme.border : 'border-slate-800'
      } ${isSpotlight ? 'ring-2 ring-sky-400 shadow-sky-500/20' : 'hover:border-slate-700'}`}
    >
      {/* Slot Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-950/70 border-b border-slate-800/80 text-xs">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black text-slate-950 font-mono"
            style={{ backgroundColor: theme.primary }}
          >
            {slot.slotId}
          </span>
          <span className="font-bold text-slate-200 truncate max-w-[110px]" title={slot.name}>
            {slot.name}
          </span>
          {slot.isBot ? (
            <span className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-semibold border border-sky-500/30">
              <Bot className="h-2.5 w-2.5" /> IA
            </span>
          ) : slot.connected ? (
            <span className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
              <User className="h-2.5 w-2.5" /> P{slot.slotId}
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {/* Status Badge */}
          {slot.status === 'playing' && (
            <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> VIVO
            </span>
          )}
          {slot.status === 'eliminated' && (
            <span className="flex items-center gap-1 text-[10px] text-rose-400 font-bold">
              <Skull className="h-3 w-3" /> OUT
            </span>
          )}
          {slot.status === 'ready' && (
            <span className="text-[10px] text-sky-400 font-semibold">LISTO</span>
          )}
          {slot.status === 'empty' && (
            <span className="text-[10px] text-slate-500 font-medium">VACÍO</span>
          )}

          {/* Spotlight Toggle */}
          {onToggleSpotlight && (
            <button
              onClick={() => onToggleSpotlight(slot.slotId)}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title={isSpotlight ? 'Salir del modo Spotlight' : 'Maximizar cámara (Spotlight)'}
            >
              {isSpotlight ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Canvas Playfield */}
      <div className="relative flex items-center justify-center p-2 bg-slate-950/40">
        <canvas
          ref={canvasRef}
          width={canvasDim}
          height={canvasDim}
          className="rounded-xl block max-w-full h-auto aspect-square border border-slate-800/80"
          style={{ imageRendering: 'pixelated' }}
        />

        {/* Golden apple active pill banner */}
        {slot.goldenApple && slot.alive && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/90 text-slate-950 font-black text-[10px] shadow-md shadow-amber-500/30 animate-bounce">
            <Flame className="h-3 w-3 fill-current" /> DORADA
          </div>
        )}
      </div>

      {/* Slot Footer Stats */}
      <div className="grid grid-cols-2 gap-2 px-3 py-2 bg-slate-950/80 border-t border-slate-800/80 text-xs">
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-500 uppercase font-semibold">Puntaje</span>
          <span className="text-sm font-black text-amber-300 font-mono">{slot.score}</span>
        </div>
        <div className="flex flex-col text-right">
          <span className="text-[10px] text-slate-500 uppercase font-semibold">Manzanas</span>
          <span className="text-sm font-black text-rose-400 font-mono">🍎 {slot.apples}</span>
        </div>
      </div>
    </div>
  );
};
