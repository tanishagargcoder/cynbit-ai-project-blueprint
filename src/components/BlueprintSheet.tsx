import type { Blueprint, BudgetStatus, Phase } from "../lib/types.ts";

const budgetStyle: Record<BudgetStatus, { label: string; cls: string }> = {
  unknown: { label: "Budget not set", cls: "border-rule text-muted" },
  fits: { label: "Fits your budget", cls: "border-print text-print" },
  under: { label: "Room to spare", cls: "border-print text-print" },
  stretch: { label: "Stretches your budget", cls: "border-pencil text-pencil" },
};

function Timeline({ phases, totalWeeks }: { phases: Phase[]; totalWeeks: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-muted" aria-hidden="true">
        <span>Week 1</span>
        <span>Week {totalWeeks}</span>
      </div>
      <ol className="space-y-2">
        {phases.map((p, i) => {
          const left = (p.startWeek / totalWeeks) * 100;
          const width = Math.max((p.weeks / totalWeeks) * 100, 3);
          return (
            <li key={p.id} className="grid grid-cols-1 items-center gap-1 sm:grid-cols-[11rem_1fr] sm:gap-3">
              <span className="flex items-baseline justify-between gap-2 text-sm font-medium text-ink">
                <span>
                  {i + 1}. {p.name}
                </span>
                <span className="shrink-0 font-normal text-muted">{p.weeks} wk</span>
              </span>
              <div className="relative h-7 border-b border-l border-rule bg-sheet">
                <div
                  aria-hidden="true"
                  className="absolute top-1 h-5 rounded-sm bg-print motion-safe:transition-all motion-safe:duration-500"
                  style={{ left: `${left}%`, width: `${width}%` }}
                />
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export interface BlueprintSheetProps {
  blueprint: Blueprint;
  /** Where the summary text came from. */
  summarySource?: "template" | "ai";
}

export function BlueprintSheet({ blueprint: bp, summarySource = "template" }: BlueprintSheetProps) {
  const budget = budgetStyle[bp.budgetFit.status];
  return (
    <article
      className="print-flat border-2 border-ink bg-sheet shadow-[6px_6px_0_0_rgba(23,35,59,0.12)]"
      aria-labelledby="bp-title"
    >
      <div className="border-b-2 border-ink p-5 sm:p-6">
        <h2 id="bp-title" className="font-display text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
          {bp.title}
        </h2>
        <p className="mt-3 max-w-prose text-[1.0625rem] leading-relaxed text-ink">{bp.summary}</p>
        {summarySource === "ai" && (
          <p className="mt-2 text-sm text-muted">Summary written by AI from the facts below. The numbers are calculated, not generated.</p>
        )}
        <p className="sr-only" aria-live="polite">
          Plan updated: {bp.timeline.minWeeks} to {bp.timeline.maxWeeks} weeks, {bp.complexity.label} complexity.
        </p>
      </div>

      <dl className="grid grid-cols-2 border-b-2 border-ink sm:grid-cols-4">
        {[
          ["Timeline", `${bp.timeline.minWeeks} to ${bp.timeline.maxWeeks} weeks`],
          ["Team", `About ${bp.teamSize} people`],
          ["Effort", `${bp.effort.minPersonWeeks} to ${bp.effort.maxPersonWeeks} person-weeks`],
          ["Complexity", bp.complexity.label],
        ].map(([k, v], i) => (
          <div key={k} className={`p-4 ${i % 2 === 1 ? "border-l border-rule" : ""} ${i > 1 ? "border-t border-rule sm:border-t-0" : ""} ${i > 0 ? "sm:border-l" : ""}`}>
            <dt className="text-sm text-muted">{k}</dt>
            <dd className="font-display text-lg font-bold leading-snug">{v}</dd>
          </div>
        ))}
      </dl>

      <section className="border-b border-rule p-5 sm:p-6" aria-labelledby="bp-phases">
        <h3 id="bp-phases" className="mb-3 font-display text-xl font-bold">
          Schedule
        </h3>
        <Timeline phases={bp.phases} totalWeeks={bp.timeline.midWeeks} />
        <p className="mt-3 text-sm text-muted">
          Bars show the middle estimate of {bp.timeline.midWeeks} weeks. Allow {bp.timeline.minWeeks} to{" "}
          {bp.timeline.maxWeeks} for the likely range.
        </p>
        <details className="mt-4 group">
          <summary className="cursor-pointer text-sm font-medium text-print underline underline-offset-4">
            What you get in each phase
          </summary>
          <ol className="mt-3 space-y-3 text-sm">
            {bp.phases.map((p) => (
              <li key={p.id}>
                <p className="font-medium">{p.name}</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-muted">
                  {p.deliverables.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </details>
      </section>

      <div className="grid md:grid-cols-2">
        <section className="border-b border-rule p-5 sm:p-6 md:border-r" aria-labelledby="bp-features">
          <h3 id="bp-features" className="mb-2 font-display text-xl font-bold">
            What we would build
          </h3>
          <ul className="list-disc space-y-1.5 pl-5">
            {bp.features.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </section>

        <section className="border-b border-rule p-5 sm:p-6" aria-labelledby="bp-stack">
          <h3 id="bp-stack" className="mb-2 font-display text-xl font-bold">
            Suggested stack
          </h3>
          {bp.stack.length === 0 ? (
            <p className="text-muted">Pick a service to see a suggested stack.</p>
          ) : (
            <dl className="space-y-2">
              {bp.stack.map((s) => (
                <div key={s.layer}>
                  <dt className="text-sm font-medium text-muted">{s.layer}</dt>
                  <dd>{s.choice}</dd>
                </div>
              ))}
            </dl>
          )}
        </section>
      </div>

      <div className="grid md:grid-cols-2">
        <section className="border-b border-rule p-5 sm:p-6 md:border-r" aria-labelledby="bp-risks">
          <h3 id="bp-risks" className="mb-2 font-display text-xl font-bold text-pencil">
            Risks to watch
          </h3>
          <ul className="list-disc space-y-1.5 pl-5 marker:text-pencil">
            {bp.risks.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </section>

        <section className="border-b border-rule p-5 sm:p-6" aria-labelledby="bp-questions">
          <h3 id="bp-questions" className="mb-2 font-display text-xl font-bold">
            Questions we would ask first
          </h3>
          <ul className="list-disc space-y-1.5 pl-5">
            {bp.questions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </section>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-b-2 border-ink p-5 sm:px-6">
        <span className={`rounded-sm border-2 px-2 py-0.5 text-sm font-semibold ${budget.cls}`}>{budget.label}</span>
        <p className="min-w-0 flex-1 text-sm text-ink">{bp.budgetFit.note}</p>
      </div>

      {/* Title block, as in the corner of an engineering drawing. */}
      <div className="grid grid-cols-2 text-sm sm:grid-cols-4">
        {[
          ["Prepared for", "Your project"],
          ["Prepared by", "Cynbit Project Blueprint"],
          ["Revision", "Draft A"],
          ["Basis", "Planning estimate, not a quote"],
        ].map(([k, v], i) => (
          <div key={k} className={`p-3 ${i > 0 ? "sm:border-l" : ""} ${i % 2 === 1 ? "border-l" : ""} ${i > 1 ? "border-t sm:border-t-0" : ""} border-ink`}>
            <p className="text-xs text-muted">{k}</p>
            <p className="font-medium leading-snug">{v}</p>
          </div>
        ))}
      </div>
    </article>
  );
}
