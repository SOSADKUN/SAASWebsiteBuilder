import next from "eslint-config-next/core-web-vitals";
const config = [
  ...next,
  { ignores: [".next/**", "drizzle/**", ".npm-cache/**"] },
  { rules: { "@next/next/no-img-element": "off" } },
];
export default config;
