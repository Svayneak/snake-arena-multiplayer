/**
 * High Scores and Settings Storage Manager
 * Uses localStorage with persistence, validation, sorting, filtering, and export.
 * Includes graceful memory store fallback.
 */

export interface HighScoreEntry {
  id: string;
  name: string;
  score: number;
  difficulty: string;
  gameMode: 'classic' | 'portal';
  apples: number;
  goldenApples?: number;
  date: string;
}

export interface PlayerStats {
  gamesPlayed: number;
  totalApples: number;
  highestScore: number;
  goldenApplesEaten: number;
}

export interface PlayerSettings {
  difficulty: 'easy' | 'normal' | 'hard' | 'insane';
  gameMode: 'classic' | 'portal';
  controlType: 'cursor' | 'wasd';
  gridVisible: boolean;
  soundEnabled: boolean;
  widescreenArena: boolean;
}

export class ScoreManager {
  private SCORES_KEY = 'snake_high_scores_v2';
  private STATS_KEY = 'snake_player_stats_v2';
  private SETTINGS_KEY = 'snake_player_settings_v2';
  private LAST_NAME_KEY = 'snake_last_player_name';
  private memoryStore: Record<string, string> = {};

  constructor() {
    this.initDefaults();
  }

  private safeGet(key: string): string | null {
    if (typeof window !== 'undefined') {
      try {
        const item = window.localStorage.getItem(key);
        if (item !== null) return item;
      } catch {}
    }
    return this.memoryStore[key] || null;
  }

