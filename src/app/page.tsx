import { Wizard } from "../components/Wizard.tsx";

export default function Home() {
  return (
    <>
      <a
        href="#brief"
        className="absolute left-3 top-3 z-50 -translate-y-20 rounded bg-ink px-3 py-2 text-sheet focus:translate-y-0"
      >
        Skip to the form
      </a>

      <header className="no-print border-b border-rule bg-sheet/90">
        <div className="mx-auto flex max-w-6xl flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-4 py-4 sm:px-6">
          <p className="font-display text-xl font-bold tracking-tight text-ink">
            Cynbit <span className="font-medium text-muted">Project Blueprint</span>
          </p>
          <p className="text-sm text-muted">
            A prototype for the Cynbit Technologies website. Not an official Cynbit product.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-10 sm:px-6 lg:pt-14">
        <div className="no-print max-w-2xl">
          <h1 className="font-display text-4xl font-bold leading-[1.08] tracking-tight text-ink sm:text-5xl">
            See your project plan before you talk to us.
          </h1>
          <p className="mt-4 text-lg text-muted">
            Tell us what you want to build. The plan on the right updates as you answer: phases, a suggested stack, a
            timeline range and the risks to watch. Nothing is sent until you choose to send it.
          </p>
        </div>

        <Wizard />
      </main>

      <footer className="no-print border-t border-rule bg-sheet/90">
        <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-muted sm:px-6">
          Built for the Cynbit Full Stack Developer Intern assessment. Estimates are planning heuristics, not quotes.
        </div>
      </footer>
    </>
  );
}
