const STATE_POINTS = US_STATE_CENTROIDS;

const STATE_NAMES = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming"
};

const LAYER_COLORS = ["#c45b28", "#2f76a5", "#56876a", "#8764a6", "#b78326"];
const FEATURE_PALETTE = ["#c45b28", "#2f76a5", "#56876a", "#8764a6", "#b78326", "#a94c45", "#397a82", "#8b6f47", "#5e6d9c", "#9a5d79"];
const LAYER_ROLES = {
  candidate: { label: "Candidate sites / buildings", color: "#c45b28" },
  infrastructure: { label: "Infrastructure", color: "#2f76a5" },
  constraint: { label: "Constraint / exclusion", color: "#a94c45" },
  context: { label: "Context / reference", color: "#56876a" }
};
const GEOJSON_GEOMETRIES = ["Point", "MultiPoint", "LineString", "MultiLineString", "Polygon", "MultiPolygon", "GeometryCollection"];
const MAX_RENDER_POINTS = 2200;
const POINT_CLUSTER_MAX_ZOOM = 1.55;
const POINT_CLUSTER_CELL_SIZE = 30;
const DENSITY_CELL_SIZE = 12;
const DENSITY_PALETTES = {
  sequential: ["#e6f4e4", "#9dd28f", "#55ad79", "#f2b35d", "#c83e2f"],
  spectral: ["#173f5f", "#20639b", "#3caea3", "#f6d55c", "#ed553b"],
  greenRed: ["#2ca25f", "#a1d76a", "#fee08b", "#f46d43", "#d73027"],
  redGreen: ["#d73027", "#fc8d59", "#fee08b", "#a1d76a", "#1a9850"]
};
const RISK_PALETTES = {
  groundwaterChange: ["#1e6f7a", "#78b5a5", "#f3efe0", "#dc8a68", "#a83d35"],
  droughtPrevalence: ["#edf3ed", "#f1d58f", "#d98b4d", "#a64335"],
  hazardPotential: ["#eef2ed", "#e5c99f", "#ca815e", "#963b35"]
};
const RISK_METRICS = {
  groundwaterChange: { label: "Change from 2021 baseline", shortLabel: "Depth change", scaleLabel: "shallower → deeper", domain: "diverging", valueLabel: "Annual mean depth change" },
  droughtPrevalence: { label: "Share of county-weeks at D1+", shortLabel: "D1+ prevalence", scaleLabel: "lower → higher prevalence", domain: "percent", valueLabel: "Mean D1+ prevalence" },
  hazardPotential: { label: "Reported natural-disaster events", shortLabel: "Reported events", scaleLabel: "fewer → more events", domain: "count", valueLabel: "Reported events" }
};
const POINT_INDEX_CELL_SIZE = 40;
const POINT_CLUSTER_MIN_ROWS = 80;
const MAP_VIEW = { width: 1000, height: 600, minZoom: 1, maxZoom: 8 };
let layerSerial = 1;
let layers = [];
let selectedLayerId = null;
let toastTimer;
let mapRenderTimer;
let mapTransformFrame;
let mapZoom = 1;
let mapPanX = 0;
let mapPanY = 0;
let mapPointer = null;
let mapDragMoved = false;
let mapEmphasis = "selected";
let mapPresentation = "focus";
let aquiferHoverFrame;
let pendingAquiferHover;
let boundaryMode = "states";
let aquiferLayerId = null;
let aquiferLoadPromise = null;
let temporalPlaybackTimer = null;
let temporalPlaybackLayerId = null;

const SAMPLE_STRESS = [
  { state: "WA", value: 34, note: "low pressure" }, { state: "OR", value: 46, note: "coastal basin" }, { state: "CA", value: 81, note: "high pressure" }, { state: "NV", value: 74, note: "dry basin" }, { state: "AZ", value: 92, note: "critical" }, { state: "UT", value: 67, note: "watch" }, { state: "CO", value: 59, note: "mixed" }, { state: "TX", value: 88, note: "high pressure" }, { state: "MN", value: 26, note: "low pressure" }, { state: "WI", value: 31, note: "low pressure" }, { state: "IL", value: 48, note: "stable" }, { state: "FL", value: 63, note: "watch" }, { state: "NY", value: 22, note: "low pressure" }, { state: "PA", value: 37, note: "stable" }, { state: "GA", value: 54, note: "mixed" }, { state: "NC", value: 42, note: "stable" }, { state: "MT", value: 51, note: "mixed" }, { state: "ND", value: 29, note: "low pressure" }, { state: "OK", value: 72, note: "dry basin" }, { state: "NM", value: 86, note: "critical" }
];
const SAMPLE_STATIONS = [
  { latitude: 47.61, longitude: -122.33, value: 8, station: "Seattle" }, { latitude: 37.77, longitude: -122.42, value: 14, station: "San Francisco" }, { latitude: 34.05, longitude: -118.24, value: 19, station: "Los Angeles" }, { latitude: 39.74, longitude: -104.99, value: 12, station: "Denver" }, { latitude: 32.78, longitude: -96.8, value: 22, station: "Dallas" }, { latitude: 41.88, longitude: -87.63, value: 17, station: "Chicago" }, { latitude: 42.36, longitude: -71.06, value: 9, station: "Boston" }, { latitude: 25.76, longitude: -80.19, value: 16, station: "Miami" }, { latitude: 40.71, longitude: -74.01, value: 11, station: "New York" }, { latitude: 38.91, longitude: -77.04, value: 13, station: "Washington" }, { latitude: 35.22, longitude: -80.84, value: 15, station: "Charlotte" }, { latitude: 44.98, longitude: -93.27, value: 7, station: "Minneapolis" }
];

const SAMPLE_WIDE = [
  { site: "Dallas North", latitude: 32.99, longitude: -96.80, year: 2024, demand_mw: 118, water_depth_ft: 34, renewable_pct: 42 },
  { site: "Atlanta West", latitude: 33.76, longitude: -84.55, year: 2024, demand_mw: 96, water_depth_ft: 18, renewable_pct: 31 },
  { site: "Phoenix South", latitude: 33.31, longitude: -112.07, year: 2024, demand_mw: 142, water_depth_ft: 82, renewable_pct: 58 },
  { site: "Columbus East", latitude: 39.98, longitude: -82.82, year: 2024, demand_mw: 74, water_depth_ft: 27, renewable_pct: 36 },
  { site: "Des Moines", latitude: 41.60, longitude: -93.62, year: 2024, demand_mw: 52, water_depth_ft: 22, renewable_pct: 47 },
  { site: "Salt Lake", latitude: 40.72, longitude: -111.89, year: 2024, demand_mw: 68, water_depth_ft: 64, renewable_pct: 51 }
];

const SAMPLE_GEOJSON_POINTS = [
  { name: "Dallas campus", status: "screening", capacity_mw: 120, __featureId: "site-01", __geometry: { type: "Point", coordinates: [-96.80, 32.99] } },
  { name: "Atlanta campus", status: "screening", capacity_mw: 96, __featureId: "site-02", __geometry: { type: "Point", coordinates: [-84.55, 33.76] } },
  { name: "Phoenix campus", status: "reference", capacity_mw: 142, __featureId: "site-03", __geometry: { type: "Point", coordinates: [-112.07, 33.31] } },
  { name: "Columbus campus", status: "reference", capacity_mw: 74, __featureId: "site-04", __geometry: { type: "Point", coordinates: [-82.82, 39.98] } }
];

const SAMPLE_MULTIPOINTS = [
  { name: "North Texas parcels", parcels: 4, __featureId: "cluster-01", __geometry: { type: "MultiPoint", coordinates: [[-97.04, 32.90], [-96.95, 32.84], [-96.82, 32.99], [-96.67, 32.91]] } },
  { name: "Georgia parcels", parcels: 3, __featureId: "cluster-02", __geometry: { type: "MultiPoint", coordinates: [[-84.80, 33.68], [-84.55, 33.76], [-84.24, 33.72]] } }
];

const SAMPLE_BUILDINGS = [
  { name: "Dallas candidate A", area_acres: 42, phase: "concept", __featureId: "bldg-01", __geometry: { type: "Polygon", coordinates: [[[-96.845, 32.985], [-96.785, 32.985], [-96.785, 33.025], [-96.845, 33.025], [-96.845, 32.985]]] } },
  { name: "Atlanta candidate B", area_acres: 31, phase: "concept", __featureId: "bldg-02", __geometry: { type: "Polygon", coordinates: [[[-84.585, 33.735], [-84.525, 33.735], [-84.525, 33.775], [-84.585, 33.775], [-84.585, 33.735]]] } },
  { name: "Phoenix candidate C", area_acres: 56, phase: "reference", __featureId: "bldg-03", __geometry: { type: "Polygon", coordinates: [[[-112.105, 33.285], [-112.035, 33.285], [-112.035, 33.335], [-112.105, 33.335], [-112.105, 33.285]]] } }
];

const SAMPLE_INFRASTRUCTURE = [
  { name: "North Texas transmission corridor", voltage_kv: 345, __featureId: "line-01", __geometry: { type: "LineString", coordinates: [[-97.20, 32.92], [-97.02, 32.89], [-96.80, 32.99], [-96.52, 32.94], [-96.32, 32.82]] } },
  { name: "Georgia utility branches", voltage_kv: 230, __featureId: "line-02", __geometry: { type: "MultiLineString", coordinates: [[[-84.95, 33.62], [-84.72, 33.70], [-84.55, 33.76]], [[-84.55, 33.76], [-84.34, 33.88], [-84.08, 33.94]]] } }
];

const SAMPLE_CONSTRAINTS = [
  { name: "Protected wetlands reference", category: "constraint", area_acres: 860, __featureId: "constraint-01", __geometry: { type: "MultiPolygon", coordinates: [
    [[[-96.91, 32.95], [-96.86, 32.95], [-96.86, 32.99], [-96.91, 32.99], [-96.91, 32.95]]],
    [[[-84.66, 33.70], [-84.60, 33.70], [-84.60, 33.73], [-84.66, 33.73], [-84.66, 33.70]]]
  ] } }
];

const SAMPLE_AQUIFERS = [
  { aquifer_name: "High Plains aquifer", coverage_type: "illustrative regional footprint", __featureId: "aquifer-01", __geometry: { type: "Polygon", coordinates: [[[-103.4, 29.1], [-96.0, 29.1], [-96.0, 42.2], [-103.4, 42.2], [-103.4, 29.1]]] } },
  { aquifer_name: "Central Valley aquifer", coverage_type: "illustrative regional footprint", __featureId: "aquifer-02", __geometry: { type: "Polygon", coordinates: [[[-123.0, 35.0], [-118.0, 35.0], [-118.0, 39.8], [-123.0, 39.8], [-123.0, 35.0]]] } },
  { aquifer_name: "Floridan aquifer system", coverage_type: "illustrative regional footprint", __featureId: "aquifer-03", __geometry: { type: "Polygon", coordinates: [[[-88.4, 29.0], [-79.6, 29.0], [-79.6, 32.7], [-88.4, 32.7], [-88.4, 29.0]]] } },
  { aquifer_name: "Gulf Coast aquifer system", coverage_type: "illustrative regional footprint", __featureId: "aquifer-04", __geometry: { type: "Polygon", coordinates: [[[-98.8, 27.0], [-89.0, 27.0], [-89.0, 31.6], [-98.8, 31.6], [-98.8, 27.0]]] } },
  { aquifer_name: "Mississippi Embayment aquifer", coverage_type: "illustrative regional footprint", __featureId: "aquifer-05", __geometry: { type: "Polygon", coordinates: [[[-92.8, 31.5], [-88.0, 31.5], [-88.0, 37.5], [-92.8, 37.5], [-92.8, 31.5]]] } },
  { aquifer_name: "Columbia Plateau aquifer", coverage_type: "illustrative regional footprint", __featureId: "aquifer-06", __geometry: { type: "Polygon", coordinates: [[[-123.4, 44.0], [-116.0, 44.0], [-116.0, 47.8], [-123.4, 47.8], [-123.4, 44.0]]] } }
];

const SAMPLE_MIXED_GEOMETRY = [
  { name: "Campus reference bundle", note: "point + service route + parcel", __featureId: "bundle-01", __geometry: { type: "GeometryCollection", geometries: [
    { type: "Point", coordinates: [-96.80, 32.99] },
    { type: "LineString", coordinates: [[-96.90, 32.96], [-96.80, 32.99], [-96.68, 32.96]] },
    { type: "Polygon", coordinates: [[[-96.84, 32.975], [-96.77, 32.975], [-96.77, 33.015], [-96.84, 33.015], [-96.84, 32.975]]] }
  ] } }
];

const BUILT_IN_SAMPLES = {
  states: { name: "State / region indicators", data: SAMPLE_STRESS, role: "context", color: "#56876a", notes: "State-level reference values; no spatial interpolation is performed." },
  stations: { name: "CSV point stations", data: SAMPLE_STATIONS, role: "infrastructure", color: "#2f76a5" },
  wide: { name: "Wide point observations", data: SAMPLE_WIDE, role: "context", color: "#8764a6", notes: "Multiple numeric columns are available for selection as the displayed measure." },
  geoPoints: { name: "GeoJSON point sites", data: SAMPLE_GEOJSON_POINTS, role: "candidate", color: "#c45b28" },
  multipoints: { name: "GeoJSON multipoint parcels", data: SAMPLE_MULTIPOINTS, role: "candidate", color: "#b78326", displayMode: "dots" },
  buildings: { name: "GeoJSON building footprints", data: SAMPLE_BUILDINGS, role: "candidate", color: "#c45b28", geometryDisplay: "fill" },
  infrastructure: { name: "GeoJSON utility corridors", data: SAMPLE_INFRASTRUCTURE, role: "infrastructure", color: "#2f76a5", geometryDisplay: "outline" },
  constraints: { name: "GeoJSON protected areas", data: SAMPLE_CONSTRAINTS, role: "constraint", color: "#a94c45", geometryDisplay: "fill" },
  aquifers: { name: "Aquifer coverage · illustrative", data: SAMPLE_AQUIFERS, role: "context", color: "#397a82", geometryDisplay: "fill", featureColorField: "aquifer_name", notes: "Illustrative teaching geometry only; replace with an authoritative aquifer coverage GeoJSON before using this for analysis." },
  mixed: { name: "GeoJSON mixed geometry bundle", data: SAMPLE_MIXED_GEOMETRY, role: "context", color: "#8764a6", geometryDisplay: "outline" }
};

const REAL_DATASETS = {
  gwd2022: {
    file: "sample_gwd_2022.csv",
    name: "Observed groundwater depth · 2022 sample",
    source: "features_observaed_gwd_CONUS_20012020.csv · representative display subset",
    options: {
      role: "context",
      color: "#397a82",
      displayMode: "density",
      densityAggregation: "average",
      densityColorScale: "sequential",
      measureField: "gwd",
      labelField: "id",
      units: "ft",
      markerSize: 3.5,
      opacity: .78,
      notes: "Representative 2022 display subset from the large observed GWD file. It keeps up to six records per 2° grid cell, with one record per month where available, so the GUI has broad spatial and seasonal coverage without loading the multi-gigabyte source. This is for visual exploration only, not modeling or inference."
    }
  },
  gwdHistorical: {
    file: "sample_gwd_historical.csv",
    name: "Observed groundwater depth · 2010 + 2022 snapshots",
    source: "features_observaed_gwd_CONUS_20012020.csv · representative historical display subset",
    options: {
      role: "context",
      color: "#397a82",
      displayMode: "density",
      densityAggregation: "average",
      densityColorScale: "sequential",
      measureField: "gwd",
      labelField: "id",
      timeField: "year",
      units: "ft",
      markerSize: 3.5,
      opacity: .78,
      notes: "Compact time-based display sample combining representative 2010 and 2022 groundwater-depth snapshots. Use the Time lens to switch periods; it is for visual exploration only, not trend inference or modeling."
    }
  },
  gwdChange: {
    file: "data/historical/derived/usgs_groundwater_change_2021_2025.csv",
    name: "Groundwater change · annual mean",
    source: "USGS Water Data API · annual well means and change from 2021 baseline",
    options: {
      role: "context",
      color: "#397a82",
      displayMode: "density",
      densityAggregation: "average",
      densityColorScale: "redGreen",
      riskMetric: "groundwaterChange",
      measureField: "change_from_2021_ft",
      labelField: "site_id",
      timeField: "year",
      defaultTimeValue: "2025",
      units: "ft change in depth",
      markerSize: 3,
      opacity: .78,
      maxRenderFeatures: 3400,
      detailFields: ["groundwater_mean_ft", "change_from_previous_ft", "observation_count", "baseline_year", "baseline_date", "latest_date", "time_series_id"],
      notes: "Annual means for wells with observations in the 2021–2025 pack. The displayed measure is annual mean depth-to-water minus that well's 2021 mean; positive values indicate a deeper measured water level. The monitoring network is uneven, so inspect coverage before drawing local conclusions."
    }
  },
  droughtPrevalence: {
    file: "data/historical/derived/usdm_drought_prevalence_state_year_2020_2025.csv",
    name: "Drought prevalence · annual",
    source: "U.S. Drought Monitor county statistics · annual state aggregation",
    options: {
      role: "context",
      color: "#b75f3c",
      geometryType: "states",
      riskMetric: "droughtPrevalence",
      regionField: "state",
      measureField: "mean_frequency_pct",
      labelField: "state",
      timeField: "year",
      defaultTimeValue: "2025",
      units: "% of county-weeks",
      opacity: .72,
      detailFields: ["county_count", "counties_ge_25_pct", "p90_frequency_pct", "drought_level", "minimum_weeks"],
      notes: "Annual state means of county-level U.S. Drought Monitor D1+ prevalence, using a four-week minimum event rule. Values are a spatial average of county frequencies, not area-weighted land coverage or a water-supply forecast."
    }
  },
  hazardPotential: {
    file: "data/historical/derived/noaa_hazard_state_year_2021_2025.csv",
    name: "Natural-disaster history · annual",
    source: "NOAA Storm Events Database · state/year hazard aggregation",
    options: {
      role: "constraint",
      color: "#a94c45",
      geometryType: "states",
      riskMetric: "hazardPotential",
      regionField: "state",
      measureField: "unique_events",
      labelField: "state",
      timeField: "year",
      defaultTimeValue: "2025",
      units: "reported events",
      opacity: .72,
      detailFields: ["detail_records", "deaths", "injuries", "damage_usd", "event_types"],
      notes: "Annual state aggregation of NOAA Storm Events records from 2021 through 2025. This is historical hazard prevalence, not a probabilistic forecast; pair it with FEMA National Risk Index and local hazard studies for forward-looking potential."
    }
  },
  usgsCurrent: {
    file: "usgs_current_gwd.csv",
    name: "USGS groundwater · nationwide latest available",
    source: "USGS Water Data API · latest daily groundwater values",
    options: {
      role: "context",
      color: "#397a82",
      displayMode: "density",
      densityAggregation: "average",
      densityColorScale: "sequential",
      measureField: "gwd_ft",
      labelField: "site_id",
      units: "ft",
      markerSize: 3,
      opacity: .78,
      notes: "Nationwide map-ready snapshot of the latest available daily USGS groundwater depth-to-water value for each geolocated monitoring site. Parameter 72019 is depth to water in feet below land surface; values are observational and may be provisional or historical where a site has not reported recently. Refresh with scripts/build_usgs_current_gwd.mjs using a local key.txt."
    }
  },
  pnnl: {
    file: "pnnl_atlas_records.csv",
    name: "PNNL existing data center buildings",
    source: "PNNL IM3 Atlas · Energy Factbook snapshot",
    options: {
      role: "context",
      color: "#72548f",
      displayMode: "dots",
      measureField: "sqft",
      labelField: "name",
      units: "sq ft",
      markerSize: 4,
      opacity: .82,
      notes: "Real building-level records from the PNNL IM3 Open Source Data Center Atlas. Coordinates are derived from OpenStreetMap and coverage is incomplete; this is a reference inventory, not a complete census or power-demand model."
    }
  },
  eiaPlants: {
    file: "eia_power_plants_2025.csv",
    name: "EIA electric power plants · 2025 early release",
    source: "U.S. EIA Form 860 · 2025 early release",
    options: {
      role: "infrastructure",
      color: "#b78326",
      displayMode: "dots",
      measureField: "grid_voltage_kv",
      labelField: "plant_name",
      featureColorField: "sector",
      units: "kV",
      markerSize: 3.5,
      opacity: .76,
      notes: "EIA Form 860 plant-level records with coordinates. This is the 2025 early release; EIA notes that it is not fully edited and is inappropriate for aggregation."
    }
  },
  hifldSubstations: {
    file: "hifld_substations.geojson",
    name: "HIFLD high-voltage substations",
    source: "HIFLD · public nationwide ArcGIS service snapshot",
    options: {
      role: "infrastructure",
      color: "#2f76a5",
      displayMode: "dots",
      labelField: "NAME",
      featureColorField: "STATUS",
      markerSize: 3.5,
      opacity: .82,
      maxRenderFeatures: 2200,
      notes: "Public nationwide HIFLD snapshot of high-voltage transmission substations, primarily at or above 69 kV. Coverage is not complete; displayed points are viewport-sampled for browser performance."
    }
  },
  waterServiceAreas: {
    file: "usgs_public_supply_water_service_areas.geojson",
    name: "USGS public-supply water service areas",
    source: "USGS 2017 Public-Supply Water Service Areas · simplified display export",
    options: {
      role: "infrastructure",
      color: "#4c80a8",
      geometryDisplay: "outline",
      labelField: "WSA_NAME",
      markerSize: 3,
      strokeWidth: .45,
      opacity: .58,
      maxRenderFeatures: 5000,
      notes: "USGS aggregated community water-system service areas active between 2010 and 2020. The bundled display export is converted to WGS84 and simplified with a 250 m topology-preserving tolerance; use the official WSA_v1 source for authoritative boundaries or analysis."
    }
  },
  usdmCurrent: {
    file: "data/raw/usdm_current.geojson",
    name: "U.S. Drought Monitor · current",
    source: "NOAA / NDMC / USDA / NASA · current USDM GeoJSON",
    options: {
      role: "context",
      color: "#c58b2a",
      geometryDisplay: "fill",
      labelField: "DM",
      featureColorField: "DM",
      strokeWidth: .8,
      opacity: .34,
      notes: "Current weekly U.S. Drought Monitor categories D0–D4. This is a national drought-context layer; it is not a site-specific groundwater or water-rights determination."
    }
  },
  usdmChange: {
    file: "data/raw/usdm_change.geojson",
    name: "U.S. Drought Monitor · 1-week change",
    source: "NOAA / NDMC / USDA / NASA · weekly-change GeoJSON",
    options: {
      role: "context",
      color: "#a94c45",
      geometryDisplay: "fill",
      labelField: "DN",
      featureColorField: "DN",
      strokeWidth: .8,
      opacity: .3,
      notes: "Current one-week change in U.S. Drought Monitor category. Use alongside the current category layer to distinguish worsening from improving conditions."
    }
  },
  usdmFourWeekChange: {
    file: "data/raw/usdm_4wk_change.geojson",
    name: "U.S. Drought Monitor · 4-week change",
    source: "NOAA / NDMC / USDA / NASA · four-week-change GeoJSON",
    options: {
      role: "context",
      color: "#8764a6",
      geometryDisplay: "fill",
      labelField: "DN",
      featureColorField: "DN",
      strokeWidth: .8,
      opacity: .26,
      notes: "Current four-week change in U.S. Drought Monitor category. This file is a bundled snapshot and should be refreshed from the NCEI directory for a current deployment."
    }
  },
  usdmFrequency: {
    file: "data/raw/usdm_county_drought_frequency_2020_2025.csv",
    name: "USDM drought frequency · 2020–2025",
    source: "U.S. Drought Monitor county statistics API · Census 2025 county centroids",
    options: {
      role: "context",
      color: "#b75f3c",
      displayMode: "density",
      densityAggregation: "average",
      densityColorScale: "sequential",
      latitudeField: "latitude",
      longitudeField: "longitude",
      regionField: "state",
      measureField: "frequency_pct",
      labelField: "county",
      units: "% of weeks",
      markerSize: 3,
      opacity: .76,
      maxRenderFeatures: 3400,
      detailFields: ["drought_weeks", "observation_weeks", "drought_level", "minimum_weeks", "period_start", "period_end", "fips"],
      notes: "Recent historical frequency snapshot at county representative points. Each cell shows the average share of 314 USDM observation weeks from 2020 through 2025 meeting the selected D1 threshold, with a minimum four-week event rule. This is a screening display, not a drought forecast, local water-supply determination, or climate-normal statistic. Use the state focus control to inspect one state at a time."
    }
  },
  usdoMonthly: {
    file: "data/raw/usdo_monthly_current.geojson",
    name: "NOAA Monthly Drought Outlook · current",
    source: "NOAA CPC / NCEI · simplified current monthly outlook GeoJSON",
    options: {
      role: "context",
      color: "#8764a6",
      geometryDisplay: "fill",
      labelField: "Outlook",
      featureColorField: "Outlook",
      featureColorOverrides: { Development: "#b95d3c", Improvement: "#d2a34e", No_Drought: "#d6ddd8", Persistence: "#b27739", Removal: "#5b9c78" },
      measureField: "US_PRCNT",
      units: "% of U.S. area",
      strokeWidth: .9,
      opacity: .42,
      detailFields: ["Fcst_Date", "Target", "AREA"],
      notes: "Categorical NOAA CPC outlook for the upcoming month: persistence, improvement, removal, development, or no drought. This is a forecast tendency, not a numeric probability surface. The bundled polygons are simplified from NOAA's current national GeoJSON for responsive display; refresh with scripts/build_usdo_display_snapshot.mjs before a time-sensitive deployment."
    }
  }
};

