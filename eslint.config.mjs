import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    // Override eslint-config-next's `react.version: "detect"` default.
    // Detection calls `context.getFilename()` via eslint-plugin-react@7.37's
    // `resolveBasedir`, which was removed in ESLint 10 and crashes the run.
    // Pinning the version skips the detect path entirely.
    settings: {
      react: {
        version: "19",
      },
    },
  },
  {
    ignores: ["node_modules/**", ".next/**", "out/**", "build/**", "next-env.d.ts"],
  },
];

export default eslintConfig;