  private safeSet(key: string, value: string): void {
    this.memoryStore[key] = value;
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(key, value);
      } catch {}
    }
  }

  private initDefaults(): void {
    if (!this.safeGet(this.SCORES_KEY)) {
      const initialScores: HighScoreEntry[] = [
        { id: '1', name: 'Master Cobra', score: 240, difficulty: 'normal', gameMode: 'classic', apples: 22, date: this.formatDate(new Date(Date.now() - 86400000 * 2)) },
        { id: '2', name: 'Ghost Viper', score: 210, difficulty: 'normal', gameMode: 'portal', apples: 19, date: this.formatDate(new Date(Date.now() - 86400000 * 1.5)) },
        { id: '3', name: 'RetroGamer', score: 180, difficulty: 'normal', gameMode: 'classic', apples: 16, date: this.formatDate(new Date(Date.now() - 86400000)) },
        { id: '4', name: 'PortalKing', score: 140, difficulty: 'hard', gameMode: 'portal', apples: 13, date: this.formatDate(new Date(Date.now() - 43200000)) },
        { id: '5', name: 'ViperKing', score: 130, difficulty: 'hard', gameMode: 'classic', apples: 12, date: this.formatDate(new Date(Date.now() - 30000000)) },
        { id: '6', name: 'PythonDev', score: 90, difficulty: 'easy', gameMode: 'portal', apples: 9, date: this.formatDate(new Date(Date.now() - 21600000)) },
        { id: '7', name: 'Novato', score: 40, difficulty: 'easy', gameMode: 'classic', apples: 4, date: this.formatDate(new Date(Date.now() - 10800000)) }
      ];
      this.safeSet(this.SCORES_KEY, JSON.stringify(initialScores));
    }

    if (!this.safeGet(this.STATS_KEY)) {
      const initialStats: PlayerStats = {
        gamesPlayed: 0,
        totalApples: 0,
        highestScore: 0,
        goldenApplesEaten: 0
      };
      this.safeSet(this.STATS_KEY, JSON.stringify(initialStats));
    }
  }

  public formatDate(date: Date): string {
    try {
      const d = new Date(date);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${mins}`;
    } catch {
      return 'Reciente';
    }
  }

  public getScores(filter: string = 'all'): HighScoreEntry[] {
    try {
      const raw = this.safeGet(this.SCORES_KEY);
      const list: HighScoreEntry[] = raw ? JSON.parse(raw) : [];
      list.sort((a, b) => b.score - a.score);

      if (filter && filter !== 'all') {
        if (filter === 'portal') {
          return list.filter(item => item.gameMode === 'portal');
        }
        if (filter === 'classic') {
          return list.filter(item => item.gameMode !== 'portal');
        }
        return list.filter(item => item.difficulty === filter);
      }
      return list;
    } catch (e) {
      console.error('Error reading scores:', e);
      return [];
    }
  }

  private listeners: Set<() => void> = new Set();

  public onChange(cb: () => void): void {
    this.listeners.add(cb);
  }

  public offChange(cb: () => void): void {
    this.listeners.delete(cb);
  }

  private notifyListeners(): void {
    this.listeners.forEach(cb => {
      try { cb(); } catch {}
    });
  }

  public syncRemoteScores(remoteScores: HighScoreEntry[]): void {
    if (!Array.isArray(remoteScores)) return;
    const sorted = [...remoteScores].sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 50);
    this.safeSet(this.SCORES_KEY, JSON.stringify(sorted));
    this.notifyListeners();
  }

  public saveScore(entry: Omit<HighScoreEntry, 'id' | 'date'>): HighScoreEntry {
    const list = this.getScores('all');
    const newEntry: HighScoreEntry = {
      ...entry,
      id: Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
      date: this.formatDate(new Date())
    };

    list.push(newEntry);
    list.sort((a, b) => b.score - a.score);
    const topScores = list.slice(0, 50);

    this.safeSet(this.SCORES_KEY, JSON.stringify(topScores));
    this.setLastName(entry.name);
    this.notifyListeners();
    return newEntry;
  }

  public isHighScore(score: number, difficulty: string = 'normal'): boolean {
    if (score <= 0) return false;
    const scores = this.getScores(difficulty);
    if (scores.length < 10) return true;
    return score > scores[scores.length - 1].score;
  }

  public getTopScore(difficulty: string = 'normal'): number {
    const scores = this.getScores(difficulty);
    return scores.length > 0 ? scores[0].score : 0;
  }

  public getStats(): PlayerStats {
    try {
      const raw = this.safeGet(this.STATS_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return { gamesPlayed: 0, totalApples: 0, highestScore: 0, goldenApplesEaten: 0 };
  }

  public recordMatchStats(score: number, apples: number, goldenApples: number): PlayerStats {
    const stats = this.getStats();
    stats.gamesPlayed += 1;
    stats.totalApples += apples;
    stats.goldenApplesEaten += goldenApples;
    if (score > stats.highestScore) {
      stats.highestScore = score;
    }
    this.safeSet(this.STATS_KEY, JSON.stringify(stats));
    return stats;
  }

  public getLastName(): string {
    return this.safeGet(this.LAST_NAME_KEY) || 'SnakePilot';
  }

  public setLastName(name: string): void {
    if (name && name.trim()) {
      this.safeSet(this.LAST_NAME_KEY, name.trim().substring(0, 16));
    }
  }

  public getSettings(): PlayerSettings {
    const defaultSettings: PlayerSettings = {
      difficulty: 'normal',
      gameMode: 'classic',
      controlType: 'cursor',
      gridVisible: true,
      soundEnabled: true,
      widescreenArena: false,
    };
    try {
      const raw = this.safeGet(this.SETTINGS_KEY);
      if (raw) {
        return { ...defaultSettings, ...JSON.parse(raw) };
      }
    } catch {}
    return defaultSettings;
  }

  public saveSettings(settings: Partial<PlayerSettings>): PlayerSettings {
    const current = this.getSettings();
    const updated = { ...current, ...settings };
    this.safeSet(this.SETTINGS_KEY, JSON.stringify(updated));
    return updated;
  }

  public clearScores(): void {
    this.safeSet(this.SCORES_KEY, JSON.stringify([]));
    this.notifyListeners();
  }

  public exportScoresJSON(): string {
    return JSON.stringify(this.getScores('all'), null, 2);
  }

  public exportScoresCSV(): string {
    const list = this.getScores('all');
    const header = ['Posición', 'Nombre', 'Puntuación', 'Dificultad', 'Modo', 'Manzanas', 'Fecha'];
    const rows = list.map((item, idx) => [
      idx + 1,
      `"${item.name.replace(/"/g, '""')}"`,
      item.score,
      item.difficulty,
      item.gameMode,
      item.apples,
      `"${item.date}"`
    ]);
    return [header.join(','), ...rows.map(r => r.join(','))].join('\n');
  }
}

export const scoreManager = new ScoreManager();
