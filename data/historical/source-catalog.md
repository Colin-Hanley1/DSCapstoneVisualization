# Risk-data source catalog

This is the source plan behind the location-risk metric. It separates data that
can support a historical trend from static context, modeled estimates, and
future-looking scenarios.

## Water quantity and water quality

| Need | Primary source | Useful fields or metrics | Geography / period |
| --- | --- | --- | --- |
| Basin water budget and surface/groundwater interaction | [USGS NWAA Data Companion web services](https://water.usgs.gov/nwaa-data/web-services/) | recharge, runoff, baseflow, soil moisture, withdrawals, consumptive use, streamflow, availability; monthly and annual resolutions | HUC12; modeled historical periods, currently through 2020 in this pack |
| Observed groundwater levels and metadata | [USGS Water Data OGC APIs](https://api.waterdata.usgs.gov/docs/ogcapi) and [NGWMN](https://www.usgs.gov/apps/ngwmn/) | depth to water, trend/slope, measurement density, aquifer, well construction, period of record | Well/time-series; historical and current observations |
| Groundwater storage anomaly | [NASA GRACE Tellus](https://grace.jpl.nasa.gov/) | terrestrial water-storage anomaly and trend | Coarse regional grids; 2002-present; calibrate against wells |
| Surface-water gages and low-flow context | [USGS StreamStats](https://www.usgs.gov/streamstats) and [USGS Water Data APIs](https://api.waterdata.usgs.gov/) | daily discharge, 7Q10/low-flow statistics, flood frequency, gage period of record | Gage and watershed; station-specific historical records |
| Surface-water extent and seasonality | [JRC Global Surface Water Explorer](https://data.jrc.ec.europa.eu/dataset/jrc-gswe-global-surface-water-explorer-v1) | occurrence, seasonality, recurrence, change, maximum extent | Global Landsat-derived history; suitable for water-body context |
| Water quality and impairments | [EPA Water Quality Portal](https://www.epa.gov/waterdata/water-quality-data-download), [ATTAINS](https://www.epa.gov/tmdl), and [ECHO](https://echo.epa.gov/tools/data-downloads) | nutrients, metals, salinity/TDS, temperature, impairments, permits, discharge facilities | Monitoring station, assessed waterbody, facility; historical records vary |
| Large-scale water stress and future scenarios | [WRI Aqueduct 4.0](https://www.wri.org/data/aqueduct-global-maps-40-data) | baseline water stress, depletion, interannual/seasonal variability, groundwater-table decline, drought, flood; future scenario layers | Global basins/grids; baseline and scenario years |

## Drought, climate, and natural hazards

| Need | Primary source | Useful fields or metrics | Geography / period |
| --- | --- | --- | --- |
| Historical drought severity and frequency | [U.S. Drought Monitor historical information](https://www.drought.gov/historical-information) and [gridded USDM](https://www.drought.gov/data-maps-tools/gridded-us-drought-monitor-usdm) | weekly D0–D4 class, duration, recurrence, onset/recovery, seasonal drought share | CONUS; 2000-present weekly; SPI/PDSI can extend farther back |
| Precipitation, heat, freeze, and climate variability | [NOAA GHCN-Daily](https://www.ncei.noaa.gov/metadata/geoportal/rest/metadata/item/gov.noaa.ncdc%3AC00861/html), [NOAA climate normals](https://www.ncei.noaa.gov/products/land-based-station/us-climate-normals), and [ERA5](https://cds.climate.copernicus.eu/datasets/reanalysis-era5-complete) | precipitation totals and anomalies, extreme heat/cold, wet/dry spells, normals, evapotranspiration proxies | Station and gridded; GHCN varies by station, ERA5 1940-present globally |
| Extreme rainfall and design storms | [NOAA Atlas 14](https://www.weather.gov/news/241909-NOAA-Atlas-14) | precipitation frequency estimates and confidence intervals | U.S. regional grids; engineering design context |
| Event prevalence and impact history | [NOAA Storm Events Database](https://www.ncei.noaa.gov/access/storm-events-database) | event count, casualties, property/crop damage, event type, coordinates, narrative | U.S. storm-event records; coverage varies by event type and era |
| Probabilistic county/tract hazard screen | [FEMA National Risk Index](https://www.fema.gov/national-risk-index) and [technical documentation](https://www.fema.gov/sites/default/files/documents/fema_national-risk-index_technical-documentation.pdf) | annualized frequency, expected annual loss, social vulnerability, community resilience | County/tract; 18 natural hazards and derived risk measures |
| Tropical cyclone history | [NOAA IBTrACS](https://www.ncei.noaa.gov/products/international-best-track-archive) and [HURDAT2](https://www.nhc.noaa.gov/data/) | track proximity, wind, pressure, recurrence, landfall distance | Global / Atlantic / eastern Pacific; long historical records |
| Earthquake and landslide exposure | [USGS earthquake hazards data](https://www.usgs.gov/programs/earthquake-hazards/data) and [USGS landslide hazards data](https://www.usgs.gov/programs/landslide-hazards/data) | shaking, fault proximity, event frequency, landslide susceptibility/inventory | U.S.; use site-specific geology for final engineering |
| Wildfire and active fire | [USFS Wildfire Risk to Communities](https://research.fs.usda.gov/firelab/products/dataandtools/wildfire-risk-communities) and [NASA FIRMS](https://firms.eosdis.nasa.gov/) | wildfire likelihood, burn probability, flame intensity proxies, recent fire detections | U.S. regional screening plus global satellite archive |
| Coastal flood and sea-level rise | [NOAA Sea Level Rise Viewer](https://coast.noaa.gov/digitalcoast/tools/slr.html) | inundation depth/extent, tidal flooding, scenario year | Coastal U.S.; scenario-based, not a storm-surge forecast |

## Infrastructure and resilience

| Need | Primary source | Useful fields or metrics |
| --- | --- | --- |
| Electric reliability and service territory | [EIA Form 861](https://www.eia.gov/electricity/data/eia861/) | SAIDI, SAIFI, CAIDI, utility territory, customer counts and interruption context |
| Transmission and substation redundancy | [HIFLD transmission data](https://catalog.data.gov/dataset/electric-power-transmission-lines) plus existing Atlas HIFLD layers | distance to substations/transmission, number of independent corridors, voltage, interconnection context |
| Broadband and communications redundancy | [FCC National Broadband Map](https://broadbandmap.fcc.gov/data-download/nationwide-data) | provider count, fiber availability, route diversity, reported service technology |
| Floodplain and protected-area constraints | existing Atlas [FEMA NFHL](https://www.fema.gov/flood-maps/national-flood-hazard-layer), [USGS PAD-US](https://www.usgs.gov/programs/gap-analysis-project/science/pad-us-data-downloads), and USFWS wetlands layers | flood zone, wetland overlap, protected-area constraints, permitting flags |

## Suggested metric construction

For each candidate site, preserve the sub-scores before producing a composite:

1. **Water baseline:** multi-year median modeled availability and observed
   groundwater depth, with a separate surface-water supply indicator.
2. **Water fluctuation:** interannual coefficient of variation, seasonal range,
   drought-year percentile, low-flow percentile, groundwater trend, and data
   coverage.
3. **Water competition and quality:** local withdrawals/consumptive use,
   permitted supply, impairment/quality flags, and cooling-water treatment
   burden.
4. **Hazard:** annualized frequency and expected loss, plus direct exposure to
   flood, wind, wildfire, earthquake, landslide, extreme heat, and coastal
   inundation where applicable.
5. **Resilience:** utility reliability, power-path redundancy, communications
   redundancy, flood protection, and recovery/access constraints.

Use percentile or robust z-score transformations within a comparable region,
carry a data-coverage/confidence field, and avoid double-counting drought,
precipitation anomalies, groundwater decline, and low-flow measures that share
the same climate signal. A final parcel decision still requires local water
rights, utility, floodplain, geotechnical, and engineering review.
