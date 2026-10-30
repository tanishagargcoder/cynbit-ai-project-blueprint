import { generateBlueprint } from "./engine.ts";
import { blueprintToText } from "./format.ts";
import { isLlmEnabled, polishSummary, type LlmConfig } from "./llm.ts";
import { clientKey, type RateLimiter } from "./rateLimit.ts";
import { validateContact, validateInput, validateLeadIdea } from "./validate.ts";

export interface HandlerDeps {
  llm: LlmConfig;
  webhookUrl?: string;
  blueprintLimiter: RateLimiter;
  leadLimiter: RateLimiter;
  fetchImpl?: typeof fetch;
  log?: (line: string) => void;
}

const MAX_BODY_BYTES = 20_000;

function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return Response.json(body, { status, headers: { "cache-control": "no-store", ...headers } });
}

function tooMany(retryAfterSeconds: number): Response {
  return json(
    { error: "Too many requests. Wait a moment and try again.", retryAfterSeconds },
    429,
    { "retry-after": String(retryAfterSeconds) },
  );
}

async function readJson(req: Request): Promise<{ ok: true; body: unknown } | { ok: false; res: Response }> {
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) return { ok: false, res: json({ error: "Request is too large." }, 413) };
  let text: string;
  try {
    text = await req.text();
  } catch {
    return { ok: false, res: json({ error: "Could not read the request." }, 400) };
  }
  if (text.length > MAX_BODY_BYTES) return { ok: false, res: json({ error: "Request is too large." }, 413) };
  try {
    return { ok: true, body: JSON.parse(text) };
  } catch {
    return { ok: false, res: json({ error: "Send valid JSON." }, 400) };
  }
}

export function createHandlers(deps: HandlerDeps) {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const log = deps.log ?? ((line: string) => console.log(line));

  /** GET: tells the UI whether the optional AI summary is available. */
  async function blueprintStatus(): Promise<Response> {
    return json({ ai: isLlmEnabled(deps.llm) });
  }

  /** POST: validate, compute the blueprint, optionally polish the summary. */
  async function blueprintPost(req: Request): Promise<Response> {
    const rl = deps.blueprintLimiter.check(clientKey(req));
    if (!rl.allowed) return tooMany(rl.retryAfterSeconds);

    const parsed = await readJson(req);
    if (!parsed.ok) return parsed.res;

    const body = (parsed.body ?? {}) as Record<string, unknown>;
    const v = validateInput(body.input ?? body);
    if (!v.ok) return json({ error: "Check the highlighted fields.", fields: v.errors }, 422);

    const blueprint = generateBlueprint(v.value);
    let summarySource: "template" | "ai" = "template";
    if (body.polish === true) {
      const polished = await polishSummary(blueprint, v.value, deps.llm, fetchImpl);
      if (polished) {
        blueprint.summary = polished;
        summarySource = "ai";
      }
    }
    return json({ blueprint, summarySource });
  }

  /** POST: validate everything again server-side, recompute, forward the lead. */
  async function leadPost(req: Request): Promise<Response> {
    const rl = deps.leadLimiter.check(clientKey(req));
    if (!rl.allowed) return tooMany(rl.retryAfterSeconds);

    const parsed = await readJson(req);
    if (!parsed.ok) return parsed.res;
    const body = (parsed.body ?? {}) as Record<string, unknown>;

    // Honeypot: real visitors never fill this hidden field. Pretend success so bots learn nothing.
    if (typeof body.website === "string" && body.website.trim() !== "") {
      return json({ ok: true });
    }

    const input = validateInput(body.input);
    const contact = validateContact(body.contact);
    const errors: Record<string, string> = {
      ...(input.ok ? validateLeadIdea(input.value) : input.errors),
      ...(contact.ok ? {} : contact.errors),
    };
    if (Object.keys(errors).length > 0 || !input.ok || !contact.ok) {
      return json({ error: "Check the highlighted fields.", fields: errors }, 422);
    }

    // Never trust a blueprint sent by the browser: rebuild it from the validated brief.
    const blueprint = generateBlueprint(input.value);
    const text = blueprintToText(blueprint, input.value, contact.value);

    if (!deps.webhookUrl) {
      log(`[lead] (no LEAD_WEBHOOK_URL set, logging only)\n${text}`);
      return json({ ok: true, delivered: "logged" });
    }
    try {
      const res = await fetchImpl(deps.webhookUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        // `text` is read by Slack, `content` by Discord; the full object helps Apps Script.
        body: JSON.stringify({
          text,
          content: text.slice(0, 1900),
          lead: contact.value,
          input: input.value,
          blueprint,
        }),
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(`webhook responded ${res.status}`);
      return json({ ok: true, delivered: "webhook" });
    } catch (err) {
      log(`[lead] webhook failed: ${(err as Error).message}\n${text}`);
      return json(
        { error: "We could not send your request just now. Please email opportunities@cynbit.in instead." },
        502,
      );
    }
  }

  return { blueprintStatus, blueprintPost, leadPost };
}
