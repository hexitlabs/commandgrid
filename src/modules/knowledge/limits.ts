export const DEFAULT_COPILOT_RETRIEVAL_LIMIT = 6;
export const MAX_COPILOT_RETRIEVAL_LIMIT = 10;
export const MIN_COPILOT_RETRIEVAL_LIMIT = 1;

export function parseCopilotRetrievalLimit(value: unknown, defaultLimit = DEFAULT_COPILOT_RETRIEVAL_LIMIT) {
  const parsed = typeof value === "number" || typeof value === "string" ? Number(value) : defaultLimit;
  if (!Number.isFinite(parsed)) return defaultLimit;
  return Math.min(MAX_COPILOT_RETRIEVAL_LIMIT, Math.max(MIN_COPILOT_RETRIEVAL_LIMIT, Math.trunc(parsed)));
}
