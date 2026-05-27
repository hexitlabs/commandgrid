import { eq } from "drizzle-orm";
import type { CommandGridDb } from "../../../lib/db/client";
import { generateWithAiGateway, type AiGenerationEnv } from "../../../lib/ai/gateway";
import { approvals, decisions, agentEvents, agentRuns, incidentTimelineEvents, incidents, notifications, recommendations, reports } from "../../../lib/db/schema";
import { deterministicAgentFallback } from "../../agents/fallbacks";
import { writeAuditLog } from "../../audit/service";
import { buildIncidentResponsePlan, approvalContinuationAuditActions } from "./plan";
import { PHASE5_AGENT_RUN_IDS, PHASE5_WORKFLOW, type IncidentAgentSlug } from "./constants";

export type IncidentWorkflowEnv = AiGenerationEnv;

export type StartIncidentWorkflowResult = {
  ok: true;
  runId: string;
  incidentId: string;
  status: "paused-for-approval" | "already-approved";
  approvalId: string;
  agentRuns: number;
  auditEvents: number;
};

export type ApproveRemediationResult = {
  ok: true;
  incidentId: string;
  approvalId: string;
  status: "remediated" | "already-remediated";
  reportId: string;
  auditEvents: number;
};

type GeneratedAgentOutput = {
  slug: IncidentAgentSlug;
  summary: string;
  eventMessage: string;
  metadata: Record<string, unknown>;
};

function date(value: string) {
  return new Date(value);
}

function agentOccurredAt(index: number) {
  return new Date(date(PHASE5_WORKFLOW.occurredAt).getTime() + index * 60_000);
}

async function existingApprovalStatus(db: CommandGridDb) {
  const [row] = await db.select({ status: approvals.status }).from(approvals).where(eq(approvals.id, PHASE5_WORKFLOW.approvalId)).limit(1);
  return row?.status;
}

async function generateAgentOutputs(env: IncidentWorkflowEnv = {}): Promise<GeneratedAgentOutput[]> {
  const plan = buildIncidentResponsePlan();

  return Promise.all(
    plan.agentRuns.map(async (agent) => {
      const fallback = deterministicAgentFallback(agent.slug);
      const ai = await generateWithAiGateway(env, {
        system: "You are a concise CommandGrid incident-response agent. Use only the supplied demo facts; do not invent secrets or external actions.",
        prompt: `Agent: ${agent.name}\nObjective: ${agent.objective}\nIncident: Northstar Logistics Warehouse API p95 latency is 1840ms, 312 orders delayed, $48,200 revenue at risk. Produce a two-sentence operational output.`,
        fallback: fallback.summary,
        timeoutMs: 1_500,
        retries: 0
      });

      return {
        slug: agent.slug,
        summary: ai.text,
        eventMessage: fallback.eventMessage,
        metadata: {
          ...fallback.metadata,
          aiMode: ai.mode,
          aiAttempts: ai.attempts,
          aiError: ai.error
        }
      };
    })
  );
}

