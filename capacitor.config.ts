import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.ayman.remote",
  appName: "Ayman Remote",
  webDir: ".output/public",
  android: {
    allowMixedContent: false,
  },
};

export default config;