const REMOTE_DATASETS = {
  hifldLines: {
    name: "HIFLD transmission lines · viewport",
    source: "HIFLD Open · live national FeatureServer query",
    url: "https://services3.arcgis.com/fwwoCWVtaahwlvxO/arcgis/rest/services/HIFLD_US_Transmission_Lines_with_ICF/FeatureServer/0",
    outFields: "ID,TYPE,STATUS,OWNER,VOLTAGE,VOLT_CLASS,SOURCE,SUB_1,SUB_2",
    maxFeatures: 1200,
    minZoom: 1.35,
    options: { role: "infrastructure", color: "#2f76a5", geometryDisplay: "outline", strokeWidth: 1.2, opacity: .8, labelField: "ID", featureColorField: "VOLT_CLASS", notes: "The national HIFLD service contains 177,944 line features. Atlas requests only the current map viewport after you zoom in, capped at 1,200 returned features for readability." }
  },
  streams: {
    name: "USGS streams and rivers · viewport",
    source: "USGS NHD · generalized national flowline service",
    url: "https://hydro.nationalmap.gov/arcgis/rest/services/nhd/MapServer/4",
    where: "FTYPE IN ('StreamRiver','ArtificialPath') AND ((StreamOrde>=4 AND LENGTHKM>=5) OR (StreamOrde=3 AND LENGTHKM>=10))",
    zoomedWhere: "FTYPE IN ('StreamRiver','ArtificialPath')",
    fallbackFile: "sample_streams_nhdplus.geojson",
    localFirst: true,
    tileColumns: 4,
    tileRows: 2,
    tileMaxZoom: 2.2,
    priorityNames: ["Mississippi River", "Missouri River", "Ohio River", "Arkansas River", "Rio Grande", "Colorado River", "Columbia River", "Snake River", "Tennessee River", "Red River"],
    priorityBounds: {
      "Mississippi River": [-97, 28, -87, 49],
      "Missouri River": [-113, 35, -88, 50],
      "Ohio River": [-92, 35, -78, 42],
      "Arkansas River": [-106, 34, -89, 38],
      "Rio Grande": [-109, 25, -95, 38],
      "Colorado River": [-116, 30, -107, 41],
      "Columbia River": [-125, 42, -116, 50],
      "Snake River": [-120, 40, -108, 48],
      "Tennessee River": [-91, 32, -81, 39],
      "Red River": [-107, 30, -90, 39]
    },
    priorityLimit: 120,
    outFields: "OBJECTID,GNIS_NAME,FTYPE,StreamOrde,TotDASqKM,QA_MA,VA_MA,LENGTHKM,REACHCODE,COMID,RESOLUTION",
    maxFeatures: 5000,
    maxRenderFeatures: 16000,
    nationalMaxRenderFeatures: 10000,
    nationalMaxZoom: 2.2,
    minZoom: 1.35,
    options: {
      role: "context",
      color: "#2f76a5",
      geometryDisplay: "outline",
      strokeWidth: 1.25,
      lineWidthByMeasure: true,
      emphasizeNamedLines: true,
      opacity: .78,
      labelField: "GNIS_NAME",
      featureColorField: "StreamOrde",
      measureField: "QA_MA",
      units: "cfs",
      detailFields: ["StreamOrde", "TotDASqKM", "VA_MA", "LENGTHKM", "RESOLUTION", "COMID"],
      notes: "USGS NHD generalized stream and river flowlines loaded for the visible viewport. The bundled example includes a broad national network of longer order-3 reaches plus order-4-and-higher reaches, with named major-river corridors on top. The live path uses tiled viewport queries and priority requests for major names; the national view renders a readable subset and zoomed views render more. NHD includes both StreamRiver and ArtificialPath features; named major rivers such as the Mississippi are commonly represented by ArtificialPath. QA_MA is the source's modeled mean-annual flow estimate in cubic feet per second (cfs), not a live instantaneous gage reading. StreamOrde is relative network hierarchy, TotDASqKM is cumulative drainage area in square kilometers, VA_MA is estimated velocity in feet per second, and LENGTHKM is source reach length."
    }
  },
  wastewaterTreatment: {
    name: "EPA wastewater treatment works · viewport",
    source: "EPA ECHO CWA/NPDES · POTW facility layer",
    url: "https://echogeo.epa.gov/arcgis/rest/services/ECHO/Facilities/MapServer/2",
    where: "CWP_FACILITY_TYPE_INDICATOR='POTW'",
    outFields: "OBJECTID,CWP_NAME,CWP_STATE,CWP_CITY,CWP_COUNTY,CWP_STATUS,CWP_PERMIT_STATUS_CODE,CWP_PERMIT_STATUS_DESC,CWP_FACILITY_TYPE_INDICATOR,CWP_MAJOR_MINOR_STATUS_FLAG,FAC_LAT,FAC_LONG,FAC_DERIVED_HUC,FAC_DERIVED_WBD,FAC_DERIVED_WBD_NAME,DFR_URL,PERMIT_NAME,PERMIT_COMPONENTS,CWP_TOTAL_DESIGN_FLOW_NMBR,CWP_ACTUAL_AVERAGE_FLOW_NMBR",
    maxFeatures: 7000,
    queryMaxFeatures: 1000,
    tileColumns: 4,
    tileRows: 2,
    tileMaxZoom: 2.2,
    minZoom: 1.35,
    options: {
      role: "infrastructure",
      color: "#b75f3c",
      displayMode: "dots",
      labelField: "CWP_NAME",
      featureColorField: "CWP_MAJOR_MINOR_STATUS_FLAG",
      measureField: "CWP_ACTUAL_AVERAGE_FLOW_NMBR",
      units: "MGD",
      markerSize: 4,
      opacity: .84,
      detailFields: ["CWP_CITY", "CWP_STATE", "CWP_COUNTY", "CWP_PERMIT_STATUS_DESC", "CWP_STATUS", "CWP_TOTAL_DESIGN_FLOW_NMBR", "FAC_DERIVED_WBD_NAME", "PERMIT_NAME", "PERMIT_COMPONENTS", "DFR_URL"],
      notes: "EPA ECHO Clean Water Act / NPDES points filtered to POTWs (publicly owned treatment works). The layer shows reported facility locations, permit status, compliance status, facility size class, and reported flow where available. This is a display/reference layer, not a complete inventory of every treatment component or a treatment-capacity model; confirm current operating status and capacity with the linked EPA facility record."
    }
  },
  wetlands: {
    name: "National Wetlands Inventory · viewport",
    source: "USFWS NWI · public ArcGIS-hosted service query",
    url: "https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/USA_Wetlands/FeatureServer/0",
    outFields: "ATTRIBUTE,WETLAND_TYPE,SYSTEM_NAME,CLASS_NAME",
    maxFeatures: 1000,
    minZoom: 1.55,
    options: { role: "constraint", color: "#398b83", geometryDisplay: "fill", strokeWidth: .55, opacity: .48, labelField: "WETLAND_TYPE", featureColorField: "WETLAND_TYPE", notes: "USFWS National Wetlands Inventory polygons loaded for the visible viewport. NWI is a screening/reference layer; confirm site-specific wetlands with the appropriate jurisdiction." }
  },
  floodZones: {
    name: "FEMA NFHL flood hazard zones · viewport",
    source: "FEMA National Flood Hazard Layer · live service query",
    url: "https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28",
    outFields: "FLD_ZONE,ZONE_SUBTY,STATIC_BFE,DFIRM_ID",
    maxFeatures: 1000,
    minZoom: 1.55,
    options: { role: "constraint", color: "#3c6f9e", geometryDisplay: "fill", strokeWidth: .7, opacity: .42, labelField: "FLD_ZONE", featureColorField: "FLD_ZONE", notes: "FEMA NFHL flood-hazard polygons loaded for the visible viewport. This is current effective regulatory flood-risk reference data; use FEMA and local authorities for site determinations." }
  },
  padus: {
    name: "PAD-US 4.1 protected areas · viewport",
    source: "USGS PAD-US 4.1 · live FeatureServer query",
    url: "https://edits.nationalmap.gov/arcgis/rest/services/PAD-US/PAD_US_4_1/MapServer/0",
    outFields: "Unit_Nm,Mang_Name,Des_Tp,GAP_Sts,Pub_Access",
    maxFeatures: 1000,
    minZoom: 1.35,
    options: { role: "constraint", color: "#805a78", geometryDisplay: "fill", strokeWidth: .65, opacity: .4, labelField: "Unit_Nm", featureColorField: "Mang_Name", notes: "USGS PAD-US 4.1 protected-area polygons loaded for the visible viewport. PAD-US contains overlapping management/designation records; treat this as a screening/reference layer." }
  }
};

const els = {
  mapSvg: document.getElementById("mapSvg"), mapLabels: document.getElementById("mapLabels"), statePaths: document.getElementById("statePaths"), aquiferHitVisuals: document.getElementById("aquiferHitVisuals"), layerVisuals: document.getElementById("layerVisuals"), mapViewport: document.getElementById("mapViewport"), mapGridRect: document.getElementById("mapGridRect"), zoomLabel: document.getElementById("zoomLabel"), boundaryModeSelect: document.getElementById("boundaryModeSelect"), aquiferFocusBar: document.getElementById("aquiferFocusBar"), aquiferFocusType: document.getElementById("aquiferFocusType"), aquiferFocusName: document.getElementById("aquiferFocusName"), aquiferFocusMode: document.getElementById("aquiferFocusMode"), aquiferFocusSummary: document.getElementById("aquiferFocusSummary"), temporalToolbar: document.getElementById("temporalToolbar"), temporalTitle: document.getElementById("temporalTitle"), temporalMeta: document.getElementById("temporalMeta"), temporalValueSelect: document.getElementById("temporalValueSelect"), temporalSlider: document.getElementById("temporalSlider"), temporalPlayButton: document.getElementById("temporalPlayButton"), temporalSummary: document.getElementById("temporalSummary"),
  mapEmpty: document.getElementById("mapEmpty"), mapTooltip: document.getElementById("mapTooltip"), mapLegend: document.getElementById("mapLegend"), mapReadingStrip: document.getElementById("mapReadingStrip"), mapSingleView: document.getElementById("mapSingleView"), mapMultiplesView: document.getElementById("mapMultiplesView"), mapPresentationSelect: document.getElementById("mapPresentationSelect"), layerEmphasisSelect: document.getElementById("layerEmphasisSelect"), layerList: document.getElementById("layerList"), layerCount: document.getElementById("layerCount"),
  mapStatus: document.getElementById("mapStatus"), mapRowSummary: document.getElementById("mapRowSummary"), mapMeasureSummary: document.getElementById("mapMeasureSummary"), fileStatus: document.getElementById("fileStatus"),
  propertyLayerStatus: document.getElementById("propertyLayerStatus"), noSelection: document.getElementById("noSelection"), propertyForm: document.getElementById("propertyForm"), visualRecipe: document.getElementById("visualRecipe"),
  layerNameField: document.getElementById("layerNameField"), geometryTypeField: document.getElementById("geometryTypeField"), displayModeField: document.getElementById("displayModeField"),
  pointFields: document.getElementById("pointFields"), regionFields: document.getElementById("regionFields"), latitudeField: document.getElementById("latitudeField"), longitudeField: document.getElementById("longitudeField"), regionField: document.getElementById("regionField"),
  measureField: document.getElementById("measureField"), densityAggregationField: document.getElementById("densityAggregationField"), densityColorScaleField: document.getElementById("densityColorScaleField"), densityControls: document.getElementById("densityControls"), labelField: document.getElementById("labelField"), timeField: document.getElementById("timeField"), roleField: document.getElementById("roleField"), geometryDisplayField: document.getElementById("geometryDisplayField"), featureColorField: document.getElementById("featureColorField"), stateFilterPanel: document.getElementById("stateFilterPanel"), stateFilterValue: document.getElementById("stateFilterValue"), stateFilterModeField: document.getElementById("stateFilterModeField"), stateFilterSummary: document.getElementById("stateFilterSummary"), stateFilterFieldNote: document.getElementById("stateFilterFieldNote"), aquiferFilterPanel: document.getElementById("aquiferFilterPanel"), filterTypeValue: document.getElementById("filterTypeValue"), filterNameValue: document.getElementById("filterNameValue"), filterModeField: document.getElementById("filterModeField"), filterSummary: document.getElementById("filterSummary"), colorField: document.getElementById("colorField"), markerSizeField: document.getElementById("markerSizeField"), markerSizeOutput: document.getElementById("markerSizeOutput"), lineWidthField: document.getElementById("lineWidthField"), lineWidthOutput: document.getElementById("lineWidthOutput"), showLabelsField: document.getElementById("showLabelsField"), unitsField: document.getElementById("unitsField"), opacityField: document.getElementById("opacityField"), opacityOutput: document.getElementById("opacityOutput"), layerNotesField: document.getElementById("layerNotesField"),
  previewStatus: document.getElementById("previewStatus"), previewFields: document.getElementById("previewFields"), previewHead: document.getElementById("previewHead"), previewBody: document.getElementById("previewBody"),
  pasteLayerName: document.getElementById("pasteLayerName"), pasteInput: document.getElementById("pasteInput"), pasteError: document.getElementById("pasteError"), toast: document.getElementById("toast")
};

function findField(fields, terms) {
  return fields.find((field) => terms.some((term) => field.toLowerCase() === term)) || fields.find((field) => terms.some((term) => field.toLowerCase().includes(term)));
}

function dataFields(row) { return Object.keys(row || {}).filter((field) => !field.startsWith("__")); }

function isGeoJSONGeometry(type) { return GEOJSON_GEOMETRIES.includes(type); }

function numericValue(value, fallback = 0) {
  const number = Number(String(value ?? "").replace(/[$,%\s,]/g, ""));
  return Number.isFinite(number) ? number : fallback;
}

function densityAggregationLabel(layer) {
  const field = layer.measureField ? readableFieldName(layer.measureField) : "measure";
  return ({ count: "Record count", average: `Average ${field}`, sum: `Sum ${field}`, max: `Maximum ${field}` })[layer.densityAggregation] || "Record count";
}

function densityColorScaleLabel(layer) {
  if (layer.riskMetric && RISK_METRICS[layer.riskMetric]) return RISK_METRICS[layer.riskMetric].scaleLabel;
  return ({ sequential: "Green → red", spectral: "Blue → red", greenRed: "Green → red · vivid", redGreen: "Red → green", intensity: "Layer color intensity" })[layer.densityColorScale] || "Green → red";
}

function hexChannels(hex) { return String(hex || "#397a82").replace("#", "").match(/.{2}/g).map((part) => parseInt(part, 16)); }

function mixHexColors(start, end, ratio) {
  const lower = hexChannels(start); const upper = hexChannels(end); const blend = clamp(Number(ratio) || 0, 0, 1);
  return `#${lower.map((channel, index) => Math.round(channel + (upper[index] - channel) * blend).toString(16).padStart(2, "0")).join("")}`;
}

function interpolateDensityColor(ratio, layer) {
  const palette = layer.riskMetric && RISK_PALETTES[layer.riskMetric] ? RISK_PALETTES[layer.riskMetric] : layer.densityColorScale === "intensity" ? [.08, .28, .48, .72, 1].map((stop) => mixHexColors("#ffffff", layer.color || "#397a82", stop)) : DENSITY_PALETTES[layer.densityColorScale] || DENSITY_PALETTES.sequential;
  const scaled = clamp(Number(ratio) || 0, 0, 1) * (palette.length - 1);
  const lowerIndex = Math.floor(scaled); const upperIndex = Math.min(palette.length - 1, lowerIndex + 1); const blend = scaled - lowerIndex;
  const lower = hexChannels(palette[lowerIndex]); const upper = hexChannels(palette[upperIndex]);
  const channels = lower.map((channel, index) => Math.round(channel + (upper[index] - channel) * blend));
  return `#${channels.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

function percentile(values, fraction) {
  if (!values.length) return 0;
  const sorted = [...values].sort((left, right) => left - right); const position = (sorted.length - 1) * fraction; const lower = Math.floor(position); const upper = Math.ceil(position);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

function formatDensityValue(value) {
  const number = Number(value); if (!Number.isFinite(number)) return "—";
  const absolute = Math.abs(number); const digits = absolute >= 100 ? 0 : absolute >= 10 ? 1 : 2;
  return number.toLocaleString(undefined, { maximumFractionDigits: digits });
}

function riskMetric(layer) { return layer?.riskMetric && RISK_METRICS[layer.riskMetric] ? RISK_METRICS[layer.riskMetric] : null; }

function riskPalette(layer) { return RISK_PALETTES[layer?.riskMetric] || [mixHexColors("#ffffff", layer?.color || "#397a82", .12), layer?.color || "#397a82"]; }

function interpolatePaletteColor(ratio, palette) {
  const scaled = clamp(Number(ratio) || 0, 0, 1) * (palette.length - 1);
  const lowerIndex = Math.floor(scaled); const upperIndex = Math.min(palette.length - 1, lowerIndex + 1); const blend = scaled - lowerIndex;
  const lower = hexChannels(palette[lowerIndex]); const upper = hexChannels(palette[upperIndex]);
  return `#${lower.map((channel, index) => Math.round(channel + (upper[index] - channel) * blend).toString(16).padStart(2, "0")).join("")}`;
}

function measureDomain(layer, values) {
  const finiteValues = values.map((value) => Number(value)).filter(Number.isFinite);
  if (!finiteValues.length) return [0, 1];
  const metric = riskMetric(layer);
  if (metric?.domain === "diverging") {
    const scale = Math.max(Math.abs(percentile(finiteValues, .05)), Math.abs(percentile(finiteValues, .95)), .25);
    return [-scale, scale];
  }
  if (metric?.domain === "percent") return [0, 100];
  if (metric?.domain === "count") return [0, Math.max(1, percentile(finiteValues, .95))];
  return [percentile(finiteValues, .05), Math.max(percentile(finiteValues, .05), percentile(finiteValues, .95))];
}

function measureRatio(layer, value, domain = null) {
  const [minimum, maximum] = domain || measureDomain(layer, layer.data.map((row) => numericValue(row[layer.measureField], Number.NaN)));
  return maximum > minimum ? clamp((Number(value) - minimum) / (maximum - minimum), 0, 1) : .5;
}

function formatMeasureValue(layer, value) {
  const formatted = formatDensityValue(value);
  return layer?.units ? `${formatted} ${layer.units}` : formatted;
}

function isNumericField(rows, field) {
  const values = rows.slice(0, 80).map((row) => row[field]).filter((value) => value !== "" && value !== null && value !== undefined);
  return values.length > 0 && values.filter((value) => Number.isFinite(Number(String(value).replace(/[$,%\s,]/g, "")))).length / values.length > .75;
}

function inferMeasureField(rows, fields) {
  const preferred = ["value", "measure", "gwd", "score", "amount", "count", "total", "prep_ft", "tmean", "num"];
  const match = findField(fields, preferred);
  if (match && isNumericField(rows, match)) return match;
  return fields.find((field) => isNumericField(rows, field) && !/^(id|unnamed|year|month|lat|long|lon|lng|latitude|longitude)$/i.test(field)) || fields[0] || "";
}

function inferGeometry(fields, data = []) {
  const sourceGeometry = data.find((row) => row.__geometry)?.__geometry;
  if (sourceGeometry?.type && isGeoJSONGeometry(sourceGeometry.type)) return { type: sourceGeometry.type, latitude: "", longitude: "", region: "" };
  const latitude = findField(fields, ["latitude", "lat", "y"]);
  const longitude = findField(fields, ["longitude", "long", "lon", "lng", "x"]);
  const region = findField(fields, ["state", "state_code", "region", "abbr", "fips"]);
  return latitude && longitude ? { type: "points", latitude, longitude, region } : { type: "states", latitude, longitude, region: region || fields[0] || "" };
}

function inferFeatureColorField(fields) { return findField(fields, ["aquifer_name", "aq_name", "aquifer", "category", "class"]) || ""; }

function inferAquiferFields(fields) { return { type: findField(fields, ["rock_name", "rock_type"]), name: findField(fields, ["aq_name", "aquifer_name", "aquifer"]) }; }

function isAquiferLikeLayer(layer) { const fields = inferAquiferFields(layer.fields || []); return Boolean(fields.type || fields.name); }

function uniqueFieldValues(layer, field, relatedField = "", relatedValue = "") {
  if (!field) return [];
  layer._fieldValueCache ||= new Map();
  const cacheKey = `${field}\u0001${relatedField}\u0001${relatedValue}`;
  if (layer._fieldValueCache.has(cacheKey)) return layer._fieldValueCache.get(cacheKey);
  const values = [...new Set(layer.data.filter((row) => !relatedField || !relatedValue || String(row[relatedField] ?? "").trim() === relatedValue).map((row) => String(row[field] ?? "").trim()).filter(Boolean))].sort();
  layer._fieldValueCache.set(cacheKey, values);
  return values;
}

