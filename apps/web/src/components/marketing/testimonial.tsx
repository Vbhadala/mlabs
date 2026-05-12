// TODO: replace with a real customer quote before launch.
// Anonymised stub so the section structure renders without making a
// fake claim.

export function Testimonial() {
  return (
    <section id="customers" className="relative bg-muted/40">
      <div className="mx-auto max-w-5xl px-6 py-24">
        <div
          data-placeholder="true"
          className="relative overflow-hidden rounded-3xl border border-border bg-card p-10 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.18)] md:p-14"
        >
          <div
            aria-hidden
            className="absolute -right-12 -top-12 size-64 rounded-full bg-primary/10 blur-3xl"
          />
          <div className="relative">
            <svg
              className="mb-6 text-primary"
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden
            >
              <path d="M7.17 17.6c-1.7 0-3.1-1.4-3.1-3.1 0-3.1 2.3-6.3 6.4-7.6l.6 1.5c-2.2.9-3.6 2.8-3.6 4.3.3-.1.6-.2 1-.2 1.7 0 3.1 1.4 3.1 3.1 0 1.7-1.5 3-3.4 3zm9.1 0c-1.7 0-3.1-1.4-3.1-3.1 0-3.1 2.3-6.3 6.4-7.6l.6 1.5c-2.2.9-3.6 2.8-3.6 4.3.3-.1.6-.2 1-.2 1.7 0 3.1 1.4 3.1 3.1 0 1.7-1.5 3-3.4 3z" />
            </svg>
            <p className="text-balance text-2xl font-bold leading-snug tracking-tight md:text-3xl">
              We stopped writing the same answer in Slack twelve times a
              week. The team gets the senior-engineer reply{" "}
              <span className="text-primary">on the first message</span>,
              and the senior engineer gets her afternoons back.
            </p>
            <div className="mt-8 flex items-center gap-4">
              <div className="flex size-11 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">
                SK
              </div>
              <div>
                <div className="text-[15px] font-semibold">
                  Head of platform, anonymised customer
                </div>
                <div className="text-[13px] text-muted-foreground">
                  Replace with a real quote before launch
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
