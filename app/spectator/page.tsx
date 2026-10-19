'use client';

import React, { useState, useEffect, useRef } from 'react';
import { SpectatorGrid } from '../../components/SpectatorGrid';
import { ArenaSlotData } from '../../components/SpectatorMiniArena';
import { 
  Play, RotateCcw, Bot, ExternalLink, Radio, Trophy, Sparkles, Copy, Check, Users, Key, Hash, RefreshCw
} from 'lucide-react';

export default function SpectatorPage() {
  const [roomId, setRoomId] = useState<string>('ARENA-1');
  const [roomInput, setRoomInput] = useState<string>('ARENA-1');
  const [slots, setSlots] = useState<ArenaSlotData[]>(() => {
    return Array.from({ length: 6 }, (_, i) => ({
      slotId: i + 1,
      connected: false,
      isBot: i > 0,
      name: i === 0 ? 'Slot 1' : `Bot #${i + 1}`,
      status: 'empty',
      score: 0,
      apples: 0,
      alive: false
    }));
  });

  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [botsEnabled, setBotsEnabled] = useState<boolean>(true);
  const [activeCountdown, setActiveCountdown] = useState<number | null>(null);
  const [fpsCounter, setFpsCounter] = useState<number>(30);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const framesReceivedRef = useRef<number>(0);

  // Initialize Room from URL Query Param (?room=...)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const queryRoom = params.get('room');
      if (queryRoom) {
        const clean = queryRoom.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 16);
        if (clean) {
          setRoomId(clean);
          setRoomInput(clean);
        }
      }
    }
  }, []);

  // Connect to Relay Server on Port 3500 for the current roomId
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (typeof window === 'undefined') return;
      const isSecure = window.location.protocol === 'https:';
      const protocol = isSecure ? 'wss:' : 'ws:';
      let url: string;

      if (isSecure || !window.location.port || window.location.port === '80' || window.location.port === '443') {
        url = `${protocol}//${window.location.host}/ws`;
      } else {
        const host = window.location.hostname || 'localhost';
        url = `${protocol}//${host}:3500`;
      }

      try {
        ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
          setIsConnected(true);
          console.log(`[Spectator] Conectado a Relay en ${url} para la Sala: ${roomId}`);
          ws?.send(JSON.stringify({ 
            type: 'REGISTER_SPECTATOR',
            roomId: roomId
          }));
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            if (data.type === 'ARENA_SNAPSHOT') {
              if (data.roomId && data.roomId !== roomId) return; // Filtrar otras salas
              framesReceivedRef.current++;
              if (Array.isArray(data.slots)) {
                setSlots(data.slots);
              }
              if (data.botsEnabled !== undefined) {
                setBotsEnabled(data.botsEnabled);
              }
              if (data.activeCountdown !== undefined) {
                setActiveCountdown(data.activeCountdown);
              }
            } else if (data.type === 'COUNTDOWN_TICK') {
              if (data.roomId && data.roomId !== roomId) return;
              setActiveCountdown(data.count);
            } else if (data.type === 'COUNTDOWN_START') {
              if (data.roomId && data.roomId !== roomId) return;
              setActiveCountdown(0);
              setTimeout(() => setActiveCountdown(null), 1000);
            } else if (data.type === 'ROOM_STATUS') {
              if (data.roomId && data.roomId !== roomId) return;
              if (data.botsEnabled !== undefined) setBotsEnabled(data.botsEnabled);
              if (Array.isArray(data.slots)) setSlots(data.slots);
            }
          } catch {}
        };

        ws.onclose = () => {
          setIsConnected(false);
          reconnectTimeout = setTimeout(connect, 2000);
        };

        ws.onerror = () => {
          setIsConnected(false);
        };
      } catch {
        reconnectTimeout = setTimeout(connect, 2000);
      }
    };

    connect();

    // FPS meter interval
    const fpsInterval = setInterval(() => {
      setFpsCounter(framesReceivedRef.current);
      framesReceivedRef.current = 0;
    }, 1000);

    return () => {
      clearInterval(fpsInterval);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) {
        try { ws.close(); } catch {}
      }
    };
  }, [roomId]);

  const handleStartCountdown = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ 
        type: 'START_COUNTDOWN', 
        roomId,
        countdownSec: 3 
      }));
    }
  };

  const handleToggleBots = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ 
        type: 'TOGGLE_BOTS', 
        roomId,
        enabled: !botsEnabled 
      }));
    }
  };

  const handleResetRound = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ 
        type: 'RESET_ROUND',
        roomId
      }));
    }
  };

  const handleSwitchRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = roomInput.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 16);
    if (clean && clean !== roomId) {
      setRoomId(clean);
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.set('room', clean);
        window.history.pushState({}, '', url.toString());
      }
    }
  };

  const handleGenerateRoom = () => {
    const randomCode = 'ARENA-' + Math.floor(1000 + Math.random() * 9000);
    setRoomId(randomCode);
    setRoomInput(randomCode);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('room', randomCode);
      window.history.pushState({}, '', url.toString());
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(text);
      setCopiedLink(label);
      setTimeout(() => setCopiedLink(null), 2000);
    }
  };

  const [shareHost, setShareHost] = useState<string>('192.168.1.5:3000');

  const getBaseOrigin = () => {
    if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return `http://${shareHost}`;
      }
      return origin;
    }
    return `http://${shareHost}`;
  };

  // Sort slots by score for the live leaderboard
  const rankedSlots = [...slots].sort((a, b) => b.score - a.score);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col p-3 sm:p-6 select-none">
      {/* Global Countdown Overlay */}
      {activeCountdown !== null && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150"
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
          <div className="flex flex-col items-center gap-3 text-center animate-in zoom-in-75 duration-200">
            <div className="text-8xl sm:text-9xl font-black font-mono tracking-wider bg-gradient-to-r from-emerald-400 via-teal-300 to-sky-400 bg-clip-text text-transparent drop-shadow-2xl">
              {activeCountdown > 0 ? activeCountdown : '¡YA!'}
            </div>
            <p className="text-sm font-bold tracking-widest text-slate-300 uppercase">
              {activeCountdown > 0 ? `SALA ${roomId}: Preparando Ronda...` : '¡RONDA EN MARCHA!'}
            </p>
          </div>
        </div>
      )}

      {/* Spectator Top Control Header */}
      <header className="w-full max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800/80 mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-sky-500/20 border border-emerald-500/40 text-2xl shadow-lg shadow-emerald-500/10">
            🐍
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black tracking-wider bg-gradient-to-r from-emerald-400 via-teal-300 to-sky-400 bg-clip-text text-transparent">
                SNAKE ARENA • SALA DE ESPECTADORES
              </h1>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                isConnected 
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                  : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
              }`}>
                <Radio className={`h-3 w-3 ${isConnected ? 'animate-pulse text-emerald-400' : 'text-rose-400'}`} />
                {isConnected ? `EN VIVO (${fpsCounter} FPS)` : 'CONECTANDO...'}
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-2">
              <span>Transmisión aislada por salas y tokens de jugador</span>
              <span>•</span>
              <span className="text-emerald-400 font-semibold font-mono">Sala Activa: {roomId}</span>
            </p>
          </div>
        </div>

        {/* Room Switcher & Generation */}
        <div className="flex items-center gap-2">
          <form onSubmit={handleSwitchRoom} className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl p-1">
            <Hash className="h-3.5 w-3.5 text-slate-400 ml-2" />
            <input
              type="text"
              value={roomInput}
              onChange={(e) => setRoomInput(e.target.value.toUpperCase())}
              placeholder="CÓDIGO SALA"
              maxLength={16}
              className="bg-transparent text-xs font-mono font-bold text-emerald-300 px-2 py-1 outline-none w-28 uppercase"
            />
            <button
              type="submit"
              className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
            >
              Ir
            </button>
          </form>

          <button
            onClick={handleGenerateRoom}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 font-semibold transition"
            title="Crear nueva sala con código aleatorio"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Nueva Sala</span>
          </button>
        </div>

        {/* Host Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Start Synchronized Round */}
          <button
            onClick={handleStartCountdown}
            disabled={!isConnected}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 active:scale-[0.98] text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition"
          >
            <Play className="h-4 w-4 fill-current" />
            Iniciar Ronda Sincronizada (3..2..1)
          </button>

          {/* Toggle AI Bots */}
          <button
            onClick={handleToggleBots}
            disabled={!isConnected}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition ${
              botsEnabled 
                ? 'bg-sky-500/20 border-sky-400/60 text-sky-300 shadow-sm shadow-sky-500/20' 
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
            }`}
          >
            <Bot className="h-3.5 w-3.5" />
            Bots IA: {botsEnabled ? 'ON (Slots vacíos)' : 'OFF'}
          </button>

          {/* Reset Round */}
          <button
            onClick={handleResetRound}
            disabled={!isConnected}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold transition"
            title="Reiniciar marcadores y posiciones"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reiniciar
          </button>

          {/* Copy Spectator Link */}
          <button
            onClick={() => copyToClipboard(`${getBaseOrigin()}/spectator?room=${roomId}`, 'spectator')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold transition"
          >
            {copiedLink === 'spectator' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            <span>Copiar Enlace Espectador</span>
          </button>
        </div>
      </header>

      {/* Room Invitation & Slots Bar */}
      <section className="w-full max-w-7xl mx-auto mb-4 bg-slate-900/90 border border-slate-800/90 rounded-2xl p-3 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-800 mb-2">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Invitación a Jugadores para la Sala {roomId} (Hasta 6 jugadores simultáneos)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-950/60 px-2 py-1 rounded-lg border border-slate-800">
              <span className="text-[11px] font-semibold">Host Wi-Fi:</span>
              <input
                type="text"
                value={shareHost}
                onChange={(e) => setShareHost(e.target.value)}
                className="bg-slate-900 text-emerald-400 border border-slate-700 px-1.5 py-0.5 rounded text-[11px] font-mono font-bold w-32 outline-none"
                title="IP de tu PC para que otros dispositivos se conecten"
              />
            </div>

            <button
              onClick={() => copyToClipboard(`${getBaseOrigin()}/?room=${roomId}`, 'general')}
              className="flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1 rounded-lg border border-emerald-500/30 transition"
            >
              {copiedLink === 'general' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              <span>Copiar Enlace General</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {slots.map((s) => {
            const slotLink = `${getBaseOrigin()}/?room=${roomId}&slot=${s.slotId}`;
            return (
              <div 
                key={s.slotId}
                className={`p-2 rounded-xl border text-xs flex flex-col justify-between gap-1.5 ${
                  s.connected
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                    : s.isBot
                      ? 'bg-sky-950/20 border-sky-500/30 text-sky-300'
                      : 'bg-slate-950/60 border-slate-800/80 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold font-mono">Slot #{s.slotId}</span>
                  {s.connected ? (
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                      <Key className="h-2.5 w-2.5" /> Token
                    </span>
                  ) : s.isBot ? (
                    <span className="text-[10px] text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded">
                      Bot IA
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500">Libre</span>
                  )}
                </div>

                <div className="font-bold truncate text-[11px] text-slate-200">
                  {s.connected ? s.name : s.isBot ? s.name : 'Disponible'}
                </div>

                <button
                  onClick={() => copyToClipboard(slotLink, `slot-${s.slotId}`)}
                  className="w-full flex items-center justify-center gap-1 py-1 rounded bg-slate-800/80 hover:bg-slate-700 text-[10px] font-semibold text-slate-300 transition"
                >
                  {copiedLink === `slot-${s.slotId}` ? (
                    <>
                      <Check className="h-2.5 w-2.5 text-emerald-400" />
                      <span>Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-2.5 w-2.5" />
                      <span>Copiar Link Slot</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Main 6-Grid Section */}
      <div className="w-full max-w-7xl mx-auto flex-1 flex flex-col gap-6">
        <SpectatorGrid slots={slots} />

        {/* Live Arena Leaderboard Summary */}
        <section className="w-full rounded-2xl bg-slate-900/80 border border-slate-800 p-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                Clasificación de la Sala {roomId} (Ronda Actual)
              </h2>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-slate-400">
              <Sparkles className="h-3 w-3 text-emerald-400" />
              <span>Transmisión aislada a 30 FPS</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {rankedSlots.map((slot, rank) => (
              <div
                key={slot.slotId}
                className={`flex items-center justify-between p-2 rounded-xl border ${
                  rank === 0 && slot.score > 0
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={`font-mono text-xs font-black ${rank === 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                    #{rank + 1}
                  </span>
                  <span className="text-xs font-bold truncate max-w-[80px]">
                    {slot.name}
                  </span>
                </div>
                <div className="font-mono text-xs font-bold text-amber-400">
                  {slot.score}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto text-center py-4 text-xs text-slate-500 border-t border-slate-900 mt-6 space-y-1">
        <p>
          🎮 <span className="font-semibold text-slate-400">Snake Arena Multi-Room Spectator</span> • 
          Transmisión sincronizada de 6 instancias individuales por sala
        </p>
      </footer>
    </main>
  );
}
