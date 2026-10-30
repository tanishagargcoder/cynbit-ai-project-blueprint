export type ServiceId = "ai" | "app" | "saas" | "cloud" | "marketing";
export type GoalId = "automate" | "launch" | "scale" | "convert";
export type UserScale = "small" | "medium" | "large";
export type Integrations = "few" | "some" | "many";
export type Compliance = "none" | "privacy" | "regulated";
export type Urgency = "flexible" | "quarter" | "rush";
export type Budget = "unsure" | "lean" | "standard" | "growth" | "enterprise";

export interface BlueprintInput {
  services: ServiceId[];
  goals: GoalId[];
  idea: string;
  scale: UserScale;
  integrations: Integrations;
  compliance: Compliance;
  urgency: Urgency;
  budget: Budget;
}

export interface Contact {
  name: string;
  email: string;
  company?: string;
}

export interface Phase {
  id: string;
  name: string;
  weeks: number;
  startWeek: number;
  deliverables: string[];
}

export interface StackItem {
  layer: string;
  choice: string;
}

export type ComplexityLabel = "Focused" | "Moderate" | "Substantial" | "Large";
export type BudgetStatus = "unknown" | "fits" | "stretch" | "under";

export interface Blueprint {
  title: string;
  summary: string;
  complexity: { score: number; label: ComplexityLabel };
  features: string[];
  stack: StackItem[];
  phases: Phase[];
  timeline: { minWeeks: number; midWeeks: number; maxWeeks: number };
  teamSize: number;
  effort: { minPersonWeeks: number; maxPersonWeeks: number };
  budgetFit: { status: BudgetStatus; note: string };
  risks: string[];
  questions: string[];
}

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: Record<string, string> };
