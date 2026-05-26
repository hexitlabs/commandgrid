import { smokeAiGateway } from "../src/lib/ai/gateway";

const result = smokeAiGateway({ COMMANDGRID_AI_GATEWAY_ID: process.env.COMMANDGRID_AI_GATEWAY_ID });
console.log(`ai_gateway_mode=${result.mode}; ok=${result.ok}`);
