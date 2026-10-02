import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;

const root = process.cwd();
loadEnvConfig(root);

if (!process.env.AI_GATEWAY_API_KEY?.trim()) {
  console.error("Classifier eval requires AI_GATEWAY_API_KEY. Set it in .env.local or the current environment; no mock model is used.");
  process.exit(1);
}

const outputDirectory = resolve(root, ".reviewguard-data/classifier-evals");
mkdirSync(outputDirectory, { recursive: true });
const env = {
  ...process.env,
  PROMPTFOO_CONFIG_DIR: resolve(outputDirectory, "promptfoo-state"),
  PROMPTFOO_DISABLE_TELEMETRY: "1",
  PROMPTFOO_DISABLE_SHARING: "1",
  PROMPTFOO_DISABLE_UPDATE: "1",
};
const promptfoo = resolve(root, "node_modules/.bin/promptfoo");
let exitCode = 0;

for (const [config, output] of [
  ["promptfooconfig.yaml", "live-latest.json"],
  ["promptfooconfig.recorded.yaml", "recorded-latest.json"],
]) {
  const result = spawnSync(
    promptfoo,
    ["eval", "--config", `evals/review-classifier/${config}`, "--no-cache", "--output", resolve(outputDirectory, output)],
    { cwd: root, stdio: "inherit", env },
  );

  if (result.error) {
    console.error(`Could not start Promptfoo: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) exitCode = result.status ?? 1;
}
process.exit(exitCode);
