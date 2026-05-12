// Mirror of src/lib/schemas/auth.ts — kept in sync deliberately.
//
// Metro can't reach across src/ → mobile/ so the mirror is intentional; a
// future shared/ package would dedupe this. See PHASE_5_5.md decision A4.
//
// Mirrors Better Auth's defaults (min password length 8 — see src/lib/auth/index.ts).

import { z } from "zod"

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password is too long")

export const emailSchema = z.email("Enter a valid email")

export const SignUpInput = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: emailSchema,
  password: passwordSchema,
})
export type SignUpInput = z.infer<typeof SignUpInput>

export const LoginInput = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
})
export type LoginInput = z.infer<typeof LoginInput>

export const ForgotPasswordInput = z.object({
  email: emailSchema,
})
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordInput>

export const ResetPasswordInput = z
  .object({
    token: z.string().min(1, "Reset token is required"),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords don't match",
  })
export type ResetPasswordInput = z.infer<typeof ResetPasswordInput>
