import type {
  Blueprint,
  BlueprintInput,
  Budget,
  BudgetStatus,
  Compliance,
  ComplexityLabel,
  GoalId,
  Integrations,
  Phase,
  ServiceId,
  StackItem,
  Urgency,
  UserScale,
} from "./types.ts";

/**
 * The blueprint engine is a pure function: same input, same output, no network.
 * That keeps the live preview instant, makes it unit-testable, and means the
 * product still works when no AI key is configured.
 */

// ---------------------------------------------------------------------------
// Assumptions. These are planning heuristics, NOT Cynbit's real pricing.
// Cynbit should replace them with its own numbers before using this in earnest.
// ---------------------------------------------------------------------------
export const ASSUMPTIONS = {
  /** Blended cost of one person for one week, in INR. Placeholder value. */
  blendedRateInrPerPersonWeek: 40_000,
  /** Baseline weeks for a trivially small project, before complexity is added. */
  baseWeeks: 3,
  /** Weeks added per complexity point. */
  weeksPerPoint: 1.5,
  /** Low and high ends of the range around the middle estimate. */
  rangeLow: 0.9,
  rangeHigh: 1.25,
} as const;

export const BUDGET_BANDS: Record<Exclude<Budget, "unsure">, { lo: number; hi: number; label: string }> = {
  lean: { lo: 0, hi: 200_000, label: "under ₹2 lakh" },
  standard: { lo: 200_000, hi: 600_000, label: "₹2–6 lakh" },
  growth: { lo: 600_000, hi: 1_500_000, label: "₹6–15 lakh" },
  enterprise: { lo: 1_500_000, hi: Number.POSITIVE_INFINITY, label: "₹15 lakh and above" },
};

// ---------------------------------------------------------------------------
// Option catalogue (also used by the UI so labels live in one place)
// ---------------------------------------------------------------------------
export const SERVICE_OPTIONS: { id: ServiceId; label: string; blurb: string; weight: number }[] = [
  { id: "ai", label: "AI automation", blurb: "Agents, LLM workflows, voice", weight: 3 },
  { id: "app", label: "Web or mobile app", blurb: "Customer-facing product", weight: 3 },
  { id: "saas", label: "SaaS platform", blurb: "Multi-user, subscription-based", weight: 4 },
  { id: "cloud", label: "Cloud and migration", blurb: "AWS or Azure, legacy to modern", weight: 2 },
  { id: "marketing", label: "Marketing and SEO", blurb: "Landing pages, tracking, search", weight: 1 },
];

export const GOAL_OPTIONS: { id: GoalId; label: string }[] = [
  { id: "automate", label: "Cut manual work" },
  { id: "launch", label: "Launch a first version" },
  { id: "scale", label: "Scale something that exists" },
  { id: "convert", label: "Get more leads or sales" },
];

export const SCALE_OPTIONS: { id: UserScale; label: string; points: number }[] = [
  { id: "small", label: "Under 1,000 users", points: 0 },
  { id: "medium", label: "1,000 to 50,000 users", points: 1 },
  { id: "large", label: "More than 50,000 users", points: 2.5 },
];

export const INTEGRATION_OPTIONS: { id: Integrations; label: string; points: number }[] = [
  { id: "few", label: "None or one other system", points: 0 },
  { id: "some", label: "Two to five systems", points: 1 },
  { id: "many", label: "Six or more systems", points: 2.5 },
];

export const COMPLIANCE_OPTIONS: { id: Compliance; label: string; points: number }[] = [
  { id: "none", label: "No sensitive data", points: 0 },
  { id: "privacy", label: "Personal data (privacy rules apply)", points: 1 },
  { id: "regulated", label: "Health, finance or other regulated data", points: 2.5 },
];

export const URGENCY_OPTIONS: { id: Urgency; label: string }[] = [
  { id: "flexible", label: "Flexible, quality first" },
  { id: "quarter", label: "Within about three months" },
  { id: "rush", label: "As fast as possible" },
];

