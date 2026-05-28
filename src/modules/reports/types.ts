import type { AiGenerationResult } from "../../lib/ai/gateway";
import type { DemoRoleSlug } from "../roles/view-rules";
import type { KnowledgeCitation } from "../knowledge/types";

export const REPORT_TYPES = ["postmortem", "executive-summary", "customer-impact"] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export type GenerateReportInput = {
  reportType: ReportType;
  incidentId?: string;
  organizationId?: string;
  actorUserId?: string | null;
  role: DemoRoleSlug;
  ipAddress?: string | null;
  persist?: boolean;
};

export type GeneratedReport = {
  id: string;
  organizationId: string;
  incidentId: string | null;
  slug: string;
  title: string;
  reportType: ReportType;
  status: "draft" | "deferred";
  generatedAt: string;
  storageUri: string;
  summary: string;
  markdown: string;
  citations: KnowledgeCitation[];
  ai: Pick<AiGenerationResult, "mode" | "attempts" | "error">;
  persisted: boolean;
};

export type ReportListItem = {
  id: string;
  organizationId: string;
  incidentId: string | null;
  slug: string;
  title: string;
  reportType: string;
  status: string;
  generatedByUserId: string | null;
  generatedAt: string;
  storageUri: string;
  summary: string;
  metadata: Record<string, unknown>;
};