export async function startDemoIncidentWorkflow(db: CommandGridDb, env: IncidentWorkflowEnv = {}): Promise<StartIncidentWorkflowResult> {
  const plan = buildIncidentResponsePlan();
  const currentApprovalStatus = await existingApprovalStatus(db);
  const approvalAlreadyApproved = currentApprovalStatus === "approved";
  const generatedOutputs = await generateAgentOutputs(env);
  const outputBySlug = new Map(generatedOutputs.map((output) => [output.slug, output]));

  if (!approvalAlreadyApproved) {
    await db
      .update(incidents)
      .set({
        status: "active",
        resolvedAt: null,
        summary:
          "Warehouse API p95 latency remains elevated in the central fulfillment cluster. CommandGrid autonomous workflow has completed investigation and is paused for governed remediation approval.",
        customerImpactSummary: "312 delayed orders across eight demo customers; $48,200 revenue at risk.",
        updatedAt: new Date()
      })
      .where(eq(incidents.id, PHASE5_WORKFLOW.incidentId));
  }

  await writeAuditLog(db, {
    id: "audit_phase5_demo_incident_requested",
    organizationId: PHASE5_WORKFLOW.organizationId,
    actorUserId: PHASE5_WORKFLOW.actorUserId,
    action: "demo.incident.requested",
    targetType: "incident",
    targetId: PHASE5_WORKFLOW.incidentId,
    occurredAt: date(PHASE5_WORKFLOW.occurredAt),
    metadata: { runId: PHASE5_WORKFLOW.runId, demoScoped: true }
  });

  await writeAuditLog(db, {
    id: "audit_phase5_workflow_started",
    organizationId: PHASE5_WORKFLOW.organizationId,
    actorUserId: null,
    action: "workflow.started",
    targetType: "incident",
    targetId: PHASE5_WORKFLOW.incidentId,
    occurredAt: date(PHASE5_WORKFLOW.occurredAt),
    metadata: { runId: PHASE5_WORKFLOW.runId, workflow: "incident-response" }
  });

  for (const [index, agent] of plan.agentRuns.entries()) {
    const generated = outputBySlug.get(agent.slug) ?? agent;
    const occurredAt = agentOccurredAt(index + 1);

    await db
      .insert(agentRuns)
      .values({
        id: agent.id,
        organizationId: PHASE5_WORKFLOW.organizationId,
        incidentId: PHASE5_WORKFLOW.incidentId,
        agentName: agent.name,
        objective: agent.objective,
        status: "completed",
        startedAt: occurredAt,
        completedAt: new Date(occurredAt.getTime() + 25_000),
        outputSummary: generated.summary,
        metadata: { ...generated.metadata, runId: PHASE5_WORKFLOW.runId, phase: 5 }
      })
      .onConflictDoUpdate({
        target: agentRuns.id,
        set: {
          status: "completed",
          completedAt: new Date(occurredAt.getTime() + 25_000),
          outputSummary: generated.summary,
          metadata: { ...generated.metadata, runId: PHASE5_WORKFLOW.runId, phase: 5 },
          updatedAt: new Date()
        }
      });

    await db
      .insert(agentEvents)
      .values({
        id: `agent_event_phase5_${agent.slug}_completed`,
        agentRunId: agent.id,
        eventType: "completed",
        message: generated.eventMessage,
        occurredAt: new Date(occurredAt.getTime() + 30_000),
        metadata: { runId: PHASE5_WORKFLOW.runId, phase: 5 }
      })
      .onConflictDoUpdate({
        target: agentEvents.id,
        set: {
          eventType: "completed",
          message: generated.eventMessage,
          occurredAt: new Date(occurredAt.getTime() + 30_000),
          metadata: { runId: PHASE5_WORKFLOW.runId, phase: 5 },
          updatedAt: new Date()
        }
      });
  }

  await writeAuditLog(db, {
    id: "audit_phase5_agents_completed",
    organizationId: PHASE5_WORKFLOW.organizationId,
    actorUserId: null,
    action: "agent.completed",
    targetType: "incident",
    targetId: PHASE5_WORKFLOW.incidentId,
    occurredAt: agentOccurredAt(plan.agentRuns.length + 1),
    metadata: { runId: PHASE5_WORKFLOW.runId, agentRunIds: Object.values(PHASE5_AGENT_RUN_IDS) }
  });

  await db
    .insert(recommendations)
    .values({
      id: PHASE5_WORKFLOW.recommendationId,
      organizationId: PHASE5_WORKFLOW.organizationId,
      incidentId: PHASE5_WORKFLOW.incidentId,
      agentRunId: PHASE5_AGENT_RUN_IDS.ops,
      title: "Enable MSP-02 regional buffer mode",
      body:
        "Simulate enabling regional buffer mode for MSP-02, validate replay health, and keep customer promise calculations stable while Warehouse API latency recovers.",
      priority: "urgent",
      status: approvalAlreadyApproved ? "implemented" : "pending-approval",
      confidence: "0.884",
      metadata: { runId: PHASE5_WORKFLOW.runId, citationLabels: ["OPS-BUF-006", "RUN-WH-API-004"], simulated: true }
    })
    .onConflictDoUpdate({
      target: recommendations.id,
      set: {
        status: approvalAlreadyApproved ? "implemented" : "pending-approval",
        body:
          "Simulate enabling regional buffer mode for MSP-02, validate replay health, and keep customer promise calculations stable while Warehouse API latency recovers.",
        metadata: { runId: PHASE5_WORKFLOW.runId, citationLabels: ["OPS-BUF-006", "RUN-WH-API-004"], simulated: true },
        updatedAt: new Date()
      }
    });

  if (!approvalAlreadyApproved) {
    await db
      .insert(approvals)
      .values({
        id: PHASE5_WORKFLOW.approvalId,
        organizationId: PHASE5_WORKFLOW.organizationId,
        incidentId: PHASE5_WORKFLOW.incidentId,
        recommendationId: PHASE5_WORKFLOW.recommendationId,
        title: "Approve simulated buffer-mode remediation",
        description:
          "Governance gate for the autonomous workflow. Approving resumes CommandGrid and simulates regional buffer mode; no external systems are changed.",
        requestedByUserId: PHASE5_WORKFLOW.engineerUserId,
        assignedRoleId: PHASE5_WORKFLOW.governanceRoleId,
        status: "pending",
        riskLevel: "medium",
        dueAt: new Date(date(PHASE5_WORKFLOW.occurredAt).getTime() + 20 * 60_000),
        metadata: {
          runId: PHASE5_WORKFLOW.runId,
          simulated: true,
          stopBeforeRemediation: true,
          actionType: "technical_remediation",
          continuation: "phase5-remediation",
          evidenceLabels: ["OPS-BUF-006", "RUN-WH-API-004"]
        }
      })
      .onConflictDoUpdate({
        target: approvals.id,
        set: {
          status: "pending",
          description:
            "Governance gate for the autonomous workflow. Approving resumes CommandGrid and simulates regional buffer mode; no external systems are changed.",
          metadata: {
            runId: PHASE5_WORKFLOW.runId,
            simulated: true,
            stopBeforeRemediation: true,
            actionType: "technical_remediation",
            continuation: "phase5-remediation",
            evidenceLabels: ["OPS-BUF-006", "RUN-WH-API-004"]
          },
          updatedAt: new Date()
        }
      });

    await db
      .insert(incidentTimelineEvents)
      .values({
        id: "tl_phase5_workflow_paused_for_approval",
        incidentId: PHASE5_WORKFLOW.incidentId,
        actorUserId: PHASE5_WORKFLOW.engineerUserId,
        eventType: "approval-requested",
        title: "Autonomous workflow paused for approval",
        body: "Governance agent created the remediation approval and stopped before simulated buffer mode could run.",
        occurredAt: agentOccurredAt(plan.agentRuns.length + 2),
        metadata: { runId: PHASE5_WORKFLOW.runId, approvalId: PHASE5_WORKFLOW.approvalId }
      })
      .onConflictDoUpdate({
        target: incidentTimelineEvents.id,
        set: {
          body: "Governance agent created the remediation approval and stopped before simulated buffer mode could run.",
          metadata: { runId: PHASE5_WORKFLOW.runId, approvalId: PHASE5_WORKFLOW.approvalId },
          updatedAt: new Date()
        }
      });

    await writeAuditLog(db, {
      id: "audit_phase5_approval_requested",
      organizationId: PHASE5_WORKFLOW.organizationId,
      actorUserId: PHASE5_WORKFLOW.engineerUserId,
      action: "approval.requested",
      targetType: "approval",
      targetId: PHASE5_WORKFLOW.approvalId,
      occurredAt: agentOccurredAt(plan.agentRuns.length + 2),
      metadata: { runId: PHASE5_WORKFLOW.runId, recommendationId: PHASE5_WORKFLOW.recommendationId, stopBeforeRemediation: true }
    });
  }

  return {
    ok: true,
    runId: PHASE5_WORKFLOW.runId,
    incidentId: PHASE5_WORKFLOW.incidentId,
    status: approvalAlreadyApproved ? "already-approved" : "paused-for-approval",
    approvalId: PHASE5_WORKFLOW.approvalId,
    agentRuns: plan.agentRuns.length,
    auditEvents: plan.auditActions.length
  };
}

