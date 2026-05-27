import type { CommandGridEventEnvelope } from "./envelope";

export type EventPublisherEnv = {
  COMMANDGRID_EVENTS?: Queue<CommandGridEventEnvelope>;
};

export type PublishEventResult = {
  queued: boolean;
  reason?: string;
};

export async function publishCommandGridEvent(env: EventPublisherEnv | null | undefined, event: CommandGridEventEnvelope): Promise<PublishEventResult> {
  const queue = env?.COMMANDGRID_EVENTS;

  if (!queue) {
    return { queued: false, reason: "queue-binding-unavailable" };
  }

  await queue.send(event, {
    contentType: "json"
  });

  return { queued: true };
}
