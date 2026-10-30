# Technical Report: Project Blueprint for the Cynbit Technologies website

**Role:** Full Stack Developer Intern, Phase 2 technical assessment
**Subject:** Improving https://www.cynbit.in/
**Deliverables:** GitHub repository, live prototype, this report

---

## 1. Summary

Cynbit's contact page asks visitors for a name, email and message, then promises a "tailored strategic overview" after about 24 hours. I built **Project Blueprint**, a guided brief that gives the visitor that overview immediately and sends the team a structured lead instead of a vague message.

As the visitor answers a few questions, a plan builds itself beside the form: six phases drawn as a schedule, a suggested stack, a timeline range, team size, risks to watch, and the questions Cynbit would ask first. The visitor can print it, copy it, or send it to the team.

It needs no paid service. The plan comes from a deterministic engine that runs in the browser in about 0.01 ms per update. An optional free-tier LLM can rewrite one summary paragraph, and every failure path falls back to the built-in text.

---

## 2. Analysis of the existing site

I read the rendered content of the home, contact, services and case-studies pages from a user's point of view and a developer's. I did not run Lighthouse on the live site for this report, so the performance findings below are limited to what the page content shows.

### What works well

- A clear story (AI automation, software, BitElevate training) and a consistent "architect" voice.
- Twelve case studies with category filters, a services page that lists the real tech stack, and a Technical FAQ on the contact page.
- Visible contact options (two emails, three phone numbers, an address) and sensible meta descriptions.

### Gaps I found

| Area | Observation | Why it matters |
| --- | --- | --- |
| Contact form | Five generic fields (name, email, company, industry, message). Nothing about the service wanted, scale, budget or timing. | The team gets a vague lead and must ask the same questions on a first call. |
| Unkept promise | The form section says the team will "analyze your requirements and prepare a tailored strategic overview before we connect". The visitor sees nothing until a reply about 24 hours later. | The most valuable moment, right after the visitor describes their need, delivers no value. |
| Lost intent | The three "Inquire" buttons on the services page, and every other call to action, lead to the same generic form. | The visitor's choice of service is thrown away. |
| Missing demo | The company sells AI automation and agents, but a visitor cannot try anything. | The site says "AI-first" without showing it. |
| Link previews | `og:image` and `twitter:image` are `logo.svg`, and the contact and services pages set `og:url` to the home page. | Most social platforms do not render SVG previews, and wrong canonical hints can hurt sharing and SEO. |
| Evidence | Case studies have no link back to the related service, and there is no search. | A visitor who likes one story has no next step. |

### Choosing one area

I considered three directions:

| Option | Impact | Cost and risk | Decision |
| --- | --- | --- | --- |
| Performance and SEO tidy-up (previews, metadata) | Medium, measurable | Low risk, but small and not much of a product feature | Good follow-up, not the headline |
| AI chat assistant answering from site content | High visual appeal | Needs a paid or rate-limited API, abuse handling, and hallucination control | Rejected: depends on paid keys |
| **Guided project brief with an instant plan** | High: converts the contact page, supplies the promised overview, doubles as a live demo of the company's "AI-first" claim | Moderate, fully buildable on free tools | **Chosen** |

---

## 3. Problem statement

> Visitors who are ready to describe a project get no value from the contact page until a human replies, and the team receives unstructured leads. How can the site respond immediately and capture better information, without paid infrastructure?

**Goals**

1. Give a visitor a useful, tailored plan within seconds of describing their need.
2. Capture a structured lead (services, goals, scale, integrations, data sensitivity, timing, budget range).
3. Work with no paid API. Treat AI as an optional enhancement.
4. Be trustworthy: honest about estimates, safe with input, accessible, usable on a phone.

**Non-goals**

- Real quotes or prices. Rates in the code are placeholders and the interface says "not a quote".
- Replacing the whole contact page, or editing Cynbit's actual codebase (not available to me).

---

## 4. Solution design

### User flow

1. The visitor ticks services and goals, and writes a few sentences about the idea.
2. They answer five short multiple-choice questions: scale, number of integrations, data sensitivity, timing, budget range.
3. The plan updates after every change. Nothing leaves the browser.
4. They can print or save as PDF, copy as text, optionally rewrite the summary with AI, or enter name and email to send the plan to Cynbit.

### Architecture

```text
Browser                                   Server (Next.js route handlers)
Form state ──► generateBlueprint()        POST /api/blueprint  validate → generate → (optional AI summary)
               (pure function)            POST /api/lead       validate → rebuild blueprint → webhook
                    ▼                     GET  /api/blueprint  is optional AI available?
              BlueprintSheet (live preview)
```

