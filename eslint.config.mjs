import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "**/.next/**",
    "coverage/**",
    // سكربتات Node عامة (CommonJS)
    "scripts/**",
    // Bridge service يستخدم CommonJS حالياً
    "services/**",
  ]),
  {
    rules: {
      // Gradual migration path for new React hooks lint semantics.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      // Keep reporting without blocking CI on existing legacy patterns.
      "prefer-const": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",
      "@typescript-eslint/no-require-imports": "warn",
    },
  },
]);

export default eslintConfig;