export const BUDGET_OPTIONS: { id: Budget; label: string }[] = [
  { id: "unsure", label: "Not sure yet" },
  { id: "lean", label: BUDGET_BANDS.lean.label },
  { id: "standard", label: BUDGET_BANDS.standard.label },
  { id: "growth", label: BUDGET_BANDS.growth.label },
  { id: "enterprise", label: BUDGET_BANDS.enterprise.label },
];

// ---------------------------------------------------------------------------
// Feature detection from the free-text idea
// ---------------------------------------------------------------------------
const KEYWORD_FEATURES: { test: RegExp; feature: string }[] = [
  { test: /chat ?bot|assistant|support bot|faq/i, feature: "Conversational assistant grounded in your own content" },
  { test: /whats ?app/i, feature: "WhatsApp channel integration" },
  { test: /\bvoice\b|\bcalls?\b|phone/i, feature: "Voice agent for inbound and outbound calls" },
  { test: /payment|checkout|subscription|billing|razorpay|stripe/i, feature: "Payments and subscription billing" },
  { test: /dashboard|analytics|report/i, feature: "Analytics dashboard with exportable reports" },
  { test: /inventory|stock|warehouse/i, feature: "Inventory and stock tracking" },
  { test: /\bcrm\b|\bleads?\b|sales pipeline/i, feature: "Lead capture with CRM sync" },
  { test: /log ?in|sign ?in|\baccounts?\b|\broles?\b|\badmin\b/i, feature: "Role-based accounts and an admin panel" },
  { test: /notification|reminder|\bemail\b|\bsms\b/i, feature: "Email and SMS notifications" },
  { test: /\b(android|ios|mobile)\b/i, feature: "Mobile-friendly client (PWA or native)" },
  { test: /\bpdf\b|invoice|document|\bocr\b/i, feature: "Document processing and data extraction" },
  { test: /booking|appointment|schedul/i, feature: "Booking and scheduling" },
  { test: /marketplace|vendor|seller/i, feature: "Multi-vendor marketplace flows" },
  { test: /\bseo\b|search ranking|google ranking/i, feature: "Technical SEO audit and fixes" },
];

const SERVICE_FEATURES: Record<ServiceId, string> = {
  ai: "Workflow automation with human-approval checkpoints",
  app: "Responsive client with a typed API",
  saas: "Multi-tenant accounts, roles and subscription plans",
  cloud: "Secure cloud environment with automated deploys",
  marketing: "Conversion-focused pages with tracking and SEO foundations",
};

const GOAL_FEATURES: Record<GoalId, string> = {
  automate: "Time-saved tracking, so the automation can be measured",
  launch: "Scoped first release with a post-launch backlog",
  scale: "Load testing and a performance budget",
  convert: "Funnel analytics and A/B-ready page structure",
};

export function detectKeywordFeatures(idea: string): string[] {
  return KEYWORD_FEATURES.filter((k) => k.test.test(idea)).map((k) => k.feature);
}

// ---------------------------------------------------------------------------
// Complexity
// ---------------------------------------------------------------------------
function pointsFor<T extends { id: string; points: number }>(options: T[], id: string): number {
  return options.find((o) => o.id === id)?.points ?? 0;
}

export function complexityScore(input: BlueprintInput, keywordCount: number): number {
  const weights = input.services
    .map((s) => SERVICE_OPTIONS.find((o) => o.id === s)?.weight ?? 0)
    .sort((a, b) => b - a);
  // The biggest workstream counts in full; each extra one adds 60% of its weight,
  // because workstreams share design, infrastructure and project management.
  const serviceScore = weights.reduce((sum, w, i) => sum + (i === 0 ? w : w * 0.6), 0);
  const keywordScore = Math.min(keywordCount, 5) * 0.4;
  const raw =
    serviceScore +
    pointsFor(SCALE_OPTIONS, input.scale) +
    pointsFor(INTEGRATION_OPTIONS, input.integrations) +
    pointsFor(COMPLIANCE_OPTIONS, input.compliance) +
    keywordScore;
  return Math.round(raw * 10) / 10;
}