function stateFilterOptions(layer) {
  if (!layer?.regionField) return [];
  const values = uniqueFieldValues(layer, layer.regionField);
  const options = new Map();
  values.forEach((value) => {
    const state = normalizeState(value);
    const optionValue = state || value;
    options.set(optionValue, { value: optionValue, label: state ? STATE_NAMES[state] : value });
  });
  return [...options.values()].sort((a, b) => a.label.localeCompare(b.label));
}

function temporalBucket(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  const match = text.match(/^(\d{4})(?:[-/](\d{1,2}))?(?:[-/](\d{1,2}))?/);
  if (match) return match[2] ? `${match[1]}-${match[2].padStart(2, "0")}` : match[1];
  const timestamp = Date.parse(text);
  if (Number.isFinite(timestamp)) {
    const date = new Date(timestamp);
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  }
  return text;
}

function temporalSortKey(value) {
  const bucket = temporalBucket(value);
  const match = bucket.match(/^(\d{4})(?:-(\d{2}))?$/);
  return match ? Number(match[1]) * 100 + Number(match[2] || 0) : bucket;
}

function temporalLabel(value) {
  const bucket = temporalBucket(value);
  const month = bucket.match(/^(\d{4})-(\d{2})$/);
  if (month) return new Date(Date.UTC(Number(month[1]), Number(month[2]) - 1, 1)).toLocaleDateString(undefined, { month: "short", year: "numeric", timeZone: "UTC" });
  return bucket;
}

function temporalOptions(layer) {
  if (!layer?.timeField) return [];
  layer._temporalOptionCache ||= new Map();
  if (layer._temporalOptionCache.has(layer.timeField)) return layer._temporalOptionCache.get(layer.timeField);
  const options = [...new Set(layer.data.map((row) => temporalBucket(row[layer.timeField])).filter(Boolean))].sort((left, right) => {
    const leftKey = temporalSortKey(left); const rightKey = temporalSortKey(right);
    return typeof leftKey === "number" && typeof rightKey === "number" ? leftKey - rightKey : String(leftKey).localeCompare(String(rightKey));
  }).map((value) => ({ value, label: temporalLabel(value) }));
  layer._temporalOptionCache.set(layer.timeField, options);
  return options;
}

function timeFilterIsActive(layer) { return Boolean(layer?.timeFilterValue); }

function rowMatchesTemporalFilter(layer, row) {
  return !timeFilterIsActive(layer) || temporalBucket(row[layer.timeField]) === layer.timeFilterValue;
}

function filterIsActive(layer) { return Boolean(layer.filterTypeValue || layer.filterNameValue || layer.stateFilterValue || layer.timeFilterValue); }

function hasVisibleSelectedLayer() { return Boolean(selectedLayerId && layers.some((layer) => layer.id === selectedLayerId && layer.visible)); }

function isFoundationLayer(layer) { return Boolean(layer?.id && layer.id === aquiferLayerId && boundaryMode !== "states"); }

function aquiferFoundationLayer() { return layers.find((layer) => layer.id === aquiferLayerId); }

function aquiferFoundationValues(layer, field, relatedField = "", relatedValue = "") {
  if (!layer || !field) return [];
  return [...new Set(layer.data.filter((row) => row.ROCK_NAME && (!relatedField || !relatedValue || String(row[relatedField] ?? "").trim() === relatedValue)).map((row) => String(row[field] ?? "").trim()).filter(Boolean))].sort((left, right) => left.localeCompare(right));
}

function mapLayerOpacity(layer) {
  const baseOpacity = clamp(Number(layer.opacity) || 0, 0, 1);
  if (mapPresentation === "multiples" || !hasVisibleSelectedLayer() || layer.id === selectedLayerId) return baseOpacity;
  if (mapPresentation === "focus") return Math.max(.055, baseOpacity * .16);
  if (mapEmphasis !== "selected") return baseOpacity;
  return Math.max(.12, baseOpacity * .28);
}

function rowMatchesFilter(layer, row) {
  const typeMatches = !layer.filterTypeValue || String(row[layer.filterTypeField] ?? "").trim() === layer.filterTypeValue;
  const nameMatches = !layer.filterNameValue || String(row[layer.filterNameField] ?? "").trim() === layer.filterNameValue;
  let stateMatches = true;
  if (layer.stateFilterValue) {
    const rowRegion = String(row[layer.regionField] ?? "").trim(); const normalizedRegion = normalizeState(rowRegion);
    stateMatches = normalizedRegion === layer.stateFilterValue || rowRegion === layer.stateFilterValue;
  }
  return typeMatches && nameMatches && stateMatches && rowMatchesTemporalFilter(layer, row);
}

function filterOpacity(layer, row) {
  const layerOpacity = mapLayerOpacity(layer);
  if (!filterIsActive(layer) || rowMatchesFilter(layer, row)) return layerOpacity;
  return layer.filterMode === "highlight" ? Math.max(.05, layerOpacity * .16) : 0;
}

function activeFilterDescription(layer) {
  const filters = [];
  if (layer.filterTypeValue) filters.push(`type: ${layer.filterTypeValue}`);
  if (layer.filterNameValue) filters.push(`name: ${layer.filterNameValue}`);
  if (layer.stateFilterValue) filters.push(`state: ${STATE_NAMES[layer.stateFilterValue] || layer.stateFilterValue}`);
  if (layer.timeFilterValue) filters.push(`period: ${temporalLabel(layer.timeFilterValue)}`);
  return filters.join(" + ");
}

function refreshFeatureColorMap(layer) {
  const values = layer.featureColorField ? [...new Set(layer.data.map((row) => String(row[layer.featureColorField] ?? "").trim()).filter(Boolean))].sort() : [];
  layer.featureColorWarning = values.length > FEATURE_PALETTE.length ? `${values.length} categories; choose a broader field for distinct colors.` : "";
  layer.featureColorMap = values.length > FEATURE_PALETTE.length ? {} : Object.fromEntries(values.map((value, index) => [value, layer.featureColorOverrides?.[value] || FEATURE_PALETTE[index]]));
}

function featureColor(layer, row) { return layer.featureColorField && layer.featureColorMap?.[String(row[layer.featureColorField] ?? "").trim()] || layer.color || "#c45b28"; }

function readableFieldName(field) { return String(field || "").replace(/[_-]+/g, " ").replace(/\b\w/g, (character) => character.toUpperCase()); }

function createLayer(name, data, source = "in-memory") {
  const fields = dataFields(data[0]);
  const geometry = inferGeometry(fields, data);
  const measure = inferMeasureField(data, fields);
  const label = findField(fields, ["name", "label", "station", "site", "id"]);
  const time = findField(fields, ["date", "time", "year", "month"]);
  const displayMode = ["points", "Point", "MultiPoint"].includes(geometry.type) ? "dots" : "bubbles";
  const aquiferFields = inferAquiferFields(fields);
  const layer = { id: `layer-${Date.now()}-${layerSerial++}`, name: name || `Layer ${layerSerial}`, source, data, fields, geometryType: geometry.type, latitudeField: geometry.latitude || "", longitudeField: geometry.longitude || "", regionField: geometry.region || "", measureField: measure, labelField: label || "", timeField: time || "", timeFilterValue: "", displayMode, densityAggregation: "count", densityColorScale: "sequential", role: "context", geometryDisplay: "auto", featureColorField: inferFeatureColorField(fields), featureColorMap: {}, filterTypeField: aquiferFields.type || "", filterNameField: aquiferFields.name || "", filterTypeValue: "", filterNameValue: "", stateFilterValue: "", filterMode: "highlight", color: LAYER_COLORS[(layerSerial - 1) % LAYER_COLORS.length], markerSize: 5, strokeWidth: 1.5, showLabels: false, units: "", opacity: .8, notes: "", visible: true };
  return layer;
}

function normalizeState(value) {
  const clean = String(value ?? "").trim().toUpperCase().replace(/\./g, "");
  if (STATE_POINTS[clean]) return clean;
  return Object.keys(STATE_NAMES).find((code) => STATE_NAMES[code].toUpperCase() === clean) || null;
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}

function projectLonLat(longitude, latitude) {
  const projection = US_MAP_PROJECTION;
  const mercator = (value) => Math.log(Math.tan(Math.PI / 4 + (value * Math.PI) / 360));
  const south = mercator(projection.south); const north = mercator(projection.north);
  const x = projection.left + ((longitude - projection.west) / (projection.east - projection.west)) * projection.width;
  const y = projection.top + ((north - mercator(latitude)) / (north - south)) * projection.height;
  return [x, y];
}

function renderBaseMap() {
  const paths = Object.entries(US_STATE_PATHS).map(([code, path]) => `<path class="state-outline" data-state="${code}" d="${path}"><title>${escapeHTML(STATE_NAMES[code] || code)}</title></path>`).join("");
  els.statePaths.innerHTML = paths;
  const densityClip = document.getElementById("densityLandClip");
  if (densityClip) densityClip.innerHTML = paths.replace(/<title>.*?<\/title>/g, "");
}

function clamp(value, minimum, maximum) { return Math.min(Math.max(value, minimum), maximum); }

function constrainMapPan() {
  mapPanX = clamp(mapPanX, MAP_VIEW.width * (1 - mapZoom), 0);
  mapPanY = clamp(mapPanY, MAP_VIEW.height * (1 - mapZoom), 0);
}

function applyMapTransform() {
  constrainMapPan();
  els.mapViewport.setAttribute("transform", `translate(${mapPanX} ${mapPanY}) scale(${mapZoom})`);
  els.zoomLabel.textContent = `${Math.round(mapZoom * 100)}%`;
}

function scheduleMapTransform() {
  if (mapTransformFrame) return;
  mapTransformFrame = requestAnimationFrame(() => { mapTransformFrame = null; applyMapTransform(); });
}

function scheduleMapRender(delay = 110) {
  clearTimeout(mapRenderTimer);
  mapRenderTimer = setTimeout(() => { mapRenderTimer = null; renderMap(); }, delay);
}

function mapPointFromClient(clientX, clientY) {
  const rect = document.getElementById("mapSvg").getBoundingClientRect();
  return { x: (clientX - rect.left) / rect.width * MAP_VIEW.width, y: (clientY - rect.top) / rect.height * MAP_VIEW.height };
}

function setMapZoom(nextZoom, anchor = { x: MAP_VIEW.width / 2, y: MAP_VIEW.height / 2 }) {
  const zoom = clamp(nextZoom, MAP_VIEW.minZoom, MAP_VIEW.maxZoom);
  const worldX = (anchor.x - mapPanX) / mapZoom;
  const worldY = (anchor.y - mapPanY) / mapZoom;
  mapZoom = zoom;
  mapPanX = anchor.x - worldX * mapZoom;
  mapPanY = anchor.y - worldY * mapZoom;
  constrainMapPan();
  scheduleMapTransform();
  if (els.mapSvg) scheduleMapRender();
}

function resetMapView() { mapZoom = 1; mapPanX = 0; mapPanY = 0; applyMapTransform(); if (els.mapSvg) scheduleMapRender(0); }

function stateBoundaryExtent(state) {
  if (!state) return [];
  const path = els.statePaths.querySelector(`[data-state="${state}"]`);
  let box = null;
  try { box = path?.getBBox?.(); } catch (error) { box = null; }
  if (box && box.width > 0 && box.height > 0) return [{ x: box.x, y: box.y }, { x: box.x + box.width, y: box.y + box.height }];
  const center = STATE_POINTS[state];
  return center ? [{ x: center[0], y: center[1] }] : [];
}

function layerPointsForRows(layer, rows) {
  if (isPointLayer(layer)) {
    const rowSet = rows ? new Set(rows) : null;
    const source = rowSet ? (layer._pointIndex || []).filter(({ row }) => rowSet.has(row)) : (layer._pointIndex || []);
    return source.map(({ point }) => point).filter(Boolean);
  }
  return (rows || layer.data).flatMap((row) => row.__geometry ? geometryCoordinatePairs(row.__geometry).map(projectCoordinate).filter(Boolean) : [getPoint(row, layer)]).filter(Boolean);
}

function zoomToSelectedLayer() {
  const layer = layers.find((entry) => entry.id === selectedLayerId);
  if (!layer) { showToast("Select a layer first."); return; }
  const focusActive = filterIsActive(layer);
  const matchingRows = focusActive ? layer.data.filter((row) => rowMatchesFilter(layer, row)) : null;
  const focusedState = layer.stateFilterValue && normalizeState(layer.stateFilterValue);
  const points = focusActive && focusedState && !layer.filterTypeValue && !layer.filterNameValue ? stateBoundaryExtent(focusedState) : layerPointsForRows(layer, matchingRows);
  const zoomPoints = points.length ? points : (focusedState ? stateBoundaryExtent(focusedState) : []);
  if (!zoomPoints.length) { showToast(focusActive ? "The selected focus has no mappable coordinates." : "The selected layer has no mappable coordinates."); return; }
  const xs = zoomPoints.map((point) => point.x); const ys = zoomPoints.map((point) => point.y);
  const minX = Math.min(...xs); const maxX = Math.max(...xs); const minY = Math.min(...ys); const maxY = Math.max(...ys);
  const spanX = Math.max(maxX - minX, 80); const spanY = Math.max(maxY - minY, 80);
  mapZoom = clamp(Math.min(760 / spanX, 420 / spanY), MAP_VIEW.minZoom, MAP_VIEW.maxZoom);
  mapPanX = MAP_VIEW.width / 2 - ((minX + maxX) / 2) * mapZoom;
  mapPanY = MAP_VIEW.height / 2 - ((minY + maxY) / 2) * mapZoom;
  applyMapTransform();
  renderMap();
  showToast(focusActive ? `Zoomed to ${layer.name} · ${activeFilterDescription(layer)}.` : `Zoomed to ${layer.name}.`);
}

function bindMapNavigation() {
  const svg = document.getElementById("mapSvg");
  svg.addEventListener("wheel", (event) => { event.preventDefault(); setMapZoom(mapZoom * (event.deltaY < 0 ? 1.2 : 1 / 1.2), mapPointFromClient(event.clientX, event.clientY)); }, { passive: false });
  svg.addEventListener("mousemove", handleAquiferMapHover);
  svg.addEventListener("pointerdown", (event) => { if (event.button !== 0) return; mapDragMoved = false; mapPointer = { id: event.pointerId, x: event.clientX, y: event.clientY, panX: mapPanX, panY: mapPanY, moved: false }; svg.setPointerCapture?.(event.pointerId); svg.classList.add("is-panning"); });
  svg.addEventListener("pointermove", (event) => { if (!mapPointer || event.pointerId !== mapPointer.id) return; if (Math.hypot(event.clientX - mapPointer.x, event.clientY - mapPointer.y) > 4) mapPointer.moved = true; mapPanX = mapPointer.panX + event.clientX - mapPointer.x; mapPanY = mapPointer.panY + event.clientY - mapPointer.y; scheduleMapTransform(); });
  const stopPanning = (event) => { if (mapPointer && event.pointerId === mapPointer.id) { mapDragMoved = mapPointer.moved; mapPointer = null; svg.classList.remove("is-panning"); svg.releasePointerCapture?.(event.pointerId); scheduleMapRender(0); } };
  svg.addEventListener("pointerup", stopPanning); svg.addEventListener("pointercancel", stopPanning); svg.addEventListener("pointerleave", (event) => { if (mapPointer && event.buttons === 0) stopPanning(event); });
}

function pointInRing(longitude, latitude, ring) {
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const currentPoint = ring[index]; const previousPoint = ring[previous]; const currentLongitude = Number(currentPoint?.[0]); const currentLatitude = Number(currentPoint?.[1]); const previousLongitude = Number(previousPoint?.[0]); const previousLatitude = Number(previousPoint?.[1]);
    if (![currentLongitude, currentLatitude, previousLongitude, previousLatitude].every(Number.isFinite)) continue;
    const crossesLatitude = (currentLatitude > latitude) !== (previousLatitude > latitude);
    if (crossesLatitude && longitude < ((previousLongitude - currentLongitude) * (latitude - currentLatitude)) / (previousLatitude - currentLatitude) + currentLongitude) inside = !inside;
  }
  return inside;
}

function pointInAquiferGeometry(longitude, latitude, geometry) {
  if (!geometry) return false;
  if (geometry.type === "Polygon") {
    const [outer, ...holes] = geometry.coordinates || [];
    return Boolean(outer && pointInRing(longitude, latitude, outer) && !holes.some((ring) => pointInRing(longitude, latitude, ring)));
  }
  if (geometry.type === "MultiPolygon") return (geometry.coordinates || []).some((polygon) => pointInAquiferGeometry(longitude, latitude, { type: "Polygon", coordinates: polygon }));
  if (geometry.type === "GeometryCollection") return (geometry.geometries || []).some((child) => pointInAquiferGeometry(longitude, latitude, child));
  return false;
}

function aquiferBoundaryRows(layer) {
  const minimumArea = mapZoom < 1.75 ? .02 : mapZoom < 3 ? .005 : .001;
  const maxPartsPerSystem = mapZoom < 1.75 ? 1 : mapZoom < 3 ? 3 : Number.POSITIVE_INFINITY;
  const systems = new Map();
  layer.data.forEach((row, index) => {
    const area = Number(row.Shape_Area);
    if (!row.ROCK_NAME || Number.isFinite(area) && area < minimumArea) return;
    const key = String(row.AQ_CODE || row.AQ_NAME || row.ROCK_NAME || index);
    const entries = systems.get(key) || [];
    entries.push({ row, index, area: Number.isFinite(area) ? area : 0 });
    systems.set(key, entries);
  });
  const representativeRows = [...systems.values()].flatMap((entries) => entries.sort((left, right) => right.area - left.area).slice(0, maxPartsPerSystem));
  if (!filterIsActive(layer)) return representativeRows.sort((left, right) => right.area - left.area);
  const focusedRows = [...systems.values()].flatMap((entries) => entries.filter((entry) => rowMatchesFilter(layer, entry.row)).sort((left, right) => right.area - left.area).slice(0, maxPartsPerSystem));
  if (layer.filterMode === "filter") return focusedRows.sort((left, right) => right.area - left.area);
  const rows = new Map([...representativeRows, ...focusedRows].map((entry) => [entry.index, entry]));
  return [...rows.values()].sort((left, right) => right.area - left.area);
}

function aquiferRowAt(layer, longitude, latitude) {
  if (layer._aquiferBoundsZoom !== mapZoom) { layer._aquiferBounds = aquiferBoundaryRows(layer).map(({ row, index }) => { const coordinates = geometryCoordinatePairs(row.__geometry); const longitudes = coordinates.map((coordinate) => Number(coordinate[0])).filter(Number.isFinite); const latitudes = coordinates.map((coordinate) => Number(coordinate[1])).filter(Number.isFinite); return { row, index, minLongitude: Math.min(...longitudes), maxLongitude: Math.max(...longitudes), minLatitude: Math.min(...latitudes), maxLatitude: Math.max(...latitudes) }; }).filter((entry) => Number.isFinite(entry.minLongitude)); layer._aquiferBoundsZoom = mapZoom; }
  return layer._aquiferBounds.find((entry) => longitude >= entry.minLongitude && longitude <= entry.maxLongitude && latitude >= entry.minLatitude && latitude <= entry.maxLatitude && pointInAquiferGeometry(longitude, latitude, entry.row.__geometry));
}

function updateAquiferMapHover(event) {
  if (mapPointer) return;
  const featureTarget = event.target?.closest?.(".layer-point, .layer-cluster, .layer-density-cell, .layer-feature:not(.aquifer-feature)");
  if (featureTarget) return;
  const aquifer = layers.find((layer) => layer.id === aquiferLayerId && layer.visible);
  if (!aquifer) return;
  const screenPoint = mapPointFromClient(event.clientX, event.clientY); const worldX = (screenPoint.x - mapPanX) / mapZoom; const worldY = (screenPoint.y - mapPanY) / mapZoom; const coordinate = inverseProjectCoordinate(worldX, worldY); const match = aquiferRowAt(aquifer, coordinate.longitude, coordinate.latitude);
  if (!match) { if (els.mapTooltip.dataset.owner === "aquifer") { els.mapTooltip.hidden = true; els.mapTooltip.dataset.owner = ""; } return; }
  const point = geometryAnchor(match.row, aquifer); if (!point) return; const fields = inferAquiferFields(aquifer.fields); const details = []; if (fields.name && match.row[fields.name] !== undefined) details.push(`Aquifer name: ${match.row[fields.name]}`); if (fields.type && match.row[fields.type] !== undefined) details.push(`Aquifer type: ${match.row[fields.type]}`); els.mapTooltip.innerHTML = `<strong>${escapeHTML(featureLabel(match.row, aquifer, match.index))}</strong><span>${escapeHTML(aquifer.name)}</span>${details.map((detail) => `<span>${escapeHTML(detail)}</span>`).join("")}`; els.mapTooltip.hidden = false; els.mapTooltip.dataset.owner = "aquifer";
  const stage = document.getElementById("mapStage").getBoundingClientRect(); const svg = document.getElementById("mapSvg").getBoundingClientRect(); const transformedX = mapPanX + point.x * mapZoom; const transformedY = mapPanY + point.y * mapZoom; const x = transformedX / 1000 * svg.width + (svg.left - stage.left); const y = transformedY / 600 * svg.height + (svg.top - stage.top); els.mapTooltip.style.left = `${Math.min(Math.max(x - 45, 8), stage.width - 200)}px`; els.mapTooltip.style.top = `${Math.min(Math.max(y - 92, 8), stage.height - 90)}px`;
}

function handleAquiferMapHover(event) {
  if (mapPointer) return;
  const featureTarget = event.target?.closest?.(".layer-point, .layer-cluster, .layer-density-cell, .layer-feature:not(.aquifer-feature)");
  if (featureTarget || !layers.some((layer) => layer.id === aquiferLayerId && layer.visible)) return;
  pendingAquiferHover = { clientX: event.clientX, clientY: event.clientY, target: event.target };
  if (aquiferHoverFrame) return;
  aquiferHoverFrame = requestAnimationFrame(() => { aquiferHoverFrame = null; const nextEvent = pendingAquiferHover; pendingAquiferHover = null; if (nextEvent) updateAquiferMapHover(nextEvent); });
}

function parseCSV(text) {
  const rows = []; let row = []; let cell = ""; let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"' && text[index + 1] === '"' && quoted) { cell += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { row.push(cell.trim()); cell = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) { if (char === "\r" && text[index + 1] === "\n") index += 1; row.push(cell.trim()); if (row.some(Boolean)) rows.push(row); row = []; cell = ""; }
    else cell += char;
  }
  if (cell || row.length) { row.push(cell.trim()); if (row.some(Boolean)) rows.push(row); }
  if (rows.length < 2) throw new Error("Add a header row and at least one data row.");
  const headers = rows[0].map((header, index) => header || `field_${index + 1}`);
  return rows.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
}

