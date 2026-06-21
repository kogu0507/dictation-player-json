import { defineConfig } from "vitest/config";

export default defineConfig({
  base: "./",
  build: {
    target: "baseline-widely-available",
  },
  test: {
    environment: "node",
  },
});
