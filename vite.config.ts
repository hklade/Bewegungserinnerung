import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3001",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir:
      "C:/Users/HeidiKlade/Documents/Codex/2026-07-06/files-mentioned-by-the-user-hier/outputs/bewegungserinnerung-dist",
    emptyOutDir: true,
  },
});