function parseGeoJSONFeatureCollection(parsed) {
  return parsed.features.map((feature) => ({ ...(feature.properties || {}), __geometry: feature.geometry || null, __featureId: feature.id ?? "" })).filter((row) => row.__geometry || dataFields(row).length);
}

function parseInput(text) {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Paste some data first.");
  if (!trimmed.startsWith("[") && !trimmed.startsWith("{")) return parseCSV(trimmed);
  const parsed = JSON.parse(trimmed);
  if (parsed.type === "FeatureCollection" && Array.isArray(parsed.features)) {
    return parseGeoJSONFeatureCollection(parsed);
  }
  if (parsed.type && isGeoJSONGeometry(parsed.type)) return [{ __geometry: parsed, __featureId: "" }];
  const rows = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.data) ? parsed.data : []);
  if (!rows.length || typeof rows[0] !== "object") throw new Error("JSON should be an array of objects or a GeoJSON FeatureCollection.");
  return rows;
}

function renderStateLabels() {
  els.mapLabels.innerHTML = Object.entries(STATE_POINTS).filter(([code]) => !["AK", "HI"].includes(code)).map(([code, [x, y]]) => `<g transform="translate(${x} ${y})"><circle r="2"></circle><text y="-7">${code}</text></g>`).join("");
}

function projectCoordinate(coordinate) {
  if (!Array.isArray(coordinate) || coordinate.length < 2) return null;
  const longitude = Number(coordinate[0]); const latitude = Number(coordinate[1]);
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude) || latitude <= -90 || latitude >= 90) return null;
  const [x, y] = projectLonLat(longitude, latitude); return { x, y };
}

function coordinatePairs(value, pairs = []) {
  if (!Array.isArray(value)) return pairs;
  if (value.length >= 2 && Number.isFinite(Number(value[0])) && Number.isFinite(Number(value[1]))) { pairs.push([Number(value[0]), Number(value[1])]); return pairs; }
  value.forEach((item) => coordinatePairs(item, pairs)); return pairs;
}

function linePath(coordinates, close = false) {
  const projected = (coordinates || []).map(projectCoordinate).filter(Boolean);
  if (projected.length < 2) return "";
  return `M ${projected.map((point) => `${point.x} ${point.y}`).join(" L ")}${close ? " Z" : ""}`;
}

function pathFromGeometry(geometry) {
  if (!geometry) return "";
  if (geometry.type === "GeometryCollection") return (geometry.geometries || []).map(pathFromGeometry).filter(Boolean).join(" ");
  if (!geometry.coordinates) return "";
  if (geometry.type === "LineString") return linePath(geometry.coordinates);
  if (geometry.type === "MultiLineString") return geometry.coordinates.map((line) => linePath(line)).filter(Boolean).join(" ");
  if (geometry.type === "Polygon") return geometry.coordinates.map((ring) => linePath(ring, true)).filter(Boolean).join(" ");
  if (geometry.type === "MultiPolygon") return geometry.coordinates.flatMap((polygon) => polygon.map((ring) => linePath(ring, true))).filter(Boolean).join(" ");
  return "";
}

function geometryPointCoordinates(geometry) {
  if (geometry?.type === "GeometryCollection") return (geometry.geometries || []).flatMap(geometryPointCoordinates);
  if (!geometry?.coordinates) return [];
  if (geometry.type === "Point") return [geometry.coordinates];
  if (geometry.type === "MultiPoint") return geometry.coordinates;
  return [];
}

function geometryCoordinatePairs(geometry) {
  if (!geometry) return [];
  if (geometry.type === "GeometryCollection") return (geometry.geometries || []).flatMap(geometryCoordinatePairs);
  return coordinatePairs(geometry.coordinates || []);
}

function geometryAnchor(row, layer) {
  const coordinates = row.__geometry ? geometryCoordinatePairs(row.__geometry) : [];
  const point = coordinates.length ? projectCoordinate(coordinates[0]) : getPoint(row, layer);
  return point;
}

function isCoverageLayer(layer) { return layer.data.some((row) => row.__geometry && !["Point", "MultiPoint"].includes(row.__geometry.type)); }

function isPointLayer(layer) { return !isCoverageLayer(layer) && ["points", "Point"].includes(layer.geometryType); }

function refreshLayerCaches(layer) {
  layer._fieldValueCache = new Map();
  layer._temporalOptionCache = new Map();
  refreshFeatureColorMap(layer);
  layer._measureMax = layer.data.reduce((maximum, row) => {
    const value = numericValue(row[layer.measureField]);
    return Number.isFinite(value) ? Math.max(maximum, value) : maximum;
  }, 1);
  layer._pointIndex = [];
  layer._pointBuckets = new Map();
  if (isPointLayer(layer)) {
    layer.data.forEach((row, index) => {
      const point = getPoint(row, layer);
      if (!point) return;
      const entry = { row, index, point };
      layer._pointIndex.push(entry);
      const key = `${Math.floor(point.x / POINT_INDEX_CELL_SIZE)}:${Math.floor(point.y / POINT_INDEX_CELL_SIZE)}`;
      const bucket = layer._pointBuckets.get(key) || [];
      bucket.push(entry);
      layer._pointBuckets.set(key, bucket);
    });
  }
}

function layerMappingSignature(layer) {
  return [layer.geometryType, layer.latitudeField, layer.longitudeField, layer.regionField, layer.measureField, layer.labelField, layer.timeField, layer.featureColorField].join("\u0001");
}

function getVisiblePointRows(layer) {
  const left = clamp((0 - mapPanX) / mapZoom, 0, MAP_VIEW.width);
  const right = clamp((MAP_VIEW.width - mapPanX) / mapZoom, 0, MAP_VIEW.width);
  const top = clamp((0 - mapPanY) / mapZoom, 0, MAP_VIEW.height);
  const bottom = clamp((MAP_VIEW.height - mapPanY) / mapZoom, 0, MAP_VIEW.height);
  const marginCells = Math.ceil(50 / mapZoom / POINT_INDEX_CELL_SIZE) + 1;
  const startX = Math.floor(left / POINT_INDEX_CELL_SIZE) - marginCells;
  const endX = Math.floor(right / POINT_INDEX_CELL_SIZE) + marginCells;
  const startY = Math.floor(top / POINT_INDEX_CELL_SIZE) - marginCells;
  const endY = Math.floor(bottom / POINT_INDEX_CELL_SIZE) + marginCells;
  const candidates = [];
  for (let cellX = startX; cellX <= endX; cellX += 1) {
    for (let cellY = startY; cellY <= endY; cellY += 1) {
      const bucket = layer._pointBuckets?.get(`${cellX}:${cellY}`);
      if (bucket) candidates.push(...bucket);
    }
  }
  return candidates.map(({ row, index, point }) => {
    const screenX = point ? point.x * mapZoom + mapPanX : Number.NaN;
    const screenY = point ? point.y * mapZoom + mapPanY : Number.NaN;
    return { row, index, point, screenX, screenY };
  }).filter(({ row, screenX, screenY }) => {
    if (timeFilterIsActive(layer) && !rowMatchesTemporalFilter(layer, row)) return false;
    if (layer.filterMode === "filter" && !rowMatchesFilter(layer, row)) return false;
    return Number.isFinite(screenX) && Number.isFinite(screenY) && screenX >= -50 && screenX <= MAP_VIEW.width + 50 && screenY >= -50 && screenY <= MAP_VIEW.height + 50;
  });
}

function shouldClusterPoints(layer) { return isPointLayer(layer) && layer.displayMode !== "density" && layer.data.length >= POINT_CLUSTER_MIN_ROWS && mapZoom <= POINT_CLUSTER_MAX_ZOOM; }

function getPointClusters(layer) {
  const clusters = new Map();
  getVisiblePointRows(layer).forEach(({ row, index, point, screenX, screenY }) => {
    const cellX = Math.floor(screenX / POINT_CLUSTER_CELL_SIZE); const cellY = Math.floor(screenY / POINT_CLUSTER_CELL_SIZE); const key = `${cellX}:${cellY}`;
    const cluster = clusters.get(key) || { row, index, count: 0, screenX: 0, screenY: 0 };
    cluster.count += 1; cluster.screenX += screenX; cluster.screenY += screenY; clusters.set(key, cluster);
  });
  return [...clusters.values()].map((cluster) => {
    cluster.screenX /= cluster.count; cluster.screenY /= cluster.count;
    return { ...cluster, x: (cluster.screenX - mapPanX) / mapZoom, y: (cluster.screenY - mapPanY) / mapZoom };
  });
}

function getPointDensityCells(layer) {
  const cells = new Map();
  const hasFocus = filterIsActive(layer);
  const aggregation = layer.densityAggregation || "count";
  const kernelRadius = 42; const sigma = 19; const radiusCells = Math.ceil(kernelRadius / DENSITY_CELL_SIZE);
  getVisiblePointRows(layer).forEach(({ row, screenX, screenY }) => {
    const pointCellX = Math.floor(screenX / DENSITY_CELL_SIZE); const pointCellY = Math.floor(screenY / DENSITY_CELL_SIZE); const matches = !hasFocus || layer.filterMode === "filter" || rowMatchesFilter(layer, row); const focusWeight = matches ? 1 : .08; const measure = numericValue(row[layer.measureField], Number.NaN);
    for (let cellX = pointCellX - radiusCells; cellX <= pointCellX + radiusCells; cellX += 1) {
      for (let cellY = pointCellY - radiusCells; cellY <= pointCellY + radiusCells; cellY += 1) {
        const centerX = (cellX + .5) * DENSITY_CELL_SIZE; const centerY = (cellY + .5) * DENSITY_CELL_SIZE; const distance = Math.hypot(centerX - screenX, centerY - screenY); if (distance > kernelRadius) continue;
        const kernelWeight = Math.exp(-(distance * distance) / (2 * sigma * sigma)); const weightedCount = kernelWeight * focusWeight; const valueWeight = hasFocus && layer.filterMode === "highlight" && !matches ? 0 : kernelWeight; const key = `${cellX}:${cellY}`;
        const cell = cells.get(key) || { cellX, cellY, count: 0, matchCount: 0, weightedCount: 0, matchWeight: 0, measureWeightedSum: 0, measureWeight: 0, measureMax: Number.NEGATIVE_INFINITY, focusedMeasureMax: Number.NEGATIVE_INFINITY };
        cell.weightedCount += weightedCount; if (matches) cell.matchWeight += kernelWeight;
        if (cellX === pointCellX && cellY === pointCellY) { cell.count += 1; if (matches) cell.matchCount += 1; }
        if (Number.isFinite(measure)) { cell.measureWeightedSum += measure * valueWeight; cell.measureWeight += valueWeight; cell.measureMax = Math.max(cell.measureMax, measure); if (matches) cell.focusedMeasureMax = Math.max(cell.focusedMeasureMax, measure); }
        cells.set(key, cell);
      }
    }
  });
  const getAggregateValue = (cell) => {
    if (aggregation === "average") return cell.measureWeight ? cell.measureWeightedSum / cell.measureWeight : Number.NaN;
    if (aggregation === "sum") return cell.measureWeight ? cell.measureWeightedSum : Number.NaN;
    if (aggregation === "max") return Number.isFinite(hasFocus && layer.filterMode === "highlight" ? cell.focusedMeasureMax : cell.measureMax) ? (hasFocus && layer.filterMode === "highlight" ? cell.focusedMeasureMax : cell.measureMax) : Number.NaN;
    return cell.weightedCount;
  };
  const prepared = [...cells.values()].map((cell) => ({ ...cell, value: getAggregateValue(cell) }));
  const values = prepared.map((cell) => cell.value).filter(Number.isFinite);
  const scaleValues = layer.riskMetric ? layer.data.map((row) => numericValue(row[layer.measureField], Number.NaN)) : values;
  const [valueScaleMin, valueScaleMax] = aggregation === "count" ? [Math.min(...values, 0), Math.max(...values, 1)] : measureDomain(layer, scaleValues);
  const scaleMin = valueScaleMin;
  const scaleMax = Math.max(scaleMin, valueScaleMax);
  const cellWorldSize = DENSITY_CELL_SIZE / mapZoom;
  return prepared.map((cell) => {
    const ratio = Number.isFinite(cell.value) ? scaleMax > scaleMin ? clamp((cell.value - scaleMin) / (scaleMax - scaleMin), 0, 1) : .5 : 0;
    const noFocusedRecords = hasFocus && layer.filterMode === "highlight" && cell.matchWeight < .03;
    const opacity = noFocusedRecords ? .025 : aggregation === "count" ? .08 + Math.sqrt(ratio) * .78 : .14 + Math.pow(ratio, .78) * .78;
    return { x: (cell.cellX * DENSITY_CELL_SIZE - mapPanX) / mapZoom, y: (cell.cellY * DENSITY_CELL_SIZE - mapPanY) / mapZoom, width: cellWorldSize, height: cellWorldSize, count: cell.count, matchCount: cell.matchCount, value: cell.value, aggregation, scaleMin, scaleMax, color: interpolateDensityColor(ratio, layer), opacity, smoothed: true };
  }).filter((cell) => Number.isFinite(cell.value));
}

function getRenderableRows(layer) {
  const sourceRows = isPointLayer(layer) ? getVisiblePointRows(layer) : layer.data.map((row, index) => ({ row, index })).filter(({ row }) => {
    if (timeFilterIsActive(layer) && !rowMatchesTemporalFilter(layer, row)) return false;
    return layer.filterMode !== "filter" || rowMatchesFilter(layer, row);
  });
  const total = sourceRows.length;
  const coverageLayer = isCoverageLayer(layer);
  const nationalLimit = coverageLayer && layer.nationalMaxRenderFeatures && mapZoom <= (layer.nationalMaxZoom || 2.2) ? layer.nationalMaxRenderFeatures : null;
  const renderLimit = nationalLimit || layer.maxRenderFeatures || (coverageLayer ? total : MAX_RENDER_POINTS);
  if (total <= renderLimit) return sourceRows;
  const priorityRows = coverageLayer ? sourceRows.filter(({ row }) => Number(row.SEGMENTS) > 0 || row.DISPLAY_ROLE === "named river corridor") : [];
  const prioritySet = new Set(priorityRows);
  const regularRows = priorityRows.length ? sourceRows.filter((entry) => !prioritySet.has(entry)) : sourceRows;
  const regularLimit = Math.max(1, renderLimit - priorityRows.length);
  const rows = [];
  const sampleStep = regularRows.length / regularLimit;
  for (let sampleIndex = 0; sampleIndex < regularLimit; sampleIndex += 1) {
    const row = regularRows[Math.min(regularRows.length - 1, Math.floor(sampleIndex * sampleStep))];
    if (row) rows.push(row);
  }
  const selected = new Set([...priorityRows, ...rows]);
  return sourceRows.filter((entry) => selected.has(entry));
}

function getPoint(row, layer) {
  if (row.__geometry?.type === "Point") {
    const projected = projectCoordinate(row.__geometry.coordinates); if (!projected) return null;
    const [longitude, latitude] = row.__geometry.coordinates; const label = layer.labelField ? row[layer.labelField] : `${Number(latitude).toFixed(3)}°, ${Number(longitude).toFixed(3)}°`;
    return { ...projected, label };
  }
  if (layer.geometryType === "points") {
    const fields = layer.fields || dataFields(row);
    const fallbackLatitudeField = findField(fields, ["latitude", "lat"]);
    const fallbackLongitudeField = findField(fields, ["longitude", "long", "lon", "lng"]);
    const selectedLatitude = numericValue(row[layer.latitudeField], Number.NaN); const selectedLongitude = numericValue(row[layer.longitudeField], Number.NaN);
    const latitudeField = Number.isFinite(selectedLatitude) && selectedLatitude >= -90 && selectedLatitude <= 90 ? layer.latitudeField : fallbackLatitudeField;
    const longitudeField = Number.isFinite(selectedLongitude) && selectedLongitude >= -180 && selectedLongitude <= 180 ? layer.longitudeField : fallbackLongitudeField;
    const lat = numericValue(row[latitudeField], Number.NaN); const lon = numericValue(row[longitudeField], Number.NaN);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    const [x, y] = projectLonLat(lon, lat);
    return { x, y, label: layer.labelField ? row[layer.labelField] : `${lat.toFixed(3)}°, ${lon.toFixed(3)}°` };
  }
  const state = normalizeState(row[layer.regionField]);
  if (!state || !STATE_POINTS[state]) return null;
  return { x: STATE_POINTS[state][0], y: STATE_POINTS[state][1], label: STATE_NAMES[state], state };
}

function featureLabel(row, layer, index) {
  if (layer.labelField && row[layer.labelField] !== undefined && row[layer.labelField] !== "") return row[layer.labelField];
  if (layer.filterNameField && row[layer.filterNameField] !== undefined && row[layer.filterNameField] !== "") return row[layer.filterNameField];
  if (row.__featureId !== undefined && row.__featureId !== "") return `Feature ${row.__featureId}`;
  return `${layer.geometryType} ${index + 1}`;
}

function isStateLayer(layer) { return layer?.geometryType === "states" && !isCoverageLayer(layer); }

function layerDisplayKind(layer) {
  if (isPointLayer(layer) && layer.displayMode === "density") return "density";
  if (isStateLayer(layer)) return "state";
  if (layer.geometryType === "GeometryCollection") return "mixed";
  if (isCoverageLayer(layer)) return ["LineString", "MultiLineString"].includes(layer.geometryType) ? "line" : "area";
  return "point";
}

function layerDrawPriority(layer) {
  return ({ state: 0, density: 1, area: 2, mixed: 3, line: 4, point: 5 })[layerDisplayKind(layer)] ?? 3;
}

function layerGeometryLabel(layer) {
  return ({ points: "CSV points", states: "State / region", Point: "GeoJSON point", MultiPoint: "GeoJSON multipoint", LineString: "Line", MultiLineString: "Multiline", Polygon: "Area", MultiPolygon: "Multi-area", GeometryCollection: "Mixed geometry" })[layer.geometryType] || layer.geometryType;
}

function mappedRecordCount(layer) {
  const rows = layer.data.filter((row) => {
    if (timeFilterIsActive(layer) && !rowMatchesTemporalFilter(layer, row)) return false;
    return layer.filterMode !== "filter" || rowMatchesFilter(layer, row);
  });
  if (isStateLayer(layer)) return new Set(rows.map((row) => normalizeState(row[layer.regionField])).filter(Boolean)).size;
  if (isPointLayer(layer)) {
    const indexedRows = new Set((layer._pointIndex || []).map((entry) => entry.row));
    return rows.filter((row) => indexedRows.has(row)).length;
  }
  if (isCoverageLayer(layer)) return rows.filter((row) => row.__geometry).length;
  return rows.filter((row) => Boolean(getPoint(row, layer))).length;
}

function layerColorDescription(layer) {
  if (riskMetric(layer)) return riskMetric(layer).label;
  return layer.featureColorField ? `by ${readableFieldName(layer.featureColorField)}` : "single color";
}

function layerSizeDescription(layer) {
  if (isStateLayer(layer)) return "value-filled states";
  if (layer.displayMode === "density") return `${densityAggregationLabel(layer)} in each cell`;
  if (layer.displayMode === "bubbles" && layer.measureField) return `scaled by ${readableFieldName(layer.measureField)}`;
  if (isCoverageLayer(layer)) return "not size-encoded";
  return "uniform marker size";
}

function layerSurfaceDescription(layer) {
  if (isStateLayer(layer)) return "filled states";
  if (!isCoverageLayer(layer)) return "point marker";
  return layer.geometryDisplay === "fill" ? "filled area" : "outline only";
}

function layerEncodingChips(layer) {
  const chips = [layerGeometryLabel(layer)];
  if (layer.displayMode === "density" && isPointLayer(layer)) chips.push(`density · ${densityAggregationLabel(layer)}`);
  else if (isStateLayer(layer)) chips.push(`fill · ${riskMetric(layer)?.shortLabel || readableFieldName(layer.measureField)}`);
  else if (layer.displayMode === "bubbles" && layer.measureField) chips.push(`size · ${readableFieldName(layer.measureField)}`);
  else if (isCoverageLayer(layer)) chips.push(layer.geometryDisplay === "fill" ? "filled areas" : "outlines");
  else chips.push("uniform dots");
  chips.push(`color · ${layerColorDescription(layer)}`);
  if (layer.timeField && temporalOptions(layer).length) chips.push(`time · ${readableFieldName(layer.timeField)}`);
  if (layer.clusterMode) chips.push(`${layer.clusteredRecordCount.toLocaleString()} grouped at this zoom`);
  if (filterIsActive(layer)) chips.push(`${layer.filterMode === "filter" ? "filtered to" : "highlighting"} ${activeFilterDescription(layer)}`);
  return chips;
}

function densityGradient(layer) {
  const palette = layer.riskMetric && RISK_PALETTES[layer.riskMetric] ? RISK_PALETTES[layer.riskMetric] : layer.densityColorScale === "intensity" ? [.08, .28, .48, .72, 1].map((stop) => mixHexColors("#ffffff", layer.color || "#397a82", stop)) : DENSITY_PALETTES[layer.densityColorScale] || DENSITY_PALETTES.sequential;
  return `linear-gradient(90deg, ${palette.join(", ")})`;
}

function layerSymbolMarkup(layer, extraClass = "") {
  const kind = layerDisplayKind(layer); const gradient = kind === "density" ? `--symbol-gradient:${densityGradient(layer)};` : "";
  return `<span class="encoding-symbol encoding-symbol-${kind} ${extraClass}" style="--symbol-color:${escapeHTML(layer.color || "#397a82")};${gradient}" aria-hidden="true"></span>`;
}

function renderVisualRecipe(layer) {
  if (!layer || !els.visualRecipe) return;
  const mapped = mappedRecordCount(layer); const chips = layerEncodingChips(layer); const role = LAYER_ROLES[layer.role]?.label || "Context / reference"; const focus = activeFilterDescription(layer);
  els.visualRecipe.innerHTML = `<div class="recipe-symbol">${layerSymbolMarkup(layer)}</div><div class="recipe-copy"><div class="recipe-kicker">Current visual recipe</div><strong>${escapeHTML(layer.name)}</strong><span>${escapeHTML(role)} · ${mapped.toLocaleString()} of ${layer.data.length.toLocaleString()} records mapped</span><div class="recipe-chips">${chips.slice(1).map((chip) => `<span>${escapeHTML(chip)}</span>`).join("")}</div>${focus ? `<div class="recipe-focus">${layer.filterMode === "filter" ? "Showing only" : "Highlighting"} ${escapeHTML(focus)}</div>` : ""}</div>`;
}

