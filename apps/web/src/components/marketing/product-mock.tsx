// Decorative product preview — static dashboard mock. Reinforces the hero
// claim by showing a realistic-feeling AI workspace surface.

export function ProductMock() {
  return (
    <div className="relative mx-auto max-w-6xl px-6 pb-24">
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_30px_80px_-30px_rgba(0,0,0,0.25)]">
        <div className="flex items-center gap-1.5 border-b border-border bg-muted/50 px-4 py-3">
          <span className="size-2.5 rounded-full bg-[#FF5F57]" />
          <span className="size-2.5 rounded-full bg-[#FEBC2E]" />
          <span className="size-2.5 rounded-full bg-[#28C840]" />
          <span className="ml-4 font-mono text-[11px] text-muted-foreground">
            app.example.com / inbox
          </span>
        </div>
        <div className="grid min-h-[260px] grid-cols-1 md:grid-cols-[200px_1fr]">
          <aside className="hidden space-y-1 border-r border-border p-4 text-[12px] md:block">
            <div className="rounded-lg bg-primary/10 px-3 py-2 font-semibold text-primary">
              Inbox
            </div>
            <div className="px-3 py-2 text-muted-foreground hover:text-foreground">
              Threads
            </div>
            <div className="px-3 py-2 text-muted-foreground hover:text-foreground">
              Knowledge
            </div>
            <div className="px-3 py-2 text-muted-foreground hover:text-foreground">
              Integrations
            </div>
            <div className="px-3 py-2 text-muted-foreground hover:text-foreground">
              Settings
            </div>
          </aside>
          <div className="space-y-4 p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
                  This week
                </div>
                <div className="text-lg font-bold">Your team, summarised</div>
              </div>
              <div className="text-[11px] text-muted-foreground">Last 7 days</div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Questions answered" value="248" delta="▲ 18%" />
              <Stat label="Avg time saved" value="3.4h" delta="▲ per person" />
              <Stat label="Coverage" value="92%" delta="— stable" muted />
            </div>
            <div className="relative h-24 overflow-hidden rounded-lg border border-border">
              <div
                aria-hidden
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(180deg, color-mix(in oklch, var(--color-primary) 14%, transparent), transparent)",
                }}
              />
              <svg
                viewBox="0 0 400 80"
                preserveAspectRatio="none"
                className="size-full"
                aria-hidden
              >
                <polyline
                  points="0,60 40,55 80,48 120,52 160,40 200,30 240,34 280,22 320,28 360,14 400,18"
                  fill="none"
                  stroke="var(--color-primary)"
                  strokeWidth="2"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  delta,
  muted,
}: {
  label: string
  value: string
  delta: string
  muted?: boolean
}) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-xl font-bold">{value}</div>
      <div
        className={
          muted
            ? "mt-1 text-[11px] text-muted-foreground"
            : "mt-1 text-[11px] text-primary"
        }
      >
        {delta}
      </div>
    </div>
  )
}
