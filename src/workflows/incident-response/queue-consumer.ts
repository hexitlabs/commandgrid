import type { CommandGridDb } from "../../lib/db/client";
import type { CommandGridEventEnvelope } from "../../modules/events/envelope";
import { approveDemoRemediation, startDemoIncidentWorkflow, type IncidentWorkflowEnv } from "../../modules/workflows/incident-response/service";

export async function handleIncidentResponseQueueEvent(db: CommandGridDb, env: IncidentWorkflowEnv, event: CommandGridEventEnvelope) {
  switch (event.type) {
    case "demo.incident.requested":
      return startDemoIncidentWorkflow(db, env);
    case "incident.approval.approved":
      return approveDemoRemediation(db, { actorUserId: event.actor.id });
    default:
      return { ok: true, ignored: true, eventType: event.type };
  }
}

export async function handleIncidentResponseQueueBatch(
  db: CommandGridDb,
  env: IncidentWorkflowEnv,
  batch: MessageBatch<CommandGridEventEnvelope>
) {
  for (const message of batch.messages) {
    try {
      await handleIncidentResponseQueueEvent(db, env, message.body);
      message.ack();
    } catch (error) {
      message.retry({ delaySeconds: 10 });
      throw error;
    }
  }
}