function renderMapReadingStrip(layer) {
  if (!els.mapReadingStrip) return;
  if (!layer) {
    els.mapReadingStrip.innerHTML = `<div class="reading-empty"><span class="reading-kicker">HOW TO READ</span><strong>Select a layer to see its visual encodings.</strong><span>Use the layer index below the map for the layers currently in view.</span></div>`;
    return;
  }
  const mapped = mappedRecordCount(layer); const role = LAYER_ROLES[layer.role]?.label || "Context / reference"; const contrastDescription = mapPresentation === "multiples" ? "one layer per pane" : mapPresentation === "focus" ? "focus in foreground" : mapEmphasis === "selected" ? "selected layer emphasized" : "all layers balanced"; const values = [{ label: "shape", value: layerGeometryLabel(layer) }, { label: "color", value: layerColorDescription(layer) }, isCoverageLayer(layer) || isStateLayer(layer) ? { label: "surface", value: layerSurfaceDescription(layer) } : { label: "size", value: layerSizeDescription(layer) }, { label: "opacity", value: `${Math.round(Number(layer.opacity || 0) * 100)}%` }, { label: "contrast", value: contrastDescription }];
  if (layer.timeField && temporalOptions(layer).length) values.push({ label: "time", value: readableFieldName(layer.timeField) });
  if (layer.displayMode === "density" && layer.renderDensityCells?.length) values.push({ label: "range", value: `${formatMeasureValue(layer, layer.renderDensityCells[0].scaleMin)}–${formatMeasureValue(layer, layer.renderDensityCells[0].scaleMax)}` });
  if (isStateLayer(layer) && layer.renderStateRows?.length) values.push({ label: "range", value: `${formatMeasureValue(layer, layer.renderStateDomain[0])}–${formatMeasureValue(layer, layer.renderStateDomain[1])}` });
  const readingKicker = mapPresentation === "focus" ? "FOCUS LAYER <em>context stays quiet</em>" : mapPresentation === "multiples" ? "COMPARISON KEY <em>one pane per layer</em>" : "READING KEY <em>overlay mode</em>";
  els.mapReadingStrip.innerHTML = `<div class="reading-primary"><span class="reading-kicker">${readingKicker}</span><div class="reading-title">${layerSymbolMarkup(layer)}<strong>${escapeHTML(layer.name)}</strong><span>${escapeHTML(role)} · ${mapped.toLocaleString()} mapped</span></div></div><div class="reading-encodings">${values.map((item) => `<span class="reading-encoding"><b>${escapeHTML(item.label)}</b>${escapeHTML(item.value)}</span>`).join("")}${layer.clusterMode ? `<span class="reading-encoding reading-encoding-alert"><b>zoom</b>${layer.clusteredRecordCount.toLocaleString()} grouped</span>` : ""}${filterIsActive(layer) ? `<span class="reading-encoding reading-encoding-focus"><b>focus</b>${escapeHTML(activeFilterDescription(layer))}</span>` : ""}</div>`;
}

function renderPointVisual(layer, row, index, point, value, max, colorOverride = "") {
  const quiet = mapPresentation === "focus" && hasVisibleSelectedLayer() && layer.id !== selectedLayerId; const baseSize = Math.max(2, Number(layer.markerSize) || 5); const valueRatio = Math.max(0, Math.min(1, value / (max || 1))); const radius = quiet ? Math.max(1.4, Math.min(2.4, baseSize * .48)) : layer.displayMode === "dots" ? baseSize : baseSize + valueRatio * baseSize * 3;
  const pointColor = colorOverride || layer.color || "#c45b28"; const label = quiet ? "" : layer.labelField ? row[layer.labelField] : point.label; const marker = quiet ? `<circle class="point-context-core" r="${radius}" fill="${pointColor}"></circle>` : `<circle class="point-halo" r="${radius + 5}" fill="${pointColor}"></circle><circle class="point-ring" r="${radius + 2}" stroke="${pointColor}"></circle><circle class="point-core" r="${radius}" fill="${pointColor}"></circle>`;
  return `<g class="layer-point layer-role-${escapeHTML(layer.role || "context")}${quiet ? " layer-point-context" : ""}" data-layer-id="${layer.id}" data-row-index="${index}" data-map-x="${point.x}" data-map-y="${point.y}" transform="translate(${point.x} ${point.y}) scale(${1 / mapZoom})" opacity="${filterOpacity(layer, row)}">${marker}${layer.showLabels && label ? `<text y="${-(radius + 5)}">${escapeHTML(label)}</text>` : ""}</g>`;
}

function renderClusterVisual(layer, cluster, index) {
  const quiet = mapPresentation === "focus" && hasVisibleSelectedLayer() && layer.id !== selectedLayerId; const count = cluster.count; const radius = quiet ? Math.min(9, 3 + Math.sqrt(count) * .55) : Math.min(18, 5 + Math.sqrt(count) * 1.05); const label = count >= 1000 ? `${(count / 1000).toFixed(count >= 10000 ? 0 : 1)}k` : String(count); const countLabel = !quiet && count >= 4 ? `<text class="cluster-count" y="3">${escapeHTML(label)}</text>` : ""; const color = layer.color || "#2f76a5";
  return `<g class="layer-cluster layer-role-${escapeHTML(layer.role || "context")}${quiet ? " layer-cluster-context" : ""}" data-layer-id="${layer.id}" data-cluster-index="${index}" data-map-x="${cluster.x}" data-map-y="${cluster.y}" transform="translate(${cluster.x} ${cluster.y}) scale(${1 / mapZoom})" opacity="${mapLayerOpacity(layer)}"><circle class="cluster-halo" r="${radius + (quiet ? 2 : 6)}" fill="${color}"></circle><circle class="cluster-core" r="${radius}" fill="${color}"></circle>${countLabel}</g>`;
}

function renderDensityVisual(layer, cell, index) {
  const quiet = mapPresentation === "focus" && hasVisibleSelectedLayer() && layer.id !== selectedLayerId; const color = cell.color || layer.color || "#2f76a5"; const cellOpacity = quiet ? Number(cell.opacity || 0) * .55 : cell.opacity;
  return `<rect class="layer-density-cell${quiet ? " layer-density-context" : ""}" data-layer-id="${layer.id}" data-density-index="${index}" data-map-x="${cell.x + cell.width / 2}" data-map-y="${cell.y + cell.height / 2}" x="${cell.x - .2}" y="${cell.y - .2}" width="${cell.width + .4}" height="${cell.height + .4}" rx=".8" fill="${color}" fill-opacity="${cellOpacity}" opacity="${mapLayerOpacity(layer)}"></rect>`;
}

function renderGeometryVisual(layer, row, index, value, max) {
  const geometry = row.__geometry;
  if (!geometry) return { markup: "", count: 0 };
  if (geometry.type === "GeometryCollection") {
    const parts = (geometry.geometries || []).map((child) => renderGeometryVisual(layer, { ...row, __geometry: child }, index, value, max));
    return { markup: parts.map((part) => part.markup).join(""), count: parts.reduce((total, part) => total + part.count, 0) };
  }
  const pointCoordinates = geometryPointCoordinates(geometry);
  if (pointCoordinates.length) {
    const markers = pointCoordinates.map((coordinate, partIndex) => {
      const point = projectCoordinate(coordinate); if (!point) return "";
      const label = layer.labelField ? row[layer.labelField] : `${geometry.type} ${index + 1}`;
      return renderPointVisual(layer, row, index, { ...point, label: partIndex ? `${label} · ${partIndex + 1}` : label }, value, max, featureColor(layer, row));
    }).filter(Boolean);
    return { markup: markers.join(""), count: markers.length };
  }
  const path = pathFromGeometry(geometry); if (!path) return { markup: "", count: 0 };
  const quiet = mapPresentation === "focus" && hasVisibleSelectedLayer() && layer.id !== selectedLayerId; const shouldFill = !quiet && (layer.geometryDisplay === "fill" || (layer.geometryDisplay === "auto" && ["candidate", "constraint"].includes(layer.role)));
  const aquiferFeature = isAquiferLikeLayer(layer) && ["Polygon", "MultiPolygon"].includes(geometry.type); const geometryColor = quiet ? "#66868a" : featureColor(layer, row); const fill = !quiet && (shouldFill || aquiferFeature) ? geometryColor : "none"; const fillOpacity = quiet ? 0 : shouldFill ? Math.min(.58, Math.max(.12, Number(layer.opacity) * .45)) : aquiferFeature ? .025 : 0; const baseStrokeWidth = Math.max(.35, Number(layer.strokeWidth) || 1.5); const lineMeasure = layer.lineWidthByMeasure ? numericValue(row[layer.measureField], Number.NaN) : Number.NaN; const lineRatio = Number.isFinite(lineMeasure) && layer._measureMax > 0 ? Math.sqrt(clamp(lineMeasure / layer._measureMax, 0, 1)) : 0; const namedLine = layer.emphasizeNamedLines && String(row[layer.labelField] ?? "").trim() && (String(row.FTYPE ?? "").toLowerCase() === "artificialpath" || String(row.FTYPE ?? "").toLowerCase() === "namedrivercorridor" || Number(row.SEGMENTS) > 0); const encodedStrokeWidth = layer.lineWidthByMeasure ? baseStrokeWidth * (.9 + lineRatio * 1.6) : baseStrokeWidth; const strokeWidth = quiet ? Math.max(.45, baseStrokeWidth * .65) : encodedStrokeWidth * (namedLine ? 1.55 : 1); const label = featureLabel(row, layer, index); const units = layer.units ? ` ${layer.units}` : ""; const measure = layer.measureField && row[layer.measureField] !== undefined ? ` · ${row[layer.measureField]}${units}` : "";
  return { markup: `<path class="layer-feature layer-role-${escapeHTML(layer.role || "context")}${aquiferFeature ? " aquifer-feature" : ""}" data-layer-id="${layer.id}" data-row-index="${index}" fill="${fill}" fill-opacity="${fillOpacity}" stroke="${geometryColor}" stroke-width="${strokeWidth}" vector-effect="non-scaling-stroke" pointer-events="${aquiferFeature ? "none" : "all"}" d="${path}" opacity="${filterOpacity(layer, row)}"><title>${escapeHTML(label)}${escapeHTML(measure)}</title></path>`, count: 1 };
}

function renderAquiferHitVisual(layer, row, index) {
  const path = pathFromGeometry(row.__geometry); if (!path) return "";
  return `<path class="aquifer-hit-feature" data-layer-id="${layer.id}" data-row-index="${index}" fill="#fff" fill-opacity="0.001" stroke="none" pointer-events="all" d="${path}"></path>`;
}

function renderAquiferBoundaryVisuals(layer) {
  const rows = aquiferBoundaryRows(layer);
  const hasFocus = filterIsActive(layer);
  const markup = rows.map(({ row, index }) => {
    const path = pathFromGeometry(row.__geometry); if (!path) return "";
    const matches = !hasFocus || rowMatchesFilter(layer, row);
    const state = hasFocus ? (matches ? " is-focused" : " is-muted") : "";
    return `<path class="aquifer-boundary${state}" data-layer-id="${layer.id}" data-row-index="${index}" fill="none" stroke="#819398" stroke-width=".75" vector-effect="non-scaling-stroke" pointer-events="none" d="${path}"></path>`;
  }).join("");
  const aquiferHitMarkup = rows.map(({ row, index }) => renderAquiferHitVisual(layer, row, index)).join("");
  return { markup, mappedCount: 0, clusteredRecordCount: 0, densityRecordCount: 0, aquiferHitMarkup };
}

function getStateRenderRows(layer) {
  const groups = new Map();
  getRenderableRows(layer).forEach(({ row, index }) => {
    const state = normalizeState(row[layer.regionField]);
    if (!state || !US_STATE_PATHS[state]) return;
    const value = numericValue(row[layer.measureField], Number.NaN);
    const entries = groups.get(state) || [];
    entries.push({ row, index, value });
    groups.set(state, entries);
  });
  return [...groups.entries()].map(([state, entries]) => {
    const validEntries = entries.filter((entry) => Number.isFinite(entry.value));
    if (!validEntries.length) return null;
    const sorted = [...validEntries].sort((left, right) => {
      const leftKey = temporalSortKey(left.row[layer.timeField]); const rightKey = temporalSortKey(right.row[layer.timeField]);
      return typeof leftKey === "number" && typeof rightKey === "number" ? leftKey - rightKey : String(leftKey).localeCompare(String(rightKey));
    });
    const representative = sorted[sorted.length - 1];
    const value = timeFilterIsActive(layer) ? representative.value : validEntries.reduce((sum, entry) => sum + entry.value, 0) / validEntries.length;
    const focused = !filterIsActive(layer) || entries.some(({ row }) => rowMatchesFilter(layer, row));
    return { state, row: representative.row, rowIndex: representative.index, value, min: Math.min(...validEntries.map((entry) => entry.value)), max: Math.max(...validEntries.map((entry) => entry.value)), recordCount: validEntries.length, entries: validEntries, period: timeFilterIsActive(layer) ? temporalLabel(layer.timeFilterValue) : `mean across ${new Set(validEntries.map((entry) => temporalBucket(entry.row[layer.timeField]))).size || 1} years`, focused };
  }).filter(Boolean).sort((left, right) => left.state.localeCompare(right.state));
}

function renderStateVisual(layer, summary, index, domain) {
  const path = US_STATE_PATHS[summary.state];
  if (!path) return "";
  const quiet = mapPresentation === "focus" && hasVisibleSelectedLayer() && layer.id !== selectedLayerId;
  const color = interpolatePaletteColor(measureRatio(layer, summary.value, domain), riskPalette(layer));
  const layerOpacity = mapLayerOpacity(layer);
  const focusOpacity = filterIsActive(layer) && layer.filterMode === "highlight" && !summary.focused ? Math.max(.04, layerOpacity * .16) : layerOpacity;
  const fillOpacity = quiet ? Math.max(.035, focusOpacity * .65) : Math.min(.84, Math.max(.12, focusOpacity * .82));
  const stroke = quiet ? "#9aaead" : "#fffefa";
  const value = formatMeasureValue(layer, summary.value);
  return `<path class="layer-state layer-role-${escapeHTML(layer.role || "context")}${summary.focused ? "" : " layer-state-muted"}" data-layer-id="${layer.id}" data-state-index="${index}" data-map-x="${STATE_POINTS[summary.state]?.[0] || 0}" data-map-y="${STATE_POINTS[summary.state]?.[1] || 0}" fill="${color}" fill-opacity="${fillOpacity}" stroke="${stroke}" stroke-width="${quiet ? ".55" : ".9"}" vector-effect="non-scaling-stroke" d="${path}" opacity="${focusOpacity}"><title>${escapeHTML(STATE_NAMES[summary.state] || summary.state)} · ${escapeHTML(value)}</title></path>`;
}

function renderStateLayerVisuals(layer) {
  const summaries = getStateRenderRows(layer);
  const domain = measureDomain(layer, layer.data.map((row) => numericValue(row[layer.measureField], Number.NaN)));
  layer.renderStateRows = summaries;
  layer.renderStateDomain = domain;
  layer.renderDensityCells = [];
  layer.renderClusters = [];
  layer.densityMode = false;
  layer.clusterMode = false;
  layer.clusteredRecordCount = 0;
  return { markup: summaries.map((summary, index) => renderStateVisual(layer, summary, index, domain)).join(""), mappedCount: summaries.length, clusteredRecordCount: 0, densityRecordCount: 0, aquiferHitMarkup: "" };
}

function stateSummaryNumber(summary, field) {
  const values = (summary.entries || []).map((entry) => numericValue(entry.row[field], Number.NaN)).filter(Number.isFinite);
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : Number.NaN;
}

function stateSummaryValue(summary, field) {
  return summary.period.startsWith("mean across") ? stateSummaryNumber(summary, field) : summary.row[field];
}

function riskTooltipDetails(layer, summary) {
  const metric = riskMetric(layer); const row = summary.row; const details = [`Period: ${summary.period}`, `${metric?.valueLabel || readableFieldName(layer.measureField)}: ${formatMeasureValue(layer, summary.value)}`];
  if (layer.riskMetric === "droughtPrevalence") {
    details.push(`90th percentile county frequency: ${formatMeasureValue({ units: "%" }, stateSummaryValue(summary, "p90_frequency_pct"))}`);
    details.push(`Counties at ≥25% frequency: ${formatMeasureValue({ units: "%" }, stateSummaryValue(summary, "counties_ge_25_pct"))}`);
    details.push(`Threshold: ${stateSummaryValue(summary, "drought_level") || "D1+"} · minimum ${formatMeasureValue({ units: "weeks" }, stateSummaryValue(summary, "minimum_weeks"))}`);
  } else if (layer.riskMetric === "hazardPotential") {
    details.push(`Deaths: ${formatDensityValue(stateSummaryValue(summary, "deaths"))} · injuries: ${formatDensityValue(stateSummaryValue(summary, "injuries"))}`);
    const damage = Number(stateSummaryValue(summary, "damage_usd")); details.push(`Reported damage: ${Number.isFinite(damage) ? `$${damage.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—"}`);
    const eventTypes = summary.period.startsWith("mean across") ? [...new Set((summary.entries || []).flatMap((entry) => String(entry.row.event_types || "").split(" | ").filter(Boolean)))].slice(0, 5) : String(row.event_types || "").split(" | ").filter(Boolean).slice(0, 5);
    if (eventTypes.length) details.push(`Event types: ${eventTypes.join(", ")}${eventTypes.length >= 5 ? "…" : ""}`);
  }
  return details;
}

function renderLayerVisuals(layer) {
  let mappedCount = 0; let clusteredRecordCount = 0; let densityRecordCount = 0; let aquiferHitMarkup = ""; let markup = "";
  if (isFoundationLayer(layer)) {
    return renderAquiferBoundaryVisuals(layer);
  } else if (isStateLayer(layer)) {
    return renderStateLayerVisuals(layer);
  } else if (isPointLayer(layer) && layer.displayMode === "density") {
    const cells = getPointDensityCells(layer); layer.renderDensityCells = cells; layer.densityMode = cells.length > 0; layer.renderClusters = []; layer.clusterMode = false; layer.clusteredRecordCount = 0; densityRecordCount = cells.reduce((total, cell) => total + cell.count, 0); mappedCount = cells.length; markup = `<g class="density-surface${mapPresentation === "focus" && hasVisibleSelectedLayer() && layer.id !== selectedLayerId ? " density-surface-context" : ""}" clip-path="url(#densityLandClip)" filter="url(#densityBlur)">${cells.map((cell, index) => renderDensityVisual(layer, cell, index)).join("")}</g>`;
  } else if (shouldClusterPoints(layer)) {
    const clusters = getPointClusters(layer); layer.renderDensityCells = []; layer.densityMode = false; layer.renderClusters = clusters; layer.clusterMode = clusters.length > 0; layer.clusteredRecordCount = clusters.reduce((total, cluster) => total + cluster.count, 0); clusteredRecordCount = layer.clusteredRecordCount; mappedCount = clusters.length; markup = clusters.map((cluster, index) => renderClusterVisual(layer, cluster, index)).join("");
  } else {
    layer.renderDensityCells = []; layer.densityMode = false; layer.renderClusters = []; layer.clusterMode = false; layer.clusteredRecordCount = 0;
    const renderRows = getRenderableRows(layer); const max = layer._measureMax || 1;
    markup = renderRows.map(({ row, index, point: indexedPoint }) => {
      if (!isPointLayer(layer) && layer.filterMode === "filter" && !rowMatchesFilter(layer, row)) return "";
      if (row.__geometry) { const visual = renderGeometryVisual(layer, row, index, numericValue(row[layer.measureField]), max); if (layer.id === aquiferLayerId) aquiferHitMarkup += renderAquiferHitVisual(layer, row, index); mappedCount += visual.count; return visual.markup; }
      const point = indexedPoint || getPoint(row, layer); if (!point) return ""; mappedCount += 1; return renderPointVisual(layer, row, index, point, numericValue(row[layer.measureField]), max, featureColor(layer, row));
    }).join("");
  }
  return { markup, mappedCount, clusteredRecordCount, densityRecordCount, aquiferHitMarkup };
}

function mapViewBox() {
  return `${(-mapPanX / mapZoom).toFixed(3)} ${(-mapPanY / mapZoom).toFixed(3)} ${(MAP_VIEW.width / mapZoom).toFixed(3)} ${(MAP_VIEW.height / mapZoom).toFixed(3)}`;
}

function miniMapMarkup(layer, markup) {
  const cleanId = layer.id.replace(/[^a-z0-9_-]/gi, ""); const gridId = `mini-grid-${cleanId}`; const clipId = `mini-clip-${cleanId}`; const blurId = `mini-blur-${cleanId}`; const shadowId = `mini-shadow-${cleanId}`; const showGrid = document.getElementById("baseMapSelect")?.value === "grid"; const showLabels = document.getElementById("labelModeSelect")?.value !== "none"; const role = LAYER_ROLES[layer.role] || LAYER_ROLES.context; const mapped = mappedRecordCount(layer); const stateMarkup = Object.entries(US_STATE_PATHS).map(([code, path]) => `<path class="state-outline" data-state="${code}" d="${path}"></path>`).join(""); const labelMarkup = showLabels ? Object.entries(STATE_POINTS).filter(([code]) => !["AK", "HI"].includes(code)).map(([code, [x, y]]) => `<g transform="translate(${x} ${y})"><circle r="2"></circle><text y="-7">${code}</text></g>`).join("") : ""; const miniMarkup = markup.replaceAll("url(#densityLandClip)", `url(#${clipId})`).replaceAll("url(#densityBlur)", `url(#${blurId})`).replaceAll("url(#pointShadow)", `url(#${shadowId})`);
  return `<article class="mini-map-card ${layer.id === selectedLayerId ? "is-current" : ""}" data-layer-id="${layer.id}" role="button" tabindex="0" aria-label="Select ${escapeHTML(layer.name)}"><div class="mini-map-card-header"><span class="mini-map-card-title"><i style="background:${role.color}"></i><strong>${escapeHTML(layer.name)}</strong></span><span class="mini-map-card-count">${mapped.toLocaleString()} mapped</span></div><div class="mini-map-card-meta"><span>${escapeHTML(layerGeometryLabel(layer))}</span><span>${escapeHTML(layer.displayMode === "density" ? densityAggregationLabel(layer) : layerSurfaceDescription(layer))}</span><span>${escapeHTML(layer.featureColorField ? `color by ${readableFieldName(layer.featureColorField)}` : "single color")}</span></div><div class="mini-map-canvas"><svg class="mini-map-svg" viewBox="${mapViewBox()}" role="img" aria-label="${escapeHTML(layer.name)} spatial view"><title>${escapeHTML(layer.name)}</title><desc>One-layer spatial view. Select the layer to inspect its properties.</desc><defs><pattern id="${gridId}" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M 50 0 L 0 0 0 50" fill="none" stroke="#52747b" stroke-width="1" opacity=".1"></path></pattern><filter id="${shadowId}" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#1f2e3c" flood-opacity=".25"></feDropShadow></filter><filter id="${blurId}" x="-15%" y="-15%" width="130%" height="130%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="4.2"></feGaussianBlur></filter><clipPath id="${clipId}">${stateMarkup}</clipPath></defs><rect class="mini-map-grid" x="0" y="0" width="1000" height="600" fill="${showGrid ? `url(#${gridId})` : "transparent"}"></rect><g>${stateMarkup}<g class="map-labels" aria-hidden="true">${labelMarkup}</g>${miniMarkup}</g></svg></div></article>`;
}

function renderMultiples(visible, renderedById) {
  if (!els.mapMultiplesView || !els.mapSingleView) return;
  const multiples = mapPresentation === "multiples"; els.mapSingleView.hidden = multiples; els.mapMultiplesView.hidden = !multiples; els.layerEmphasisSelect.disabled = multiples || mapPresentation !== "overlay"; els.layerEmphasisSelect.closest("label")?.toggleAttribute("hidden", mapPresentation !== "overlay");
  if (!multiples) { els.mapMultiplesView.innerHTML = ""; return; }
  els.mapMultiplesView.innerHTML = visible.length ? visible.map((layer) => miniMapMarkup(layer, renderedById.get(layer.id)?.markup || "")).join("") : "";
  els.mapMultiplesView.querySelectorAll(".mini-map-card").forEach((card) => {
    const selectLayer = () => { selectedLayerId = card.dataset.layerId; renderAll(); };
    card.addEventListener("click", selectLayer);
    card.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selectLayer(); } });
  });
}

