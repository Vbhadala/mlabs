// @mlabs/eslint-config/library — preset for workspace packages under packages/*.
//
// Just the base rules. Packages don't need Next/Expo framework rules.
//
// Consumed by packages via:
//   import libraryConfig from "@mlabs/eslint-config/library";
//   export default libraryConfig;

import baseConfig from "./base.mjs";

const libraryConfig = [...baseConfig];

export default libraryConfig;
