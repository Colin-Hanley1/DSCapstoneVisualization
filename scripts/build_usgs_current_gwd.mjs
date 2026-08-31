#!/usr/bin/env node

/**
 * Build a nationwide snapshot of the latest available USGS groundwater depth values.
 *
 * This intentionally creates a map-ready snapshot, not the full historical
 * archive. It reads a local API key, follows the OGC API pagination links,
 * keeps one geolocated depth-to-water value per monitoring site, and writes
 * a CSV that Atlas can load without exposing the key in the browser.
 *
 * Usage:
 *   node scripts/build_usgs_current_gwd.mjs
 */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const keyPath = process.env.USGS_API_KEY_FILE || path.join(root, "key.txt");
const outputPath = path.join(root, "usgs_current_gwd.csv");
const apiUrl = "https://api.waterdata.usgs.gov/ogcapi/v0/collections/latest-daily/items";
const parameterCode = "72019";
const statisticCode = "00003";
const pageSize = 10000;

function csvEscape(value) {
  const text = value == null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function buildInitialUrl() {
  const url = new URL(apiUrl);
  url.search = new URLSearchParams({
    parameter_code: parameterCode,
    statistic_id: statisticCode,
    limit: String(pageSize),
    f: "json"
  });
  return url;
}

async function fetchPage(url, apiKey, attempt = 0) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/geo+json, application/json",
      "X-Api-Key": apiKey
    }
  });
  if (response.ok) return response.json();

  const retryable = response.status === 429 || response.status >= 500;
  if (retryable && attempt < 5) {
    await sleep(750 * (attempt + 1));
    return fetchPage(url, apiKey, attempt + 1);
  }
  const detail = await response.text().catch(() => "");
  throw new Error(`USGS API returned HTTP ${response.status}${detail ? `: ${detail.slice(0, 180)}` : ""}.`);
}

function rowFromFeature(feature, sourceUrl) {
  const properties = feature?.properties || {};
  const coordinates = feature?.geometry?.type === "Point" ? feature.geometry.coordinates : [];
  const longitude = Number(coordinates?.[0]);
  const latitude = Number(coordinates?.[1]);
  const value = Number(properties.value);
  const siteId = String(properties.monitoring_location_id || "").trim();
  if (!siteId || !Number.isFinite(latitude) || !Number.isFinite(longitude) || !Number.isFinite(value)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return {
    site_id: siteId,
    site_name: properties.monitoring_location_name || "",
    state: properties.state_name || properties.state_code || "",
    state_code: properties.state_code || "",
    county: properties.county_name || "",
    latitude,
    longitude,
    gwd_ft: value,
    measurement_time: properties.time || "",
    approval_status: properties.approval_status || "",
    quality_code: properties.qualifier || "",
    agency: properties.agency_name || properties.agency_code || "",
    site_type: properties.site_type || properties.site_type_code || "",
    aquifer_code: properties.aquifer_code || "",
    national_aquifer_code: properties.national_aquifer_code || "",
    well_depth_ft: properties.well_constructed_depth ?? "",
    parameter_code: properties.parameter_code || parameterCode,
    statistic_code: properties.statistic_id || statisticCode,
    source_url: sourceUrl
  };
}

async function run() {
  const apiKey = (await readFile(keyPath, "utf8")).trim();
  if (!apiKey) throw new Error(`No USGS API key found in ${path.relative(root, keyPath)}.`);

  const sourceUrl = buildInitialUrl().toString();
  const latestBySite = new Map();
  let nextUrl = buildInitialUrl();
  let pageCount = 0;
  let rawFeatureCount = 0;

  while (nextUrl) {
    const page = await fetchPage(nextUrl, apiKey);
    const features = Array.isArray(page.features) ? page.features : [];
    rawFeatureCount += features.length;
    for (const feature of features) {
      const row = rowFromFeature(feature, sourceUrl);
      if (!row) continue;
      const previous = latestBySite.get(row.site_id);
      if (!previous || String(row.measurement_time) > String(previous.measurement_time)) latestBySite.set(row.site_id, row);
    }
    pageCount += 1;
    console.log(`[page ${pageCount}] ${features.length.toLocaleString()} records · ${latestBySite.size.toLocaleString()} geolocated sites retained`);
    const nextLink = Array.isArray(page.links) ? page.links.find((link) => link.rel === "next")?.href : "";
    nextUrl = nextLink ? new URL(nextLink) : null;
  }

  const header = [
    "site_id", "site_name", "state", "state_code", "county", "latitude", "longitude", "gwd_ft",
    "measurement_time", "approval_status", "quality_code", "agency", "site_type", "aquifer_code",
    "national_aquifer_code", "well_depth_ft", "parameter_code", "statistic_code", "source_url"
  ];
  const rows = [...latestBySite.values()]
    .sort((left, right) => String(left.state).localeCompare(String(right.state)) || left.site_id.localeCompare(right.site_id))
    .map((row) => header.map((field) => csvEscape(row[field])).join(","));

  await writeFile(outputPath, `${[header.join(","), ...rows].join("\n")}\n`);
  console.log(`Wrote ${rows.length.toLocaleString()} geolocated sites from ${rawFeatureCount.toLocaleString()} API records to ${path.relative(root, outputPath)}`);
}

run().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
