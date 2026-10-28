import { execSync, spawnSync } from "node:child_process";
import path from "node:path";

const repositoryRoot = path.resolve(process.cwd(), "..");
const output = execSync("npx --yes supabase@2.110.0 status -o env", {
  cwd: repositoryRoot,
  encoding: "utf8",
  stdio: ["ignore", "pipe", "inherit"]
});
const local = Object.fromEntries(
  output
    .split(/\r?\n/)
    .filter((line) => /^[A-Z_]+=/.test(line))
    .map((line) => {
      const separator = line.indexOf("=");
      return [line.slice(0, separator), line.slice(separator + 1).replace(/^['"]|['"]$/g, "")];
    })
);

const required = ["API_URL", "ANON_KEY", "SERVICE_ROLE_KEY", "MAILPIT_URL"];
for (const name of required) {
  if (!local[name]) throw new Error(`Local Supabase did not expose ${name}.`);
}
if (!["127.0.0.1", "localhost"].includes(new URL(local.API_URL).hostname)) {
  throw new Error("Local auth E2E refuses to use a non-local Supabase URL.");
}

const environment = {
  ...process.env,
  E2E_BASE_URL: "http://localhost:3011",
  E2E_LOCAL_SUPABASE_URL: local.API_URL,
  E2E_LOCAL_SERVICE_ROLE_KEY: local.SERVICE_ROLE_KEY,
  E2E_LOCAL_MAILPIT_URL: local.MAILPIT_URL,
  NEXT_PUBLIC_SUPABASE_URL: local.API_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: local.ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: local.SERVICE_ROLE_KEY,
  NEXT_PUBLIC_APP_URL: "http://localhost:3011"
};
const cli = path.join(process.cwd(), "node_modules", "@playwright", "test", "cli.js");
const result = spawnSync(
  process.execPath,
  [cli, "test", "tests/e2e/local-auth.spec.ts", "--config=playwright.local.config.ts"],
  { cwd: process.cwd(), env: environment, stdio: "inherit" }
);

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