export function complexityLabel(score: number): ComplexityLabel {
  if (score < 4) return "Focused";
  if (score < 7) return "Moderate";
  if (score < 10) return "Substantial";
  return "Large";
}

function teamSizeFor(label: ComplexityLabel): number {
  return { Focused: 2, Moderate: 3, Substantial: 4, Large: 5 }[label];
}

// ---------------------------------------------------------------------------
// Phases: Cynbit's own six-step lifecycle, as shown on their website
// ---------------------------------------------------------------------------
const PHASE_SHARES: { id: string; name: string; share: number }[] = [
  { id: "discovery", name: "Discovery and audit", share: 0.1 },
  { id: "strategy", name: "Strategy and blueprinting", share: 0.12 },
  { id: "design", name: "High-fidelity design", share: 0.16 },
  { id: "build", name: "Technical implementation", share: 0.4 },
  { id: "quality", name: "Quality and integrity check", share: 0.12 },
  { id: "launch", name: "Deployment and evolution", share: 0.1 },
];

const BUILD_DELIVERABLES: Record<ServiceId, string> = {
  ai: "Agent and LLM workflows with guardrails and an evaluation set",
  app: "Client application and API, built in weekly demoable slices",
  saas: "Multi-tenant backend with authentication and billing",
  cloud: "Infrastructure as code and a CI/CD pipeline",
  marketing: "Landing pages, event tracking and technical SEO fixes",
};

function deliverablesFor(phaseId: string, input: BlueprintInput): string[] {
  switch (phaseId) {
    case "discovery":
      return [
        "Stakeholder interviews and workflow mapping",
        "Audit of existing systems and data",
        input.compliance === "none" ? "Success metrics agreed in writing" : "Data-handling and compliance checklist",
      ];
    case "strategy":
      return [
        "Architecture and integration plan",
        "Prioritised scope with a first-release cut line",
        input.services.includes("ai") ? "AI approach, data sources and evaluation plan" : "Technology choices and rationale",
      ];
    case "design":
      return [
        "Clickable prototype of the key journeys",
        "Design system: type, colour, components",
        "Usability check with two or three real users",
      ];
    case "build":
      return [
        ...input.services.map((s) => BUILD_DELIVERABLES[s]),
        "Weekly demos on a staging environment",
        "Code review and technical documentation",
      ].slice(0, 5);
    case "quality":
      return [
        "Automated tests on critical paths",
        input.scale === "large" ? "Load test against peak traffic" : "Cross-device and accessibility pass",
        "Security review before launch",
      ];
    default:
      return [
        "Staged rollout with monitoring and alerts",
        "Team handover and documentation",
        "First-month optimisation against agreed metrics",
      ];
  }
}

function buildPhases(midTarget: number, input: BlueprintInput): Phase[] {
  let cursor = 0;
  return PHASE_SHARES.map((p) => {
    const weeks = Math.max(1, Math.round(midTarget * p.share));
    const phase: Phase = {
      id: p.id,
      name: p.name,
      weeks,
      startWeek: cursor,
      deliverables: deliverablesFor(p.id, input),
    };
    cursor += weeks;
    return phase;
  });
}

