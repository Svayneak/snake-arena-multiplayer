import { SnakeGameComponent } from '../components/SnakeGame';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-between p-2 md:p-6">
      <div className="w-full flex-1 flex flex-col items-center justify-center">
        <SnakeGameComponent />
      </div>

      <footer className="w-full max-w-4xl text-center py-4 text-xs text-slate-500 border-t border-slate-900 mt-6 space-y-1">
        <p>
          🐍 <span className="font-semibold text-slate-400">Víbora Retro Next.js 14 App Router</span> • 
          Continuous Cursor Follower & Zero-Jump Armed Spawning
        </p>
        <p className="text-[11px] text-slate-600">
          Servidor Telemetría activo en <code className="text-sky-500">/api/telemetry</code> • Registros en tiempo real guardados en <code className="text-slate-400">data/telemetry_flight_log.json</code>
        </p>
      </footer>
    </main>
  );
}
