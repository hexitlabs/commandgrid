import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { CommandGridCloudflareEnv } from "@/types/cloudflare";

type CloudflareContext = {
  env: CommandGridCloudflareEnv;
};

export async function getCommandGridCloudflareContext(): Promise<CloudflareContext | null> {
  try {
    return (await getCloudflareContext({ async: true })) as CloudflareContext;
  } catch {
    return null;
  }
}
