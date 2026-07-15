import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Deterministic gate config: alias `~` -> ./src so the suite resolves the same
// `~/...` imports the app uses, run in a plain Node environment (no DOM needed
// for pure ranking/terrain/bearing logic), and only pick up co-located tests.
export default defineConfig({
  resolve: {
    alias: {
      "~": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
