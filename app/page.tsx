import { ThemeToggle } from "@/components/theme-toggle";

// Temporary internal surface: verifies the design tokens resolve as Tailwind
// utilities and flip correctly in light/dark. Real product screens replace this.

function Swatch({ className, name, role }: { className: string; name: string; role: string }) {
  return (
    <div className="overflow-hidden rounded-card border border-border bg-surface">
      <div className={`h-16 ${className}`} />
      <div className="px-3 py-2">
        <div className="text-sm font-semibold">{name}</div>
        <div className="text-xs text-muted">{role}</div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main className="flex-1">
      {/* Masthead — navy ground, gold accent */}
      <header className="bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-5xl items-start justify-between gap-6 px-6 py-14">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">
              Design tokens · live
            </p>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Think-Winners Movement
            </h1>
            <p className="mt-3 max-w-xl text-primary-foreground/80">
              The brand palette, wired as tokens. Every colour here is a semantic
              utility that flips with the theme — no hard-coded hex in components.
            </p>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <div className="mx-auto flex max-w-5xl flex-col gap-12 px-6 py-12">
        {/* Semantic tokens */}
        <section>
          <h2 className="mb-4 text-lg font-bold tracking-tight">Semantic tokens</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <Swatch className="bg-primary" name="primary" role="actions, headings" />
            <Swatch className="bg-accent" name="accent" role="highlight (dark text)" />
            <Swatch className="bg-surface-muted" name="surface-muted" role="muted surface" />
            <Swatch className="bg-success" name="success" role="approved · active" />
            <Swatch className="bg-warning" name="warning" role="pending · frozen" />
            <Swatch className="bg-danger" name="danger" role="errors · destructive" />
            <Swatch className="bg-info" name="info" role="neutral notices" />
            <Swatch className="bg-border" name="border" role="dividers" />
          </div>
        </section>

        {/* Brand scales */}
        <section>
          <h2 className="mb-4 text-lg font-bold tracking-tight">Brand scales</h2>
          <div className="flex flex-col gap-2">
            {/* Full class names on purpose — Tailwind can't see interpolated ones. */}
            <div className="flex overflow-hidden rounded-card border border-border">
              <div className="h-12 flex-1 bg-navy-50" />
              <div className="h-12 flex-1 bg-navy-100" />
              <div className="h-12 flex-1 bg-navy-300" />
              <div className="h-12 flex-1 bg-navy-500" />
              <div className="h-12 flex-1 bg-navy-700" />
              <div className="h-12 flex-1 bg-navy-900" />
            </div>
            <div className="flex overflow-hidden rounded-card border border-border">
              <div className="h-12 flex-1 bg-gold-50" />
              <div className="h-12 flex-1 bg-gold-100" />
              <div className="h-12 flex-1 bg-gold-300" />
              <div className="h-12 flex-1 bg-gold-500" />
              <div className="h-12 flex-1 bg-gold-700" />
              <div className="h-12 flex-1 bg-gold-900" />
            </div>
            <p className="text-xs text-muted">navy 50–900 · gold 50–900</p>
          </div>
        </section>

        {/* In use */}
        <section>
          <h2 className="mb-4 text-lg font-bold tracking-tight">In use</h2>
          <div className="max-w-sm rounded-card border border-border bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-bold">Ada Obi</div>
                <div className="font-mono text-sm text-muted">TWM-LA-IKJ-000123</div>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success-soft px-2.5 py-1 text-xs font-bold text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
                Active
              </span>
            </div>
            <p className="mt-2 text-sm text-muted">Ikeja · Lagos</p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                View
              </button>
              <button
                type="button"
                className="inline-flex min-h-11 items-center justify-center rounded-md bg-accent px-4 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                Download card
              </button>
            </div>
          </div>
        </section>

        <p className="text-sm text-muted">
          Tokens implement{" "}
          <span className="font-mono">docs/design/brand-and-color.md</span>. This page is a
          temporary verification surface — real screens come with the members&rsquo; app.
        </p>
      </div>
    </main>
  );
}
