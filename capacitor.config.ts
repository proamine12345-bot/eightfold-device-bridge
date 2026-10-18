import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.ayman.remote",
  appName: "Ayman Remote",
  webDir: ".output/public",
  android: {
    allowMixedContent: false,
  },
  server: {
    androidScheme: "https",
    url: "https://eightfold-device-bridge.lovable.app",
    cleartext: false,
  },
};

export default config;
