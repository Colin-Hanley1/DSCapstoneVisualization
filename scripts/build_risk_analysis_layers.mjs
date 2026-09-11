#!/usr/bin/env node

/**
 * Build the three compact, map-ready risk layers used by the Atlas gallery:
 *   1. annual groundwater change from each well's 2021 mean;
 *   2. annual state drought prevalence from USDM county statistics;
 *   3. annual state natural-disaster history from NOAA Storm Events.
 *
 * The outputs are intentionally summaries, not a composite score. They keep
 * the existing Atlas map and Time lens useful without changing the default
 * workspace for other users.
 */

import fs from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(process.cwd());
const GROUNDWATER_INPUT = path.join(ROOT, "data/historical/derived/usgs_groundwater_monthly_2021_2025.csv");
const HAZARD_INPUT = path.join(ROOT, "data/historical/derived/noaa_storm_events_state_year_type_2021_2025.csv");
const GROUNDWATER_OUTPUT = path.join(ROOT, "data/historical/derived/usgs_groundwater_change_2021_2025.csv");
const DROUGHT_OUTPUT = path.join(ROOT, "data/historical/derived/usdm_drought_prevalence_state_year_2020_2025.csv");
const HAZARD_OUTPUT = path.join(ROOT, "data/historical/derived/noaa_hazard_state_year_2021_2025.csv");
const USDM_ENDPOINT = "https://usdmdataservices.unl.edu/api/ConsecutiveNonConsecutiveStatistics/GetNonConsecutiveStatisticsCounty";
const SKIP_DROUGHT = process.argv.includes("--skip-drought");

const STATE_ABBR = {
  Alabama: "AL", Alaska: "AK", Arizona: "AZ", Arkansas: "AR", California: "CA", Colorado: "CO", Connecticut: "CT", Delaware: "DE", "District of Columbia": "DC", Florida: "FL", Georgia: "GA", Hawaii: "HI", Idaho: "ID", Illinois: "IL", Indiana: "IN", Iowa: "IA", Kansas: "KS", Kentucky: "KY", Louisiana: "LA", Maine: "ME", Maryland: "MD", Massachusetts: "MA", Michigan: "MI", Minnesota: "MN", Mississippi: "MS", Missouri: "MO", Montana: "MT", Nebraska: "NE", Nevada: "NV", "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM", NewYork: "NY", "New York": "NY", "North Carolina": "NC", "North Dakota": "ND", Ohio: "OH", Oklahoma: "OK", Oregon: "OR", Pennsylvania: "PA", "Rhode Island": "RI", "South Carolina": "SC", "South Dakota": "SD", Tennessee: "TN", Texas: "TX", Utah: "UT", Vermont: "VT", Virginia: "VA", Washington: "WA", "West Virginia": "WV", Wisconsin: "WI", Wyoming: "WY"
};
const DISPLAY_STATES = new Set(Object.values(STATE_ABBR).filter((state) => !["AK", "HI"].includes(state)));

function parseCsvLine(line) {
  const values = []; let value = ""; let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') { value += '"'; index += 1; }
      else quoted = !quoted;
    } else if (character === "," && !quoted) { values.push(value); value = ""; }
    else value += character;
  }
  values.push(value);
  return values;
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const headers = parseCsvLine(lines.shift() || "");
  return lines.map((line) => Object.fromEntries(parseCsvLine(line).map((value, index) => [headers[index], value])));
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function csvWrite(rows, columns) {
  return [columns.join(","), ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(","))].join("\n") + "\n";
}

