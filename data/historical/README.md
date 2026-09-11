# Historical risk-data pack

This directory is the refreshable historical collection layer for Atlas. The
first pass targets a few complete years so the data can support a presentation
without implying that a short history is a full site-engineering assessment.

## Collected coverage

- `2021–2025`: NOAA Storm Events detail records and derived state/year/event-type
  summaries.
- `2021–2025`: USGS daily groundwater-level observations sampled on the 15th of
  each month, using parameter `72019` and statistic `00003`.
- `2016–2017` and `2020`: USGS National Water Availability Assessment (NWAA)
  modeled HUC12 water quantity, withdrawals, consumptive use, and availability
  tables. The 2018 water-quantity and irrigation tables are also present. The
  2019 and remaining 2018 tables are queued for a later retry because the
  public service rate-limited the high-volume archive request.
- `2020–2025`: U.S. Drought Monitor county frequency/severity data already
  bundled in `data/raw/`.

Run the collectors from the repository root:

```sh
node scripts/collect_historical_risk_pack.mjs --start-year 2021 --end-year 2025
node scripts/collect_nwaa_history.mjs --start-year 2016 --end-year 2020
```

Add `--refresh` to the first command to redownload NOAA and USGS files. The
groundwater collector writes one raw GeoJSON response per month, so an
interrupted run can be resumed without discarding completed months.

The NWAA collector is intentionally separate because it is a large HUC12
archive. If the service returns HTTP 429, wait for the rate limit to clear and
rerun the NWAA command; the current partial status is recorded in
`nwaa-manifest.json`.

## Files produced

- `raw/noaa_storm_events/`: official NOAA Storm Events detail archives.
- `raw/usgs_groundwater/`: monthly USGS daily-observation FeatureCollections.
- `derived/noaa_storm_events_YYYY_YYYY.csv`: selected event records with
  locations, casualties, damage, and event metadata.
- `derived/noaa_storm_events_state_year_type_YYYY_YYYY.csv`: presentation-ready
  aggregation by year, state, and event type.
- `derived/usgs_groundwater_monthly_YYYY_YYYY.csv`: normalized groundwater
  observations with coordinates, aquifer/HUC metadata when supplied, and data
  quality fields.
- `derived/usgs_groundwater_change_2021_2025.csv`: annual well means and
  within-well change from the 2021 mean, for the map Time lens.
- `derived/usdm_drought_prevalence_state_year_2020_2025.csv`: annual state
  averages of county D1+ prevalence, including the share of counties above a
  25% frequency threshold.
- `derived/noaa_hazard_state_year_2021_2025.csv`: annual state aggregation of
  unique events, detail records, casualties, reported damage, and event types.
- `collection-manifest.json` and `nwaa-manifest.json`: coverage, URLs, row
  counts, and limitations.

## Important interpretation notes

Groundwater observations are not a balanced panel. A missing value means that a
well did not report an observation in that exact daily window, not that water
was absent. For scoring, calculate per-well coverage, use robust within-well
baselines, and aggregate by aquifer/HUC12 only after checking sample density.

NOAA Storm Events detail rows can represent event/location records rather than
one row per physical hazard episode. The derived summary therefore includes
both `unique_events` and `detail_records`. Damage values are converted from
NOAA's K/M/B notation to nominal dollars and should be treated as reported
screening indicators, not replacement-cost estimates.

NWAA is modeled and HUC12-keyed. It is useful for basin-scale baseline,
seasonality, withdrawal pressure, and availability comparisons, but it does not
replace local groundwater permits, well tests, surface-water rights, utility
studies, or engineering review. Its latest complete year in this pack is 2020.

## Next source families for the scoring model

The full source plan, suggested fields, and metric construction notes are in
[`source-catalog.md`](source-catalog.md). The following sources are
intentionally kept as source links or existing live
layers until a geography, storage, and refresh cadence are chosen:

- FEMA National Risk Index for county/tract hazard frequency, expected annual
  loss, social vulnerability, and community resilience.
- NOAA GHCN-Daily, NOAA Atlas 14, and NOAA climate normals for precipitation,
  temperature, extreme rainfall, heat, and freeze stress.
- USGS StreamStats and Water Data for the Nation surface-water gage records,
  low-flow statistics, and flood-frequency context.
- EPA Water Quality Portal, ATTAINS, and ECHO for source-water and receiving-
  water quality, impairment, permits, and wastewater infrastructure.
- EIA Form 861 reliability/service-territory data and HIFLD transmission data
  for grid continuity and redundancy.
- NOAA coastal water-level/sea-level-rise data, USGS earthquake and landslide
  products, and USDA/USFS wildfire-risk products for site-specific hazard
  screening.
- WRI Aqueduct, NASA GRACE, JRC Global Surface Water, ERA5, and GloFAS when
  the model needs a global or climate-scenario layer.

The recommended final score should keep water quantity, water quality, grid,
hazard, and resilience sub-scores separate until the weighting and dependence
assumptions have been reviewed. Avoid double-counting drought and low-flow
signals that originate from the same climate driver.
