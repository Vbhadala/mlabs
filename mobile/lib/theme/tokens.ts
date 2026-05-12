// Theme tokens for runtime React Native consumption (e.g. status bar tint,
// splash bg, programmatic SVG strokes). Compile-time class names come from
// `tailwind.config.js` which is generated from the same source —
// `src/config/design.ts`. Hand-maintained for now; if it drifts the design
// review will catch it. (Cross-package import would couple the two tsconfigs.)

export const design = {
  colors: {
    light: {
      background: "#ffffff",
      foreground: "#252525",
      muted: "#f6f6f6",
      mutedForeground: "#8e8e8e",
      border: "#ebebeb",
      primary: "#343434",
      primaryForeground: "#fbfbfb",
      destructive: "#dc2626",
      success: "#16a34a",
      warning: "#d97706",
    },
    dark: {
      background: "#252525",
      foreground: "#fbfbfb",
      muted: "#444444",
      mutedForeground: "#b5b5b5",
      border: "rgba(255,255,255,0.10)",
      primary: "#ececec",
      primaryForeground: "#343434",
      destructive: "#f87171",
      success: "#22c55e",
      warning: "#f59e0b",
    },
  },
} as const;
