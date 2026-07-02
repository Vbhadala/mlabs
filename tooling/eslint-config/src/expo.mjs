// @mlabs/eslint-config/expo — preset for the Expo mobile app.
//
// Today mobile uses `expo lint` (the Expo CLI's built-in ESLint integration).
// This preset is a thin wrapper that adds MLabs custom rules on top, so when
// mobile migrates from `expo lint` to direct ESLint invocation it can consume
// this preset with no surprise.
//
// Also adds `no-restricted-imports` to forbid mobile from pulling in server
// packages — defense in depth on top of package.json deps + bundle-scan CI.

import baseConfig from "./base.mjs";
import noServerImports from "./no-server-imports.mjs";

const expoConfig = [...baseConfig, noServerImports];

export default expoConfig;
