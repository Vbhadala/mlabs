import Link from "next/link"
import { brand } from "@mlabs/config"
import { buttonVariants } from "@mlabs/ui-web/button"
import { cn } from "@mlabs/ui-web/utils"

type MarketingNavProps = {
  signedIn?: boolean
}

export function MarketingNav({ signedIn = false }: MarketingNavProps) {
  return (
    <header className="relative z-20">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2">
          <span className="inline-block size-2.5 rounded-full bg-primary" />
          <span className="text-[19px] font-extrabold tracking-tight">
            {brand.name}
          </span>
        </Link>

        <nav className="hidden items-center gap-9 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground md:flex">
          <Link href="#features" className="transition hover:text-foreground">
            Features
          </Link>
          <Link href="#how-it-works" className="transition hover:text-foreground">
            How it works
          </Link>
          <Link href="#customers" className="transition hover:text-foreground">
            Customers
          </Link>
          <Link href="/design" className="transition hover:text-foreground">
            Design
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          {signedIn ? (
            <Link href="/" className={cn(buttonVariants({ size: "sm" }))}>
              Go to dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden text-[13px] font-medium text-muted-foreground hover:text-foreground sm:inline"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className={cn(buttonVariants({ size: "sm" }))}
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
