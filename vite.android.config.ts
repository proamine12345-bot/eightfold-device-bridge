import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  // The Android build uses android-web as its app root, but the project's
  // Supabase VITE_* settings live in the repository-root .env file.
  // Keep envDir at the repository root so the APK bundles the real backend URL
  // and publishable key instead of building with missing configuration.
  envDir: process.cwd(),
  root: "android-web",
  base: "./",
  plugins: [react(), tailwindcss(), tsconfigPaths()],
  build: {
    outDir: "../.output/public",
    emptyOutDir: true,
  },
});
