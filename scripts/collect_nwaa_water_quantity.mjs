#!/usr/bin/env node

/**
 * Collect the latest currently published USGS NWAA water-quantity snapshot.
 *
 * NWAA's public model archive currently covers water years through 2020.
 * Requests are made by state because the service requires a geographic
 * location and state requests are small enough to retry safely. HUC12 values
 * are de-duplicated because a watershed can touch more than one state.
 *
 * Usage:
 *   node scripts/collect_nwaa_water_quantity.mjs
 *   NWAA_YEAR=2019 node scripts/collect_nwaa_water_quantity.mjs
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const execFileAsync = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const year = String(process.env.NWAA_YEAR || "2020");
const outputPath = path.join(root, "data", "raw", `nwaa_water_quantity_${year}.csv`);
const model = "wqn-nhmprms-conus-nwaa-v1";
const variables = "recharge,incbsflow,incrunoff,soilmstfr,soilmst";
const pageSize = 600;
const states = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID",
  "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS",
  "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK",
  "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV",
  "WI", "WY"
];

const canonicalHeaders = ["huc12_id", "year", "recharge_mm/mo", "incbsflow_mm/mo", "incrunoff_mm/mo", "soilmstfr_frac", "soilmst_mm"];

async function fetchState(state) {
  const rows = [];
  for (let skip = 0; ; skip += pageSize) {
    const url = new URL("https://api.water.usgs.gov/nwaa-data/data");
    url.search = new URLSearchParams({
      model,
      variable: variables,
      location: `stateCd:${state}`,
      timeRes: "annualwy",
      startDate: year,
      endDate: year,
      format: "csv",
      skip: String(skip)
    });
    try {
      const { stdout } = await execFileAsync("curl", [
        "-L", "--fail", "--silent", "--show-error", "--max-time", "90", "--retry", "4", "--retry-all-errors", "--retry-delay", "5", "--retry-max-time", "600", url.toString()
      ], { maxBuffer: 32 * 1024 * 1024 });
      const page = stdout.trim();
      if (!page) break;
      const lines = page.split(/\r?\n/).filter(Boolean);
      const headers = lines.shift().split(",");
      lines.forEach((line) => {
        const values = parseCsvLine(line);
        rows.push(Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
      });
      const rowCount = lines.length;
      if (rowCount < pageSize) break;
    } catch (error) {
      if (skip === 0 && /returned error: 400/.test(error.message)) return "";
      throw error;
    }
  }
  return rows;
}

function parseCsvLine(line) {
  return line.split(",");
}

async function run() {
  const rows = new Map();
  let header = "";
  let completed = 0;

  for (let index = 0; index < states.length; index += 2) {
    const batch = states.slice(index, index + 2);
    const results = await Promise.all(batch.map(async (state) => {
      try {
        const fetchedRows = await fetchState(state);
        if (!header) header = canonicalHeaders.join(",");
        for (const row of fetchedRows) {
          const huc12 = row.huc12_id;
          if (huc12 && huc12 !== "huc12_id") rows.set(huc12, canonicalHeaders.map((field) => row[field] ?? "").join(","));
        }
        completed += 1;
        console.log(`[${completed}/${states.length}] ${state}: ${fetchedRows.length.toLocaleString()} rows`);
      } catch (error) {
        console.warn(`[failed] ${state}: ${error.message}`);
      }
    }));
    await Promise.all(results);
  }

  if (!header || !rows.size) throw new Error("NWAA collection returned no rows.");
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${header}\n${[...rows.values()].sort().join("\n")}\n`);
  console.log(`Wrote ${rows.size.toLocaleString()} de-duplicated HUC12 rows to ${path.relative(root, outputPath)}.`);
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
