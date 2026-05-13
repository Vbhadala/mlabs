import type { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Muscat",
  slug: "muscat-mobile",
  scheme: "muscat",
  ios: {
    bundleIdentifier: "com.example.muscat",
    associatedDomains: ["applinks:muscat.example.com"],
  },
  android: {
    package: "com.example.muscat",
    intentFilters: [{ data: [{ scheme: "https", host: "muscat.example.com" }] }],
  },
  plugins: [
    [
      "expo-image-picker",
      { photosPermission: "Muscat needs access to your photos." },
    ],
  ],
});
