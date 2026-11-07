import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
export default defineConfig({
  base: "./",
  plugins: [react()],
  esbuild: {
    target: "es2019",
  },
  build: {
    target: "es2019",
  },
  test: { include: ["tests/**/*.test.ts"], environment: "node" },
});
