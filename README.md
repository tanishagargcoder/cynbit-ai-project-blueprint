# Cynbit Project Blueprint

A prototype improvement for the [Cynbit Technologies](https://www.cynbit.in/) website, built for the Full Stack Developer Intern assessment.

**The problem.** Cynbit's contact page promises that the team will "analyze your requirements and prepare a tailored strategic overview", but the visitor fills in five generic fields and then waits about 24 hours to see anything. The page also loses which service the visitor was interested in.

**The improvement.** A guided brief that shows a tailored project plan *while the visitor answers*. Nothing is sent until they choose to send it.

- Pick services and goals, describe the idea, answer five short questions.
- The plan updates instantly: six phases drawn as a schedule, a suggested stack, a timeline range, team size, risks, discovery questions and a budget note.
- Print or save it as a PDF, copy it as text, or send it to the Cynbit team as a structured lead.

It works fully **without any paid API key**. The plan comes from a deterministic rule-based engine. A free Gemini key is optional and only rewrites the one summary paragraph.

> Estimates are planning heuristics, not quotes. The rates in `src/lib/engine.ts` are placeholders that Cynbit would replace with its own.

---

## 1. Run it on Windows (step by step)

### Install the tools once

1. **Node.js 22 or newer** (the LTS version): <https://nodejs.org>. Run the installer with the default options.
2. **Git**: <https://git-scm.com/download/win>. Default options are fine.
3. **VS Code** (optional but handy): <https://code.visualstudio.com>.

Check they installed. Open **PowerShell** (press the Windows key, type `PowerShell`, press Enter) and run:

```powershell
node -v
git --version
```

`node -v` must print `v22` or higher. If it prints a lower number, reinstall Node from the link above.

### Start the app

1. Unzip the project and open the folder.
2. In File Explorer, click the address bar, type `powershell`, press Enter. A terminal opens in that folder.
3. Install the packages (takes 1 to 3 minutes the first time):

   ```powershell
   npm install
   ```

4. Start the app:

   ```powershell
   npm run dev
   ```

5. Open <http://localhost:3000> in your browser. Press `Ctrl + C` in the terminal to stop it.

**If PowerShell says "running scripts is disabled on this system"**, run this once, then try again:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

**If port 3000 is busy**, run `npm run dev -- -p 3001` and open <http://localhost:3001>.

### Run the tests

```powershell
npm test
```

You should see all tests pass (51 at the time of writing). They cover the engine, validation, rate limiting, the API handlers and the AI-summary fallback.

Other checks:

```powershell
npm run typecheck   # TypeScript, no output files
npm run build       # production build, same as Vercel runs
npm start           # serve the production build on http://localhost:3000
```

---

## 2. Optional settings

Everything works with none of these. To use them, copy `.env.example` to a new file named `.env.local` and fill in the values. Never commit `.env.local` (it is already ignored).

| Variable | What it does | If missing |
| --- | --- | --- |
| `LEAD_WEBHOOK_URL` | Where "Send plan to Cynbit" delivers each lead. A Discord or Slack incoming webhook URL works. | Leads are only printed in the server console. |
| `GEMINI_API_KEY` | Free key from <https://aistudio.google.com/apikey>. Enables the "Rewrite summary with AI" button. | The button is hidden. |
| `GEMINI_MODEL` | Model name. | Defaults to `gemini-2.0-flash`. |

**Quickest way to see real lead delivery (Discord, free):** in a Discord server you own, open *Server Settings → Integrations → Webhooks → New Webhook → Copy Webhook URL*, and paste it as `LEAD_WEBHOOK_URL`. Restart `npm run dev`.

---

## 3. Put it on GitHub

1. Create an account at <https://github.com> if you do not have one.
2. Click **New repository**. Name it `cynbit-blueprint`. Leave "Add a README" **unticked**. Click **Create repository**.
3. In your project terminal, run (replace `YOUR-USERNAME`):

   ```powershell
   git remote add origin https://github.com/YOUR-USERNAME/cynbit-blueprint.git
   git push -u origin main
   ```

   The ZIP already contains the commit history, so your repository will show clean, separate commits. If Git asks who you are, run:

   ```powershell
   git config --global user.name "Your Name"
   git config --global user.email "you@example.com"
   ```

4. On the repository page, open the **Actions** tab. A check named **CI** runs the tests, type-check and build for you. A green tick is useful proof to show reviewers.

---

## 4. Deploy to Vercel (free)

1. Sign up at <https://vercel.com> with your GitHub account.
2. Click **Add New → Project**, pick the `cynbit-blueprint` repository, click **Import**.
3. Leave the settings as they are (Vercel detects Next.js). Optionally add `LEAD_WEBHOOK_URL` and `GEMINI_API_KEY` under **Environment Variables**.
4. Click **Deploy**. After about a minute you get a live URL like `https://cynbit-blueprint.vercel.app`.
5. Open the live URL and try it: pick a service, answer the questions, check the plan updates, submit the form with a test email.

That live URL is your **Primary Deliverable Link** (or put the GitHub link first and the live URL as an additional link).

**Then fill in the report.** Run <https://pagespeed.web.dev> on your live URL and paste the mobile and desktop scores into the "Results after deployment" table in `docs/TECHNICAL_REPORT.md`.

---

## 5. How it works

```text
Browser                                   Server (Next.js route handlers)
-------                                   -------------------------------
Form state ──► generateBlueprint()        POST /api/blueprint  validate → generateBlueprint → (optional AI summary)
               (pure function, ~0.01 ms)  POST /api/lead       validate → rebuild blueprint → webhook
                    │                     GET  /api/blueprint  is the optional AI available?
                    ▼
              BlueprintSheet (live preview)
```

| Path | Purpose |
| --- | --- |
| `src/lib/engine.ts` | The rule-based engine: complexity score, six phases, stack, timeline range, risks, questions, budget fit. Pure and deterministic. |
| `src/lib/validate.ts` | Whitelist validation and sanitising of every input. |
| `src/lib/handlers.ts` | The API logic as a function with injectable dependencies, so it is unit-testable. |
| `src/lib/llm.ts` | Optional Gemini summary. Any failure falls back to the template summary. |
| `src/lib/rateLimit.ts` | Small in-memory rate limiter. |
| `src/lib/format.ts` | Plain-text version of a plan for copy and the webhook. |
| `src/components/Wizard.tsx` | The form, live preview, and lead form. |
| `src/components/BlueprintSheet.tsx` | The drawing-sheet result view. |
| `src/app/api/*/route.ts` | Thin Next.js wrappers around the handlers. |
| `tests/` | Unit and API tests (Node's built-in test runner, no extra packages). |
| `docs/TECHNICAL_REPORT.md` | The assessment report. |

**Security choices:** all input is whitelisted server-side; the server rebuilds the blueprint itself instead of trusting one sent by the browser; request bodies are capped; leads are rate limited; the lead form has a honeypot field; the AI key is sent in a header (never in a URL); the visitor's text is passed to the AI as data with an instruction to ignore instructions inside it.

---

## 6. Known limits

- The rate limiter is per server instance. On serverless hosting it slows casual abuse but is not a hard guarantee. A shared store such as Upstash Redis is the production upgrade.
- Cost and timeline figures use placeholder heuristics and say so on screen.
- This is a standalone prototype styled to suit Cynbit. It does not use Cynbit's logo or codebase. Dropping it into the real site would mean moving `src/lib/*` and the two components into Cynbit's own Next.js app and restyling.

## 7. Troubleshooting

| Problem | Fix |
| --- | --- |
| `node -v` shows a version below 22 | Install the current LTS from nodejs.org, then open a new terminal. |
| `npm install` fails with network errors | Check your internet or VPN, then run it again. |
| `npm run build` shows a TypeScript or font error | Copy the exact message. It is almost always one line to fix. |
| The page loads but has no styling | Stop the server, delete the `.next` folder, run `npm run dev` again. |
| "Send plan" says it could not send | `LEAD_WEBHOOK_URL` is wrong or the webhook was deleted. Check the server terminal for the logged lead. |
