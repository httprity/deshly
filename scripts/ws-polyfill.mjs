// Node < 22 has no global WebSocket; supabase-js (realtime) needs one.
// Loaded via `node --import` BEFORE the main script so the supabase client
// (created at module load in src/lib/supabase.ts) finds it. Scripts only.
import ws from "ws";
if (!globalThis.WebSocket) {
  globalThis.WebSocket = ws;
}
