import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Víbora Retro Next - Snake Game 14',
  description: 'Port moderno de la víbora retro en Next.js 14 con seguimiento continuo por cursor, telemetría y tabla de líderes.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-emerald-500 selection:text-slate-950">
        {children}
      </body>
    </html>
  );
}