function metricDescriptionMarkup(layer) {
  if (layer.riskMetric === "groundwaterChange") return `<span class="legend-risk-note"><b>Read it:</b> negative = shallower than 2021; positive = deeper.</span>`;
  if (layer.riskMetric === "droughtPrevalence") return `<span class="legend-risk-note"><b>Read it:</b> share of county-weeks at D1+ (moderate drought or worse).</span>`;
  if (layer.riskMetric === "hazardPotential") return `<span class="legend-risk-note"><b>Read it:</b> historical NOAA event count, not a probability forecast.</span>`;
  return "";
}

function riskScaleMarkup(layer) {
  const metric = riskMetric(layer);
  if (!metric && !isStateLayer(layer)) return "";
  const domain = layer.renderStateDomain || measureDomain(layer, layer.data.map((row) => numericValue(row[layer.measureField], Number.NaN)));
  const selectedPeriod = timeFilterIsActive(layer) ? temporalLabel(layer.timeFilterValue) : layer.timeField ? "mean across available years" : "all records";
  const capNote = metric?.domain === "count" ? " · color capped at 95th percentile" : metric?.domain === "diverging" ? " · symmetric around zero" : "";
  const palette = metric ? riskPalette(layer) : [mixHexColors("#ffffff", layer.color || "#397a82", .12), layer.color || "#397a82"];
  return `<div class="legend-scale risk-scale"><div class="legend-scale-heading"><span>${escapeHTML(metric?.shortLabel || readableFieldName(layer.measureField))}</span><span>${escapeHTML(metric?.scaleLabel || "lower → higher")}, ${escapeHTML(selectedPeriod)}${escapeHTML(capNote)}</span></div><div class="legend-gradient" style="background:linear-gradient(90deg, ${palette.join(", ")})"></div><div class="legend-scale-values"><span>${escapeHTML(formatMeasureValue(layer, domain[0]))}</span><span>${escapeHTML(formatMeasureValue(layer, domain[1]))}</span></div></div>`;
}

function renderLegend() {
  const visible = layers.filter((layer) => layer.visible && !isFoundationLayer(layer));
  const groups = ["candidate", "infrastructure", "constraint", "context"];
  const groupMarkup = groups.map((roleKey) => {
    const groupLayers = visible.filter((layer) => layer.role === roleKey);
    if (!groupLayers.length) return "";
    const role = LAYER_ROLES[roleKey] || { label: "Layer", color: "#56876a" };
    const rows = groupLayers.map((layer) => {
      const selected = layer.id === selectedLayerId; const mapped = mappedRecordCount(layer); const entries = Object.entries(layer.featureColorMap || {}); const focus = activeFilterDescription(layer); const colorDescription = layer.featureColorField ? `color · ${readableFieldName(layer.featureColorField)}` : "single color";
      const densityScale = selected && layer.displayMode === "density" && layer.renderDensityCells?.length ? `<div class="legend-scale"><div class="legend-scale-heading"><span>${escapeHTML(densityAggregationLabel(layer))}</span><span>${escapeHTML(densityColorScaleLabel(layer))}</span></div><div class="legend-gradient" style="background:${densityGradient(layer)}"></div><div class="legend-scale-values"><span>${escapeHTML(formatMeasureValue(layer, layer.renderDensityCells[0].scaleMin))}</span><span>${escapeHTML(formatMeasureValue(layer, layer.renderDensityCells[0].scaleMax))}</span></div></div>` : "";
      const stateScale = selected && isStateLayer(layer) && layer.renderStateRows?.length ? riskScaleMarkup(layer) : "";
      const categoryMarkup = selected && entries.length ? `<div class="legend-categories">${entries.slice(0, 8).map(([value, color]) => `<span class="legend-category" title="${escapeHTML(value)}"><span class="legend-swatch" style="background:${color}"></span>${escapeHTML(value)}</span>`).join("")}</div>${entries.length > 8 ? `<span class="legend-more">+${entries.length - 8} additional categories</span>` : ""}` : "";
      const warning = selected && layer.featureColorWarning ? `<span class="legend-more">${escapeHTML(layer.featureColorWarning)}</span>` : "";
      const detail = selected ? `<div class="legend-layer-detail"><span>${escapeHTML(layerGeometryLabel(layer))} · ${escapeHTML(isCoverageLayer(layer) || isStateLayer(layer) ? layerSurfaceDescription(layer) : layerSizeDescription(layer))}</span><span>${escapeHTML(colorDescription)}</span>${layer.clusterMode ? `<span>${layer.clusteredRecordCount.toLocaleString()} grouped at this zoom</span>` : ""}${focus ? `<span>${layer.filterMode === "filter" ? "Showing only" : "Highlighting"} ${escapeHTML(focus)}</span>` : ""}</div>${densityScale}${stateScale}${metricDescriptionMarkup(layer)}${categoryMarkup}${warning}` : `<span class="legend-layer-compact-meta">${escapeHTML(layerGeometryLabel(layer))} · ${escapeHTML(colorDescription)}</span>`;
      return `<div class="legend-layer ${selected ? "is-current" : ""}" data-layer-id="${layer.id}" role="button" tabindex="0" aria-label="Select ${escapeHTML(layer.name)}"><div class="legend-layer-row">${layerSymbolMarkup(layer, "legend-symbol")}<span class="legend-layer-name"><b>${escapeHTML(layer.name)}</b><small>${mapped.toLocaleString()} / ${layer.data.length.toLocaleString()} mapped</small></span><span class="legend-layer-mode">${selected ? "selected" : ""}</span></div>${detail}</div>`;
    }).join("");
    return `<section class="legend-group"><div class="legend-group-heading"><span><i style="background:${role.color}"></i>${escapeHTML(role.label)}</span><small>${groupLayers.length} layer${groupLayers.length === 1 ? "" : "s"}</small></div><div class="legend-group-list">${rows}</div></section>`;
  }).join("");
  const groupedNote = visible.length > 1 ? "Click a layer row to make its full visual recipe the active reading key." : "The selected layer’s full visual recipe appears above the map.";
  els.mapLegend.innerHTML = visible.length ? `<div class="legend-header"><strong>Layer index</strong><span>${visible.length} visible · grouped by role</span></div><div class="legend-guide"><b>Progressive key</b><span>${groupedNote} Color identifies layers or categories; size, fill, and density show the selected measure.</span></div><div class="legend-groups">${groupMarkup}</div>` : "<div class=\"legend-header\"><strong>Layer index</strong><span>0 visible</span></div><small>Add or show a layer to build the map.</small>";
  els.mapLegend.querySelectorAll(".legend-layer").forEach((item) => {
    const selectLayer = () => { selectedLayerId = item.dataset.layerId; renderAll(); };
    item.addEventListener("click", selectLayer);
    item.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selectLayer(); } });
  });
}

function renderMap() {
  clearTimeout(mapRenderTimer); mapRenderTimer = null;
  renderAquiferFoundationControls();
  if (els.mapPresentationSelect && els.mapPresentationSelect.value !== mapPresentation) els.mapPresentationSelect.value = mapPresentation;
  if (els.layerEmphasisSelect && els.layerEmphasisSelect.value !== mapEmphasis) els.layerEmphasisSelect.value = mapEmphasis;
  const visible = layers.filter((layer) => layer.visible); const dataVisible = visible.filter((layer) => !isFoundationLayer(layer)); const drawLayers = [...visible].sort((left, right) => layerDrawPriority(left) - layerDrawPriority(right) || visible.indexOf(left) - visible.indexOf(right)); const renderedLayers = drawLayers.map((layer) => ({ layer, ...renderLayerVisuals(layer) })); const renderedById = new Map(renderedLayers.map((entry) => [entry.layer.id, entry])); const mappedCount = renderedLayers.reduce((total, entry) => total + entry.mappedCount, 0); const clusteredRecordCount = renderedLayers.reduce((total, entry) => total + entry.clusteredRecordCount, 0); const densityRecordCount = renderedLayers.reduce((total, entry) => total + entry.densityRecordCount, 0);
  els.layerVisuals.innerHTML = renderedLayers.map((entry) => entry.markup).join("");
  els.aquiferHitVisuals.innerHTML = renderedLayers.map((entry) => entry.aquiferHitMarkup).join("");
  renderMultiples(dataVisible, renderedById);
  els.mapEmpty.hidden = mappedCount > 0 || visible.length === 0;
  const noMatchLayer = dataVisible.find((layer) => layer.filterMode === "filter" && filterIsActive(layer));
  els.mapEmpty.querySelector("strong").textContent = noMatchLayer ? "No matching features" : "No geometry to display";
  els.mapEmpty.querySelector("span").textContent = noMatchLayer ? "Clear focus or choose a different state, aquifer, or category." : "Check the source geometry and fields in Layer properties.";
  const groupingNote = clusteredRecordCount ? ` · ${clusteredRecordCount.toLocaleString()} records grouped` : "";
  const densityNote = densityRecordCount ? ` · ${densityRecordCount.toLocaleString()} records in density grids` : "";
  const densityCellCount = renderedLayers.reduce((total, entry) => total + (entry.layer.displayMode === "density" && isPointLayer(entry.layer) ? entry.layer.renderDensityCells?.length || 0 : 0), 0); const nonDensityMarkCount = Math.max(0, mappedCount - densityCellCount); const visualSummary = densityCellCount ? `${densityCellCount.toLocaleString()} smoothed heat cells${nonDensityMarkCount ? ` · ${nonDensityMarkCount.toLocaleString()} other marks` : ""}` : `${mappedCount.toLocaleString()} visual marks`;
  els.mapRowSummary.textContent = `${visualSummary}${groupingNote}${densityNote}${visible.some((layer) => layer.data.length > MAX_RENDER_POINTS && !isCoverageLayer(layer) && !layer.clusterMode && layer.displayMode !== "density") ? ` · max ${MAX_RENDER_POINTS.toLocaleString()} per point layer` : ""}`;
  const viewNote = mapPresentation === "multiples" ? " · separate comparison panes" : mapPresentation === "focus" ? " · focus + quiet context" : " · overlay"; els.mapStatus.textContent = `${dataVisible.length} active layer${dataVisible.length === 1 ? "" : "s"} · ${visualSummary}${groupingNote}${densityNote}${viewNote}`;
  const selected = layers.find((layer) => layer.id === selectedLayerId); const displayDescription = selected?.displayMode === "density" ? `${densityAggregationLabel(selected)} heatmap` : isStateLayer(selected) ? "state fill" : selected?.displayMode === "bubbles" ? "bubble size" : "uniform marker"; const densityScale = selected?.displayMode === "density" && selected.densityAggregation !== "count" && selected.renderDensityCells?.length ? ` · scale ${formatMeasureValue(selected, selected.renderDensityCells[0].scaleMin)}–${formatMeasureValue(selected, selected.renderDensityCells[0].scaleMax)}` : ""; const densityColorNote = selected?.displayMode === "density" || isStateLayer(selected) ? ` · ${densityColorScaleLabel(selected)}` : ""; const contrastNote = mapPresentation === "multiples" ? " · layer shown in its own pane" : mapPresentation === "focus" ? " · focus layer foreground; context subdued" : mapEmphasis === "selected" && hasVisibleSelectedLayer() ? " · selected layer emphasized" : " · all layers balanced"; els.mapMeasureSummary.textContent = selected ? `${selected.riskMetric ? riskMetric(selected).label : selected.measureField ? readableFieldName(selected.measureField) : "No measure"} · ${displayDescription}${densityScale}${densityColorNote} · ${selected.geometryDisplay || "source geometry"}${activeFilterDescription(selected) ? ` · ${selected.filterMode} focus` : ""}${contrastNote}` : "Select a layer to see its visual encoding";
  renderVisualRecipe(selected); renderMapReadingStrip(selected); renderLegend(); bindMapFeatures();
}

function featureElementFromTarget(target) {
  const element = target?.closest?.(".layer-point, .layer-state, .layer-feature, .layer-cluster, .layer-density-cell, .aquifer-hit-feature");
  return element && els.mapSvg.contains(element) ? element : null;
}

function positionMapTooltip(point) {
  const stage = document.getElementById("mapStage").getBoundingClientRect(); const svg = document.getElementById("mapSvg").getBoundingClientRect(); const transformedX = mapPanX + point.x * mapZoom; const transformedY = mapPanY + point.y * mapZoom; const x = transformedX / 1000 * svg.width + (svg.left - stage.left); const y = transformedY / 600 * svg.height + (svg.top - stage.top);
  els.mapTooltip.style.left = `${Math.min(Math.max(x - 45, 8), stage.width - 200)}px`; els.mapTooltip.style.top = `${Math.min(Math.max(y - 92, 8), stage.height - 90)}px`;
}

function showMapFeatureTooltip(element) {
  const layer = layers.find((item) => item.id === element.dataset.layerId); if (!layer) return;
  if (element.classList.contains("layer-density-cell")) {
    const cell = layer.renderDensityCells?.[Number(element.dataset.densityIndex)]; if (!cell) return;
    const focusNote = filterIsActive(layer) ? ` · ${cell.matchCount.toLocaleString()} focused` : "";
    const valueNote = cell.aggregation === "count" ? `Record density: ${formatDensityValue(cell.value)}` : `${densityAggregationLabel(layer)}: ${formatDensityValue(cell.value)}${layer.units ? ` ${layer.units}` : ""}`;
    const scaleNote = cell.aggregation === "count" ? "" : ` · value scale ${formatDensityValue(cell.scaleMin)}–${formatDensityValue(cell.scaleMax)}`;
    const supportNote = cell.count ? `${cell.count.toLocaleString()} source record${cell.count === 1 ? "" : "s"} centered in cell` : "surface blended from nearby observations";
    const interpretation = layer.riskMetric === "groundwaterChange" ? "positive = deeper than 2021 · negative = shallower" : "";
    els.mapTooltip.innerHTML = `<strong>${escapeHTML(valueNote)}</strong><span>${escapeHTML(layer.name)}</span><span>${supportNote} · ${escapeHTML(densityColorScaleLabel(layer))}${scaleNote}${focusNote}</span>${interpretation ? `<span>${escapeHTML(interpretation)}</span>` : ""}`; els.mapTooltip.hidden = false; els.mapTooltip.dataset.owner = "feature"; positionMapTooltip({ x: cell.x + cell.width / 2, y: cell.y + cell.height / 2 }); return;
  }
  if (element.classList.contains("layer-cluster")) {
    const cluster = layer.renderClusters?.[Number(element.dataset.clusterIndex)]; if (!cluster) return;
    els.mapTooltip.innerHTML = `<strong>${cluster.count.toLocaleString()} records</strong><span>${escapeHTML(layer.name)}</span><span>Zoom in for individual features</span>`; els.mapTooltip.hidden = false; els.mapTooltip.dataset.owner = "feature"; positionMapTooltip({ x: cluster.x, y: cluster.y }); return;
  }
  if (element.classList.contains("layer-state")) {
    const summary = layer.renderStateRows?.[Number(element.dataset.stateIndex)]; if (!summary) return;
    const label = STATE_NAMES[summary.state] || summary.state; const details = riskTooltipDetails(layer, summary);
    els.mapTooltip.innerHTML = `<strong>${escapeHTML(label)}</strong><span>${escapeHTML(layer.name)}</span>${details.map((detail) => `<span>${escapeHTML(detail)}</span>`).join("")}`; els.mapTooltip.hidden = false; els.mapTooltip.dataset.owner = "feature"; positionMapTooltip({ x: STATE_POINTS[summary.state][0], y: STATE_POINTS[summary.state][1] }); return;
  }
  const rowIndex = Number(element.dataset.rowIndex); const row = layer.data[rowIndex]; if (!row) return;
  const point = geometryAnchor(row, layer); if (!point) return; const label = row.__geometry ? featureLabel(row, layer, rowIndex) : getPoint(row, layer)?.label || "Mapped feature"; const units = layer.units ? ` ${layer.units}` : ""; const details = [];
  if (isAquiferLikeLayer(layer)) { const aquiferFields = inferAquiferFields(layer.fields); if (aquiferFields.name && row[aquiferFields.name] !== undefined) details.push(`Aquifer name: ${row[aquiferFields.name]}`); if (aquiferFields.type && row[aquiferFields.type] !== undefined) details.push(`Aquifer type: ${row[aquiferFields.type]}`); }
  if (layer.measureField && row[layer.measureField] !== undefined) { const measureKey = String(layer.measureField).toLowerCase(); const measureLabel = layer.riskMetric === "groundwaterChange" ? "Change from 2021 baseline" : ["qama", "qa_ma"].includes(measureKey) ? "Mean annual flow estimate" : measureKey === "cwp_actual_average_flow_nmbr" ? "Reported average flow" : { frequency_pct: "Historical drought frequency", us_prcnt: "Outlook area share" }[measureKey] || readableFieldName(layer.measureField); details.push(`${measureLabel}: ${row[layer.measureField]}${units}`); if (layer.riskMetric === "groundwaterChange") details.push("Interpretation: positive = deeper; negative = shallower"); }
  if (!isAquiferLikeLayer(layer) && layer.featureColorField && layer.featureColorField !== layer.labelField && row[layer.featureColorField] !== undefined) { const colorFieldKey = String(layer.featureColorField).toLowerCase(); const colorFieldLabel = { cwp_major_minor_status_flag: "Facility size class" }[colorFieldKey] || readableFieldName(layer.featureColorField); details.push(`${colorFieldLabel}: ${row[layer.featureColorField]}`); }
  if (layer.detailFields?.length) {
    const detailLabels = { streamorde: "Stream order", totdasqkm: "Cumulative drainage area", vama: "Estimated velocity", gageidma: "USGS gage", gageqma: "Gaged mean annual flow", gageadjma: "Gage adjusted", cwp_city: "City", cwp_state: "State", cwp_county: "County", cwp_permit_status_desc: "Permit status", cwp_status: "Compliance status", cwp_major_minor_status_flag: "Facility size class", cwp_total_design_flow_nmbr: "Design flow", fac_derived_wbd_name: "Watershed", permit_name: "Permit name", permit_components: "Permit components", dfr_url: "EPA detailed report", drought_weeks: "Drought-threshold weeks", observation_weeks: "Observation weeks", drought_level: "Drought threshold", minimum_weeks: "Minimum event length", period_start: "Period start", period_end: "Period end", fips: "County FIPS", fcst_date: "Forecast release", target: "Forecast target month", area: "Outlook area", groundwater_mean_ft: "Annual mean depth-to-water", change_from_previous_ft: "Change from previous year", observation_count: "Observations", baseline_year: "Baseline year", baseline_date: "Baseline date", latest_date: "Latest date", time_series_id: "USGS time-series ID" };
    layer.detailFields.forEach((field) => {
      const detailKey = String(field || "").toLowerCase();
      if (!field || field === layer.measureField || field === layer.featureColorField || row[field] === undefined || row[field] === null || row[field] === "" || (detailKey === "gageidma" && String(row[field]) === "0")) return;
      const value = detailKey === "gageadjma" ? (Number(row[field]) === 1 ? "yes" : "no") : row[field];
      const detailUnits = ["totdasqkm", "lengthkm", "area"].includes(detailKey) ? detailKey === "lengthkm" ? " km" : " km²" : ["vama", "va_ma"].includes(detailKey) ? " fps" : detailKey === "gageqma" ? " cfs" : ["cwp_total_design_flow_nmbr"].includes(detailKey) ? " MGD" : ["drought_weeks", "observation_weeks", "minimum_weeks"].includes(detailKey) ? " weeks" : ["groundwater_mean_ft", "change_from_previous_ft"].includes(detailKey) ? " ft" : "";
      const detailLabel = { ...detailLabels, va_ma: "Estimated velocity", lengthkm: "Reach length", resolution: "Source resolution", comid: "NHDPlus COMID" }[detailKey] || readableFieldName(field);
      details.push(`${detailLabel}: ${value}${detailUnits}`);
    });
  }
  if (layer.timeField && row[layer.timeField] !== undefined) details.push(`${layer.timeField}: ${row[layer.timeField]}`);
  els.mapTooltip.innerHTML = `<strong>${escapeHTML(label)}</strong><span>${escapeHTML(layer.name)}</span>${details.map((detail) => `<span>${escapeHTML(detail)}</span>`).join("")}`; els.mapTooltip.hidden = false; els.mapTooltip.dataset.owner = "feature"; positionMapTooltip(point);
  if (element.classList.contains("aquifer-feature") || element.classList.contains("aquifer-boundary")) { element.classList.add("is-hovered"); element.parentNode?.appendChild(element); }
  if (element.classList.contains("aquifer-hit-feature")) document.querySelector(`.aquifer-boundary[data-layer-id="${layer.id}"][data-row-index="${element.dataset.rowIndex}"], .aquifer-feature[data-layer-id="${layer.id}"][data-row-index="${element.dataset.rowIndex}"]`)?.classList.add("is-hovered");
}

function hideMapFeatureTooltip(element) {
  element.classList.remove("is-hovered");
  if (element.classList.contains("aquifer-hit-feature")) { const layer = layers.find((item) => item.id === element.dataset.layerId); document.querySelector(`.aquifer-boundary[data-layer-id="${layer?.id}"][data-row-index="${element.dataset.rowIndex}"], .aquifer-feature[data-layer-id="${layer?.id}"][data-row-index="${element.dataset.rowIndex}"]`)?.classList.remove("is-hovered"); }
  if (els.mapTooltip.dataset.owner === "feature") { els.mapTooltip.hidden = true; els.mapTooltip.dataset.owner = ""; }
}

function selectAquiferBoundary(element) {
  const layer = layers.find((item) => item.id === element.dataset.layerId); const row = layer?.data[Number(element.dataset.rowIndex)];
  if (!layer || !row) return;
  const fields = inferAquiferFields(layer.fields); const name = fields.name ? String(row[fields.name] ?? "").trim() : ""; const type = fields.type ? String(row[fields.type] ?? "").trim() : "";
  if (!name && !type) return;
  layer.filterTypeValue = ""; layer.filterNameValue = name; layer.filterMode = "highlight";
  renderLayerList(); renderMap(); showToast(`${name || type} selected. Use Aquifer focus to change the selection.`);
}

function bindMapFeatures() {
  if (els.mapSvg.dataset.featureBindings === "true") return;
  els.mapSvg.dataset.featureBindings = "true";
  els.mapSvg.addEventListener("pointerover", (event) => { const element = featureElementFromTarget(event.target); const previous = featureElementFromTarget(event.relatedTarget); if (element && element !== previous) showMapFeatureTooltip(element); });
  els.mapSvg.addEventListener("pointerout", (event) => { const element = featureElementFromTarget(event.target); const next = featureElementFromTarget(event.relatedTarget); if (element && element !== next) hideMapFeatureTooltip(element); });
  els.mapSvg.addEventListener("click", (event) => { const element = event.target?.closest?.(".aquifer-hit-feature"); if (!element || mapDragMoved) { mapDragMoved = false; return; } selectAquiferBoundary(element); });
}

