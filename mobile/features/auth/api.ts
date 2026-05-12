import { apiPost, setTokens, clearTokens } from "../../lib/api/client";
import type {
  SignUpInput,
  LoginInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from "../../lib/schemas/auth";

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  avatarUrl?: string | null;
}

interface AuthSuccess {
  user: User;
  tokens?: TokenPair;
}

/**
 * Sign-up posts to Better Auth's bearer-enabled endpoint and returns the
 * user. The server emits the access/refresh pair only after email
 * verification (sign-up returns just user + a "check email" state).
 */
export async function signUpRequest(input: SignUpInput): Promise<AuthSuccess> {
  const data = await apiPost<AuthSuccess>("/api/auth/sign-up", input);
  if (data.tokens) {
    await setTokens({
      access: data.tokens.accessToken,
      refresh: data.tokens.refreshToken,
    });
  }
  return data;
}

export async function loginRequest(input: LoginInput): Promise<AuthSuccess> {
  const data = await apiPost<AuthSuccess>("/api/auth/sign-in", input);
  if (data.tokens) {
    await setTokens({
      access: data.tokens.accessToken,
      refresh: data.tokens.refreshToken,
    });
  }
  return data;
}

export async function forgotPasswordRequest(
  input: ForgotPasswordInput
): Promise<{ ok: true }> {
  return apiPost("/api/auth/forgot-password", input);
}

export async function resetPasswordRequest(
  input: ResetPasswordInput
): Promise<{ ok: true }> {
  return apiPost("/api/auth/reset-password", {
    token: input.token,
    password: input.password,
  });
}

export async function verifyEmailRequest(
  token: string
): Promise<{ ok: true }> {
  return apiPost("/api/auth/verify-email", { token });
}

export async function resendVerifyRequest(
  email: string
): Promise<{ ok: true }> {
  return apiPost("/api/auth/resend-verify", { email });
}

export async function signOutRequest(): Promise<void> {
  try {
    await apiPost("/api/auth/sign-out", {});
  } finally {
    await clearTokens();
  }
}

export async function meRequest(): Promise<User> {
  const data = await apiPost<{ user: User }>("/api/auth/me", {});
  return data.user;
}
