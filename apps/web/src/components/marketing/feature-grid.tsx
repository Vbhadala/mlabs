// Six feature cards, framed for a generic AI-product startup so the
// template's default landing reads like a real product, not a template.
// Forks rewrite copy to fit their actual product.

import type { ReactNode } from "react"

const features = [
  {
    title: "Trained on your context, not the internet",
    body: "Pulls from the docs, threads, and code your team already writes. Answers sound like the senior person on your team — because they're built from your team's words.",
    icon: <BrainIcon />,
  },
  {
    title: "Connects on day one",
    body: "Slack, Linear, Notion, GitHub, Google Drive — wire them up in minutes. No data export, no migration, no \"give us 4 weeks for onboarding.\"",
    icon: <PlugIcon />,
  },
  {
    title: "Built for teams, not just users",
    body: "Shared spaces, role-aware answers, audit-logged actions. Designed so the whole team gets smarter together, not one prompt-power-user at a time.",
    icon: <UsersIcon />,
  },
  {
    title: "Auditable answers, every time",
    body: "Every response cites its sources. Disagree with an answer? Click the citation, fix the source, watch the answer improve everywhere.",
    icon: <CheckShieldIcon />,
  },
  {
    title: "Private by design",
    body: "Your data trains your workspace and nobody else's. SOC 2 in progress, encryption at rest and in transit, deletion that actually deletes.",
    icon: <LockIcon />,
  },
  {
    title: "Ships with your workflow",
    body: "Lives where your team already works — in your inbox, your chat, your code review. No new tab to open, no new habit to build.",
    icon: <ShipIcon />,
  },
]

export function FeatureGrid() {
  return (
    <section id="features" className="relative">
      <div className="mx-auto max-w-7xl px-6 py-24">
        <div className="max-w-2xl">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
            What&apos;s inside
          </div>
          <h2 className="text-balance text-4xl font-extrabold leading-[1.02] tracking-tighter md:text-5xl">
            Everything an AI product should have on{" "}
            <span className="text-primary">day one</span>.
          </h2>
          <p className="mt-5 text-[16px] leading-relaxed text-muted-foreground">
            Most AI products are demos that don&apos;t survive contact with a
            real team. These are the foundations we built first.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </div>
      </div>
    </section>
  )
}

function FeatureCard({
  title,
  body,
  icon,
}: {
  title: string
  body: string
  icon: ReactNode
}) {
  return (
    <div className="group rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-0.5 hover:border-primary/40">
      <div className="mb-5 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="mb-2 text-[17px] font-bold">{title}</h3>
      <p className="text-[14px] leading-relaxed text-muted-foreground">
        {body}
      </p>
    </div>
  )
}

function svgProps(extra?: string) {
  return {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    className: extra,
  }
}

function BrainIcon() {
  return (
    <svg {...svgProps()}>
      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44A2.5 2.5 0 0 1 4 18a2.5 2.5 0 0 1-2.5-2.5 2.5 2.5 0 0 1 .92-1.93 2.5 2.5 0 0 1 .58-3.74A2.5 2.5 0 0 1 4 6.5a2.5 2.5 0 0 1 2.5-2.5 2.5 2.5 0 0 1 3-2z" />
      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44A2.5 2.5 0 0 0 20 18a2.5 2.5 0 0 0 2.5-2.5 2.5 2.5 0 0 0-.92-1.93 2.5 2.5 0 0 0-.58-3.74A2.5 2.5 0 0 0 20 6.5a2.5 2.5 0 0 0-2.5-2.5 2.5 2.5 0 0 0-3-2z" />
    </svg>
  )
}

function PlugIcon() {
  return (
    <svg {...svgProps()}>
      <path d="M12 22v-5" />
      <path d="M9 8V2" />
      <path d="M15 8V2" />
      <path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z" />
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg {...svgProps()}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function CheckShieldIcon() {
  return (
    <svg {...svgProps()}>
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg {...svgProps()}>
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

function ShipIcon() {
  return (
    <svg {...svgProps()}>
      <path d="M12 10.189V14" />
      <path d="M12 2v3" />
      <path d="M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6" />
      <path d="M19.38 20A11.6 11.6 0 0 0 21 14l-8.188-3.275a2 2 0 0 0-1.624 0L3 14a11.6 11.6 0 0 0 2.81 7.76" />
      <path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1s1.2 1 2.5 1c2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
    </svg>
  )
}
