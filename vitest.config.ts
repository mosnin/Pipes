import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./tests/unit/setup.ts"],
    fileParallelism: false,
    include: ["tests/unit/**/*.test.ts", "tests/unit/**/*.test.tsx"]
  }
});
