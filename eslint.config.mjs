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
  ]),
  {
    rules: {
      // These two rules exist to steer code toward React Compiler compatibility.
      // This project doesn't enable the compiler, and both idioms they flag —
      // `useEffect(() => { load() }, [])` for client-side data fetching, and
      // `const Icon = getIcon(name)` for a dynamic-but-stable icon lookup — are
      // standard and safe here. Kept as warnings rather than silenced entirely.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/static-components": "warn",
    },
  },
]);

export default eslintConfig;
