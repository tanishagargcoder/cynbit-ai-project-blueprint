"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  BUDGET_OPTIONS,
  COMPLIANCE_OPTIONS,
  GOAL_OPTIONS,
  INTEGRATION_OPTIONS,
  SCALE_OPTIONS,
  SERVICE_OPTIONS,
  URGENCY_OPTIONS,
  generateBlueprint,
} from "../lib/engine.ts";
import { blueprintToText } from "../lib/format.ts";
import type { BlueprintInput, GoalId, ServiceId } from "../lib/types.ts";
import { LIMITS } from "../lib/validate.ts";
import { BlueprintSheet } from "./BlueprintSheet.tsx";

const DEFAULTS: BlueprintInput = {
  services: [],
  goals: [],
  idea: "",
  scale: "" as BlueprintInput["scale"],
  integrations: "" as BlueprintInput["integrations"],
  compliance: "" as BlueprintInput["compliance"],
  urgency: "" as BlueprintInput["urgency"],
  budget: "" as BlueprintInput["budget"],
};

const inputCls =
  "w-full rounded-sm border-2 border-ink bg-sheet px-3 py-2 text-ink placeholder:text-muted/70";

function Fieldset({ legend, hint, children }: { legend: string; hint?: string; children: ReactNode }) {
  return (
    <fieldset className="border-0 p-0">
      <legend className="font-display text-lg font-bold">{legend}</legend>
      {hint && <p className="mb-2 text-sm text-muted">{hint}</p>}
      <div className="mt-2 grid gap-2">{children}</div>
    </fieldset>
  );
}