The engine is one pure function used by both the browser (for instant preview) and the server (to rebuild the plan from validated input when a lead arrives). The server never trusts a plan sent by the browser.

### The engine

It maps a brief to a plan using transparent rules:

- **Complexity score.** The heaviest selected workstream counts in full and each extra one adds 60% of its weight, since workstreams share design and infrastructure. Scale, integrations and data sensitivity add points. Up to five features detected in the free-text idea (payments, dashboard, WhatsApp, voice, CRM and others) add a small amount. The score maps to Focused, Moderate, Substantial or Large.
- **Timeline.** A base plus weeks per complexity point, adjusted by urgency (rush ×0.8, flexible ×1.1), then split across **Cynbit's own six lifecycle phases**, taken from the home page: Discovery and audit, Strategy and blueprinting, High-fidelity design, Technical implementation, Quality and integrity check, Deployment and evolution. The result is shown as a range (about 0.9× to 1.25×), not a single number.
- **Stack.** Chosen only from technologies Cynbit already lists on its services page (Next.js, NestJS, FastAPI, PostgreSQL, Redis, AWS or Azure, Terraform, OpenAI, LangChain), so suggestions stay credible.
- **Risks and questions.** Rules fire on regulated data, many integrations, tight deadlines, AI quality, vague ideas, several parallel workstreams and high traffic. At most four of each are shown.
- **Budget note.** Converts effort to a rupee range with a placeholder blended rate and compares it with the chosen band: fits, room to spare, or stretches. Budget never changes the estimate itself.

### Design

Cynbit calls itself "architects", so the result is a **drawing sheet**: cool grey drafting paper, navy ink, a single print-blue for the schedule, red pencil reserved for risks, and a title block in the corner like an engineering drawing. The schedule is the one memorable element. It is a drawn Gantt-style chart where week counts sit in the labels so nothing is clipped on small screens. Layout is two columns on desktop and a single column on phones with a fixed summary bar.

---

## 5. Technology choices

| Choice | Why |
| --- | --- |
| **Next.js (App Router) with TypeScript** | Cynbit's own site appears to use Next.js, and its services page lists Next.js and Tailwind. This keeps the prototype directly portable. TypeScript catches shape errors across the shared engine. |
| **Tailwind CSS 3** | Fast, consistent styling, matches Cynbit's stack, with a small design-token palette in `tailwind.config.ts`. |
| **Rule-based engine instead of an LLM** | Deterministic, instant, free, testable, and cannot invent numbers. An LLM would add cost, latency and hallucination risk to the part that matters most. |
| **Optional Gemini free tier for the summary only** | Shows AI integration without depending on it. The model receives only calculated facts, and its output is length-checked and discarded if odd. |
| **Route handlers as plain functions** | `createHandlers(deps)` takes its dependencies (rate limiter, fetch, config), so it is tested with real `Request` objects and no framework. |
| **Webhook for leads** | Works with Discord, Slack or Google Apps Script with no database to host. A database such as Supabase is the obvious next step. |
| **Node's built-in test runner** | Zero test dependencies, runs TypeScript directly. |
| **Vercel** | Free tier, zero-config for Next.js, creates a live URL from the GitHub repo. |

---

## 6. Implementation notes

**Validation and security**

- Every field is checked against a whitelist. Unknown values are rejected, duplicates removed, control characters stripped, lengths capped.
- Bodies over 20 KB are rejected. Malformed JSON returns 400.
- The lead route is rate limited (5 per 10 minutes per IP) and has a hidden honeypot field. Bots that fill it receive a success response and nothing is sent.
- The blueprint sent with a lead is rebuilt on the server, so a forged plan cannot be injected.
- The AI key is sent in a request header, never in the URL. The visitor's idea is passed as quoted data with an instruction to ignore instructions inside it.

**Resilience**

- No AI key, a provider error, a timeout, or odd output all lead to the same result: the template summary. The numbers never depend on AI.
- If the webhook fails, the visitor sees the fallback email address and the lead is logged server-side.
- The browser plan needs no network at all once the page has loaded.

**Accessibility**

- Native radio buttons and checkboxes in labelled fieldsets, visible keyboard focus, a skip link, and a polite live region that announces the new timeline.
- Errors are text and linked to their fields. Colour is never the only signal (budget status always has words).
- Motion is limited to the bar width transition and respects reduced-motion settings.
- Print styles hide the form and buttons, so "Save as PDF" produces a clean plan.

**Commits.** History is split by concern: scaffold, engine, API, UI, then documentation.

---

## 7. Testing and verification

