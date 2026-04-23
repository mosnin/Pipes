import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const config = [
  {
    ignores: [".next/**", "node_modules/**", "convex/_generated/**", "playwright-report/**", "test-results/**"]
  },
  ...nextVitals,
  ...nextTs
];

config.forEach((entry) => {
  entry.rules = {
    ...(entry.rules ?? {}),
    "@typescript-eslint/no-explicit-any": "off",
    "react-hooks/set-state-in-effect": "off",
    "@typescript-eslint/ban-ts-comment": "off",
    "@typescript-eslint/no-unused-vars": "off"
  };
});

export default config;
