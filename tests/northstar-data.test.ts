import { describe, expect, it } from "vitest";
import {
  DEMO_PERMISSION_DEFINITIONS,
  DEMO_ROLES,
  FLAGSHIP_INCIDENT,
  HISTORICAL_INCIDENTS,
  KNOWLEDGE_DOCUMENTS,
  ORDERS,
  SUPPORT_TICKETS,
  SYSTEM_LOG_MESSAGES
} from "../src/lib/demo/northstar-data";

describe("Northstar Logistics demo data", () => {
  it("defines required server-side demo roles with permissions", () => {
    expect(DEMO_ROLES.map((role) => role.slug)).toEqual(["executive", "ops-manager", "engineer", "support-lead", "finance-reviewer", "admin"]);
    expect(DEMO_ROLES).toHaveLength(6);

    for (const role of DEMO_ROLES) {
      expect(role.permissionSlugs.length).toBeGreaterThan(0);
    }

    const knownPermissions = new Set(DEMO_PERMISSION_DEFINITIONS.map((permission) => permission[1]));
    for (const role of DEMO_ROLES) {
      for (const permissionSlug of role.permissionSlugs) {
        expect(knownPermissions.has(permissionSlug)).toBe(true);
      }
    }
  });

  it("preserves the flagship incident narrative", () => {
    expect(FLAGSHIP_INCIDENT.slug).toBe("warehouse-api-latency-spike");
    expect(FLAGSHIP_INCIDENT.delayedOrders).toBe(312);
    expect(FLAGSHIP_INCIDENT.revenueAtRiskCents).toBe(4_820_000);
  });

  it("has enough historical incidents and cited knowledge artifacts for dashboard demos", () => {
    expect(HISTORICAL_INCIDENTS.length).toBeGreaterThanOrEqual(5);

    const citationBackedArtifacts = KNOWLEDGE_DOCUMENTS.length + SUPPORT_TICKETS.length + SYSTEM_LOG_MESSAGES.length;
    expect(citationBackedArtifacts).toBeGreaterThanOrEqual(20);

    for (const document of KNOWLEDGE_DOCUMENTS) {
      expect(document[6]).toMatch(/^[A-Z]+-/);
      expect(document[7]).toMatch(/^commandgrid:\/\//);
    }
  });

  it("links credible sample orders to the flagship impact", () => {
    const delayedOrAtRiskOrders = ORDERS.filter((order) => order[3] !== "processing");
    const sampleRevenueAtRisk = delayedOrAtRiskOrders.reduce((total, order) => total + order[4], 0);

    expect(delayedOrAtRiskOrders.length).toBeGreaterThanOrEqual(10);
    expect(sampleRevenueAtRisk).toBe(FLAGSHIP_INCIDENT.revenueAtRiskCents);
  });
});
