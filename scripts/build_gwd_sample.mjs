import fs from "node:fs";
import readline from "node:readline";

const sourcePath = "features_observaed_gwd_CONUS_20012020.csv";
const outputPath = "sample_gwd_2022.csv";
const selectedYear = "2022";
const gridSizeDegrees = 2;
const maxRowsPerCell = 6;

const outputFields = [
  "id", "year", "month", "lat", "long", "gwd", "num", "prep_ft", "tmean", "DEM_ft", "slope", "aspect", "PET_ft",
  "rocktype", "DTB_ft", "drainclass", "hydrogrp", "developed", "barren", "forest", "shrubland", "herbaceous",
  "Pasture_Hay_crop", "wetland", "water_snow_ice", "NESO", "PDO", "longterm_aveg_dtw_ft", "distance_ft", "gw_use_ft_m",
  "sw_use_ft_m", "recharge_ft_m", "MlrAD_irri_ornot", "irri_gw_use_ft_m"
];

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function cleanValue(value) {
  const text = String(value ?? "");
  return text.startsWith('"') && text.endsWith('"') ? text.slice(1, -1).replaceAll('""', '"') : text;
}

function numeric(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

const input = fs.createReadStream(sourcePath);
const lines = readline.createInterface({ input, crlfDelay: Infinity });
const output = fs.createWriteStream(outputPath);
let sourceFields = [];
let sourceIndexes = [];
let selectedRows = 0;
let eligibleRows = 0;
const cellCounts = new Map();
const cellMonths = new Map();

output.write(`${outputFields.join(",")}\n`);

for await (const line of lines) {
  if (!sourceFields.length) {
    sourceFields = line.split(",").map((field, index) => {
      const clean = field.replace(/^"|"$/g, "");
      return index === 0 && !clean ? "id" : clean;
    });
    sourceIndexes = outputFields.map((field) => sourceFields.indexOf(field));
    const missing = outputFields.filter((field) => !sourceFields.includes(field));
    if (missing.length) throw new Error(`Missing source fields: ${missing.join(", ")}`);
    continue;
  }

  const values = line.split(",");
  if (values[1] !== selectedYear) continue;
  const latitude = numeric(values[3]);
  const longitude = numeric(values[4]);
  const gwd = numeric(values[5]);
  if (latitude === null || longitude === null || gwd === null || latitude < 24 || latitude > 50 || longitude < -126 || longitude > -66) continue;
  eligibleRows += 1;

  const cell = `${Math.floor((latitude + 90) / gridSizeDegrees)}:${Math.floor((longitude + 180) / gridSizeDegrees)}`;
  const month = values[2] || "unknown";
  const monthKey = `${cell}:${month}`;
  const count = cellCounts.get(cell) || 0;
  if (count >= maxRowsPerCell || cellMonths.has(monthKey)) continue;

  cellCounts.set(cell, count + 1);
  cellMonths.set(monthKey, true);
  output.write(`${sourceIndexes.map((index) => csvEscape(cleanValue(values[index]))).join(",")}\n`);
  selectedRows += 1;
}

await new Promise((resolve, reject) => { output.end((error) => error ? reject(error) : resolve()); });
console.log(JSON.stringify({ sourcePath, outputPath, selectedYear, eligibleRows, selectedRows, gridSizeDegrees, maxRowsPerCell }));
