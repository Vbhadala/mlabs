import { afterEach, describe, expect, it, vi } from "vitest"
import {
  _setDriverForTesting,
  sendNotificationEmail,
  sendPasswordResetEmail,
  sendVerifyEmail,
  type EmailDriver,
  type SendArgs,
} from "@/lib/email"
import { brand } from "@/config/brand"

function recordingDriver(): { driver: EmailDriver; calls: SendArgs[] } {
  const calls: SendArgs[] = []
  const driver: EmailDriver = {
    name: "recording",
    send: vi.fn(async (args: SendArgs) => {
      calls.push(args)
      return { messageId: `recorded-${calls.length}` }
    }),
  }
  return { driver, calls }
}

afterEach(() => {
  _setDriverForTesting(null)
})

describe("sendVerifyEmail", () => {
  it("calls the active driver with the verify-email template + expected vars", async () => {
    const { driver, calls } = recordingDriver()
    _setDriverForTesting(driver)

    await sendVerifyEmail({
      to: "alice@example.com",
      name: "Alice",
      verifyUrl: "https://app.example.com/verify-email?token=abc",
    })

    expect(calls).toHaveLength(1)
    expect(calls[0]).toMatchObject({
      templateAlias: "verify-email",
      to: "alice@example.com",
      fromName: brand.name,
      variables: {
        brand_name: brand.name,
        name: "Alice",
        verify_url: "https://app.example.com/verify-email?token=abc",
      },
    })
  })
})

describe("sendPasswordResetEmail", () => {
  it("uses password-reset template, default expires_in_minutes = 60", async () => {
    const { driver, calls } = recordingDriver()
    _setDriverForTesting(driver)

    await sendPasswordResetEmail({
      to: "bob@example.com",
      name: "Bob",
      resetUrl: "https://app.example.com/reset?token=xyz",
    })

    expect(calls[0].templateAlias).toBe("password-reset")
    expect(calls[0].variables.expires_in_minutes).toBe(60)
    expect(calls[0].variables.reset_url).toBe("https://app.example.com/reset?token=xyz")
  })

  it("respects custom expires_in_minutes", async () => {
    const { driver, calls } = recordingDriver()
    _setDriverForTesting(driver)

    await sendPasswordResetEmail({
      to: "carol@example.com",
      name: "Carol",
      resetUrl: "https://app.example.com/reset?token=abc",
      expiresInMinutes: 15,
    })

    expect(calls[0].variables.expires_in_minutes).toBe(15)
  })
})

describe("sendNotificationEmail", () => {
  it("passes title/body and CTA defaults to empty strings when omitted", async () => {
    const { driver, calls } = recordingDriver()
    _setDriverForTesting(driver)

    await sendNotificationEmail({
      to: "dan@example.com",
      title: "Bet settled",
      body: "Your bet on team X just settled.",
    })

    expect(calls[0].templateAlias).toBe("notification-generic")
    expect(calls[0].variables).toMatchObject({
      title: "Bet settled",
      body: "Your bet on team X just settled.",
      cta_label: "",
      cta_url: "",
    })
  })

  it("propagates CTA when given", async () => {
    const { driver, calls } = recordingDriver()
    _setDriverForTesting(driver)

    await sendNotificationEmail({
      to: "eve@example.com",
      title: "New signal",
      body: "A new signal you might like.",
      ctaLabel: "View signal",
      ctaUrl: "https://app.example.com/signals/42",
    })

    expect(calls[0].variables.cta_label).toBe("View signal")
    expect(calls[0].variables.cta_url).toBe("https://app.example.com/signals/42")
  })
})

describe("driver failures bubble", () => {
  it("rejects when the driver throws (so the auth flow can surface a retry)", async () => {
    const driver: EmailDriver = {
      name: "broken",
      send: vi.fn(async () => {
        throw new Error("postmark down")
      }),
    }
    _setDriverForTesting(driver)

    await expect(
      sendVerifyEmail({
        to: "frank@example.com",
        name: "Frank",
        verifyUrl: "https://app.example.com/verify",
      }),
    ).rejects.toThrow("postmark down")
  })
})
