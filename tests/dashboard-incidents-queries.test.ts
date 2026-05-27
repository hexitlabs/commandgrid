import { afterAll, describe, expect, it } from "vitest";
import { config } from "dotenv";
import { createCommandGridDb } from "../src/lib/db/client";
import { FLAGSHIP_INCIDENT, NORTHSTAR_ORG } from "../src/lib/demo/northstar-data";
import { getDashboardOverview } from "../src/modules/dashboard/queries";
import { normalizeIncidentListFilters } from "../src/modules/incidents/filters";
import { getIncidentDetail, getIncidentList } from "../src/modules/incidents/queries";
import { getRoleViewRule, isDemoRoleSlug } from "../src/modules/roles/view-rules";

config({ path: ".env.local", override: false, quiet: true });
config({ path: ".env", override: false, quiet: true });

const databaseUrl = process.env.DATABASE_URL;
const runDatabaseQueryTests = databaseUrl && process.env.COMMANDGRID_RUN_DB_QUERY_TESTS === "1";
const describeWithDatabase = runDatabaseQueryTests ? describe : describe.skip;

describe("incident filter normalization", () => {
  it("normalizes multi-select status/severity filters and clamps limits", () => {
    expect(
      normalizeIncidentListFilters({
        status: "active,resolved",
        severity: ["sev1", "sev2"],
        sortBy: "revenueAtRisk",
        sortDirection: "asc",
        limit: 500
      })
    ).toEqual({
      organizationSlug: NORTHSTAR_ORG.slug,
      status: ["active", "resolved"],
      severity: ["sev1", "sev2"],
      sortBy: "revenueAtRisk",
      sortDirection: "asc",
      limit: 100
    });
  }, 30_000);
});

describe("role-specific view rules", () => {
  it("defines role-specific priorities and action affordances for all demo roles", () => {
    const roles = ["executive", "ops-manager", "engineer", "support-lead", "finance-reviewer", "admin"] as const;

    for (const role of roles) {
      expect(isDemoRoleSlug(role)).toBe(true);
      const rule = getRoleViewRule(role);
      expect(rule.dashboardPriority.length).toBeGreaterThan(0);
      expect(rule.incidentDetailPriority.length).toBeGreaterThan(0);
      expect(rule.primaryActions.length).toBeGreaterThan(0);
    }

    expect(getRoleViewRule("executive").dashboardPriority[0]).toBe("revenueAtRisk");
    expect(getRoleViewRule("engineer").incidentDetailPriority[0]).toBe("evidence");
  });
});

describeWithDatabase("dashboard and incident query contracts", () => {
  const commandGrid = createCommandGridDb(databaseUrl ?? "");

  afterAll(async () => {
    await commandGrid.sql.end({ timeout: 1 });
  });

  it("returns real seeded dashboard aggregates for Northstar", async () => {
    const dashboard = await getDashboardOverview(commandGrid.db, { role: "executive" });

    expect(dashboard.organization.slug).toBe(NORTHSTAR_ORG.slug);
    expect(dashboard.operationalHealth.level).toBe("critical");
    expect(dashboard.incidents.active).toBe(1);
    expect(dashboard.revenueAtRisk.cents).toBe(FLAGSHIP_INCIDENT.revenueAtRiskCents);
    expect(dashboard.delayedOrders.count).toBe(FLAGSHIP_INCIDENT.delayedOrders);
    expect(dashboard.supportSignal.openTickets).toBeGreaterThanOrEqual(6);
    expect(dashboard.agentActivity.totalRuns).toBeGreaterThanOrEqual(3);
    expect(dashboard.approvals.pending).toBe(2);
    expect(dashboard.incidentTrend.length).toBeGreaterThanOrEqual(5);
    expect(dashboard.flagshipIncident?.slug).toBe(FLAGSHIP_INCIDENT.slug);
  }, 30_000);

  it("lists incidents with status/severity filtering and impact summaries", async () => {
    const activeSev1 = await getIncidentList(commandGrid.db, { status: "active", severity: "sev1", sortBy: "revenueAtRisk" });

    expect(activeSev1.incidents).toHaveLength(1);
    expect(activeSev1.incidents[0]?.slug).toBe(FLAGSHIP_INCIDENT.slug);
    expect(activeSev1.incidents[0]?.affectedCustomers).toBeGreaterThanOrEqual(6);
    expect(activeSev1.incidents[0]?.supportTickets).toBeGreaterThanOrEqual(6);
    expect(activeSev1.summary.revenueAtRiskCents).toBe(FLAGSHIP_INCIDENT.revenueAtRiskCents);

    const resolved = await getIncidentList(commandGrid.db, { status: "resolved", sortBy: "startedAt", sortDirection: "desc" });
    expect(resolved.incidents.length).toBeGreaterThanOrEqual(5);
    expect(resolved.incidents.every((incident) => incident.status === "resolved")).toBe(true);
  }, 30_000);

  it("returns the flagship incident detail contract with timeline, impact, evidence, agents, approvals, reports, and audit", async () => {
    const detail = await getIncidentDetail(commandGrid.db, FLAGSHIP_INCIDENT.slug, { role: "engineer" });

    expect(detail).not.toBeNull();
    expect(detail?.overview.slug).toBe(FLAGSHIP_INCIDENT.slug);
    expect(detail?.overview.narrative).toContain("312 delayed orders");
    expect(detail?.timeline.length).toBeGreaterThanOrEqual(4);
    expect(detail?.businessImpact.revenueAtRiskCents).toBe(FLAGSHIP_INCIDENT.revenueAtRiskCents);
    expect(detail?.affectedCustomers.length).toBeGreaterThanOrEqual(6);
    expect(detail?.affectedOrders.length).toBeGreaterThanOrEqual(10);
    expect(detail?.affectedServices.map((service) => service.slug)).toContain("warehouse-api");
    expect(detail?.citations.some((citation) => citation.sourceType === "log")).toBe(true);
    expect(detail?.citations.some((citation) => citation.sourceType === "ticket")).toBe(true);
    expect(detail?.citations.some((citation) => citation.sourceType === "runbook")).toBe(true);
    expect(detail?.agentActivity.runs.length).toBeGreaterThanOrEqual(3);
    expect(detail?.agentActivity.recommendations.length).toBeGreaterThanOrEqual(3);
    expect(detail?.approvals.length).toBeGreaterThanOrEqual(3);
    expect(detail?.approvals.some((approval) => approval.decisions.length > 0)).toBe(true);
    expect(detail?.reports.length).toBeGreaterThanOrEqual(1);
    expect(detail?.auditTrail.length).toBeGreaterThanOrEqual(4);
  }, 30_000);
});
