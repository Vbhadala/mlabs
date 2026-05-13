import Link from "next/link"
import { brand } from "@mlabs/config"
import { buttonVariants } from "@mlabs/ui-web/button"
import { cn } from "@mlabs/ui-web/utils"
import { Tagline } from "./tagline"

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[600px]"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, color-mix(in oklch, var(--color-primary) 10%, transparent) 0%, transparent 60%)",
        }}
      />

      <div className="relative mx-auto max-w-5xl px-6 pb-20 pt-20 text-center">
        <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-[12px] font-medium text-primary ring-1 ring-primary/25">
          <span className="inline-block size-1.5 rounded-full bg-primary" />
          Now in private beta · join the waitlist
        </div>

        <h1 className="text-balance text-5xl font-extrabold leading-[0.98] tracking-tighter sm:text-6xl md:text-7xl">
          <Tagline text={brand.tagline} highlight={brand.taglineHighlight} />.
        </h1>

        <p className="mx-auto mt-7 max-w-2xl text-[17px] leading-relaxed text-muted-foreground">
          The AI workspace that learns your team&apos;s context — from the
          docs you&apos;ve written to the conversations you have. Ask once,
          get the answer your team would have given.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/signup"
            className={cn(buttonVariants({ size: "lg" }), "h-11 px-6 text-[14px]")}
          >
            Get started — it&apos;s free
          </Link>
          <Link
            href="#how-it-works"
            className={cn(
              buttonVariants({ size: "lg", variant: "outline" }),
              "h-11 px-6 text-[14px]"
            )}
          >
            See it in action
          </Link>
        </div>

        <div className="mt-12 flex items-center justify-center gap-6 text-[12px] text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <CheckIcon className="text-primary" /> No credit card
          </span>
          <span className="hidden items-center gap-2 sm:inline-flex">
            <CheckIcon className="text-primary" /> SOC 2 in progress
          </span>
          <span className="hidden items-center gap-2 sm:inline-flex">
            <CheckIcon className="text-primary" /> Your data stays yours
          </span>
        </div>
      </div>
    </section>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}