function renderLayerList() {
  const managedLayers = layers.filter((layer) => !isFoundationLayer(layer));
  els.layerList.innerHTML = managedLayers.map((layer, index) => {
    const role = LAYER_ROLES[layer.role]?.label || "Context / reference";
    const focus = activeFilterDescription(layer); const mapped = mappedRecordCount(layer); const chips = layerEncodingChips(layer); const selected = layer.id === selectedLayerId;
    return `<article class="layer-item ${selected ? "is-selected" : ""} ${layer.visible ? "" : "is-hidden"}" data-layer-id="${layer.id}" aria-current="${selected ? "true" : "false"}"><div class="layer-drag" aria-hidden="true">⠿</div><div class="layer-card-main"><div class="layer-card-heading">${layerSymbolMarkup(layer, "layer-symbol")}<div class="layer-card-title"><h3 class="layer-name">${escapeHTML(layer.name)}</h3><span class="layer-badge">${escapeHTML(role)}</span></div></div><div class="layer-meta"><span>${layer.data.length.toLocaleString()} records</span><span>${mapped.toLocaleString()} mapped</span>${focus ? `<span class="layer-focus-state">${layer.filterMode === "filter" ? "filtered" : "focused"}</span>` : ""}</div><div class="layer-encoding-chips">${chips.slice(1, 4).map((chip) => `<span>${escapeHTML(chip)}</span>`).join("")}</div></div><div class="layer-actions"><button class="icon-button move-up" type="button" title="Move layer up" ${index === 0 ? "disabled" : ""}>↑</button><button class="icon-button visibility" type="button" title="Toggle visibility" aria-label="Toggle ${escapeHTML(layer.name)} visibility" aria-pressed="${layer.visible}"><span class="visibility-icon"></span></button><button class="icon-button delete" type="button" title="Remove layer" aria-label="Remove ${escapeHTML(layer.name)}">×</button></div></article>`;
  }).join("");
  document.querySelectorAll(".layer-item").forEach((item) => {
    const id = item.dataset.layerId; item.addEventListener("click", (event) => { if (!event.target.closest("button")) { selectedLayerId = id; renderAll(); } });
    item.querySelector(".visibility").addEventListener("click", () => { const layer = layers.find((entry) => entry.id === id); layer.visible = !layer.visible; renderAll(); });
    item.querySelector(".delete").addEventListener("click", () => { layers = layers.filter((entry) => entry.id !== id); if (selectedLayerId === id) selectedLayerId = layers[0]?.id || null; if (id === aquiferLayerId) { aquiferLayerId = null; boundaryMode = "states"; els.boundaryModeSelect.value = "states"; els.statePaths.style.display = ""; } renderAll(); showToast("Layer removed."); });
    item.querySelector(".move-up").addEventListener("click", () => { const index = layers.findIndex((entry) => entry.id === id); if (index > 0) [layers[index - 1], layers[index]] = [layers[index], layers[index - 1]]; renderAll(); });
  });
  els.layerCount.textContent = `${managedLayers.filter((layer) => layer.visible).length} active / ${managedLayers.length} total`;
}

function populateSelect(select, fields, selected, allowBlank = false) {
  select.innerHTML = `${allowBlank ? "<option value=\"\">— none —</option>" : ""}${fields.map((field) => `<option value="${escapeHTML(field)}">${escapeHTML(field)}</option>`).join("")}`;
  select.value = fields.includes(selected) ? selected : (allowBlank ? "" : fields[0] || "");
}

function populateFilterValues(select, values, selected, allLabel) {
  select.innerHTML = `<option value="">${allLabel}</option>${values.map((value) => `<option value="${escapeHTML(value)}">${escapeHTML(value)}</option>`).join("")}`;
  select.value = values.includes(selected) ? selected : "";
}

function renderAquiferFoundationControls() {
  const layer = aquiferFoundationLayer();
  const available = Boolean(layer && boundaryMode !== "states");
  els.aquiferFocusBar.hidden = !available;
  if (!available) return;
  const fields = inferAquiferFields(layer.fields);
  layer.filterTypeField = layer.filterTypeField || fields.type || "";
  layer.filterNameField = layer.filterNameField || fields.name || "";
  const typeValues = aquiferFoundationValues(layer, layer.filterTypeField);
  if (!typeValues.includes(layer.filterTypeValue)) layer.filterTypeValue = "";
  const nameValues = aquiferFoundationValues(layer, layer.filterNameField, layer.filterTypeField, layer.filterTypeValue);
  if (!nameValues.includes(layer.filterNameValue)) layer.filterNameValue = "";
  populateFilterValues(els.aquiferFocusType, typeValues, layer.filterTypeValue, "All aquifer types");
  populateFilterValues(els.aquiferFocusName, nameValues, layer.filterNameValue, layer.filterTypeValue ? "All systems in this type" : "All aquifer systems");
  els.aquiferFocusMode.value = layer.filterMode || "highlight";
  const focus = activeFilterDescription(layer);
  els.aquiferFocusSummary.textContent = focus ? `${layer.filterMode === "filter" ? "Showing only" : "Highlighting"} ${focus}.` : "All representative systems visible · click a boundary to select it.";
  els.aquiferFocusBar.classList.toggle("has-selection", Boolean(focus));
}

function applyAquiferFoundationFocus() {
  const layer = aquiferFoundationLayer();
  if (!layer) return;
  const typeValues = aquiferFoundationValues(layer, layer.filterTypeField);
  const nameValues = aquiferFoundationValues(layer, layer.filterNameField, layer.filterTypeField, els.aquiferFocusType.value);
  layer.filterTypeValue = typeValues.includes(els.aquiferFocusType.value) ? els.aquiferFocusType.value : "";
  layer.filterNameValue = nameValues.includes(els.aquiferFocusName.value) ? els.aquiferFocusName.value : "";
  layer.filterMode = els.aquiferFocusMode.value;
  renderLayerList(); renderMap();
}

function clearAquiferFoundationFocus() {
  const layer = aquiferFoundationLayer();
  if (!layer) return;
  layer.filterTypeValue = ""; layer.filterNameValue = ""; layer.filterMode = "highlight";
  renderLayerList(); renderMap();
}

function renderStateFilter(layer) {
  const options = stateFilterOptions(layer);
  const available = Boolean(layer?.regionField && options.length);
  els.stateFilterPanel.hidden = !available;
  if (!available) { if (layer) layer.stateFilterValue = ""; return; }
  if (!options.some((option) => option.value === layer.stateFilterValue)) layer.stateFilterValue = "";
  els.stateFilterValue.innerHTML = `<option value="">All states / regions</option>${options.map((option) => `<option value="${escapeHTML(option.value)}">${escapeHTML(option.label)}</option>`).join("")}`;
  els.stateFilterValue.value = layer.stateFilterValue || "";
  els.stateFilterModeField.value = layer.filterMode || "highlight";
  els.stateFilterFieldNote.textContent = layer.regionField;
  els.stateFilterSummary.textContent = layer.stateFilterValue ? `${layer.filterMode === "filter" ? "Showing only" : "Highlighting"} ${STATE_NAMES[layer.stateFilterValue] || layer.stateFilterValue}.` : "Choose a state to focus on its mapped records.";
}

function renderAquiferFilter(layer) {
  const aquiferLike = Boolean(layer && isAquiferLikeLayer(layer));
  els.aquiferFilterPanel.hidden = !aquiferLike;
  if (!aquiferLike) return;
  const fields = inferAquiferFields(layer.fields);
  layer.filterTypeField = layer.filterTypeField || fields.type || "";
  layer.filterNameField = layer.filterNameField || fields.name || "";
  const typeValues = uniqueFieldValues(layer, layer.filterTypeField);
  const nameValues = uniqueFieldValues(layer, layer.filterNameField, layer.filterTypeField, layer.filterTypeValue);
  populateFilterValues(els.filterTypeValue, typeValues, layer.filterTypeValue, layer.filterTypeField ? "All aquifer types" : "Type field not available");
  populateFilterValues(els.filterNameValue, nameValues, layer.filterNameValue, layer.filterNameField ? "All aquifer names" : "Name field not available");
  els.filterTypeValue.disabled = !layer.filterTypeField;
  els.filterNameValue.disabled = !layer.filterNameField;
  els.filterModeField.value = layer.filterMode || "highlight";
  const focus = activeFilterDescription(layer);
  els.filterSummary.textContent = focus ? `${layer.filterMode === "filter" ? "Showing only" : "Highlighting"} ${focus}.` : "Choose a broad type, a specific name, or both.";
}

function applyStateFilter() {
  const layer = layers.find((entry) => entry.id === selectedLayerId);
  if (!layer || !layer.regionField) return;
  layer.stateFilterValue = els.stateFilterValue.value;
  layer.filterMode = els.stateFilterModeField.value;
  renderFilterChange(layer); showToast(layer.stateFilterValue ? `${layer.filterMode === "filter" ? "State filter" : "State highlight"} applied.` : "State focus cleared.");
}

function clearStateFilter() {
  const layer = layers.find((entry) => entry.id === selectedLayerId);
  if (!layer || !layer.regionField) return;
  layer.stateFilterValue = "";
  if (!layer.filterTypeValue && !layer.filterNameValue) layer.filterMode = "highlight";
  renderFilterChange(layer); showToast("State focus cleared.");
}

function applyAquiferFilter() {
  const layer = layers.find((entry) => entry.id === selectedLayerId);
  if (!layer || !isAquiferLikeLayer(layer)) return;
  layer.filterTypeValue = els.filterTypeValue.value;
  layer.filterNameValue = els.filterNameValue.value;
  layer.filterMode = els.filterModeField.value;
  renderFilterChange(layer); showToast(activeFilterDescription(layer) ? `${layer.filterMode === "filter" ? "Filter" : "Highlight"} applied.` : "Aquifer focus cleared.");
}

function clearAquiferFilter() {
  const layer = layers.find((entry) => entry.id === selectedLayerId);
  if (!layer || !isAquiferLikeLayer(layer)) return;
  layer.filterTypeValue = ""; layer.filterNameValue = ""; if (!layer.stateFilterValue) layer.filterMode = "highlight";
  renderFilterChange(layer); showToast("Aquifer focus cleared.");
}

function stopTemporalPlayback() {
  if (temporalPlaybackTimer) clearInterval(temporalPlaybackTimer);
  temporalPlaybackTimer = null;
  temporalPlaybackLayerId = null;
}

function renderTemporalControls(layer) {
  if (!els.temporalToolbar) return;
  const options = temporalOptions(layer);
  const available = Boolean(layer?.timeField && options.length);
  if (!available) {
    if (layer) layer.timeFilterValue = "";
    stopTemporalPlayback();
    els.temporalToolbar.hidden = true;
    return;
  }
  if (temporalPlaybackLayerId && temporalPlaybackLayerId !== layer.id) stopTemporalPlayback();
  if (layer.timeFilterValue && !options.some((option) => option.value === layer.timeFilterValue)) layer.timeFilterValue = "";
  const selectedIndex = options.findIndex((option) => option.value === layer.timeFilterValue);
  els.temporalToolbar.hidden = false;
  els.temporalTitle.textContent = layer.name;
  els.temporalMeta.textContent = `${options.length.toLocaleString()} period${options.length === 1 ? "" : "s"} · ${readableFieldName(layer.timeField)}`;
  els.temporalValueSelect.innerHTML = `<option value="">All periods</option>${options.map((option) => `<option value="${escapeHTML(option.value)}">${escapeHTML(option.label)}</option>`).join("")}`;
  els.temporalValueSelect.value = layer.timeFilterValue || "";
  els.temporalSlider.min = "0";
  els.temporalSlider.max = String(options.length);
  els.temporalSlider.value = String(selectedIndex < 0 ? 0 : selectedIndex + 1);
  els.temporalSlider.setAttribute("aria-valuetext", selectedIndex < 0 ? "All periods" : options[selectedIndex].label);
  els.temporalPlayButton.textContent = temporalPlaybackTimer ? "Pause" : "Play";
  els.temporalPlayButton.setAttribute("aria-pressed", String(Boolean(temporalPlaybackTimer)));
  els.temporalSummary.textContent = layer.timeFilterValue ? `Showing ${temporalLabel(layer.timeFilterValue)} only.` : "All periods shown · select a period or press Play.";
  els.temporalToolbar.classList.toggle("has-selection", Boolean(layer.timeFilterValue));
}

function setTemporalFilter(value) {
  const layer = layers.find((entry) => entry.id === selectedLayerId);
  if (!layer) return;
  const options = temporalOptions(layer);
  layer.timeFilterValue = options.some((option) => option.value === value) ? value : "";
  renderAll();
}

function advanceTemporalPlayback() {
  const layer = layers.find((entry) => entry.id === temporalPlaybackLayerId);
  if (!layer) { stopTemporalPlayback(); return; }
  const options = temporalOptions(layer);
  const currentIndex = options.findIndex((option) => option.value === layer.timeFilterValue);
  if (!options.length || currentIndex >= options.length - 1) {
    stopTemporalPlayback();
    renderTemporalControls(layer);
    return;
  }
  layer.timeFilterValue = options[currentIndex + 1].value;
  renderAll();
}

function toggleTemporalPlayback() {
  const layer = layers.find((entry) => entry.id === selectedLayerId);
  const options = temporalOptions(layer);
  if (!layer || !options.length) return;
  if (temporalPlaybackTimer) {
    stopTemporalPlayback();
    renderTemporalControls(layer);
    return;
  }
  temporalPlaybackLayerId = layer.id;
  const currentIndex = options.findIndex((option) => option.value === layer.timeFilterValue);
  if (currentIndex >= options.length - 1) layer.timeFilterValue = "";
  advanceTemporalPlayback();
  if (temporalPlaybackLayerId) temporalPlaybackTimer = setInterval(advanceTemporalPlayback, 850);
  renderTemporalControls(layer);
}

function renderProperties() {
  const layer = layers.find((entry) => entry.id === selectedLayerId);
  const hasLayer = Boolean(layer); els.noSelection.hidden = hasLayer; els.propertyForm.hidden = !hasLayer; els.propertyLayerStatus.textContent = layer ? layer.name : "Select a layer";
  if (!layer) return;
  const fields = layer.fields; els.layerNameField.value = layer.name; els.geometryTypeField.value = layer.geometryType; els.displayModeField.value = layer.displayMode; els.densityAggregationField.value = layer.densityAggregation || "count"; els.densityColorScaleField.value = layer.densityColorScale || "sequential"; els.roleField.value = layer.role || "context"; els.geometryDisplayField.value = layer.geometryDisplay || "auto"; els.featureColorField.value = layer.featureColorField || ""; els.colorField.value = layer.color || "#c45b28"; els.markerSizeField.value = layer.markerSize || 5; els.markerSizeOutput.value = `${els.markerSizeField.value}px`; els.lineWidthField.value = layer.strokeWidth || 1.5; els.lineWidthOutput.value = `${els.lineWidthField.value}px`; els.showLabelsField.value = layer.showLabels ? "yes" : "no"; els.unitsField.value = layer.units; els.opacityField.value = Math.round(layer.opacity * 100); els.opacityOutput.value = `${els.opacityField.value}%`; els.layerNotesField.value = layer.notes;
  populateSelect(els.latitudeField, fields, layer.latitudeField); populateSelect(els.longitudeField, fields, layer.longitudeField); populateSelect(els.regionField, fields, layer.regionField); populateSelect(els.measureField, fields, layer.measureField); populateSelect(els.labelField, fields, layer.labelField, true); populateSelect(els.timeField, fields, layer.timeField, true); populateSelect(els.featureColorField, fields, layer.featureColorField, true); renderStateFilter(layer); renderAquiferFilter(layer); renderVisualRecipe(layer); toggleGeometryFields();
}

function toggleGeometryFields() { const points = ["points", "Point", "MultiPoint"].includes(els.geometryTypeField.value); const regions = els.geometryTypeField.value === "states"; els.pointFields.hidden = !points; els.regionFields.hidden = !regions; els.densityControls.hidden = !points || els.displayModeField.value !== "density"; }

function renderPreview() {
  const layer = layers.find((entry) => entry.id === selectedLayerId); if (!layer) { els.previewStatus.textContent = "No layer selected"; els.previewFields.textContent = ""; els.previewHead.innerHTML = ""; els.previewBody.innerHTML = ""; return; }
  const fields = layer.fields; const chosen = [...new Set([layer.latitudeField, layer.longitudeField, layer.regionField, layer.measureField, layer.labelField, layer.timeField].filter(Boolean))]; const displayFields = [...chosen, ...fields.filter((field) => !chosen.includes(field))].slice(0, 8); els.previewStatus.textContent = `${layer.data.length.toLocaleString()} rows · ${fields.length} columns`; els.previewFields.textContent = `${displayFields.length} of ${fields.length} columns shown`;
  els.previewHead.innerHTML = `<tr>${displayFields.map((field) => `<th>${escapeHTML(field)}</th>`).join("")}</tr>`; els.previewBody.innerHTML = layer.data.slice(0, 8).map((row) => `<tr>${displayFields.map((field) => `<td>${escapeHTML(row[field])}</td>`).join("")}</tr>`).join("");
}

function renderAll() { const selected = layers.find((layer) => layer.id === selectedLayerId); renderLayerList(); renderProperties(); renderPreview(); renderTemporalControls(selected); renderMap(); }

function updateFilterSummaries(layer) {
  if (!layer) return;
  if (!els.stateFilterPanel.hidden) {
    els.stateFilterModeField.value = layer.filterMode || "highlight";
    els.stateFilterSummary.textContent = layer.stateFilterValue ? `${layer.filterMode === "filter" ? "Showing only" : "Highlighting"} ${STATE_NAMES[layer.stateFilterValue] || layer.stateFilterValue}.` : "Choose a state to focus on its mapped records.";
  }
  if (!els.aquiferFilterPanel.hidden) {
    els.filterModeField.value = layer.filterMode || "highlight";
    const focus = activeFilterDescription(layer);
    els.filterSummary.textContent = focus ? `${layer.filterMode === "filter" ? "Showing only" : "Highlighting"} ${focus}.` : "Choose a broad type, a specific name, or both.";
  }
}

function renderFilterChange(layer) { updateFilterSummaries(layer); renderLayerList(); renderMap(); }

function focusSelectedLayer() {
  const selected = layers.find((layer) => layer.id === selectedLayerId);
  if (!selected) { showToast("Select a layer first."); return; }
  layers.forEach((layer) => { layer.visible = layer.id === selected.id; });
  renderLayerList(); renderMap(); showToast(`Showing ${selected.name} only.`);
}

function showAllLayers() {
  layers.forEach((layer) => { layer.visible = true; });
  if (aquiferLayerId && boundaryMode === "states") { const aquifer = layers.find((layer) => layer.id === aquiferLayerId); if (aquifer) aquifer.visible = false; }
  renderLayerList(); renderMap(); showToast(boundaryMode === "states" ? "All data layers shown; state lines remain active." : "All layers shown.");
}

function addDataLayer(data, name, source, options = {}) { const layer = createLayer(name, data, source); Object.assign(layer, options); refreshLayerCaches(layer); if (options.defaultTimeValue && temporalOptions(layer).some((option) => option.value === options.defaultTimeValue)) layer.timeFilterValue = options.defaultTimeValue; layers.unshift({ ...layer, color: options.color || LAYER_COLORS[layers.length % LAYER_COLORS.length] }); selectedLayerId = layer.id; renderAll(); els.fileStatus.textContent = `${source} · ${data.length.toLocaleString()} rows · ${layer.fields.length} columns`; showToast(options.foundation ? `${layer.name} added as a map foundation.` : `${layer.name} loaded. Define its fields at right.`); return layer; }
function focusDataEntry() { const panel = document.getElementById("dataEntryPanel"); panel.classList.remove("is-collapsed"); document.getElementById("toggleDataEntryButton")?.setAttribute("aria-expanded", "true"); document.getElementById("toggleDataEntryButton").textContent = "Hide"; panel.scrollIntoView({ behavior: "smooth", block: "nearest" }); els.pasteLayerName.focus(); }
function createPastedLayer() { try { addDataLayer(parseInput(els.pasteInput.value), els.pasteLayerName.value.trim() || "Pasted layer", "pasted data"); els.pasteInput.value = ""; els.pasteLayerName.value = ""; els.pasteError.hidden = true; } catch (error) { els.pasteError.textContent = error.message; els.pasteError.hidden = false; } }
function loadFile(file) { if (!file) return; const reader = new FileReader(); reader.onload = () => { try { addDataLayer(parseInput(String(reader.result)), file.name.replace(/\.[^.]+$/, ""), file.name); } catch (error) { showToast(error.message || "Could not read that file."); } }; reader.readAsText(file); }
async function loadBundledSample() { try { const response = await fetch("sample.csv", { cache: "no-store" }); if (!response.ok) throw new Error(`sample.csv could not be loaded (${response.status}).`); addDataLayer(parseInput(await response.text()), "sample.csv · groundwater depth", "bundled sample.csv"); } catch (error) { showToast(error.message || "Could not load sample.csv."); } }
async function loadRealDataset(key) { const dataset = REAL_DATASETS[key]; if (!dataset) return null; try { const response = await fetch(dataset.file, { cache: "no-store" }); if (!response.ok) throw new Error(`${dataset.file} could not be loaded (${response.status}).`); return addDataLayer(parseInput(await response.text()), dataset.name, dataset.source, dataset.options); } catch (error) { showToast(error.message || `Could not load ${dataset.name}.`); return null; } }

async function loadRiskLayers() {
  const riskKeys = ["gwdChange", "droughtPrevalence", "hazardPotential"];
  for (const key of riskKeys) {
    const dataset = REAL_DATASETS[key];
    if (!dataset || layers.some((layer) => layer.source === dataset.source)) continue;
    await loadRealDataset(key);
  }
  mapPresentation = "multiples";
  mapEmphasis = "balanced";
  renderAll();
  document.querySelector(".map-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
  showToast("Risk layers loaded · use the Time lens to compare years.");
}
async function fetchWithTimeout(url, options = {}, timeout = 15000) {
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), timeout);
  try { return await fetch(url, { ...options, signal: controller.signal }); } finally { clearTimeout(timer); }
}
function inverseProjectCoordinate(x, y) {
  const projection = US_MAP_PROJECTION;
  const mercator = (value) => Math.log(Math.tan(Math.PI / 4 + (value * Math.PI) / 360));
  const south = mercator(projection.south); const north = mercator(projection.north);
  const longitude = projection.west + ((x - projection.left) / projection.width) * (projection.east - projection.west);
  const mercatorLatitude = north - ((y - projection.top) / projection.height) * (north - south);
  const latitude = (Math.atan(Math.exp(mercatorLatitude)) * 360) / Math.PI - 90;
  return { longitude, latitude };
}

