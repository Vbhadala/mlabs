// Centered-card layout for /login, /signup, /forgot-password, /reset-password,
// /verify-email per design decision D2 (PLAN.md §4).

import Link from "next/link"
import { brand } from "@/config/brand"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm space-y-6">
        <Link href="/" className="block text-center">
          <p className="text-sm font-medium text-muted-foreground">
            {brand.legalEntity}
          </p>
          <p className="text-lg font-semibold tracking-tight">{brand.name}</p>
        </Link>
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          {children}
        </div>
      </div>
    </main>
  )
}
