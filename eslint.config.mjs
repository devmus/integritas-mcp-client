import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),

  // add rules here
  ...compat.config({
    rules: {
      "@typescript-eslint/no-explicit-any": "off", // disable "any" error
      "react/no-unescaped-entities": "off", // example from docs
      "@next/next/no-page-custom-font": "off", // example from docs
    },
  }),

  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
];

export default eslintConfig;
