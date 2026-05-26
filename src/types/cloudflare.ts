export type HyperdriveBinding = {
  connectionString: string;
};

export type CommandGridCloudflareEnv = {
  COMMANDGRID_DB?: HyperdriveBinding;
  COMMANDGRID_CONFIG?: KVNamespace;
  COMMANDGRID_REPORTS?: R2Bucket;
  COMMANDGRID_EVENTS?: Queue;
  COMMANDGRID_AI_GATEWAY_URL?: string;
  COMMANDGRID_AI_GATEWAY_ID?: string;
  ENVIRONMENT?: string;
  DEMO_MODE?: string;
};
