import Link from "next/link"
import { brand } from "@/config/brand"
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-24">
      <div className="w-full max-w-xl text-center">
        <p className="text-sm font-medium text-muted-foreground">
          {brand.legalEntity}
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">
          {brand.name}
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">{brand.tagline}</p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Button size="lg">
            <Link href="/signup">Get started</Link>
          </Button>
          <Button size="lg" variant="outline">
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </div>
    </main>
  )
}
