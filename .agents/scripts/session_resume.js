/**
 * Antigravity Lifecycle Hook: SessionStart Handoff
 * Injects pending task context for deploying snake-next to GitHub + Render.com
 */

const handoffMessage = [
  "[Estado del Proyecto - Despliegue Multiplayer snake-next + Supabase COMPLETADO]",
  "1. Repositorio GitHub: https://github.com/Svayneak/snake-arena-multiplayer (rama 'main').",
  "2. Servidor en Producción (Render.com Live): https://snake-arena-multiplayer.onrender.com",
  "3. Base de Datos Permanente (Supabase): https://naacgdwtglvcumaccime.supabase.co (tabla 'public.high_scores' provisionada y conectada).",
  "4. MCPs configurados en .agents/mcp.json: 'github' y 'supabase' listos para reutilizar en cualquier proyecto del workspace."
].join("\n");

const response = {
  decision: "allow",
  additionalContext: handoffMessage
};

process.stdout.write(JSON.stringify(response) + "\n");
