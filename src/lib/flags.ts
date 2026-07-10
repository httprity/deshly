// ============================================================
// DESHLY — feature flags
//
// Server-side, env-driven. Default OFF until a feature proves lift.
// Read these at call sites; never hardcode the env lookup elsewhere.
// ============================================================

/**
 * Exemplar-Retrieval RAG (build plan v2). When false, the campaign generator
 * behaves exactly as today: no retrieval, no exemplar block, byte-identical
 * prompt. Flip to "true" only after Phase 6 measurement shows the exemplars
 * improve baseline WITHOUT collapsing cross-audience divergence.
 */
export const EXEMPLAR_RAG_ENABLED = process.env.EXEMPLAR_RAG_ENABLED === "true";