function Choice({
  type,
  name,
  checked,
  onChange,
  label,
  blurb,
}: {
  type: "radio" | "checkbox";
  name: string;
  checked: boolean;
  onChange: () => void;
  label: string;
  blurb?: string;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-sm border-2 px-3 py-2 ${
        checked ? "border-print bg-print-soft" : "border-rule bg-sheet hover:border-ink"
      } has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-print`}
    >
      <input type={type} name={name} checked={checked} onChange={onChange} className="mt-1.5 h-4 w-4 accent-[#1e4fd6]" />
      <span>
        <span className="block font-medium leading-snug">{label}</span>
        {blurb && <span className="block text-sm text-muted">{blurb}</span>}
      </span>
    </label>
  );
}

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

type Status = "idle" | "sending" | "sent" | "error";

export function Wizard({ initial }: { initial?: Partial<BlueprintInput> } = {}) {
  const [draft, setDraft] = useState<BlueprintInput>({ ...DEFAULTS, ...initial });
  const set = <K extends keyof BlueprintInput>(key: K, value: BlueprintInput[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const blueprint = useMemo(() => (draft.services.length > 0 ? generateBlueprint(draft) : null), [draft]);

  // Optional AI summary. The server says whether it is available.
  const [aiAvailable, setAiAvailable] = useState(false);
  const [ai, setAi] = useState<{ key: string; text: string } | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiMessage, setAiMessage] = useState("");
  const draftKey = JSON.stringify(draft);

  useEffect(() => {
    let alive = true;
    fetch("/api/blueprint")
      .then((r) => (r.ok ? r.json() : { ai: false }))
      .then((d) => alive && setAiAvailable(Boolean(d.ai)))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  async function polish() {
    setAiBusy(true);
    setAiMessage("");
    try {
      const res = await fetch("/api/blueprint", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ input: draft, polish: true }),
      });
      const data = await res.json();
      if (res.ok && data.summarySource === "ai") setAi({ key: draftKey, text: data.blueprint.summary });
      else setAiMessage(res.status === 429 ? "Too many requests. Try again in a minute." : "The AI summary is not available right now. The plan above is unchanged.");
    } catch {
      setAiMessage("Could not reach the server. The plan above is unchanged.");
    } finally {
      setAiBusy(false);
    }
  }

  const shownBlueprint = useMemo(() => {
    if (!blueprint) return null;
    return ai && ai.key === draftKey ? { ...blueprint, summary: ai.text } : blueprint;
  }, [blueprint, ai, draftKey]);

  // Copy
  const [copied, setCopied] = useState<"" | "yes" | "no">("");
  async function copyPlan() {
    if (!blueprint) return;
    try {
      await navigator.clipboard.writeText(blueprintToText(shownBlueprint ?? blueprint, draft));
      setCopied("yes");
    } catch {
      setCopied("no");
    }
    setTimeout(() => setCopied(""), 2500);
  }

  // Lead form
  const [contact, setContact] = useState({ name: "", email: "", company: "" });
  const [website, setWebsite] = useState(""); // honeypot
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formMessage, setFormMessage] = useState("");

  async function send(e: FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrors({});
    setFormMessage("");
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ input: draft, contact, website }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setStatus("sent");
        return;
      }
      setStatus("error");
      setErrors(data.fields ?? {});
      setFormMessage(data.error ?? "Something went wrong. Please try again.");
    } catch {
      setStatus("error");
      setFormMessage("Could not reach the server. Check your connection and try again.");
    }
  }

  return (
    <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:gap-12">
      {/* ---------------------------------------------------------------- Brief */}
      <form id="brief" className="no-print space-y-8" onSubmit={(e) => e.preventDefault()} aria-label="Project brief">
        <Fieldset legend="What do you need?" hint="Pick everything that applies.">
          {SERVICE_OPTIONS.map((o) => (
            <Choice
              key={o.id}
              type="checkbox"
              name="services"
              label={o.label}
              blurb={o.blurb}
              checked={draft.services.includes(o.id as ServiceId)}
              onChange={() => set("services", toggle(draft.services, o.id as ServiceId))}
            />
          ))}
        </Fieldset>

        <Fieldset legend="What should it achieve?">
          {GOAL_OPTIONS.map((o) => (
            <Choice
              key={o.id}
              type="checkbox"
              name="goals"
              label={o.label}
              checked={draft.goals.includes(o.id as GoalId)}
              onChange={() => set("goals", toggle(draft.goals, o.id as GoalId))}
            />
          ))}
        </Fieldset>

        <div>
          <label htmlFor="idea" className="font-display text-lg font-bold">
            Describe your idea
          </label>
          <p className="mb-2 text-sm text-muted">
            A few sentences is plenty. Mentioning things like payments, a dashboard or WhatsApp adds them to the plan.
          </p>
          <textarea
            id="idea"
            rows={5}
            maxLength={LIMITS.idea}
            value={draft.idea}
            onChange={(e) => set("idea", e.target.value)}
            className={inputCls}
            placeholder="We run a chain of clinics and want patients to book and reschedule on WhatsApp."
          />
          <p className="mt-1 text-right text-sm text-muted">
            {draft.idea.length} of {LIMITS.idea}
          </p>
        </div>

        <Fieldset legend="How many people will use it?">
          {SCALE_OPTIONS.map((o) => (
            <Choice key={o.id} type="radio" name="scale" label={o.label} checked={draft.scale === o.id} onChange={() => set("scale", o.id)} />
          ))}
        </Fieldset>

        <Fieldset legend="How many other systems must it connect to?">
          {INTEGRATION_OPTIONS.map((o) => (
            <Choice key={o.id} type="radio" name="integrations" label={o.label} checked={draft.integrations === o.id} onChange={() => set("integrations", o.id)} />
          ))}
        </Fieldset>

        <Fieldset legend="What kind of data will it hold?">
          {COMPLIANCE_OPTIONS.map((o) => (
            <Choice key={o.id} type="radio" name="compliance" label={o.label} checked={draft.compliance === o.id} onChange={() => set("compliance", o.id)} />
          ))}
        </Fieldset>

        <Fieldset legend="When do you need it?">
          {URGENCY_OPTIONS.map((o) => (
            <Choice key={o.id} type="radio" name="urgency" label={o.label} checked={draft.urgency === o.id} onChange={() => set("urgency", o.id)} />
          ))}
        </Fieldset>

        <Fieldset legend="What is your budget?" hint="Optional. It only changes the budget note, never the estimate.">
          {BUDGET_OPTIONS.map((o) => (
            <Choice key={o.id} type="radio" name="budget" label={o.label} checked={draft.budget === o.id} onChange={() => set("budget", o.id)} />
          ))}
        </Fieldset>
      </form>

      {/* ------------------------------------------------------------ Blueprint */}
      <div className="min-w-0 space-y-8" id="blueprint">
        {shownBlueprint ? (
          <>
            <BlueprintSheet blueprint={shownBlueprint} summarySource={ai && ai.key === draftKey ? "ai" : "template"} />

            <div className="no-print flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => window.print()} className="rounded-sm border-2 border-ink bg-sheet px-4 py-2 font-medium hover:bg-print-soft">
                Print or save as PDF
              </button>
              <button type="button" onClick={copyPlan} className="rounded-sm border-2 border-ink bg-sheet px-4 py-2 font-medium hover:bg-print-soft">
                Copy plan as text
              </button>
              {aiAvailable && (
                <button type="button" onClick={polish} disabled={aiBusy} className="rounded-sm border-2 border-ink bg-sheet px-4 py-2 font-medium hover:bg-print-soft disabled:opacity-60">
                  {aiBusy ? "Writing summary..." : "Rewrite summary with AI"}
                </button>
              )}
              <span role="status" className="text-sm text-muted">
                {copied === "yes" && "Plan copied."}
                {copied === "no" && "Copy was blocked by your browser. Select the plan and copy it by hand."}
                {aiMessage}
              </span>
            </div>

            {/* ---------------------------------------------------- Lead form */}
            <section className="no-print border-2 border-ink bg-sheet p-5 sm:p-6" aria-labelledby="send-title">
              {status === "sent" ? (
                <div role="status">
                  <h2 id="send-title" className="font-display text-2xl font-bold">
                    Sent to the Cynbit team
                  </h2>
                  <p className="mt-2">
                    Thanks, {contact.name.split(" ")[0]}. We have your plan and will reply to {contact.email.toLowerCase()} within one working day.
                  </p>
                </div>
              ) : (
                <form onSubmit={send} noValidate>
                  <h2 id="send-title" className="font-display text-2xl font-bold">
                    Send this plan to the Cynbit team
                  </h2>
                  <p className="mt-1 text-muted">We will review it and reply with a proper quote. No account needed.</p>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="name" className="font-medium">Your name</label>
                      <input id="name" autoComplete="name" className={inputCls} value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "name-err" : undefined} />
                      {errors.name && <p id="name-err" className="mt-1 text-sm text-pencil">{errors.name}</p>}
                    </div>
                    <div>
                      <label htmlFor="email" className="font-medium">Work email</label>
                      <input id="email" type="email" autoComplete="email" className={inputCls} value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "email-err" : undefined} />
                      {errors.email && <p id="email-err" className="mt-1 text-sm text-pencil">{errors.email}</p>}
                    </div>
                    <div className="sm:col-span-2">
                      <label htmlFor="company" className="font-medium">Company <span className="font-normal text-muted">(optional)</span></label>
                      <input id="company" autoComplete="organization" className={inputCls} value={contact.company} onChange={(e) => setContact({ ...contact, company: e.target.value })} />
                    </div>
                  </div>

                  {/* Honeypot: hidden from people, tempting to bots. */}
                  <div className="sr-only-field" aria-hidden="true">
                    <label htmlFor="website">Leave this field empty</label>
                    <input id="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
                  </div>

                  {errors.idea && (
                    <p className="mt-3 text-pencil">
                      {errors.idea} <a className="underline" href="#idea">Go to the description</a>
                    </p>
                  )}
                  {formMessage && !errors.idea && (
                    <p className="mt-3 text-pencil" role="alert">{formMessage}</p>
                  )}

                  <button type="submit" disabled={status === "sending"} className="mt-5 rounded-sm bg-print px-5 py-2.5 font-semibold text-white hover:bg-ink disabled:opacity-60">
                    {status === "sending" ? "Sending..." : "Send plan to Cynbit"}
                  </button>
                </form>
              )}
            </section>
          </>
        ) : (
          <div className="border-2 border-dashed border-ink/40 bg-sheet/70 p-8">
            <h2 className="font-display text-2xl font-bold">Your plan appears here</h2>
            <p className="mt-2 max-w-prose text-muted">
              Pick at least one service on the left. The schedule, stack and risks build themselves as you answer.
            </p>
          </div>
        )}
      </div>

      {/* Small-screen summary bar so the result is never out of reach. */}
      {shownBlueprint && (
        <a
          href="#blueprint"
          className="no-print fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t-2 border-ink bg-sheet px-4 py-3 lg:hidden"
        >
          <span className="font-display font-bold">
            {shownBlueprint.timeline.minWeeks} to {shownBlueprint.timeline.maxWeeks} weeks
          </span>
          <span className="text-sm font-medium text-print underline underline-offset-4">View your plan</span>
        </a>
      )}
    </div>
  );
}
