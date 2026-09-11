#!/usr/bin/env node

/**
 * Build a compact watershed-level NWAA screening layer for Atlas.
 *
 * NWAA is published by HUC12. This derivative aggregates the validated
 * 2020 snapshot currently available to HUC8 by taking
 * the mean of depth-equivalent model fields and the sum of sector withdrawals.
 * The HUC8 geometry is a simplified USGS WBD extract so the result is useful
 * at national scale without shipping the much larger HUC12 geometry set.
 *
 * Usage:
 *   node scripts/build_nwaa_huc8_water_screen.mjs
 *   NWAA_REFRESH_GEOMETRY=1 node scripts/build_nwaa_huc8_water_screen.mjs
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const geometryUrl = "https://hydro.nationalmap.gov/arcgis/rest/services/wbd/MapServer/4/query";
const geometryCache = path.join(root, "data", "historical", "raw", "usgs_wbd_huc8_simplified_4326.json");
const outputFile = path.join(root, "data", "historical", "derived", "nwaa_huc8_water_screen_2020.geojson");
const manifestFile = path.join(root, "data", "historical", "derived", "nwaa_huc8_water_screen_2020_manifest.json");
const years = [2020];
const pageSize = 2000;

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  const headers = lines.shift().split(",");
  return lines.map((line) => {
    const values = line.split(",");
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function mean(values) {
  const valid = values.map(number).filter((value) => value !== null);
  return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : null;
}

function sum(values) {
  const valid = values.map(number).filter((value) => value !== null);
  return valid.length ? valid.reduce((total, value) => total + value, 0) : null;
}

function round(value, digits = 4) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return null;
  const factor = 10 ** digits;
  return Math.round(Number(value) * factor) / factor;
}

async function fetchGeometryPage(offset) {
  const params = new URLSearchParams({
    where: "1=1",
    outFields: "HUC8,NAME,STATES",
    returnGeometry: "true",
    outSR: "4326",
    maxAllowableOffset: "0.05",
    geometryPrecision: "2",
    resultRecordCount: String(pageSize),
    resultOffset: String(offset),
    f: "json"
  });
  const response = await fetch(`${geometryUrl}?${params}`);
  if (!response.ok) throw new Error(`USGS WBD geometry request failed (${response.status}).`);
  const payload = await response.json();
  if (!Array.isArray(payload.features)) throw new Error("USGS WBD geometry response did not contain features.");
  return payload;
}

async function loadGeometry() {
  if (process.env.NWAA_REFRESH_GEOMETRY !== "1") {
    try {
      const cached = JSON.parse(await readFile(geometryCache, "utf8"));
      if (Array.isArray(cached.features) && cached.features.length) return cached;
    } catch (error) {
      // Fetch a fresh extract when the cache is absent or invalid.
    }
  }
  const features = [];
  for (let offset = 0; ; offset += pageSize) {
    const page = await fetchGeometryPage(offset);
    features.push(...page.features);
    if (page.features.length < pageSize || !page.exceededTransferLimit) break;
  }
  const payload = { geometryType: "esriGeometryPolygon", spatialReference: { wkid: 4326 }, features };
  await mkdir(path.dirname(geometryCache), { recursive: true });
  await writeFile(geometryCache, JSON.stringify(payload));
  return payload;
}

function esriPolygonToGeoJson(geometry) {
  if (!Array.isArray(geometry?.rings) || !geometry.rings.length) return null;
  return { type: "Polygon", coordinates: geometry.rings.map((ring) => ring.map(([longitude, latitude]) => [Number(longitude), Number(latitude)])) };
}

async function loadTable(file) {
  return parseCsv(await readFile(path.join(root, file), "utf8"));
}

function byHuc12(rows) {
  return new Map(rows.map((row) => [String(row.huc12_id).padStart(12, "0"), row]));
}

function attribute(attributes, name) {
  return attributes?.[name] ?? attributes?.[name.toLowerCase()] ?? attributes?.[name.toUpperCase()] ?? "";
}

function aggregateYear(year, tables, geometryFeatures) {
  const availability = byHuc12(tables.availability);
  const quantity = byHuc12(tables.quantity);
  const irrigation = byHuc12(tables.irrigation);
  const publicSupply = byHuc12(tables.publicSupply);
  const thermoelectric = byHuc12(tables.thermoelectric);
  const grouped = new Map();
  for (const [huc12, row] of availability) {
    const huc8 = huc12.slice(0, 8);
    const group = grouped.get(huc8) || { huc12: [], availability: [], quantity: [], irrigation: [], publicSupply: [], thermoelectric: [] };
    group.huc12.push(huc12);
    group.availability.push(row);
    if (quantity.has(huc12)) group.quantity.push(quantity.get(huc12));
    if (irrigation.has(huc12)) group.irrigation.push(irrigation.get(huc12));
    if (publicSupply.has(huc12)) group.publicSupply.push(publicSupply.get(huc12));
    if (thermoelectric.has(huc12)) group.thermoelectric.push(thermoelectric.get(huc12));
    grouped.set(huc8, group);
  }
  const records = new Map();
  for (const feature of geometryFeatures) {
    const huc8 = String(attribute(feature.attributes, "HUC8") || "").padStart(8, "0");
    const group = grouped.get(huc8);
    if (!group) continue;
    const values = (rows, field) => rows.map((row) => row[field]);
    const irrigationWithdrawal = sum(values(group.irrigation, "irrwdtot_mgd"));
    const publicSupplyWithdrawal = sum(values(group.publicSupply, "pswdtot_mgd"));
    const thermoelectricWithdrawal = sum(values(group.thermoelectric, "tewdftot_mgd"));
    const surfaceWaterWithdrawal = sum([
      ...values(group.irrigation, "irrwdsw_mgd"),
      ...values(group.publicSupply, "pswdsw_mgd"),
      ...values(group.thermoelectric, "tewdfsw_mgd")
    ]);
    const groundwaterWithdrawal = sum([
      ...values(group.irrigation, "irrwdgw_mgd"),
      ...values(group.publicSupply, "pswdgw_mgd"),
      ...values(group.thermoelectric, "tewdfgw_mgd")
    ]);
    records.set(huc8, {
      huc8,
      name: attribute(feature.attributes, "NAME") || huc8,
      states: attribute(feature.attributes, "STATES") || "",
      year,
      huc12_count: group.huc12.length,
      availability_mean_mm_mo: round(mean(values(group.availability, "availab_mm/mo")), 3),
      surface_flow_mean_mm_mo: round(mean(values(group.availability, "strflow_mm/mo")), 3),
      surface_use_index_pct: round((mean(values(group.availability, "sui_frac")) ?? 0) * 100, 2),
      consumptive_use_mean_mm_mo: round(mean(values(group.availability, "consum_mm/mo")), 3),
      recharge_mean_mm_mo: round(mean(values(group.quantity, "recharge_mm/mo")), 3),
      baseflow_mean_mm_mo: round(mean(values(group.quantity, "incbsflow_mm/mo")), 3),
      runoff_mean_mm_mo: round(mean(values(group.quantity, "incrunoff_mm/mo")), 3),
      irrigation_withdrawal_mgd: round(irrigationWithdrawal, 3),
      public_supply_withdrawal_mgd: round(publicSupplyWithdrawal, 3),
      thermoelectric_withdrawal_mgd: round(thermoelectricWithdrawal, 3),
      total_withdrawal_mgd: round(sum([irrigationWithdrawal, publicSupplyWithdrawal, thermoelectricWithdrawal]), 3),
      surface_water_withdrawal_mgd: round(surfaceWaterWithdrawal, 3),
      groundwater_withdrawal_mgd: round(groundwaterWithdrawal, 3),
      aggregation_note: "HUC12 model records summarized to HUC8; depth-equivalent fields are unweighted means and withdrawal fields are sums."
    });
  }
  return records;
}

async function main() {
  const geometry = await loadGeometry();
  const geometryFeatures = geometry.features.filter((feature) => attribute(feature.attributes, "HUC8") && feature.geometry?.rings);
  const outputFeatures = [];
  const yearCoverage = {};
  for (const year of years) {
    const files = {
      availability: `data/raw/nwaa_availability_${year}.csv`,
      quantity: `data/raw/nwaa_water_quantity_${year}.csv`,
      irrigation: `data/raw/nwaa_water_use_${year}.csv`,
      publicSupply: `data/raw/nwaa_public_supply_${year}.csv`,
      thermoelectric: `data/raw/nwaa_thermoelectric_${year}.csv`
    };
    const tables = {};
    for (const [key, file] of Object.entries(files)) tables[key] = await loadTable(file);
    const invalidUseIndex = tables.availability.filter((row) => {
      const value = number(row.sui_frac);
      return value === null || value < 0 || value > 1;
    }).length;
    if (invalidUseIndex) throw new Error(`${files.availability} contains ${invalidUseIndex.toLocaleString()} invalid sui_frac values; refresh the NWAA collector before building the map.`);
    const records = aggregateYear(year, tables, geometryFeatures);
    yearCoverage[year] = { huc8_count: records.size, source_rows: Object.fromEntries(Object.entries(tables).map(([key, rows]) => [key, rows.length])) };
    for (const record of records.values()) {
      const feature = geometryFeatures.find((candidate) => String(attribute(candidate.attributes, "HUC8")).padStart(8, "0") === record.huc8);
      const geoJsonGeometry = esriPolygonToGeoJson(feature.geometry);
      if (!geoJsonGeometry) continue;
      outputFeatures.push({ type: "Feature", id: `${record.huc8}-${year}`, properties: record, geometry: geoJsonGeometry });
    }
  }
  const output = {
    type: "FeatureCollection",
    name: "nwaa_huc8_water_screen_2016_2020",
    metadata: {
      source: "USGS National Water Availability Assessment (NWAA) + USGS Watershed Boundary Dataset HUC8 geometry",
      source_url: "https://water.usgs.gov/nwaa-data/web-services/",
      geometry_url: "https://hydro.nationalmap.gov/arcgis/rest/services/wbd/MapServer/4",
      years,
      geometry_level: "HUC8",
      aggregation: "HUC12 records summarized to HUC8; depth-equivalent model fields are unweighted means and withdrawal fields are sums.",
      limitation: "First display pass uses the validated 2020 snapshot. Older NWAA companion tables require a rate-limit-safe refresh before being added to the time lens."
    },
    features: outputFeatures
  };
  await mkdir(path.dirname(outputFile), { recursive: true });
  await writeFile(outputFile, JSON.stringify(output));
  await writeFile(manifestFile, JSON.stringify({ ...output.metadata, feature_count: outputFeatures.length, year_coverage: yearCoverage, generated_at: new Date().toISOString() }, null, 2) + "\n");
  console.log(`Wrote ${outputFeatures.length.toLocaleString()} HUC8-year features to ${path.relative(root, outputFile)}.`);
  console.log(JSON.stringify(yearCoverage, null, 2));
}

main().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
