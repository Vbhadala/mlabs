// Placeholder customer logos. Each carries data-placeholder="true" so
// pre-launch QA can find them. Replace with real customer wordmarks (or
// remove the section) before going live.

const placeholders = [
  { name: "Northwind", className: "font-bold tracking-tight" },
  { name: "Acme.co", className: "font-bold tracking-tight" },
  { name: "Lumen", className: "font-serif italic" },
  { name: "{ tessera }", className: "font-mono" },
  { name: "HARBOUR", className: "font-bold tracking-widest" },
  { name: "Quill/AI", className: "font-bold tracking-tight" },
] as const

export function LogoStrip() {
  return (
    <section className="border-y border-border bg-muted/40">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <p className="mb-6 text-center text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          Trusted by teams shipping AI features in production
        </p>
        <div className="grid grid-cols-2 items-center gap-x-8 gap-y-5 text-foreground/70 sm:grid-cols-3 md:grid-cols-6">
          {placeholders.map((p) => (
            // TODO: replace placeholder customer logo before launch.
            <div
              key={p.name}
              data-placeholder="true"
              className={`text-center ${p.className}`}
            >
              {p.name}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
