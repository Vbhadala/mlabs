// STUB — replaced with import from src/lib/schemas/auth.ts after Lane B
// merges (integration step). Lane B will produce the canonical pure-Zod
// schemas; this file mirrors their expected shape so Lane C compiles in
// isolation.

import { z } from "zod";

export const SignUpInput = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "At least 8 characters"),
  name: z.string().min(1, "Name is required"),
});
export type SignUpInput = z.infer<typeof SignUpInput>;

export const LoginInput = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof LoginInput>;

export const ForgotPasswordInput = z.object({
  email: z.string().email("Enter a valid email"),
});
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordInput>;

export const ResetPasswordInput = z
  .object({
    token: z.string().min(1),
    password: z.string().min(8, "At least 8 characters"),
    confirm: z.string().min(1, "Confirm your password"),
  })
  .refine((d) => d.password === d.confirm, {
    path: ["confirm"],
    message: "Passwords don't match",
  });
export type ResetPasswordInput = z.infer<typeof ResetPasswordInput>;
