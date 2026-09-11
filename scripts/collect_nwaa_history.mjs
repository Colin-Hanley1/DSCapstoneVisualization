#!/usr/bin/env node

/**
 * Collect the complete common USGS NWAA modeled archive currently used by
 * Atlas. NWAA is published by water year and currently ends at 2020.
 *
 * Usage:
 *   node scripts/collect_nwaa_history.mjs
 *   node scripts/collect_nwaa_history.mjs --start-year 2016 --end-year 2020
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const execFileAsync = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);

function option(name, fallback) {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

const startYear = Number(option("--start-year", "2016"));
const endYear = Number(option("--end-year", "2020"));
const scripts = [
  "collect_nwaa_water_quantity.mjs",
  "collect_nwaa_huc12_snapshot.mjs"
];

async function run() {
  if (!Number.isInteger(startYear) || !Number.isInteger(endYear) || startYear > endYear) {
    throw new Error("--start-year and --end-year must be integer years with start <= end.");
  }
  const results = [];
  for (let year = startYear; year <= endYear; year += 1) {
    for (const script of scripts) {
      console.log(`[nwaa] ${year}: ${script}`);
      const { stdout, stderr } = await execFileAsync(process.execPath, [path.join(root, "scripts", script)], {
        env: { ...process.env, NWAA_YEAR: String(year) },
        maxBuffer: 64 * 1024 * 1024
      });
      if (stdout) process.stdout.write(stdout);
      if (stderr) process.stderr.write(stderr);
    }
    results.push(year);
  }
  const manifestPath = path.join(root, "data", "historical", "nwaa-manifest.json");
  await mkdir(path.dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, `${JSON.stringify({
    generated_at: new Date().toISOString(),
    coverage: { start_water_year: startYear, end_water_year: endYear },
    source: "https://water.usgs.gov/nwaa-data/web-services/",
    years_collected: results,
    files: results.flatMap((year) => [
      `data/raw/nwaa_water_quantity_${year}.csv`,
      `data/raw/nwaa_water_use_${year}.csv`,
      `data/raw/nwaa_public_supply_${year}.csv`,
      `data/raw/nwaa_thermoelectric_${year}.csv`,
      `data/raw/nwaa_availability_${year}.csv`
    ]),
    interpretation: [
      "NWAA values are modeled estimates keyed to HUC12 watersheds, not measurements at a proposed parcel.",
      "The archive is useful for multi-year basin-scale quantity, withdrawal, consumptive-use, and availability comparisons; join to WBD HUC12 geometry for mapping.",
      "The latest complete archive year currently collected is 2020, so do not represent these files as current conditions."
    ]
  }, null, 2)}\n`);
  console.log(`Wrote ${path.relative(root, manifestPath)}.`);
}

run().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});