export async function approveDemoRemediation(db: CommandGridDb, options: { actorUserId?: string; rationale?: string } = {}): Promise<ApproveRemediationResult> {
  const [approval] = await db.select({ status: approvals.status }).from(approvals).where(eq(approvals.id, PHASE5_WORKFLOW.approvalId)).limit(1);

  if (!approval) {
    throw new Error("Phase 5 remediation approval does not exist. Run /api/demo/run-incident first.");
  }

  const alreadyRemediated = approval.status === "approved";
  const actorUserId = options.actorUserId ?? PHASE5_WORKFLOW.actorUserId;

  if (!alreadyRemediated) {
    await db
      .update(approvals)
      .set({ status: "approved", updatedAt: new Date() })
      .where(eq(approvals.id, PHASE5_WORKFLOW.approvalId));

    await db
      .insert(decisions)
      .values({
        id: PHASE5_WORKFLOW.decisionId,
        approvalId: PHASE5_WORKFLOW.approvalId,
        decidedByUserId: actorUserId,
        decision: "approved",
        rationale: options.rationale ?? "Approved for public demo remediation simulation; no external systems are changed.",
        decidedAt: date(PHASE5_WORKFLOW.approvedAt),
        metadata: { runId: PHASE5_WORKFLOW.runId, simulated: true }
      })
      .onConflictDoUpdate({
        target: decisions.id,
        set: {
          decision: "approved",
          rationale: options.rationale ?? "Approved for public demo remediation simulation; no external systems are changed.",
          decidedAt: date(PHASE5_WORKFLOW.approvedAt),
          metadata: { runId: PHASE5_WORKFLOW.runId, simulated: true },
          updatedAt: new Date()
        }
      });
  }

  await writeAuditLog(db, {
    id: "audit_phase5_approval_approved",
    organizationId: PHASE5_WORKFLOW.organizationId,
    actorUserId,
    action: "approval.approved",
    targetType: "approval",
    targetId: PHASE5_WORKFLOW.approvalId,
    occurredAt: date(PHASE5_WORKFLOW.approvedAt),
    metadata: { runId: PHASE5_WORKFLOW.runId, decisionId: PHASE5_WORKFLOW.decisionId }
  });

  await db
    .update(recommendations)
    .set({ status: "implemented", updatedAt: new Date() })
    .where(eq(recommendations.id, PHASE5_WORKFLOW.recommendationId));

  await db
    .update(incidents)
    .set({
      status: "resolved",
      resolvedAt: date(PHASE5_WORKFLOW.resolvedAt),
      summary:
        "Warehouse API latency recovered after simulated MSP-02 buffer mode and pool stabilization. CommandGrid generated the post-incident report.",
      customerImpactSummary: "312 delayed orders stabilized; $48,200 revenue-at-risk exposure moved to post-incident follow-up.",
      updatedAt: new Date()
    })
    .where(eq(incidents.id, PHASE5_WORKFLOW.incidentId));

  await db
    .insert(incidentTimelineEvents)
    .values({
      id: "tl_phase5_remediation_simulated",
      incidentId: PHASE5_WORKFLOW.incidentId,
      actorUserId,
      eventType: "remediation-simulated",
      title: "Buffer-mode remediation simulated",
      body: "After approval, CommandGrid simulated MSP-02 regional buffer mode and replay-health validation. No external systems were changed.",
      occurredAt: date(PHASE5_WORKFLOW.resolvedAt),
      metadata: { runId: PHASE5_WORKFLOW.runId, approvalId: PHASE5_WORKFLOW.approvalId, simulated: true }
    })
    .onConflictDoUpdate({
      target: incidentTimelineEvents.id,
      set: {
        body: "After approval, CommandGrid simulated MSP-02 regional buffer mode and replay-health validation. No external systems were changed.",
        metadata: { runId: PHASE5_WORKFLOW.runId, approvalId: PHASE5_WORKFLOW.approvalId, simulated: true },
        updatedAt: new Date()
      }
    });

  await db
    .insert(notifications)
    .values({
      id: PHASE5_WORKFLOW.notificationId,
      organizationId: PHASE5_WORKFLOW.organizationId,
      incidentId: PHASE5_WORKFLOW.incidentId,
      integrationId: "int_slack",
      channel: "slack",
      recipient: "#sev1-warehouse-api",
      subject: "Warehouse API latency remediated in CommandGrid demo",
      status: "sent",
      sentAt: date(PHASE5_WORKFLOW.resolvedAt),
      metadata: { runId: PHASE5_WORKFLOW.runId, simulated: true }
    })
    .onConflictDoUpdate({
      target: notifications.id,
      set: { status: "sent", sentAt: date(PHASE5_WORKFLOW.resolvedAt), metadata: { runId: PHASE5_WORKFLOW.runId, simulated: true }, updatedAt: new Date() }
    });

  await writeAuditLog(db, {
    id: "audit_phase5_remediation_simulated",
    organizationId: PHASE5_WORKFLOW.organizationId,
    actorUserId,
    action: "remediation.simulated",
    targetType: "incident",
    targetId: PHASE5_WORKFLOW.incidentId,
    occurredAt: date(PHASE5_WORKFLOW.resolvedAt),
    metadata: { runId: PHASE5_WORKFLOW.runId, approvalId: PHASE5_WORKFLOW.approvalId }
  });

  await db
    .insert(reports)
    .values({
      id: PHASE5_WORKFLOW.reportId,
      organizationId: PHASE5_WORKFLOW.organizationId,
      incidentId: PHASE5_WORKFLOW.incidentId,
      slug: PHASE5_WORKFLOW.reportSlug,
      title: "Warehouse API latency post-incident report",
      reportType: "postmortem",
      status: "draft",
      generatedByUserId: actorUserId,
      generatedAt: date(PHASE5_WORKFLOW.resolvedAt),
      storageUri: "r2://commandgrid-reports/demo/warehouse-api-latency-phase5-postmortem.md",
      summary:
        "Autonomous workflow completed Ops, Support, Finance, Security, Comms, and Governance steps; remediation was simulated only after approval.",
      metadata: {
        runId: PHASE5_WORKFLOW.runId,
        approvalId: PHASE5_WORKFLOW.approvalId,
        auditActions: approvalContinuationAuditActions(),
        simulated: true
      }
    })
    .onConflictDoUpdate({
      target: reports.id,
      set: {
        status: "draft",
        generatedAt: date(PHASE5_WORKFLOW.resolvedAt),
        summary:
          "Autonomous workflow completed Ops, Support, Finance, Security, Comms, and Governance steps; remediation was simulated only after approval.",
        metadata: {
          runId: PHASE5_WORKFLOW.runId,
          approvalId: PHASE5_WORKFLOW.approvalId,
          auditActions: approvalContinuationAuditActions(),
          simulated: true
        },
        updatedAt: new Date()
      }
    });

  await writeAuditLog(db, {
    id: "audit_phase5_postmortem_generated",
    organizationId: PHASE5_WORKFLOW.organizationId,
    actorUserId,
    action: "postmortem.generated",
    targetType: "report",
    targetId: PHASE5_WORKFLOW.reportId,
    occurredAt: date(PHASE5_WORKFLOW.resolvedAt),
    metadata: { runId: PHASE5_WORKFLOW.runId, reportSlug: PHASE5_WORKFLOW.reportSlug }
  });

  return {
    ok: true,
    incidentId: PHASE5_WORKFLOW.incidentId,
    approvalId: PHASE5_WORKFLOW.approvalId,
    status: alreadyRemediated ? "already-remediated" : "remediated",
    reportId: PHASE5_WORKFLOW.reportId,
    auditEvents: approvalContinuationAuditActions().length
  };
}