| Check | Result |
| --- | --- |
| Unit and API tests (`npm test`) | **51 of 51 pass.** Cover the engine, thresholds, validation, rate limiting, handler status codes (200, 400, 413, 422, 429, 502), honeypot, forged-blueprint rejection, and the AI path with a mocked provider. |
| TypeScript, strict mode | The engine, validation, handlers and all test files compile with **no errors** (`tsc --strict`). |
| Server-side render of both React components | Rendered without errors. The sheet shows all six phases, and the form has the expected 9 checkboxes and 17 radio buttons. |
| Visual check at 1280 px and 390 px wide | No horizontal overflow. This was an approximate check with the project's classes compiled by a different Tailwind version, so final pixel details can differ slightly. |
| Engine speed | About 0.013 ms per blueprint (average of 10,000 runs), so recalculating on every click has no visible cost. |

Sample outputs from the engine:

| Brief | Complexity | Timeline | Team | Effort |
| --- | --- | --- | --- | --- |
| Landing pages and SEO | Focused | 6 to 9 weeks | 2 | 12 to 18 person-weeks |
| Salon booking app | Moderate | 9 to 14 weeks | 3 | 27 to 42 person-weeks |
| WhatsApp clinic bot with payments and dashboard | Substantial | 16 to 23 weeks | 4 | 64 to 92 person-weeks |
| Multi-tenant hospital SaaS with AI triage | Large | 24 to 34 weeks | 5 | 120 to 170 person-weeks |
| Rush cloud migration | Moderate | 7 to 10 weeks | 3 | 24 to 35 person-weeks |

---

## 8. Results

### Measured in development

| Measure | Existing contact page | With Project Blueprint |
| --- | --- | --- |
| Time until the visitor receives a tailored overview | About 24 hours (the page's own "24 H response" claim) | Under 1 second after each answer |
| Information the team receives | Name, email, optional company and industry, free-text message | Services, goals, idea, scale, integrations, data sensitivity, timing, budget band, and a computed plan |
| Extra discovery questions answered before the first call | None | Up to four generated per lead |

### Results after deployment

Fill these in once the site is live. Run <https://pagespeed.web.dev> on the live URL.

| Measure | Value |
| --- | --- |
| Live URL | _paste here_ |
| PageSpeed mobile: Performance / Accessibility / Best Practices / SEO | _paste here_ |
| PageSpeed desktop: Performance / Accessibility / Best Practices / SEO | _paste here_ |
| End-to-end lead test (form → webhook message received) | _pass / fail, with date_ |

### How Cynbit would measure the business impact

I have not measured conversion, and I do not claim an uplift. The hypothesis is that showing value before asking for contact details raises completed enquiries, and that structured leads shorten first calls. To test it, Cynbit would compare, over several weeks:

1. Contact page enquiries per 100 visitors, against the same figure for the Blueprint flow.
2. The share of visitors who reach a finished plan, and where they drop off.
3. Time from lead to first call, and the share of leads that become quotes.

---

## 9. Limitations

- **Estimates are heuristic.** Weights, thresholds and the placeholder rate are my assumptions. Cynbit would calibrate them from its past projects, which would be the most valuable next step.
- **Rate limiting is per instance.** It is in memory, so on serverless hosting it is a speed bump rather than a guarantee.
- **No database.** Leads go to a webhook and the server log. There is no lead dashboard or follow-up status.
- **Free-text keyword detection is simple.** It matches English phrases, and does not understand Hindi or complex phrasing.
- **Standalone prototype.** It is styled to suit Cynbit and not wired into the real site, which I could not access.
- **Fonts load from Google Fonts at build time** through the Next.js font system. A build without internet access would fail on that step.

## 10. Future work

1. Calibrate the engine on Cynbit's real project history, and add an admin view of the weights.
2. Store leads in Supabase with a status pipeline and email confirmation to the visitor.
3. Pre-select the service when the visitor arrives from a specific "Inquire" button, using a query parameter.
4. Add Hindi, and a shareable plan link.
5. Fix the link-preview metadata found in the audit (a proper 1200×630 `og:image`, correct `og:url` on each page) as a small, separate change.
6. Move rate limiting to Upstash Redis and add bot protection such as Cloudflare Turnstile.
7. Track funnel events (started, finished, sent) to measure the impact properly.

---

## 11. Repository

See `README.md` for Windows setup, tests, GitHub and Vercel steps.

```text
src/lib/        engine, validation, handlers, optional AI, rate limiter, formatter
src/components/ Wizard (form + live preview + lead form), BlueprintSheet
src/app/        page, layout, styles, API route wrappers
tests/          engine, validation and API tests
docs/           this report
.github/        CI workflow: test, typecheck, build
```
