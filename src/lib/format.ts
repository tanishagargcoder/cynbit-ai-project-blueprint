import type { Blueprint, BlueprintInput, Contact } from "./types.ts";
import {
  BUDGET_OPTIONS,
  COMPLIANCE_OPTIONS,
  GOAL_OPTIONS,
  INTEGRATION_OPTIONS,
  SCALE_OPTIONS,
  SERVICE_OPTIONS,
  URGENCY_OPTIONS,
} from "./engine.ts";

const labelOf = (options: { id: string; label: string }[], id: string) =>
  options.find((o) => o.id === id)?.label ?? id;

/** Plain-text version of a blueprint: used for copy, email and the lead webhook. */
export function blueprintToText(bp: Blueprint, input: BlueprintInput, contact?: Contact): string {
  const lines: string[] = [];
  if (contact) {
    lines.push(`Lead: ${contact.name} <${contact.email}>${contact.company ? `, ${contact.company}` : ""}`, "");
  }
  lines.push(
    bp.title.toUpperCase(),
    bp.summary,
    "",
    `Complexity: ${bp.complexity.label} (${bp.complexity.score})`,
    `Timeline: ${bp.timeline.minWeeks} to ${bp.timeline.maxWeeks} weeks, team of about ${bp.teamSize}`,
    `Budget: ${labelOf(BUDGET_OPTIONS, input.budget)}. ${bp.budgetFit.note}`,
    "",
    "Brief",
    `- Services: ${input.services.map((s) => labelOf(SERVICE_OPTIONS, s)).join(", ")}`,
    `- Goals: ${input.goals.map((g) => labelOf(GOAL_OPTIONS, g)).join(", ") || "not stated"}`,
    `- Scale: ${labelOf(SCALE_OPTIONS, input.scale)}`,
    `- Integrations: ${labelOf(INTEGRATION_OPTIONS, input.integrations)}`,
    `- Data: ${labelOf(COMPLIANCE_OPTIONS, input.compliance)}`,
    `- Timing: ${labelOf(URGENCY_OPTIONS, input.urgency)}`,
    `- Idea: ${input.idea || "not provided"}`,
    "",
    "Phases",
    ...bp.phases.map((p) => `- ${p.name}: ${p.weeks} wk (starts week ${p.startWeek + 1})`),
    "",
    "Suggested stack",
    ...bp.stack.map((s) => `- ${s.layer}: ${s.choice}`),
    "",
    "Risks",
    ...bp.risks.map((r) => `- ${r}`),
    "",
    "Questions for discovery",
    ...bp.questions.map((q) => `- ${q}`),
    "",
    "Estimate from the Cynbit Project Blueprint prototype. Not a quote.",
  );
  return lines.join("\n");
}
