export type CommandGridEventType =
  | "demo.incident.requested"
  | "incident.workflow.started"
  | "incident.agent.completed"
  | "incident.approval.requested"
  | "incident.approval.approved"
  | "incident.remediation.completed"
  | "incident.postmortem.generated";

export type CommandGridEventEnvelope<TMetadata extends Record<string, unknown> = Record<string, unknown>> = {
  id: string;
  type: CommandGridEventType;
  entityType: "incident" | "approval" | "agent_run" | "report";
  entityId: string;
  actor: {
    type: "system" | "user";
    id?: string;
  };
  occurredAt: string;
  metadata: TMetadata;
};

export function createEventEnvelope<TMetadata extends Record<string, unknown>>(input: Omit<CommandGridEventEnvelope<TMetadata>, "occurredAt"> & { occurredAt?: string }): CommandGridEventEnvelope<TMetadata> {
  return {
    ...input,
    occurredAt: input.occurredAt ?? new Date().toISOString()
  };
}