function number(value) {
  const parsed = Number(String(value ?? "").replace(/[$,%\s,]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function fixed(value, digits = 3) {
  return Number.isFinite(value) ? Number(value.toFixed(digits)) : "";
}

function sleep(milliseconds) { return new Promise((resolve) => setTimeout(resolve, milliseconds)); }

function percentile(values, fraction) {
  if (!values.length) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const position = (sorted.length - 1) * fraction;
  const lower = Math.floor(position); const upper = Math.ceil(position);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

async function buildGroundwaterChange() {
  const rows = parseCsv(await fs.readFile(GROUNDWATER_INPUT, "utf8"));
  const annualBySite = new Map();
  rows.forEach((row) => {
    const siteId = String(row.site_id || "").trim();
    const year = String(row.observation_date || "").slice(0, 4);
    const depth = number(row.groundwater_level_ft);
    const latitude = number(row.latitude); const longitude = number(row.longitude);
    if (!siteId || !/^20\d{2}$/.test(year) || depth === null || latitude === null || longitude === null) return;
    const site = annualBySite.get(siteId) || { siteId, latitude, longitude, siteName: row.site_name, state: row.state, county: row.county, timeSeriesId: row.time_series_id, years: new Map() };
    const annual = site.years.get(year) || { sum: 0, count: 0, firstDate: row.observation_date, lastDate: row.observation_date };
    annual.sum += depth; annual.count += 1; annual.firstDate = annual.firstDate < row.observation_date ? annual.firstDate : row.observation_date; annual.lastDate = annual.lastDate > row.observation_date ? annual.lastDate : row.observation_date;
    site.years.set(year, annual); annualBySite.set(siteId, site);
  });

  const output = [];
  annualBySite.forEach((site) => {
    const years = [...site.years.keys()].sort();
    if (!site.years.has("2021") || !site.years.has("2025")) return;
    const baseline = site.years.get("2021").sum / site.years.get("2021").count;
    let previousMean = null;
    years.forEach((year) => {
      const annual = site.years.get(year); const mean = annual.sum / annual.count;
      output.push({ year, site_id: site.siteId, time_series_id: site.timeSeriesId, site_name: site.siteName, state: site.state, county: site.county, latitude: fixed(site.latitude, 6), longitude: fixed(site.longitude, 6), groundwater_mean_ft: fixed(mean), change_from_2021_ft: fixed(mean - baseline), change_from_previous_ft: previousMean === null ? "" : fixed(mean - previousMean), observation_count: annual.count, baseline_year: 2021, baseline_date: site.years.get("2021").firstDate, latest_date: site.years.get("2025").lastDate });
      previousMean = mean;
    });
  });
  output.sort((left, right) => left.site_id.localeCompare(right.site_id) || Number(left.year) - Number(right.year));
  const columns = ["year", "site_id", "time_series_id", "site_name", "state", "county", "latitude", "longitude", "groundwater_mean_ft", "change_from_2021_ft", "change_from_previous_ft", "observation_count", "baseline_year", "baseline_date", "latest_date"];
  await fs.writeFile(GROUNDWATER_OUTPUT, csvWrite(output, columns));
  console.log(`Groundwater change: ${output.length.toLocaleString()} annual well rows from ${new Set(output.map((row) => row.site_id)).size.toLocaleString()} wells.`);
}

async function buildHazardHistory() {
  const rows = parseCsv(await fs.readFile(HAZARD_INPUT, "utf8"));
  const grouped = new Map();
  rows.forEach((row) => {
    const year = String(row.year || "").trim(); const rawState = String(row.state || "").trim(); const stateName = Object.keys(STATE_ABBR).find((name) => name.toUpperCase() === rawState.toUpperCase()) || rawState; const state = STATE_ABBR[stateName] || rawState.toUpperCase();
    if (!/^20\d{2}$/.test(year) || !DISPLAY_STATES.has(state)) return;
    const key = `${year}|${state}`; const target = grouped.get(key) || { year, state, state_name: stateName, unique_events: 0, detail_records: 0, deaths: 0, injuries: 0, damage_usd: 0, eventTypes: new Set() };
    target.unique_events += number(row.unique_events) || 0; target.detail_records += number(row.detail_records) || 0; target.deaths += number(row.deaths) || 0; target.injuries += number(row.injuries) || 0; target.damage_usd += (number(row.property_damage_usd) || 0) + (number(row.crop_damage_usd) || 0); if (row.event_type) target.eventTypes.add(row.event_type); grouped.set(key, target);
  });
  const output = [...grouped.values()].map((row) => ({ year: row.year, state: row.state, state_name: row.state_name, unique_events: row.unique_events, detail_records: row.detail_records, deaths: row.deaths, injuries: row.injuries, damage_usd: fixed(row.damage_usd, 0), event_types: [...row.eventTypes].sort().join(" | ") })).sort((left, right) => Number(left.year) - Number(right.year) || left.state.localeCompare(right.state));
  const columns = ["year", "state", "state_name", "unique_events", "detail_records", "deaths", "injuries", "damage_usd", "event_types"];
  await fs.writeFile(HAZARD_OUTPUT, csvWrite(output, columns));
  console.log(`Natural-disaster history: ${output.length.toLocaleString()} state-year rows.`);
}

async function fetchUsdmYear(year) {
  const startdate = `1/1/${year}`; const enddate = `1/1/${year + 1}`;
  const params = new URLSearchParams({ aoi: "", dx: "1", minimumweeks: "4", startdate, enddate });
  let lastError;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const response = await fetch(`${USDM_ENDPOINT}?${params.toString()}`, { headers: { Accept: "application/json" } });
      if (response.status === 429) { await sleep((attempt + 1) * 4000); continue; }
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      const result = await response.json();
      if (!Array.isArray(result) || result.length === 0) throw new Error("USDM returned no county records.");
      return { year, rows: result };
    } catch (error) { lastError = error; await sleep((attempt + 1) * 1200); }
  }
  throw new Error(`USDM ${year} failed: ${lastError?.message || "unknown error"}`);
}

async function buildDroughtPrevalence() {
  const yearly = [];
  for (let year = 2020; year <= 2025; year += 1) {
    const result = await fetchUsdmYear(year); yearly.push(result);
    console.log(`Drought prevalence: fetched ${year} (${result.rows.length.toLocaleString()} county rows).`);
    if (year < 2025) await sleep(1200);
  }
  const countyUniverse = parseCsv(await fs.readFile(path.join(ROOT, "data/raw/usdm_county_drought_frequency_2020_2025.csv"), "utf8"));
  const output = [];
  yearly.forEach(({ year, rows }) => {
    const resultByFips = new Map(rows.map((row) => [String(row.fips || "").padStart(5, "0"), row]));
    const groups = new Map();
    countyUniverse.forEach((county) => {
      const state = String(county.state || "").trim().toUpperCase(); const fips = String(county.fips || "").padStart(5, "0"); const source = resultByFips.get(fips); const weeks = number(source?.nonConsecutiveWeeks) || 0;
      if (!Object.values(STATE_ABBR).includes(state) || !/^\d{5}$/.test(fips)) return;
      const target = groups.get(state) || { frequencies: [], droughtWeeks: 0, countiesGe25: 0 };
      const totalWeeks = Math.max(1, Math.ceil((Date.UTC(year + 1, 0, 1) - Date.UTC(year, 0, 1)) / (7 * 24 * 60 * 60 * 1000)));
      const frequency = Math.min(100, weeks / totalWeeks * 100); target.frequencies.push(frequency); target.droughtWeeks += weeks; if (frequency >= 25) target.countiesGe25 += 1; groups.set(state, target);
    });
    groups.forEach((group, state) => {
      const frequency = group.frequencies.reduce((sum, value) => sum + value, 0) / group.frequencies.length;
      output.push({ year, state: STATE_ABBR[state] || state, county_count: group.frequencies.length, mean_frequency_pct: fixed(frequency), p90_frequency_pct: fixed(percentile(group.frequencies, .9)), counties_ge_25_pct: fixed(group.countiesGe25 / group.frequencies.length * 100), drought_weeks: group.droughtWeeks, drought_level: "D1", minimum_weeks: 4 });
    });
  });
  output.sort((left, right) => Number(left.year) - Number(right.year) || left.state.localeCompare(right.state));
  const columns = ["year", "state", "county_count", "mean_frequency_pct", "p90_frequency_pct", "counties_ge_25_pct", "drought_weeks", "drought_level", "minimum_weeks"];
  await fs.writeFile(DROUGHT_OUTPUT, csvWrite(output, columns));
  console.log(`Drought prevalence: ${output.length.toLocaleString()} state-year rows.`);
}

async function main() {
  await buildGroundwaterChange();
  await buildHazardHistory();
  if (!SKIP_DROUGHT) await buildDroughtPrevalence();
}

main().catch((error) => { console.error(error.message || error); process.exitCode = 1; });
