import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateInput, validateContact, validateLeadIdea, clean } from "../src/lib/validate.ts";
import { createRateLimiter } from "../src/lib/rateLimit.ts";

const good = {
  services: ["ai", "app"],
  goals: ["automate"],
  idea: "Automate invoice handling for our accounts team",
  scale: "small",
  integrations: "few",
  compliance: "none",
  urgency: "quarter",
  budget: "unsure",
};

describe("validateInput", () => {
  it("accepts a good brief", () => {
    const r = validateInput(good);
    assert.ok(r.ok);
  });

  it("rejects non-objects", () => {
    for (const bad of [null, undefined, "x", 4, [], true]) {
      assert.equal(validateInput(bad).ok, false);
    }
  });

  it("requires at least one service", () => {
    const r = validateInput({ ...good, services: [] });
    assert.ok(!r.ok && r.errors.services);
  });

  it("drops unknown services and de-duplicates, keeping canonical order", () => {
    const r = validateInput({ ...good, services: ["marketing", "ai", "ai", "hax"] });
    assert.ok(r.ok);
    if (r.ok) assert.deepEqual(r.value.services, ["ai", "marketing"]);
  });

  it("rejects values outside the allowed options", () => {
    const r = validateInput({ ...good, scale: "huge", budget: "a lot" });
    assert.ok(!r.ok && r.errors.scale && r.errors.budget);
  });

  it("rejects an idea over the length limit", () => {
    const r = validateInput({ ...good, idea: "x".repeat(1001) });
    assert.ok(!r.ok && r.errors.idea);
  });

  it("strips control characters from the idea", () => {
    const r = validateInput({ ...good, idea: "hello\u0000 \u0007world" });
    assert.ok(r.ok);
    if (r.ok) assert.equal(r.value.idea, "hello world");
  });

  it("does not let prototype keys through", () => {
    const r = validateInput(JSON.parse('{"__proto__":{"x":1},"services":["ai"],"scale":"small","integrations":"few","compliance":"none","urgency":"quarter","budget":"unsure"}'));
    assert.ok(r.ok);
    if (r.ok) assert.equal(Object.keys(r.value).includes("__proto__"), false);
  });
});

describe("validateContact", () => {
  it("accepts and normalises a contact", () => {
    const r = validateContact({ name: "  Asha Rao ", email: "ASHA@Example.com", company: "" });
    assert.ok(r.ok);
    if (r.ok) assert.deepEqual(r.value, { name: "Asha Rao", email: "asha@example.com" });
  });

  it("rejects bad emails and short names", () => {
    for (const email of ["", "nope", "a@b", "a b@c.com", "@c.com"]) {
      const r = validateContact({ name: "Asha", email });
      assert.ok(!r.ok && r.errors.email, `rejects "${email}"`);
    }
    const r = validateContact({ name: "A", email: "a@b.com" });
    assert.ok(!r.ok && r.errors.name);
  });
});

describe("validateLeadIdea", () => {
  it("asks for more detail when the idea is too short", () => {
    const r = validateInput({ ...good, idea: "app" });
    assert.ok(r.ok);
    if (r.ok) assert.ok(validateLeadIdea(r.value).idea);
  });
});

describe("clean", () => {
  it("returns an empty string for non-strings", () => {
    assert.equal(clean(42, 10), "");
    assert.equal(clean(undefined, 10), "");
  });
});

describe("rate limiter", () => {
  it("blocks after the limit and recovers after the window", () => {
    const rl = createRateLimiter(2, 1000);
    assert.ok(rl.check("a", 0).allowed);
    assert.ok(rl.check("a", 10).allowed);
    const blocked = rl.check("a", 20);
    assert.equal(blocked.allowed, false);
    assert.ok(blocked.retryAfterSeconds >= 1);
    assert.ok(rl.check("b", 20).allowed, "other keys are unaffected");
    assert.ok(rl.check("a", 1001).allowed, "window has reset");
  });
});