function visibleMapBounds() {
  const left = clamp((0 - mapPanX) / mapZoom, 0, MAP_VIEW.width);
  const right = clamp((MAP_VIEW.width - mapPanX) / mapZoom, 0, MAP_VIEW.width);
  const top = clamp((0 - mapPanY) / mapZoom, 0, MAP_VIEW.height);
  const bottom = clamp((MAP_VIEW.height - mapPanY) / mapZoom, 0, MAP_VIEW.height);
  const northwest = inverseProjectCoordinate(left, top); const southeast = inverseProjectCoordinate(right, bottom);
  return { west: Math.min(northwest.longitude, southeast.longitude), east: Math.max(northwest.longitude, southeast.longitude), south: Math.min(northwest.latitude, southeast.latitude), north: Math.max(northwest.latitude, southeast.latitude) };
}

function esriGeometryToGeoJSON(geometry) {
  if (!geometry) return null;
  if (Number.isFinite(Number(geometry.x)) && Number.isFinite(Number(geometry.y))) return { type: "Point", coordinates: [Number(geometry.x), Number(geometry.y)] };
  if (Array.isArray(geometry.points)) return { type: "MultiPoint", coordinates: geometry.points };
  if (Array.isArray(geometry.paths)) return { type: geometry.paths.length === 1 ? "LineString" : "MultiLineString", coordinates: geometry.paths.length === 1 ? geometry.paths[0] : geometry.paths };
  if (Array.isArray(geometry.rings)) return { type: "Polygon", coordinates: geometry.rings };
  return null;
}

function parseArcGISFeatureCollection(parsed) {
  if (!Array.isArray(parsed.features)) return [];
  return parsed.features.map((feature, index) => {
    const geometry = feature.geometry?.type ? feature.geometry : esriGeometryToGeoJSON(feature.geometry);
    if (!geometry) return null;
    return { ...(feature.attributes || feature.properties || {}), __geometry: geometry, __featureId: feature.id ?? feature.attributes?.OBJECTID ?? index };
  }).filter(Boolean);
}

function intersectMapBounds(left, right) {
  const bounds = { west: Math.max(left.west, right.west), east: Math.min(left.east, right.east), south: Math.max(left.south, right.south), north: Math.min(left.north, right.north) };
  return bounds.west < bounds.east && bounds.south < bounds.north ? bounds : null;
}

function remoteQueryBounds(dataset, bounds, resultRecordCount, whereOverride = "") {
  const where = whereOverride || (dataset.zoomedWhere && mapZoom > (dataset.tileMaxZoom || 2.2) ? dataset.zoomedWhere : dataset.where || "1=1");
  const params = new URLSearchParams({ where, outFields: dataset.outFields, returnGeometry: "true", outSR: "4326", geometry: `${bounds.west},${bounds.south},${bounds.east},${bounds.north}`, geometryType: "esriGeometryEnvelope", inSR: "4326", spatialRel: "esriSpatialRelIntersects", resultRecordCount: String(Math.min(resultRecordCount, dataset.queryMaxFeatures || resultRecordCount)), f: "json" });
  return fetchWithTimeout(`${dataset.url}/query?${params.toString()}`, { cache: "no-store" }).then(async (response) => {
    if (!response.ok) throw new Error(`${dataset.name} returned HTTP ${response.status}.`);
    const parsed = await response.json(); if (parsed.error) throw new Error(parsed.error.message || `${dataset.name} could not be queried.`);
    return { data: parseArcGISFeatureCollection(parsed), exceededTransferLimit: Boolean(parsed.exceededTransferLimit) };
  });
}

function remoteQueryTiles(dataset, bounds) {
  const shouldTile = dataset.tileColumns && dataset.tileRows && mapZoom <= (dataset.tileMaxZoom || 2.2);
  if (!shouldTile) return [bounds];
  const tiles = []; const tileWidth = (bounds.east - bounds.west) / dataset.tileColumns; const tileHeight = (bounds.north - bounds.south) / dataset.tileRows;
  for (let row = 0; row < dataset.tileRows; row += 1) for (let column = 0; column < dataset.tileColumns; column += 1) tiles.push({ west: bounds.west + column * tileWidth, east: bounds.west + (column + 1) * tileWidth, south: bounds.south + row * tileHeight, north: bounds.south + (row + 1) * tileHeight });
  return tiles;
}

async function loadRemoteDataset(key) {
  const dataset = REMOTE_DATASETS[key]; if (!dataset) return;
  if (mapZoom < dataset.minZoom) {
    setMapZoom(dataset.minZoom);
    showToast(`Zoomed to ${Math.round(dataset.minZoom * 100)}% for ${dataset.name}; loading the visible area…`);
  }
  if (dataset.localFirst && dataset.fallbackFile) {
    try {
      const fallbackResponse = await fetch(dataset.fallbackFile, { cache: "no-store" }); if (!fallbackResponse.ok) throw new Error(`Could not load ${dataset.fallbackFile}.`);
      const fallbackData = parseInput(await fallbackResponse.text()); const fallbackLayer = addDataLayer(fallbackData, `${dataset.name} · bundled example`, `${dataset.source} · bundled display snapshot`, dataset.options); fallbackLayer.notes = `${dataset.options.notes} This bundled snapshot is a broad generalized display network with named river corridors from the same source.`; renderAll(); showToast(`${dataset.name} loaded from the bundled display snapshot.`); return;
    } catch (error) { /* Fall through to the live query when the bundled snapshot is unavailable. */ }
  }
  const bounds = visibleMapBounds(); const tiles = remoteQueryTiles(dataset, bounds); const tileLimit = Math.max(1, Math.ceil(dataset.maxFeatures / tiles.length));
  try {
    showToast(`Loading ${dataset.name} for the visible map area…`);
    const tileResultsPromise = Promise.all(tiles.map((tile) => remoteQueryBounds(dataset, tile, tileLimit)));
    const priorityResultsPromise = Promise.all((mapZoom <= (dataset.tileMaxZoom || 2.2) ? dataset.priorityNames || [] : []).map((name) => {
      const field = dataset.priorityNameField || "GNIS_NAME";
      const escapedName = String(name).replaceAll("'", "''");
      const priorityBounds = dataset.priorityBounds?.[name] ? intersectMapBounds(bounds, { west: dataset.priorityBounds[name][0], south: dataset.priorityBounds[name][1], east: dataset.priorityBounds[name][2], north: dataset.priorityBounds[name][3] }) : bounds;
      return priorityBounds ? remoteQueryBounds(dataset, priorityBounds, dataset.priorityLimit || 100, `${field}='${escapedName}' AND FTYPE IN ('StreamRiver','ArtificialPath') AND LENGTHKM>=2`) : Promise.resolve({ data: [], exceededTransferLimit: false });
    }));
    const [tileResults, priorityResults] = await Promise.all([tileResultsPromise, priorityResultsPromise]);
    const allResults = [...priorityResults, ...tileResults];
    const parsed = { exceededTransferLimit: allResults.some((result) => result.exceededTransferLimit) };
    const data = [...new Map(allResults.flatMap((result) => result.data).map((row, index) => [String(row.__featureId ?? row.REACHCODE ?? index), row])).values()].slice(0, dataset.maxFeatures);
    if (!data.length) {
      if (dataset.fallbackFile) {
        const fallbackResponse = await fetch(dataset.fallbackFile, { cache: "no-store" }); if (!fallbackResponse.ok) throw new Error(`No ${dataset.name.toLowerCase()} features intersect the visible map area.`);
        const fallbackData = parseInput(await fallbackResponse.text()); const fallbackLayer = addDataLayer(fallbackData, `${dataset.name} · bundled example`, `${dataset.source} · bundled fallback`, dataset.options); fallbackLayer.notes = `${dataset.options.notes} This bundled display fallback is a broad generalized network with named river corridors from the same NHD service.`; renderAll(); showToast(`${dataset.name} loaded from its bundled display example.`); return;
      }
      showToast(`No ${dataset.name.toLowerCase()} features intersect the visible map area.`); return;
    }
    const layer = addDataLayer(data, dataset.name, dataset.source, dataset.options); layer.notes = `${dataset.options.notes} Current query: ${Math.round(bounds.west * 100) / 100}° to ${Math.round(bounds.east * 100) / 100}° longitude, ${Math.round(bounds.south * 100) / 100}° to ${Math.round(bounds.north * 100) / 100}° latitude${tiles.length > 1 ? ` · ${tiles.length} tiled requests` : ""}${parsed.exceededTransferLimit ? " · service capped one or more tiles" : ""}.`; renderAll();
    if (parsed.exceededTransferLimit) showToast(`${dataset.name} loaded with the service result cap; zoom in further for a clearer view.`);
  } catch (error) {
    if (dataset.fallbackFile) {
      try {
        const fallbackResponse = await fetch(dataset.fallbackFile, { cache: "no-store" }); if (!fallbackResponse.ok) throw error;
        const fallbackData = parseInput(await fallbackResponse.text()); const fallbackLayer = addDataLayer(fallbackData, `${dataset.name} · bundled example`, `${dataset.source} · bundled fallback`, dataset.options); fallbackLayer.notes = `${dataset.options.notes} This bundled display fallback is a broad generalized network with named river corridors from the same NHD service.`; renderAll(); showToast(`${dataset.name} loaded from its bundled display example; live service unavailable.`); return;
      } catch (fallbackError) { /* Report the original service error when the local fallback is also unavailable. */ }
    }
    showToast(error.message || `Could not load ${dataset.name}.`);
  }
}
function applyBoundaryMode() { els.statePaths.style.display = boundaryMode === "aquifers" ? "none" : ""; const aquifer = layers.find((layer) => layer.id === aquiferLayerId); if (aquifer) aquifer.visible = boundaryMode !== "states"; if (els.boundaryModeSelect.value !== boundaryMode) els.boundaryModeSelect.value = boundaryMode; if (aquifer && boundaryMode !== "states") els.fileStatus.textContent = "Map foundation · USGS principal aquifers"; renderLayerList(); renderProperties(); renderMap(); }
async function loadBundledAquifers() {
  const existing = layers.find((layer) => layer.id === aquiferLayerId); if (existing) return existing;
  if (aquiferLoadPromise) return aquiferLoadPromise;
  aquiferLoadPromise = (async () => {
    const response = await fetch("aquifers_us.geojson", { cache: "no-store" }); if (!response.ok) throw new Error(`aquifers_us.geojson could not be loaded (${response.status}).`);
    const previousSelectedLayerId = selectedLayerId; const data = parseGeoJSONFeatureCollection(await response.json()); const layer = addDataLayer(data, "USGS principal aquifers", "USGS shapefile · aquifers_us(1)", { foundation: true, role: "context", color: "#397a82", labelField: "AQ_NAME", featureColorField: "ROCK_NAME", geometryDisplay: "outline", strokeWidth: .75, opacity: .64, notes: "USGS principal aquifer coverage. The map uses the broad ROCK_NAME classification for readability; AQ_NAME remains available in the data. Regional/national display source; not site-specific hydrogeologic evidence." }); aquiferLayerId = layer.id; selectedLayerId = previousSelectedLayerId && layers.some((entry) => entry.id === previousSelectedLayerId) ? previousSelectedLayerId : layers.find((entry) => entry.id !== layer.id)?.id || null; return layer;
  })();
  try { return await aquiferLoadPromise; } finally { aquiferLoadPromise = null; }
}
async function setBoundaryMode(mode) {
  boundaryMode = mode;
  if (mode !== "states" && !layers.some((layer) => layer.id === aquiferLayerId)) {
    try { await loadBundledAquifers(); } catch (error) { boundaryMode = "states"; els.boundaryModeSelect.value = "states"; showToast(error.message || "Could not load the aquifer coverage layer."); }
  }
  applyBoundaryMode();
}
function loadBuiltInSample(key) { const sample = BUILT_IN_SAMPLES[key]; if (!sample) return; addDataLayer(sample.data, sample.name, "built-in sample", { role: sample.role, color: sample.color, geometryDisplay: sample.geometryDisplay, featureColorField: sample.featureColorField, displayMode: sample.displayMode, notes: sample.notes || "" }); }
async function loadAllBuiltInSamples() { layers = []; selectedLayerId = null; renderAll(); Object.keys(BUILT_IN_SAMPLES).forEach((key) => loadBuiltInSample(key)); let total = Object.keys(BUILT_IN_SAMPLES).length; try { const response = await fetch("sample.csv", { cache: "no-store" }); if (response.ok) { addDataLayer(parseInput(await response.text()), "sample.csv · groundwater depth", "bundled sample.csv"); total += 1; } } catch (error) { /* The inline samples still work when opened directly from disk. */ } showToast(`${total} sample layers loaded.`); }
function showToast(message) { clearTimeout(toastTimer); els.toast.textContent = message; els.toast.classList.add("is-visible"); toastTimer = setTimeout(() => els.toast.classList.remove("is-visible"), 3500); }

function applyProperties() {
  const layer = layers.find((entry) => entry.id === selectedLayerId); if (!layer) return;
  const previousMapping = layerMappingSignature(layer);
  Object.assign(layer, { name: els.layerNameField.value.trim() || layer.name, geometryType: els.geometryTypeField.value, displayMode: els.displayModeField.value, densityAggregation: els.densityAggregationField.value, densityColorScale: els.densityColorScaleField.value, latitudeField: els.latitudeField.value, longitudeField: els.longitudeField.value, regionField: els.regionField.value, measureField: els.measureField.value, labelField: els.labelField.value, timeField: els.timeField.value, role: els.roleField.value, geometryDisplay: els.geometryDisplayField.value, featureColorField: els.featureColorField.value, color: els.colorField.value, markerSize: Number(els.markerSizeField.value), strokeWidth: Number(els.lineWidthField.value), showLabels: els.showLabelsField.value === "yes", units: els.unitsField.value.trim(), opacity: Number(els.opacityField.value) / 100, notes: els.layerNotesField.value.trim() });
  if (layerMappingSignature(layer) !== previousMapping) refreshLayerCaches(layer);
  renderAll(); showToast("Layer definition applied.");
}

function exportSVG() {
  const svg = document.getElementById("mapSvg").cloneNode(true); svg.querySelectorAll("title, desc").forEach((node) => node.remove()); svg.setAttribute("xmlns", "http://www.w3.org/2000/svg"); const style = document.createElementNS("http://www.w3.org/2000/svg", "style"); style.textContent = ".map-grid{fill:url(#mapGrid)} .state-outline{fill:#f8f8f5;stroke:#6f8089;stroke-width:1}.map-labels text{fill:#697d86;font:9px monospace;text-anchor:middle}.map-labels circle{fill:#607a83}.layer-point .point-core{stroke:#fff;stroke-width:1.5}.layer-point .point-ring{fill:none}.layer-feature{paint-order:stroke}.aquifer-boundary{fill:none;stroke:#819398;stroke-width:.75;opacity:.42}.aquifer-boundary.is-focused{stroke:#176b6b;stroke-width:1.7;opacity:.94}.aquifer-boundary.is-muted{opacity:.1}.map-compass circle{fill:#fff;stroke:#70818a}.map-compass path{fill:#c45b28}.map-compass text{fill:#20303e;font:10px monospace;text-anchor:middle}"; svg.prepend(style);
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml;charset=utf-8" })); const link = document.createElement("a"); link.href = url; link.download = "atlas-map.svg"; link.click(); URL.revokeObjectURL(url); showToast("SVG map exported.");
}

async function seedDemoLayers() {
  const gwdDataset = REAL_DATASETS.usgsCurrent;
  const dataCenterDataset = REAL_DATASETS.pnnl;
  els.fileStatus.textContent = "Loading default GWD and data-center layers…";
  try {
    const responses = await Promise.all([fetch(gwdDataset.file, { cache: "no-store" }), fetch(dataCenterDataset.file, { cache: "no-store" })]);
    const failed = responses.find((response) => !response.ok);
    if (failed) throw new Error("The bundled default layers could not be loaded.");
    const [gwdData, dataCenterData] = await Promise.all(responses.map(async (response) => parseInput(await response.text())));
    const gwdLayer = createLayer(gwdDataset.name, gwdData, gwdDataset.source);
    Object.assign(gwdLayer, gwdDataset.options, { displayMode: "density" });
    const dataCenterLayer = createLayer(dataCenterDataset.name, dataCenterData, dataCenterDataset.source);
    Object.assign(dataCenterLayer, dataCenterDataset.options, { displayMode: "dots" });
    layers = [gwdLayer, dataCenterLayer].map((layer) => { refreshLayerCaches(layer); return { ...layer }; });
    selectedLayerId = gwdLayer.id;
    renderAll();
    els.fileStatus.textContent = "Default view · nationwide USGS GWD + data-center dots";
    showToast("Default view loaded: nationwide USGS GWD with data-center dots.");
  } catch (error) {
    layers = [];
    selectedLayerId = null;
    renderAll();
    els.fileStatus.textContent = "Default layers unavailable · use the data gallery below";
    showToast(error.message || "Could not load the default layers.");
  }
}

document.getElementById("newLayerButton").addEventListener("click", focusDataEntry); document.getElementById("addLayerButton").addEventListener("click", focusDataEntry); document.getElementById("focusLayerButton").addEventListener("click", focusSelectedLayer); document.getElementById("showAllLayersButton").addEventListener("click", showAllLayers); document.getElementById("pasteDataButton").addEventListener("click", focusDataEntry); document.getElementById("openFileButton").addEventListener("click", () => document.getElementById("fileInput").click()); document.getElementById("fileInput").addEventListener("change", (event) => loadFile(event.target.files[0])); document.getElementById("loadSampleFileButton").addEventListener("click", loadBundledSample); document.getElementById("createPastedLayerButton").addEventListener("click", createPastedLayer); document.getElementById("loadExampleButton").addEventListener("click", () => { els.pasteLayerName.value = "sample point observations"; els.pasteInput.value = "lat,long,gwd,year\n30.416,-87.853,35.0,2002\n30.452,-87.742,13.66,2009"; }); document.getElementById("applyPropertiesButton").addEventListener("click", applyProperties); els.geometryTypeField.addEventListener("change", toggleGeometryFields); els.displayModeField.addEventListener("change", toggleGeometryFields); els.opacityField.addEventListener("input", () => { els.opacityOutput.value = `${els.opacityField.value}%`; }); els.markerSizeField.addEventListener("input", () => { els.markerSizeOutput.value = `${els.markerSizeField.value}px`; }); els.lineWidthField.addEventListener("input", () => { els.lineWidthOutput.value = `${els.lineWidthField.value}px`; }); document.getElementById("clearLayersButton").addEventListener("click", () => { layers = []; selectedLayerId = null; aquiferLayerId = null; boundaryMode = "states"; els.boundaryModeSelect.value = "states"; els.statePaths.style.display = ""; renderAll(); els.fileStatus.textContent = "Workspace cleared · add a layer to begin"; }); document.getElementById("exportButton").addEventListener("click", exportSVG); document.getElementById("baseMapSelect").addEventListener("change", (event) => { els.mapGridRect.style.display = event.target.value === "grid" ? "block" : "none"; renderMap(); }); document.getElementById("labelModeSelect").addEventListener("change", (event) => { els.mapLabels.style.display = event.target.value === "state" ? "block" : "none"; renderMap(); }); document.getElementById("mapPresentationSelect").addEventListener("change", (event) => { mapPresentation = event.target.value; renderMap(); }); document.getElementById("layerEmphasisSelect").addEventListener("change", (event) => { mapEmphasis = event.target.value; renderMap(); }); document.getElementById("zoomInButton").addEventListener("click", () => setMapZoom(mapZoom * 1.35)); document.getElementById("zoomOutButton").addEventListener("click", () => setMapZoom(mapZoom / 1.35)); document.getElementById("resetZoomButton").addEventListener("click", resetMapView); document.getElementById("zoomToDataButton").addEventListener("click", zoomToSelectedLayer); document.getElementById("fitMapButton").addEventListener("click", () => { resetMapView(); document.getElementById("mapStage").animate([{ opacity: .72 }, { opacity: 1 }], { duration: 250 }); showToast("Map view reset."); });

document.getElementById("loadRiskLayersButton").addEventListener("click", loadRiskLayers);

document.getElementById("toggleDataEntryButton").addEventListener("click", () => {
  const panel = document.getElementById("dataEntryPanel");
  const isCollapsed = panel.classList.toggle("is-collapsed");
  const button = document.getElementById("toggleDataEntryButton");
  button.setAttribute("aria-expanded", String(!isCollapsed));
  button.textContent = isCollapsed ? "Show" : "Hide";
});
document.getElementById("togglePreviewButton").addEventListener("click", () => {
  const panel = document.querySelector(".preview-panel");
  const isCollapsed = panel.classList.toggle("is-collapsed");
  const button = document.getElementById("togglePreviewButton");
  button.setAttribute("aria-expanded", String(!isCollapsed));
  button.textContent = isCollapsed ? "Show" : "Hide";
});

document.querySelectorAll("[data-sample-key]").forEach((button) => button.addEventListener("click", () => loadBuiltInSample(button.dataset.sampleKey)));
document.querySelectorAll("[data-real-dataset-key]").forEach((button) => button.addEventListener("click", () => loadRealDataset(button.dataset.realDatasetKey)));
document.querySelectorAll("[data-remote-dataset-key]").forEach((button) => button.addEventListener("click", () => loadRemoteDataset(button.dataset.remoteDatasetKey)));
document.getElementById("loadAllSamplesButton").addEventListener("click", loadAllBuiltInSamples);
els.boundaryModeSelect.addEventListener("change", (event) => setBoundaryMode(event.target.value));
els.aquiferFocusType.addEventListener("change", applyAquiferFoundationFocus);
els.aquiferFocusName.addEventListener("change", applyAquiferFoundationFocus);
els.aquiferFocusMode.addEventListener("change", applyAquiferFoundationFocus);
document.getElementById("clearAquiferFocusButton").addEventListener("click", clearAquiferFoundationFocus);
els.filterTypeValue.addEventListener("change", () => {
  const layer = layers.find((entry) => entry.id === selectedLayerId);
  if (!layer) return;
  populateFilterValues(els.filterNameValue, uniqueFieldValues(layer, layer.filterNameField, layer.filterTypeField, els.filterTypeValue.value), els.filterNameValue.value, layer.filterNameField ? "All aquifer names" : "Name field not available");
});
document.getElementById("applyAquiferFilterButton").addEventListener("click", applyAquiferFilter);
document.getElementById("clearAquiferFilterButton").addEventListener("click", clearAquiferFilter);
document.getElementById("applyStateFilterButton").addEventListener("click", applyStateFilter);
document.getElementById("clearStateFilterButton").addEventListener("click", clearStateFilter);
els.temporalValueSelect.addEventListener("change", (event) => setTemporalFilter(event.target.value));
els.temporalSlider.addEventListener("input", (event) => {
  const layer = layers.find((entry) => entry.id === selectedLayerId);
  const options = temporalOptions(layer);
  const index = Number(event.target.value) - 1;
  setTemporalFilter(index >= 0 ? options[index]?.value || "" : "");
});
els.temporalPlayButton.addEventListener("click", toggleTemporalPlayback);
document.getElementById("clearTemporalButton").addEventListener("click", () => setTemporalFilter(""));

bindMapNavigation(); applyMapTransform(); renderBaseMap(); renderStateLabels(); void seedDemoLayers();
