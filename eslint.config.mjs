import nextTypescript from "eslint-config-next/typescript";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const config = [{ ignores: [".next/**", "node_modules/**"] }, ...nextCoreWebVitals, ...nextTypescript];

export default config;
