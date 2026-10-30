import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  generateBlueprint,
  complexityScore,
  complexityLabel,
  detectKeywordFeatures,
  assessBudget,
} from "../src/lib/engine.ts";
import type { BlueprintInput } from "../src/lib/types.ts";

const base: BlueprintInput = {
  services: ["app"],
  goals: ["launch"],
  idea: "A booking app for local salons with reminders and an admin panel for owners.",
  scale: "medium",
  integrations: "some",
  compliance: "none",
  urgency: "quarter",
  budget: "unsure",
};

const withInput = (over: Partial<BlueprintInput>): BlueprintInput => ({ ...base, ...over });

describe("generateBlueprint", () => {
  it("is deterministic", () => {
    assert.deepEqual(generateBlueprint(base), generateBlueprint(base));
  });

  it("always produces six phases that run back to back", () => {
    const bp = generateBlueprint(base);
    assert.equal(bp.phases.length, 6);
    let cursor = 0;
    for (const p of bp.phases) {
      assert.ok(p.weeks >= 1, `${p.name} has at least one week`);
      assert.equal(p.startWeek, cursor);
      assert.ok(p.deliverables.length >= 3);
      cursor += p.weeks;
    }
    assert.equal(cursor, bp.timeline.midWeeks);
  });

  it("keeps the range ordered around the middle estimate", () => {
    const { minWeeks, midWeeks, maxWeeks } = generateBlueprint(base).timeline;
    assert.ok(minWeeks <= midWeeks && midWeeks <= maxWeeks);
  });

  it("scores more workstreams as more complex than one", () => {
    const one = generateBlueprint(withInput({ services: ["marketing"] }));
    const many = generateBlueprint(withInput({ services: ["saas", "ai", "app"] }));
    assert.ok(many.complexity.score > one.complexity.score);
    assert.ok(many.timeline.midWeeks > one.timeline.midWeeks);
  });

  it("shortens the timeline for a rush and lengthens it when flexible", () => {
    const rush = generateBlueprint(withInput({ urgency: "rush" }));
    const flexible = generateBlueprint(withInput({ urgency: "flexible" }));
    assert.ok(rush.timeline.midWeeks < flexible.timeline.midWeeks);
    assert.ok(rush.risks.some((r) => /compressed schedule/i.test(r)));
  });

  it("adds a compliance risk and a security layer for regulated data", () => {
    const bp = generateBlueprint(withInput({ compliance: "regulated" }));
    assert.ok(bp.risks.some((r) => /compliance review/i.test(r)));
    assert.ok(bp.stack.some((s) => s.layer === "Security" && /zero-trust/i.test(s.choice)));
  });

  it("flags a vague idea", () => {
    const bp = generateBlueprint(withInput({ idea: "an app" }));
    assert.ok(bp.risks.some((r) => /still broad/i.test(r)));
  });

  it("never lists more than four risks or four questions", () => {
    const bp = generateBlueprint({
      services: ["ai", "saas", "app", "cloud"],
      goals: ["scale"],
      idea: "x",
      scale: "large",
      integrations: "many",
      compliance: "regulated",
      urgency: "rush",
      budget: "unsure",
    });
    assert.ok(bp.risks.length <= 4);
    assert.ok(bp.questions.length <= 4);
  });

  it("uses the AI stack only when AI is selected", () => {
    assert.ok(!generateBlueprint(base).stack.some((s) => s.layer === "AI"));
    const ai = generateBlueprint(withInput({ services: ["ai"] }));
    assert.ok(ai.stack.some((s) => s.layer === "AI"));
    assert.ok(ai.questions.some((q) => /documents, systems or data/i.test(q)));
  });

  it("titles the plan after the selected services", () => {
    const bp = generateBlueprint(withInput({ services: ["ai", "saas"] }));
    assert.equal(bp.title, "Blueprint for AI automation and SaaS platform");
  });

  it("caps the feature list at nine", () => {
    const bp = generateBlueprint({
      ...base,
      services: ["ai", "app", "saas", "cloud", "marketing"],
      goals: ["automate", "launch", "scale", "convert"],
      idea: "WhatsApp chatbot with payments, dashboard, CRM leads, login, reminders, invoices and booking",
    });
    assert.equal(bp.features.length, 9);
  });
});

describe("detectKeywordFeatures", () => {
  it("finds features mentioned in the idea", () => {
    const f = detectKeywordFeatures("A WhatsApp chatbot with payments and a dashboard for sellers");
    assert.ok(f.some((x) => /WhatsApp/.test(x)));
    assert.ok(f.some((x) => /Conversational assistant/.test(x)));
    assert.ok(f.some((x) => /Payments/.test(x)));
    assert.ok(f.some((x) => /dashboard/i.test(x)));
  });

  it("returns nothing for an idea with no known keywords", () => {
    assert.deepEqual(detectKeywordFeatures("Something new and exciting"), []);
  });
});

describe("complexity", () => {
  it("applies a discount to additional workstreams", () => {
    // saas (4) + ai (3 * 0.6) = 5.8, plus medium scale (1) and some integrations (1) = 7.8
    const score = complexityScore(withInput({ services: ["saas", "ai"] }), 0);
    assert.equal(score, 7.8);
  });

  it("caps keyword influence at five keywords", () => {
    const five = complexityScore(base, 5);
    const nine = complexityScore(base, 9);
    assert.equal(five, nine);
  });

  it("maps scores to labels at the documented thresholds", () => {
    assert.equal(complexityLabel(3.9), "Focused");
    assert.equal(complexityLabel(4), "Moderate");
    assert.equal(complexityLabel(6.9), "Moderate");
    assert.equal(complexityLabel(7), "Substantial");
    assert.equal(complexityLabel(10), "Large");
  });
});

describe("budget fit", () => {
  it("is unknown when the visitor is unsure", () => {
    assert.equal(assessBudget("unsure", 10, 20).status, "unknown");
  });

  it("flags a stretch when the scope clearly exceeds the budget", () => {
    const bp = generateBlueprint({
      services: ["saas", "ai", "app"],
      goals: ["scale"],
      idea: "A large multi-tenant platform with AI features for hospitals across the country",
      scale: "large",
      integrations: "many",
      compliance: "regulated",
      urgency: "quarter",
      budget: "lean",
    });
    assert.equal(bp.budgetFit.status, "stretch");
    assert.match(bp.budgetFit.note, /phased first release/);
  });

  it("reports room to spare when the scope is far below the budget", () => {
    const bp = generateBlueprint(withInput({ services: ["marketing"], scale: "small", integrations: "few", budget: "enterprise" }));
    assert.equal(bp.budgetFit.status, "under");
  });

  it("reports a fit when the estimate overlaps the band", () => {
    const bp = generateBlueprint(withInput({ services: ["marketing"], scale: "small", integrations: "few", budget: "standard" }));
    assert.equal(bp.budgetFit.status, "fits");
  });
});
