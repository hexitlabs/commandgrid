import type { IncidentListFilters, IncidentSortDirection, IncidentSortKey } from "./types";

export const DEFAULT_INCIDENT_SORT: { sortBy: IncidentSortKey; sortDirection: IncidentSortDirection } = {
  sortBy: "startedAt",
  sortDirection: "desc"
};

const SORT_KEYS = new Set<IncidentSortKey>(["startedAt", "detectedAt", "severity", "status", "revenueAtRisk", "delayedOrders"]);
const SORT_DIRECTIONS = new Set<IncidentSortDirection>(["asc", "desc"]);

function normalizeMultiValue(value: string | string[] | undefined) {
  if (!value) {
    return undefined;
  }

  const values = Array.isArray(value) ? value : value.split(",");
  const normalized = values.map((item) => item.trim()).filter(Boolean);

  return normalized.length > 0 ? normalized : undefined;
}

export function normalizeIncidentListFilters(filters: IncidentListFilters = {}) {
  const sortBy = filters.sortBy && SORT_KEYS.has(filters.sortBy) ? filters.sortBy : DEFAULT_INCIDENT_SORT.sortBy;
  const sortDirection = filters.sortDirection && SORT_DIRECTIONS.has(filters.sortDirection) ? filters.sortDirection : DEFAULT_INCIDENT_SORT.sortDirection;
  const limit = filters.limit && filters.limit > 0 ? Math.min(Math.floor(filters.limit), 100) : 50;

  return {
    organizationSlug: filters.organizationSlug ?? "northstar-logistics",
    status: normalizeMultiValue(filters.status),
    severity: normalizeMultiValue(filters.severity),
    sortBy,
    sortDirection,
    limit
  };
}
