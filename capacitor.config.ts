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
    // Pour tester en direct sur un appareil, décommentez et pointez vers l'URL publiée :
    // url: "https://votre-app.lovable.app",
    // cleartext: false,
  },
};

export default config;
