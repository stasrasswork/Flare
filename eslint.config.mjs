import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["**/dist/**", "**/src/generated/**"]),
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,tsx}"],
    extends: [js.configs.recommended, tseslint.configs.recommended],
  },
  {
    files: [
      "apps/api/**/*.{js,mjs,cjs,ts,mts,cts}",
      "apps/web/*.{js,ts}",
      "packages/sdk-node/**/*.ts",
      "examples/**/*.ts",
    ],
    languageOptions: { globals: globals.node },
  },
  {
    files: ["apps/web/src/**/*.{ts,tsx}", "packages/sdk-react/**/*.{ts,tsx}"],
    extends: [reactHooks.configs.flat.recommended],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ["apps/web/src/**/*.{ts,tsx}"],
    extends: [reactRefresh.configs.vite],
  },
]);
