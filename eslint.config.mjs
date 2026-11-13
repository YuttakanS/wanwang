import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // New in eslint-plugin-react-hooks 7. Every hit here reads browser-only state (localStorage,
      // matchMedia, navigator) after hydration, which must happen in an effect so the server HTML
      // and the first client render match.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  globalIgnores([".next/**", "node_modules/**", "next-env.d.ts", "mobile/**", ".claude/**"]),
]);

export default eslintConfig;
