import Link from "next/link"
import { buttonVariants } from "@mlabs/ui-web/button"
import { cn } from "@mlabs/ui-web/utils"

export function CtaBand() {
  return (
    <section id="cta" className="relative">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="relative overflow-hidden rounded-3xl bg-foreground p-12 text-center text-background md:p-16">
          <div
            aria-hidden
            className="absolute inset-0 opacity-60"
            style={{
              background:
                "radial-gradient(60% 80% at 50% 0%, color-mix(in oklch, var(--color-primary) 30%, transparent), transparent 60%)",
            }}
          />
          <div className="relative">
            <h2 className="text-balance text-4xl font-extrabold leading-[1.02] tracking-tighter md:text-6xl">
              Your team&apos;s answers,
              <br />
              before the question gets asked.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-[16px] text-background/70">
              Spin up your workspace in under a minute. Wire up your
              tools. Watch your team get faster every week.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/signup"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "h-11 px-6 text-[14px]"
                )}
              >
                Get started — it&apos;s free
              </Link>
              <Link
                href="#features"
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-background/30 px-6 text-[14px] font-semibold transition hover:bg-background/5"
              >
                Book a walkthrough
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
