import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const locales = ["sq", "en", "de", "it", "tr", "pl"];

function flatten(value, prefix = "") {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [prefix];
  return Object.entries(value).flatMap(([key, child]) => flatten(child, prefix ? `${prefix}.${key}` : key));
}

async function main() {
  const messageSets = await Promise.all(locales.map(async (locale) => {
    const source = await readFile(resolve("messages", `${locale}.json`), "utf8");
    return [locale, source, new Set(flatten(JSON.parse(source)))];
  }));
  const byLocale = new Map(messageSets.map(([locale, _source, keys]) => [locale, keys]));
  const reference = byLocale.get("sq");
  const failures = [];

  for (const [locale, source] of messageSets) {
    if (/[\u00C3\u00C2\u00E2]|\uFFFD/.test(source)) {
      failures.push(`${locale}: possible mojibake or invalid replacement character in translation content`);
    }
  }

  for (const locale of locales) {
    const keys = byLocale.get(locale);
    const missing = [...reference].filter((key) => !keys.has(key));
    const extra = [...keys].filter((key) => !reference.has(key));
    if (missing.length || extra.length) failures.push(`${locale}: missing [${missing.join(", ") || "none"}], extra [${extra.join(", ") || "none"}]`);
  }

  if (failures.length) throw new Error(`Translation key parity failed.\n${failures.join("\n")}`);
  console.log(`Translation key parity passed for ${locales.join(", ")}.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