// ---------------------------------------------------------------------------
// Stack: drawn from the technologies Cynbit lists on its own services page
// ---------------------------------------------------------------------------
function buildStack(input: BlueprintInput): StackItem[] {
  const has = (s: ServiceId) => input.services.includes(s);
  const stack: StackItem[] = [];
  const voice = /\bvoice\b|\bcalls?\b|phone/i.test(input.idea);

  if (has("app") || has("saas") || has("marketing") || has("ai")) {
    stack.push({ layer: "Front end", choice: "Next.js with Tailwind CSS" });
  }
  if (has("ai") && (has("app") || has("saas"))) {
    stack.push({ layer: "Back end", choice: "NestJS API with a separate FastAPI service for AI work" });
  } else if (has("ai")) {
    stack.push({ layer: "Back end", choice: "FastAPI (Python) workflow service" });
  } else if (has("app") || has("saas")) {
    stack.push({ layer: "Back end", choice: "NestJS (TypeScript) API" });
  }
  if (has("app") || has("saas") || has("ai")) {
    stack.push({
      layer: "Data",
      choice: input.scale === "large" ? "PostgreSQL with Redis for caching and queues" : "PostgreSQL (Supabase)",
    });
  }
  if (has("ai")) {
    stack.push({
      layer: "AI",
      choice: voice
        ? "OpenAI and LangChain, plus a speech-to-text and text-to-speech provider"
        : "OpenAI and LangChain, with retrieval over your own documents",
    });
  }
  if (has("cloud") || input.scale === "large" || input.compliance === "regulated") {
    stack.push({ layer: "Cloud", choice: "AWS or Azure, with Terraform, Docker and CI/CD" });
  } else if (stack.length > 0) {
    stack.push({ layer: "Hosting", choice: "Managed hosting with CI/CD, scalable later" });
  }
  if (has("marketing")) {
    stack.push({ layer: "Growth", choice: "Analytics and event tracking, Search Console, CRM automation" });
  }
  if (input.compliance === "privacy") {
    stack.push({ layer: "Security", choice: "Encryption at rest, audit logs and consent capture" });
  } else if (input.compliance === "regulated") {
    stack.push({ layer: "Security", choice: "Zero-trust access, full audit trail, data-residency review" });
  }
  return stack;
}

// ---------------------------------------------------------------------------
// Risks and questions
// ---------------------------------------------------------------------------
function buildRisks(input: BlueprintInput): string[] {
  const risks: string[] = [];
  if (input.compliance === "regulated") {
    risks.push("Regulated data needs a compliance review before the design is locked.");
  }
  if (input.integrations === "many") {
    risks.push("Six or more integrations: API limits and changes can slow delivery. Confirm access to each system early.");
  }
  if (input.urgency === "rush") {
    risks.push("A compressed schedule leaves less room for rework. We would cut scope before cutting testing.");
  }
  if (input.services.includes("ai")) {
    risks.push("AI output quality depends on your data. Plan an evaluation set and human review from the start.");
  }
  if (input.idea.trim().length < 40) {
    risks.push("The idea is still broad. Discovery will narrow the scope before estimates firm up.");
  }
  if (input.services.length >= 3) {
    risks.push("Several workstreams at once. Consider phasing the release.");
  }
  if (input.scale === "large") {
    risks.push("Peak traffic must be load tested before launch.");
  }
  if (risks.length === 0) {
    risks.push("No major risks flagged. Discovery may surface more.");
  }
  return risks.slice(0, 4);
}

function buildQuestions(input: BlueprintInput): string[] {
  const q: string[] = ["Who approves scope and decisions on your side?"];
  if (input.services.includes("ai")) {
    q.push("Which documents, systems or data will the AI work from, and who owns them?");
  }
  if (input.integrations !== "few") {
    q.push("Which systems must connect first, and can we get sandbox access?");
  }
  if (input.compliance !== "none") {
    q.push("Which regulations or customer contracts apply to this data?");
  }
  if (input.services.includes("marketing")) {
    q.push("What are your current traffic and conversion numbers?");
  }
  if (input.budget === "unsure") {
    q.push("What would a successful first release look like, in numbers?");
  }
  return q.slice(0, 4);
}

