import * as React from "react";
import { Stack } from "expo-router";

/**
 * Auth stack — no tab bar, no header (each screen draws its own wordmark
 * inline, per the locked design spec).
 */
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
