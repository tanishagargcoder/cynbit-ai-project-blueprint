import type {
  BlueprintInput,
  Contact,
  ValidationResult,
} from "./types.ts";

const SERVICES = ["ai", "app", "saas", "cloud", "marketing"] as const;
const GOALS = ["automate", "launch", "scale", "convert"] as const;
const SCALES = ["small", "medium", "large"] as const;
const INTEGRATIONS = ["few", "some", "many"] as const;
const COMPLIANCE = ["none", "privacy", "regulated"] as const;
const URGENCY = ["flexible", "quarter", "rush"] as const;
const BUDGETS = ["unsure", "lean", "standard", "growth", "enterprise"] as const;

export const LIMITS = { idea: 1000, name: 80, company: 80, email: 120, minLeadIdea: 10 } as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Remove control characters and collapse stray whitespace. */
export function clean(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[ \t]+/g, " ")
    .trim()
    .slice(0, max);
}

function pickOne<T extends string>(raw: unknown, allowed: readonly T[], field: string, errors: Record<string, string>): T {
  if (typeof raw === "string" && (allowed as readonly string[]).includes(raw)) return raw as T;
  errors[field] = "Choose one of the listed options.";
  return allowed[0];
}

function pickMany<T extends string>(raw: unknown, allowed: readonly T[]): T[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<T>();
  for (const item of raw) {
    if (typeof item === "string" && (allowed as readonly string[]).includes(item)) seen.add(item as T);
  }
  // Keep the canonical order so equal selections give equal results.
  return allowed.filter((a) => seen.has(a));
}

export function validateInput(raw: unknown): ValidationResult<BlueprintInput> {
  const errors: Record<string, string> = {};
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { ok: false, errors: { form: "Send the project details as an object." } };
  }
  const r = raw as Record<string, unknown>;

  const services = pickMany(r.services, SERVICES);
  if (services.length === 0) errors.services = "Pick at least one service.";

  const goals = pickMany(r.goals, GOALS);
  const idea = clean(r.idea, LIMITS.idea);
  if (typeof r.idea === "string" && r.idea.length > LIMITS.idea) {
    errors.idea = `Keep the description under ${LIMITS.idea} characters.`;
  }

  const scale = pickOne(r.scale, SCALES, "scale", errors);
  const integrations = pickOne(r.integrations, INTEGRATIONS, "integrations", errors);
  const compliance = pickOne(r.compliance, COMPLIANCE, "compliance", errors);
  const urgency = pickOne(r.urgency, URGENCY, "urgency", errors);
  const budget = pickOne(r.budget, BUDGETS, "budget", errors);

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { services, goals, idea, scale, integrations, compliance, urgency, budget } };
}

export function validateContact(raw: unknown): ValidationResult<Contact> {
  const errors: Record<string, string> = {};
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { ok: false, errors: { contact: "Send your contact details as an object." } };
  }
  const r = raw as Record<string, unknown>;
  const name = clean(r.name, LIMITS.name);
  const email = clean(r.email, LIMITS.email).toLowerCase();
  const company = clean(r.company, LIMITS.company);

  if (name.length < 2) errors.name = "Enter your name.";
  if (!EMAIL_RE.test(email)) errors.email = "Enter a valid email address, like name@company.com.";
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { name, email, ...(company ? { company } : {}) } };
}

/** A lead needs enough detail for the team to act on. */
export function validateLeadIdea(input: BlueprintInput): Record<string, string> {
  return input.idea.length < LIMITS.minLeadIdea
    ? { idea: `Describe your idea in at least ${LIMITS.minLeadIdea} characters so the team can help.` }
    : {};
}
