import { cpSync } from "node:fs";
import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "copy-runtime-assets",
      closeBundle() {
        const sourceDir = path.resolve(__dirname, "assets");
        const targetDir = path.resolve(__dirname, "dist", "assets");
        cpSync(sourceDir, targetDir, { recursive: true, force: true });
      },
    },
  ],
});
