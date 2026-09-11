#!/usr/bin/env node

/**
 * Collect display-ready USGS NWAA HUC12 snapshots for the latest complete
 * common model year currently available in the public API.
 *
 * These files are tables keyed by HUC12. They intentionally do not pretend
 * to be point data: join them to the Watershed Boundary Dataset before
 * drawing polygons or centroids in Atlas.
 *
 * Usage:
 *   node scripts/collect_nwaa_huc12_snapshot.mjs
 *   NWAA_YEAR=2019 node scripts/collect_nwaa_huc12_snapshot.mjs
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const execFileAsync = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const year = String(process.env.NWAA_YEAR || "2020");
const pageSize = 600;
const states = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID",
  "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS",
  "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK",
  "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV",
  "WI", "WY"
];

const collections = [
  {
    id: "nwaa_water_use",
    output: `data/raw/nwaa_water_use_${year}.csv`,
    timeRes: "annualcy",
    model: "wu-irrigation-wd",
    variables: "irrwdgw,irrwdsw,irrwdtot",
    source: "irrigation withdrawals"
  },
  {
    id: "nwaa_public_supply",
    output: `data/raw/nwaa_public_supply_${year}.csv`,
    timeRes: "annualcy",
    model: "wu-public-supply-wd",
    variables: "pswdgw,pswdsw,pswdtot",
    source: "public-supply withdrawals"
  },
  {
    id: "nwaa_thermoelectric",
    output: `data/raw/nwaa_thermoelectric_${year}.csv`,
    timeRes: "annualcy",
    model: "wu-thermoelectric",
    variables: "tewdfgw,tewdfsw,tewdftot,tecufgw,tecufsw,tecuftot",
    source: "thermoelectric withdrawals and consumptive use"
  },
  {
    id: "nwaa_availability",
    output: `data/raw/nwaa_availability_${year}.csv`,
    timeRes: "annualwy",
    model: "iwa-assessment-outputs-conus-2025",
    variables: "availab,sui,strflow,consum",
    source: "integrated water availability"
  }
];

const canonicalHeaders = {
  nwaa_water_use: ["huc12_id", "year", "irrwdtot_mgd", "irrwdsw_mgd", "irrwdgw_mgd"],
  nwaa_public_supply: ["huc12_id", "year", "pswdtot_mgd", "pswdsw_mgd", "pswdgw_mgd"],
  nwaa_thermoelectric: ["huc12_id", "year", "tewdfgw_mgd", "tewdftot_mgd", "tecuftot_mgd", "tecufsw_mgd", "tecufgw_mgd", "tewdfsw_mgd"],
  nwaa_availability: ["huc12_id", "year", "availab_mm/mo", "sui_frac", "strflow_mm/mo", "consum_mm/mo"]
};

function splitLines(text) {
  return text.trim().split(/\r?\n/).filter(Boolean);
}

async function fetchState(collection, state) {
  const rows = [];
  for (let skip = 0; ; skip += pageSize) {
    const url = new URL("https://api.water.usgs.gov/nwaa-data/data");
    url.search = new URLSearchParams({
      model: collection.model,
      variable: collection.variables,
      location: `stateCd:${state}`,
      timeRes: collection.timeRes,
      startDate: year,
      endDate: year,
      format: "csv",
      skip: String(skip)
    });
    try {
      const { stdout } = await execFileAsync("curl", [
        "-L", "--fail", "--silent", "--show-error", "--max-time", "60",
        "--retry", "2", "--retry-all-errors", "--retry-delay", "3", "--retry-max-time", "180", url.toString()
      ], { maxBuffer: 48 * 1024 * 1024 });
      const page = stdout.trim();
      if (!page) break;
      const lines = splitLines(page);
      const headers = lines.shift().split(",");
      lines.forEach((line) => {
        const values = line.split(",");
        const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
        rows.push(row);
      });
      if (lines.length < pageSize) break;
    } catch (error) {
      if (skip === 0 && /returned error: 400/.test(error.message)) return "";
      throw new Error(`${state} page ${skip}: ${error.message}`);
    }
  }
  return rows;
}

async function collect(collection) {
  const rows = new Map();
  let header = "";
  let completed = 0;
  const failures = [];

  for (let index = 0; index < states.length; index += 2) {
    const batch = states.slice(index, index + 2);
    await Promise.all(batch.map(async (state) => {
      try {
        const fetchedRows = await fetchState(collection, state);
        const canonical = canonicalHeaders[collection.id] || Object.keys(fetchedRows[0] || {});
        if (!header && canonical.length) header = canonical.join(",");
        for (const row of fetchedRows) {
          const huc12 = row.huc12_id;
          if (huc12 && huc12 !== "huc12_id") rows.set(huc12, canonical.map((field) => row[field] ?? "").join(","));
        }
        completed += 1;
        console.log(`[${collection.id}] [${completed}/${states.length}] ${state}: ${fetchedRows.length.toLocaleString()} rows`);
      } catch (error) {
        failures.push(`${state}: ${error.message}`);
        console.warn(`[${collection.id}] [failed] ${error.message}`);
      }
    }));
  }

  if (!header || !rows.size) throw new Error(`${collection.source} returned no rows.`);
  if (failures.length) {
    throw new Error(`${collection.source} was incomplete. Retry the collection; failures: ${failures.join(" | ")}`);
  }

  const outputPath = path.join(root, collection.output);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${header}\n${[...rows.values()].sort().join("\n")}\n`);
  console.log(`[${collection.id}] Wrote ${rows.size.toLocaleString()} de-duplicated HUC12 rows to ${collection.output}.`);
}

async function run() {
  for (const collection of collections) await collect(collection);
}

run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
