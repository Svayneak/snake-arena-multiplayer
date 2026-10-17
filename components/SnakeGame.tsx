'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  Trophy, Volume2, VolumeX, Maximize2, Minimize2, 
  Play, Pause, RotateCcw, Flame, Sparkles, Compass,
  Key, Hash, Users, ExternalLink, RefreshCw, Smartphone, Monitor
} from 'lucide-react';
import { SnakeGame, GameOverData } from '@/lib/engine';
import { soundManager } from '@/lib/audio';
import { scoreManager } from '@/lib/storage';
import { cursorTracker } from '@/lib/tracker';
import { QuickPauseMenu } from './QuickPauseMenu';
import { Leaderboard } from './Leaderboard';
import { arenaNet } from '@/lib/network';
import { detectDevice, DeviceInfo } from '@/lib/device';
import { touchTracker } from '@/lib/touchTracker';
import { TouchControls } from './TouchControls';

// Confetti particle helper
function triggerConfettiBurst() {
  if (typeof window === 'undefined') return;
  try {
    // If external canvas-confetti is available
    import('canvas-confetti').then((confettiModule) => {
      const confetti = confettiModule.default || confettiModule;
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    }).catch(() => {});
  } catch {}
}

export const SnakeGameComponent: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<SnakeGame | null>(null);

  // Reactive State
  const [gameState, setGameState] = useState<string>('idle');
  const [score, setScore] = useState<number>(0);
  const [apples, setApples] = useState<number>(0);
  const [bestScore, setBestScore] = useState<number>(0);
  const [difficulty, setDifficulty] = useState<'easy' | 'normal' | 'hard' | 'insane'>('normal');
  const [gameMode, setGameMode] = useState<'classic' | 'portal'>('classic');
  const [controlType, setControlType] = useState<'cursor' | 'wasd'>('cursor');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isWidescreen, setIsWidescreen] = useState<boolean>(false);

  // Bonus Golden Apple state
  const [bonusData, setBonusData] = useState<{ percent: number; remainingSec: number } | null>(null);

  // Modals
  const [isQuickPauseOpen, setIsQuickPauseOpen] = useState<boolean>(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState<boolean>(false);
  const [isGameOverModalOpen, setIsGameOverModalOpen] = useState<boolean>(false);
  const [gameOverInfo, setGameOverInfo] = useState<GameOverData | null>(null);
  const [playerName, setPlayerName] = useState<string>('');
  const [isHighScore, setIsHighScore] = useState<boolean>(false);
  const [scoreSaved, setScoreSaved] = useState<boolean>(false);

  // Multiplayer Spectator Stream & Room Tokens
  const [roomId, setRoomId] = useState<string>('ARENA-1');
  const [slotId, setSlotId] = useState<number>(1);
  const [playerToken, setPlayerToken] = useState<string | null>(null);
  const [isReconnected, setIsReconnected] = useState<boolean>(false);
  const [isNetConnected, setIsNetConnected] = useState<boolean>(false);
  const [countdownOverlay, setCountdownOverlay] = useState<number | null>(null);
  const [isRoomSwitcherOpen, setIsRoomSwitcherOpen] = useState<boolean>(false);
  const [roomInput, setRoomInput] = useState<string>('ARENA-1');

  // Device & Touchscreen Detection
  const [device, setDevice] = useState<DeviceInfo>(() => detectDevice());

  useEffect(() => {
    const d = detectDevice();
    setDevice(d);
    const handleResize = () => setDevice(detectDevice());
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // Track cursor coordinates
  const lastMousePosRef = useRef<{ clientX: number; clientY: number }>({ clientX: 0, clientY: 0 });

  // Initialize from storage
  useEffect(() => {
    const saved = scoreManager.getSettings();
    setDifficulty(saved.difficulty);
    setGameMode(saved.gameMode);
    setControlType(saved.controlType);
    setSoundEnabled(saved.soundEnabled);
    setBestScore(scoreManager.getTopScore(saved.difficulty));
    setPlayerName(scoreManager.getLastName());
  }, []);

  // Update best score when difficulty changes
  useEffect(() => {
    setBestScore(scoreManager.getTopScore(difficulty));
  }, [difficulty]);

  // Connect to Multiplayer Spectator Relay (Port 3500) with Room & Token
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const searchParams = new URLSearchParams(window.location.search);
    const queryRoom = searchParams.get('room');
    const finalRoom = queryRoom ? queryRoom.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 16) || 'ARENA-1' : 'ARENA-1';
    setRoomId(finalRoom);
    setRoomInput(finalRoom);

    const requestedSlot = searchParams.get('slot') ? parseInt(searchParams.get('slot')!, 10) : 1;
    const finalSlot = isNaN(requestedSlot) || requestedSlot < 1 || requestedSlot > 6 ? 1 : requestedSlot;
    setSlotId(finalSlot);

    arenaNet.connect(finalSlot, playerName || `Piloto #${finalSlot}`, finalRoom);

    const handleConn = (conn: unknown) => setIsNetConnected(!!conn);
    const handlePlayerRegistered = (reg: unknown) => {
      const p = reg as { slotId: number; token: string; isReconnect: boolean; roomId: string };
      setSlotId(p.slotId);
      setPlayerToken(p.token);
      setIsReconnected(p.isReconnect);
    };
    const handleCountTick = (cnt: unknown) => setCountdownOverlay(cnt as number);
    const handleCountStart = () => {
      setCountdownOverlay(0);
      setTimeout(() => setCountdownOverlay(null), 800);
      const game = gameRef.current;
      if (game) {
        setIsGameOverModalOpen(false);
        setIsQuickPauseOpen(false);
        game.resetGame();
        game.start();
      }
    };
    const handleRoundReset = () => {
      const game = gameRef.current;
      if (game) {
        game.resetGame();
      }
    };

    arenaNet.on('connection_change', handleConn);
    arenaNet.on('player_registered', handlePlayerRegistered);
    arenaNet.on('countdown_tick', handleCountTick);
    arenaNet.on('countdown_start', handleCountStart);
    arenaNet.on('round_reset', handleRoundReset);

    // 30 FPS telemetry stream to Spectator Relay
    const streamTimer = setInterval(() => {
      if (gameRef.current && arenaNet.isConnected) {
        arenaNet.sendFrame(gameRef.current.getFrameSnapshot());
      }
    }, 33);

    return () => {
      clearInterval(streamTimer);
      arenaNet.off('connection_change', handleConn);
      arenaNet.off('player_registered', handlePlayerRegistered);
      arenaNet.off('countdown_tick', handleCountTick);
      arenaNet.off('countdown_start', handleCountStart);
      arenaNet.off('round_reset', handleRoundReset);
    };
  }, [playerName]);

  // Instantiate Game Engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const game = new SnakeGame(canvas, {
      width: 540,
      height: 540,
      difficulty,
      gameMode,
      controlType,
      onScoreUpdate: (newScore, newApples, diff) => {
        setScore(newScore);
        setApples(newApples);
        const top = scoreManager.getTopScore(diff);
        setBestScore(Math.max(newScore, top));
      },
      onBonusUpdate: (bonus) => {
        setBonusData(bonus);
      },
      onStateChange: (state) => {
        setGameState(state);
      },
      onGameOver: (data) => {
        setGameOverInfo(data);
        setIsGameOverModalOpen(true);
        setScoreSaved(false);

        scoreManager.recordMatchStats(data.score, data.apples, data.goldenApples);
        const high = scoreManager.isHighScore(data.score, data.difficulty);
        setIsHighScore(high);

        if (high) {
          soundManager.playHighScore();
          triggerConfettiBurst();
        }
      }
    });

    gameRef.current = game;

    return () => {
      game.destroy();
      gameRef.current = null;
    };
  }, []);

  // Update arena size on widescreen toggle or window resize
  const handleResize = useCallback(() => {
    const game = gameRef.current;
    if (!game || !containerRef.current) return;

    if (isWidescreen) {
      const parent = containerRef.current.parentElement;
      const availableWidth = parent ? Math.min(parent.clientWidth - 32, 1100) : 900;
      const availableHeight = Math.min(window.innerHeight - 300, 680);
      const size = Math.max(480, Math.min(availableWidth, availableHeight));
      game.resizeArena(size * 1.35, size);
    } else {
      game.resizeArena(540, 540);
    }
  }, [isWidescreen]);

  useEffect(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  // Handle Mute
  const handleToggleSound = () => {
    const enabled = soundManager.toggle();
    setSoundEnabled(enabled);
    scoreManager.saveSettings({ soundEnabled: enabled });
  };

  // Handle Mode Change
  const handleModeChange = (newMode: 'classic' | 'portal') => {
    setGameMode(newMode);
    scoreManager.saveSettings({ gameMode: newMode });
    if (gameRef.current) {
      gameRef.current.setGameMode(newMode);
    }
  };

  // Handle Difficulty Change
  const handleDifficultyChange = (newDiff: 'easy' | 'normal' | 'hard' | 'insane') => {
    setDifficulty(newDiff);
    scoreManager.saveSettings({ difficulty: newDiff });
    if (gameRef.current) {
      gameRef.current.setDifficulty(newDiff);
    }
  };

  // Handle Control Change
  const handleControlChange = (newControl: 'cursor' | 'wasd') => {
    setControlType(newControl);
    scoreManager.saveSettings({ controlType: newControl });
    if (gameRef.current) {
      gameRef.current.setControlType(newControl);
    }
  };

  // Start / Pause / Resume
  const handleStartOrResume = () => {
    const game = gameRef.current;
    if (!game) return;

    if (game.state === SnakeGame.STATE_PLAYING) {
      game.pause();
    } else if (game.state === SnakeGame.STATE_PAUSED) {
      // Resume and sync head directly under current mouse coords (Zero-Jump)
      const canvas = canvasRef.current;
      if (canvas && controlType === 'cursor') {
        const rect = canvas.getBoundingClientRect();
        const cx = (lastMousePosRef.current.clientX - rect.left) * (game.width / rect.width);
        const cy = (lastMousePosRef.current.clientY - rect.top) * (game.height / rect.height);
        game.synchronizeCursorHead(cx, cy);
      }
      game.pause(); // unpause
      setIsQuickPauseOpen(false);
    } else {
      game.start();
    }
  };

  const handleRestart = () => {
    const game = gameRef.current;
    if (!game) return;
    setIsGameOverModalOpen(false);
    setIsQuickPauseOpen(false);
    game.resetGame();
    game.start();
  };

  // Canvas Mouse Move Handler (Continuous Cursor Follower)
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    lastMousePosRef.current = { clientX: e.clientX, clientY: e.clientY };
    const game = gameRef.current;
    const canvas = canvasRef.current;
    if (!game || !canvas || controlType !== 'cursor') return;

    const rect = canvas.getBoundingClientRect();
    const cx = (e.clientX - rect.left) * (game.width / rect.width);
    const cy = (e.clientY - rect.top) * (game.height / rect.height);

    game.updateCursorTrail(cx, cy, e.clientX, e.clientY);
  };

  // Right-Click Handler (Quick Pause Menu)
  const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const game = gameRef.current;
    if (!game) return;

    if (game.state === SnakeGame.STATE_PLAYING) {
      game.pause();
    }
    setIsQuickPauseOpen(true);
  };

  // Canvas Click Handler
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const game = gameRef.current;
    if (!game) return;

    if (game.state === SnakeGame.STATE_IDLE || game.state === SnakeGame.STATE_GAMEOVER) {
      const canvas = canvasRef.current;
      let spawnPos = null;
      if (canvas && controlType === 'cursor') {
        const rect = canvas.getBoundingClientRect();
        spawnPos = {
          x: (e.clientX - rect.left) * (game.width / rect.width),
          y: (e.clientY - rect.top) * (game.height / rect.height)
        };
      }
      game.start(spawnPos);
    } else if (game.state === SnakeGame.STATE_PAUSED) {
      handleStartOrResume();
    }
  };

  // Touchscreen Handlers (Continuous Touch Follower & Swipes)
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 0) return;
    const touch = e.touches[0];
    const canvas = canvasRef.current;
    const game = gameRef.current;
    if (!canvas || !game) return;

    lastMousePosRef.current = { clientX: touch.clientX, clientY: touch.clientY };
    const point = touchTracker.handleTouchStart(touch, canvas, game.width, game.height);

    if (game.state === SnakeGame.STATE_IDLE || game.state === SnakeGame.STATE_GAMEOVER) {
      game.start({ x: point.canvasX, y: point.canvasY });
    } else if (game.state === SnakeGame.STATE_PAUSED) {
      game.synchronizeCursorHead(point.canvasX, point.canvasY);
      game.pause();
      setIsQuickPauseOpen(false);
    } else if (controlType === 'cursor') {
      game.updateCursorTrail(point.canvasX, point.canvasY, touch.clientX, touch.clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 0) return;
    const touch = e.touches[0];
    const canvas = canvasRef.current;
    const game = gameRef.current;
    if (!canvas || !game) return;

    lastMousePosRef.current = { clientX: touch.clientX, clientY: touch.clientY };
    const { point, swipe } = touchTracker.handleTouchMove(touch, canvas, game.width, game.height);

    if (controlType === 'cursor') {
      game.updateCursorTrail(point.canvasX, point.canvasY, touch.clientX, touch.clientY);
    } else if (controlType === 'wasd' && swipe) {
      game.queueDirection(swipe.direction);
    }
  };

  const handleTouchEnd = () => {
    touchTracker.handleTouchEnd();
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const game = gameRef.current;
      if (!game) return;

      const key = e.key.toLowerCase();

      // Pause toggle
      if (key === ' ' || key === 'p') {
        e.preventDefault();
        handleStartOrResume();
        return;
      }

      // Restart
      if (key === 'r') {
        e.preventDefault();
        handleRestart();
        return;
      }

      // Telemetry HUD toggle
      if (key === 't') {
        e.preventDefault();
        cursorTracker.toggleHud();
        game.draw();
        return;
      }

      // WASD / Arrow directional controls
      if (controlType === 'wasd' && game.state === SnakeGame.STATE_PLAYING) {
        if (key === 'arrowup' || key === 'w') {
          e.preventDefault();
          game.queueDirection({ x: 0, y: -1 });
        } else if (key === 'arrowdown' || key === 's') {
          e.preventDefault();
          game.queueDirection({ x: 0, y: 1 });
        } else if (key === 'arrowleft' || key === 'a') {
          e.preventDefault();
          game.queueDirection({ x: -1, y: 0 });
        } else if (key === 'arrowright' || key === 'd') {
          e.preventDefault();
          game.queueDirection({ x: 1, y: 0 });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [controlType, gameState]);

  // Save Score from Game Over
  const handleSaveScore = () => {
    if (!gameOverInfo || scoreSaved) return;
    const finalName = playerName.trim() || 'PilotoSnake';
    scoreManager.saveScore({
      name: finalName,
      score: gameOverInfo.score,
      difficulty: gameOverInfo.difficulty,
      gameMode: gameOverInfo.gameMode,
      apples: gameOverInfo.apples,
      goldenApples: gameOverInfo.goldenApples
    });
    setScoreSaved(true);
    setBestScore(scoreManager.getTopScore(difficulty));
  };

  return (
    <div ref={containerRef} className="flex flex-col items-center w-full max-w-5xl mx-auto px-4 py-2 select-none">
      {/* Top Header & Status Bar */}
      <div className="w-full flex items-center justify-between py-2 border-b border-slate-800/80 mb-3 text-slate-200">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🐍</span>
            <span className="text-lg font-black tracking-wider bg-gradient-to-r from-emerald-400 via-teal-300 to-sky-400 bg-clip-text text-transparent">
              VÍBORA RETRO NEXT
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
              gameMode === 'portal' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
            }`}>
              {gameMode === 'portal' ? '🌀 Atraviesa Paredes' : '🧱 Clásico (Paredes Mortales)'}
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-slate-800 text-slate-300 capitalize border border-slate-700">
              {difficulty}
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-slate-800 text-slate-300 border border-slate-700">
              {controlType === 'cursor' ? (device.isTouch ? '👆 Táctil' : '🖱️ Cursor') : (device.isTouch ? '🕹️ D-Pad' : '⌨️ WASD')}
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-slate-800/80 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
              {device.isTouch ? <Smartphone className="h-3 w-3" /> : <Monitor className="h-3 w-3" />}
              <span>{device.isTouch ? 'Móvil Táctil' : 'PC'}</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Room & Token Indicator Button */}
          <button
            onClick={() => setIsRoomSwitcherOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 transition border border-slate-700/80 text-xs font-semibold"
            title="Cambiar Sala o Slot"
          >
            <span className="font-mono font-bold text-emerald-400">{roomId}</span>
            <span className="text-slate-600">•</span>
            <span className="font-mono text-slate-300">Slot #{slotId}</span>
            {playerToken && (
              <span 
                title={`Token Activo: ${playerToken.substring(0, 8)}... (${isReconnected ? 'Reconectado' : 'Asignado'})`} 
                className="inline-flex items-center text-amber-400 ml-0.5"
              >
                <Key className="h-3 w-3" />
              </span>
            )}
          </button>

          {/* Spectator Room Live Badge & Link */}
          <a
            href={`/spectator?room=${roomId}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition border border-slate-700/60 text-xs font-semibold group"
            title={`Abrir Sala de Espectadores para ${roomId}`}
          >
            <span className={`h-2 w-2 rounded-full ${isNetConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span className="hidden sm:inline group-hover:text-emerald-300 transition">
              {isNetConnected ? 'En Vivo' : 'Relay'}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">📺 Espectador ↗</span>
          </a>

          {/* Mute Button */}
          <button
            onClick={handleToggleSound}
            aria-label="Silenciar o activar sonido"
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition border border-slate-700/60"
            title="Activar / Desactivar Sonido"
          >
            {soundEnabled ? <Volume2 className="h-4 w-4 text-emerald-400" /> : <VolumeX className="h-4 w-4 text-slate-500" />}
          </button>

          {/* Widescreen Arena Toggle */}
          <button
            onClick={() => setIsWidescreen(!isWidescreen)}
            aria-label="Modo arena amplia"
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition border border-slate-700/60"
            title="Arena Amplia (Widescreen)"
          >
            {isWidescreen ? <Minimize2 className="h-4 w-4 text-sky-400" /> : <Maximize2 className="h-4 w-4 text-slate-300" />}
          </button>

          {/* Leaderboard button */}
          <button
            onClick={() => setIsLeaderboardOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold transition"
          >
            <Trophy className="h-4 w-4 text-amber-400" />
            <span className="hidden sm:inline">Récords</span>
          </button>
        </div>
      </div>

      {/* Synchronized Countdown Overlay */}
      {countdownOverlay !== null && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm pointer-events-none animate-in fade-in duration-100"
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
          <div className="flex flex-col items-center gap-2 animate-in zoom-in-75 duration-150">
            <span className="text-8xl sm:text-9xl font-black font-mono tracking-wider bg-gradient-to-r from-emerald-400 via-teal-300 to-sky-400 bg-clip-text text-transparent drop-shadow-2xl">
              {countdownOverlay > 0 ? countdownOverlay : '¡YA!'}
            </span>
            <span className="text-xs font-bold tracking-widest text-slate-300 uppercase">
              {countdownOverlay > 0 ? 'Ronda Sincronizada Iniciando...' : '¡A JUGAR!'}
            </span>
          </div>
        </div>
      )}

      {/* Score HUD bar */}
      <div className="w-full grid grid-cols-3 gap-3 mb-2 text-center">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5 shadow-sm">
          <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Puntos</div>
          <div className="text-2xl font-black text-emerald-400">{score}</div>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5 shadow-sm">
          <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Manzanas</div>
          <div className="text-2xl font-black text-rose-400">{apples}</div>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5 shadow-sm">
          <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Récord</div>
          <div className="text-2xl font-black text-amber-400">{bestScore}</div>
        </div>
      </div>

      {/* 
        CRITICAL REQUIREMENT 3:
        GOLDEN APPLE BANNER PLACEMENT:
        - MUST be located OUTSIDE the canvas (never over or inside the play area).
        - Must be inside a dedicated fixed-height row/container so its appearance causes ZERO layout shift / zero displacement of the canvas.
      */}
      <div 
        className="w-full h-11 mb-2 flex items-center justify-center overflow-hidden"
        style={{ minHeight: '44px', height: '44px', maxHeight: '44px' }}
      >
        {bonusData ? (
          <div className="w-full max-w-md bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 border border-amber-500/40 rounded-xl px-4 py-2 flex items-center justify-between text-amber-300 shadow-lg shadow-amber-500/10 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-amber-400 animate-bounce" />
              <span className="text-xs font-bold tracking-wide">¡MANZANA DORADA! (+50 PTS)</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden border border-amber-500/30">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-yellow-300 transition-all duration-100 ease-linear"
                  style={{ width: `${bonusData.percent}%` }}
                />
              </div>
              <span className="text-xs font-mono font-bold text-amber-200">{bonusData.remainingSec}s</span>
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-600 font-medium tracking-wide flex items-center gap-1.5 opacity-60">
            <Sparkles className="h-3.5 w-3.5 text-slate-600" />
            <span>Cada 5 manzanas aparece una Manzana Dorada especial</span>
          </div>
        )}
      </div>

      {/* Canvas Playfield Area */}
      <div className="relative rounded-2xl overflow-hidden border-2 border-slate-800 shadow-2xl bg-slate-950 flex items-center justify-center touch-none">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onContextMenu={handleContextMenu}
          onClick={handleCanvasClick}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          className={`cursor-crosshair block transition-opacity duration-200 touch-none ${
            gameState === 'idle' ? 'opacity-90' : 'opacity-100'
          }`}
          style={{
            maxWidth: '100%',
            height: 'auto',
            touchAction: 'none'
          }}
        />
      </div>

      {/* Mobile Touch Controls Component */}
      {(device.isTouch || device.isMobile) && (
        <TouchControls
          onDirection={(dir) => {
            if (gameRef.current) {
              gameRef.current.queueDirection(dir);
            }
          }}
          onPauseToggle={handleStartOrResume}
          onRestart={handleRestart}
          isPaused={gameState === 'paused'}
          controlType={controlType}
          onToggleControlType={() => handleControlChange(controlType === 'cursor' ? 'wasd' : 'cursor')}
        />
      )}

      {/* Control bar under arena */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 mt-4 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <button
            onClick={handleStartOrResume}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/30 font-semibold transition"
          >
            {gameState === 'playing' ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {gameState === 'playing' ? 'Pausar (Espacio)' : gameState === 'paused' ? 'Reanudar' : 'Jugar'}
          </button>
          <button
            onClick={handleRestart}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reiniciar (R)
          </button>
          <button
            onClick={() => {
              cursorTracker.toggleHud();
              if (gameRef.current) gameRef.current.draw();
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
          >
            <Compass className="h-3.5 w-3.5 text-sky-400" />
            HUD (T)
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-slate-500 hidden md:inline">
            💡 Click derecho en la arena para pausar y abrir el Menú Rápido
          </span>
        </div>
      </div>

      {/* Quick Pause Menu Modal (Right-Click) */}
      <QuickPauseMenu
        isOpen={isQuickPauseOpen}
        gameMode={gameMode}
        difficulty={difficulty}
        controlType={controlType}
        isWidescreen={isWidescreen}
        onResume={handleStartOrResume}
        onRestart={handleRestart}
        onModeChange={handleModeChange}
        onDifficultyChange={handleDifficultyChange}
        onControlChange={handleControlChange}
        onToggleArena={() => setIsWidescreen(!isWidescreen)}
        onOpenLeaderboard={() => {
          setIsQuickPauseOpen(false);
          setIsLeaderboardOpen(true);
        }}
        onClose={() => setIsQuickPauseOpen(false)}
      />

      {/* Leaderboard Modal */}
      <Leaderboard
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
      />

      {/* Game Over Modal */}
      {isGameOverModalOpen && gameOverInfo && (
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
            className="w-full max-w-md rounded-2xl border border-rose-500/30 bg-slate-900/95 p-6 shadow-2xl text-slate-100 text-center space-y-4"
            style={{
              backgroundColor: '#0f172a',
              border: '1px solid rgba(244, 63, 94, 0.4)',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '420px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
            }}
          >
            <div className="inline-flex p-3 rounded-full bg-rose-500/20 text-rose-400">
              <Flame className="h-8 w-8" />
            </div>

            <h3 className="text-2xl font-black text-rose-400">¡FIN DE LA PARTIDA!</h3>
            <p className="text-xs text-slate-400">{gameOverInfo.reason}</p>

            <div className="grid grid-cols-2 gap-3 py-2">
              <div className="rounded-xl bg-slate-800/80 p-3 border border-slate-700">
                <div className="text-xs text-slate-400">Puntaje Final</div>
                <div className="text-2xl font-black text-amber-300">{gameOverInfo.score}</div>
              </div>
              <div className="rounded-xl bg-slate-800/80 p-3 border border-slate-700">
                <div className="text-xs text-slate-400">Manzanas</div>
                <div className="text-2xl font-black text-rose-400">{gameOverInfo.apples}</div>
              </div>
            </div>

            {isHighScore && (
              <div className="rounded-xl bg-amber-400/10 border border-amber-400/40 p-2.5 text-xs font-bold text-amber-300 animate-pulse">
                🎉 ¡NUEVO RÉCORD CONSEGUIDO! 🎉
              </div>
            )}

            {/* Name Input */}
            <div className="space-y-2 text-left">
              <label className="text-xs font-semibold text-slate-300">
                Guarda tu récord en el Leaderboard:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={16}
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Tu apodo..."
                  disabled={scoreSaved}
                  className="flex-1 rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400 disabled:opacity-50"
                />
                <button
                  onClick={handleSaveScore}
                  disabled={scoreSaved}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
                    scoreSaved
                      ? 'bg-emerald-600 text-white cursor-default'
                      : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
                  }`}
                >
                  {scoreSaved ? '✓ Guardado' : 'Guardar'}
                </button>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleRestart}
                className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/20 hover:brightness-110 transition"
              >
                Jugar de Nuevo
              </button>
              <button
                onClick={() => {
                  setIsGameOverModalOpen(false);
                  setIsLeaderboardOpen(true);
                }}
                className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-sm font-semibold transition"
              >
                Ver Tabla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Room & Slot Switcher Modal */}
      {isRoomSwitcherOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Hash className="h-5 w-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Configuración de Sala Multijugador</h3>
              </div>
              <button
                onClick={() => setIsRoomSwitcherOpen(false)}
                className="text-slate-400 hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Room Code */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">
                Código de Sala (Hasta 6 jugadores):
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={16}
                  value={roomInput}
                  onChange={(e) => setRoomInput(e.target.value.toUpperCase())}
                  placeholder="ARENA-1"
                  className="flex-1 rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-sm font-mono font-bold text-emerald-300 uppercase focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    const rnd = 'ARENA-' + Math.floor(1000 + Math.random() * 9000);
                    setRoomInput(rnd);
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold"
                  title="Generar sala aleatoria"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Slot Picker */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">
                Selecciona tu Slot (1 al 6):
              </label>
              <div className="grid grid-cols-6 gap-1.5">
                {[1, 2, 3, 4, 5, 6].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSlotId(s)}
                    className={`py-2 rounded-xl text-xs font-bold font-mono transition border ${
                      slotId === s
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                    }`}
                  >
                    #{s}
                  </button>
                ))}
              </div>
            </div>

            {/* Token Status Info */}
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs space-y-1.5">
              <div className="flex items-center justify-between text-slate-300 font-semibold">
                <span className="flex items-center gap-1.5">
                  <Key className="h-3.5 w-3.5 text-amber-400" />
                  <span>Token de Sesión:</span>
                </span>
                <span className="font-mono text-[11px] text-emerald-400">
                  {playerToken ? `${playerToken.slice(0, 10)}...` : 'Se asignará al conectar'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Tu token queda guardado en tu navegador para que puedas reconectarte al mismo slot si refrescas la página.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  const clean = roomInput.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 16) || 'ARENA-1';
                  setRoomId(clean);
                  if (typeof window !== 'undefined') {
                    const url = new URL(window.location.href);
                    url.searchParams.set('room', clean);
                    url.searchParams.set('slot', slotId.toString());
                    window.history.pushState({}, '', url.toString());
                  }
                  arenaNet.connect(slotId, playerName || `Piloto #${slotId}`, clean);
                  setIsRoomSwitcherOpen(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 font-bold text-xs text-slate-950 hover:brightness-110 shadow-lg shadow-emerald-500/20 transition"
              >
                Conectar a Sala
              </button>
              <button
                type="button"
                onClick={() => setIsRoomSwitcherOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-semibold text-xs transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
