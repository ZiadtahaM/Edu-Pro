import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const read = file => readFileSync(join(root, file), "utf8");
const checks = [];
const check = (name, passed, evidence) => checks.push({ name, passed, evidence });

const css = read("client/src/index.css");
const portal = read("client/src/pages/Portal.tsx");
const app = read("client/src/App.tsx");
const client = read("server/eduProClient.ts");
const moduleFile = read("../workspace/Edu-Pro/app.module.ts");

check("Visible focus styles", /focus-visible/.test(css) && /outline/.test(css), "index.css contains focus-visible styling");
check("Reduced motion", /prefers-reduced-motion/.test(css), "index.css contains a prefers-reduced-motion media query");
check("Labeled form controls", /htmlFor=/.test(portal) && /aria-label=/.test(portal), "profile labels and category filter label are present");
check("Semantic admin table", /<table/.test(portal) && /<caption/.test(portal) && /scope=/.test(portal), "admin page uses captioned table headers");
check("Admin route gate", /user\?\.role === \"admin\"/.test(app) && /enabled: user\?\.role === \"admin\"/.test(portal), "route and query are role-gated");
check("REST timeout", /AbortController/.test(client) && /setTimeout/.test(client), "server REST client aborts slow requests");
check("Global throttling", /ThrottlerModule/.test(moduleFile) && /APP_GUARD/.test(moduleFile), "Nest module registers global throttler guard");
check("No committed env files", !readdirSync(root, { withFileTypes: true }).some(entry => entry.name === ".env" || entry.name.startsWith(".env.")), "project root contains no .env file");

const failed = checks.filter(item => !item.passed);
const report = `# Local Accessibility and Security Audit\n\nGenerated: ${new Date().toISOString()}\n\n| Check | Result | Evidence |\n|---|---|---|\n${checks.map(item => `| ${item.name} | ${item.passed ? "PASS" : "FAIL"} | ${item.evidence} |`).join("\n")}\n\nResult: **${failed.length === 0 ? "PASS" : "REVIEW REQUIRED"}**. This source audit does not replace a deployed axe scan, real JWT issuer test, MongoDB ping, or reverse-proxy 429 test.\n`;
writeFileSync(join(root, "docs/local-accessibility-security-audit.md"), report);
console.log(report);
if (failed.length) process.exitCode = 1;
