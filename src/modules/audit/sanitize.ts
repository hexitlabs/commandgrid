const sensitiveKeyPattern = /(secret|token|password|authorization|cookie|api[_-]?key|private[_-]?key|connection|string|dsn|credential|trace|payload|raw|logDump)/i;
const maxStringLength = 120;
const maxSummaryParts = 8;

function isPrimitive(value: unknown): value is string | number | boolean | null {
  return value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}

function formatPrimitive(value: string | number | boolean | null) {
  if (value === null) {
    return "null";
  }

  if (typeof value === "string") {
    const compact = value.replace(/\s+/g, " ").trim();
    return compact.length > maxStringLength ? `${compact.slice(0, maxStringLength)}…` : compact;
  }

  return String(value);
}

export function sanitizeAuditMetadata(metadata: Record<string, unknown> | null | undefined): Record<string, string | number | boolean> {
  const safe: Record<string, string | number | boolean> = {};

  if (!metadata) {
    return safe;
  }

  for (const [key, value] of Object.entries(metadata)) {
    if (sensitiveKeyPattern.test(key)) {
      safe[key] = "[redacted]";
      continue;
    }

    if (isPrimitive(value)) {
      safe[key] = formatPrimitive(value);
      continue;
    }

    if (Array.isArray(value)) {
      safe[key] = `${value.length} item${value.length === 1 ? "" : "s"}`;
      continue;
    }

    if (typeof value === "object") {
      safe[key] = "summary object";
    }
  }

  return safe;
}

export function auditMetadataSummary(metadata: Record<string, unknown> | null | undefined) {
  const safe = sanitizeAuditMetadata(metadata);
  const parts = Object.entries(safe)
    .slice(0, maxSummaryParts)
    .map(([key, value]) => `${key}: ${value}`);

  return parts.length ? parts.join(" · ") : "No metadata summary";
}

export function metadataString(metadata: Record<string, unknown> | null | undefined) {
  return Object.entries(sanitizeAuditMetadata(metadata))
    .map(([key, value]) => `${key} ${value}`)
    .join(" ")
    .toLowerCase();
}
