import { createHandlers } from "./handlers.ts";
import { llmConfigFromEnv } from "./llm.ts";
import { createRateLimiter } from "./rateLimit.ts";

// One shared instance per server process.
export const handlers = createHandlers({
  llm: llmConfigFromEnv(),
  webhookUrl: process.env.LEAD_WEBHOOK_URL?.trim() || undefined,
  blueprintLimiter: createRateLimiter(30, 60_000),
  leadLimiter: createRateLimiter(5, 10 * 60_000),
});
