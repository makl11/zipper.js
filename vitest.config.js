import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    dir: "__tests__",
    isolate: false,
    fileParallelism: !process.env.CI,
    sequence: {
      concurrent: !process.env.CI,
    },
  },
});
