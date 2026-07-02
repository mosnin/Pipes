import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "convex/_generated/**",
      "playwright-report/**",
      "test-results/**",
      // Vendored registry components (shadcn/ncdai/shark/pixel-perfect).
      // Re-voiced per DESIGN.md as they're integrated; not held to our lint.
      "src/components/fx/**",
      "src/components/charts/**",
      "src/components/pixel-perfect/**",
      "src/components/templates/**",
      "src/components/kibo-ui/**",
      "src/components/theme/**"
    ]
  },
  ...nextVitals,
  ...nextTs
];

config.forEach((entry) => {
  // A config object that carries only `ignores` acts as global ignores —
  // adding `rules` to it would silently disable that behavior.
  if (entry.ignores && !entry.files) return;
  entry.rules = {
    ...(entry.rules ?? {}),
    "@typescript-eslint/no-explicit-any": "off",
    "react-hooks/set-state-in-effect": "off",
    "@typescript-eslint/ban-ts-comment": "off",
    "@typescript-eslint/no-unused-vars": "off"
  };
});

export default config;