// ---------------------------------------------------------------------------
// Budget fit
// ---------------------------------------------------------------------------
export function assessBudget(
  budget: Budget,
  minPersonWeeks: number,
  maxPersonWeeks: number,
): { status: BudgetStatus; note: string } {
  if (budget === "unsure") {
    return { status: "unknown", note: "Share a budget range and we will shape the scope to fit it." };
  }
  const band = BUDGET_BANDS[budget];
  const rate = ASSUMPTIONS.blendedRateInrPerPersonWeek;
  const estMin = minPersonWeeks * rate;
  const estMax = maxPersonWeeks * rate;
  if (estMin > band.hi) {
    return {
      status: "stretch",
      note: `This scope likely needs more than ${band.label}. We would propose a phased first release that fits.`,
    };
  }
  if (estMax < band.lo) {
    return {
      status: "under",
      note: `This scope sits below ${band.label}, so there is room for extra features or a longer polish phase.`,
    };
  }
  return { status: "fits", note: `The scope looks workable within ${band.label}, to be confirmed in discovery.` };
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------
function driversOf(input: BlueprintInput, keywordCount: number): string[] {
  const d: string[] = [];
  if (input.services.length >= 2) d.push("several workstreams");
  if (input.integrations === "many") d.push("many integrations");
  if (input.compliance === "regulated") d.push("regulated data");
  if (input.scale === "large") d.push("high expected traffic");
  if (input.urgency === "rush") d.push("a tight deadline");
  if (keywordCount >= 3) d.push("a rich feature list");
  return d;
}

function joinNatural(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

export function generateBlueprint(input: BlueprintInput): Blueprint {
  const keywordFeatures = detectKeywordFeatures(input.idea);
  const score = complexityScore(input, keywordFeatures.length);
  const label = complexityLabel(score);

  const urgencyFactor = { flexible: 1.1, quarter: 1, rush: 0.8 }[input.urgency];
  const baseWeeks = ASSUMPTIONS.baseWeeks + score * ASSUMPTIONS.weeksPerPoint;
  const phases = buildPhases(baseWeeks * urgencyFactor, input);
  const midWeeks = phases.reduce((sum, p) => sum + p.weeks, 0);
  const minWeeks = Math.max(1, Math.floor(midWeeks * ASSUMPTIONS.rangeLow));
  const maxWeeks = Math.ceil(midWeeks * ASSUMPTIONS.rangeHigh);

  const teamSize = teamSizeFor(label);
  // A rushed project is delivered by a bigger team working in parallel, which costs more coordination.
  const coordination = input.urgency === "rush" ? 1.15 : 1;
  const minPersonWeeks = Math.round(minWeeks * teamSize * coordination);
  const maxPersonWeeks = Math.round(maxWeeks * teamSize * coordination);

  const features = [
    ...input.services.map((s) => SERVICE_FEATURES[s]),
    ...input.goals.map((g) => GOAL_FEATURES[g]),
    ...keywordFeatures,
  ].slice(0, 9);

  const serviceLabels = input.services.map((s) => SERVICE_OPTIONS.find((o) => o.id === s)?.label ?? s);
  const title = `${joinNatural(serviceLabels)} blueprint`;
  const drivers = driversOf(input, keywordFeatures.length);
  const summary =
    `This looks like a ${label.toLowerCase()} project: roughly ${minWeeks} to ${maxWeeks} weeks across six phases, ` +
    `with a team of about ${teamSize}. ` +
    (drivers.length > 0
      ? `The main drivers are ${joinNatural(drivers)}.`
      : "The scope is clear and well bounded.");

  return {
    title,
    summary,
    complexity: { score, label },
    features,
    stack: buildStack(input),
    phases,
    timeline: { minWeeks, midWeeks, maxWeeks },
    teamSize,
    effort: { minPersonWeeks, maxPersonWeeks },
    budgetFit: assessBudget(input.budget, minPersonWeeks, maxPersonWeeks),
    risks: buildRisks(input),
    questions: buildQuestions(input),
  };
}
