# Atlas

Atlas is a static, client-side US geospatial data viewer for layering CSV, JSON, and GeoJSON data. It is intentionally built with plain HTML, CSS, and JavaScript so it can deploy directly to GitHub Pages with no build step.

## Use it

Open `index.html` in a browser, or enable GitHub Pages for the repository root. Use **Open data…** or **Paste data…** to load a layer. After loading, use **Layer properties** to explicitly define the layer:

The Load data panel also includes a built-in sample gallery covering state tables, CSV points, wide point records, GeoJSON points and multipoints, polygons, lines, multipolygons, and mixed geometry collections. Use **Load all demo layers** to see the supported visual layer types together.

The same panel includes a real reference layer: **PNNL data center buildings** loads the bundled `pnnl_atlas_records.csv` snapshot with 1,237 building-level records. The source is the [PNNL IM3 Open Source Data Center Atlas](https://im3.pnnl.gov/datacenter-atlas/), distributed here through the [Energy Factbook data release](https://energyfactbook.com/data-centers/map/). It is derived from OpenStreetMap, licensed under ODbL, and accompanied by [`ODBL-NOTICE.md`](ODBL-NOTICE.md). The locations are useful for visual reference but are not a complete census, and the dataset does not contain power-demand calculations.

The real-data gallery also includes bundled display snapshots for **EIA electric power plants** (`eia_power_plants_2025.csv`, 16,900 located plant records from the 2025 early release), **HIFLD substations** (`hifld_substations.geojson`, 77,945 nationwide point records), and **USGS public-supply water service areas** (`usgs_public_supply_water_service_areas.geojson`, 18,806 polygons). The substation snapshot was retrieved from this [public HIFLD ArcGIS service copy](https://services6.arcgis.com/OO2s4OoyCZkYJ6oE/arcgis/rest/services/Substations/FeatureServer/0) and covers the country, but HIFLD notes that lower-voltage coverage is incomplete. The map viewport-samples this large point file so it stays responsive, then selects the points in view when you zoom or pan. The water-service file is a display derivative of the USGS `WSA_v1.zip`: reprojected to WGS84 and simplified with a 250 m topology-preserving tolerance, so it is appropriate for visual context but not boundary-accurate analysis. EIA warns that the 2025 early release is not fully edited and should not be used for aggregation.

The gallery also includes **Observed groundwater depth · 2022**, a compact display subset of `features_observaed_gwd_CONUS_20012020.csv`. It contains the most recent year present in that source, keeps up to six records per 2° grid cell with monthly variation, and is intended for visual exploration only.

The gallery also includes **USGS groundwater · nationwide latest available**, a refreshable map-ready snapshot of the latest available daily depth-to-water value for each geolocated monitoring site. To refresh it locally, put a USGS API key in `key.txt` and run `node scripts/build_usgs_current_gwd.mjs`. The script uses the current paginated USGS Water Data OGC API, never writes the key into the CSV or browser code, and keeps one observation per site. `key.txt` is excluded from version control. This is a nationwide latest-value snapshot, not the complete historical archive.

Large national layers are handled as viewport queries so GitHub Pages does not have to ship multi-hundred-megabyte files. The gallery can query **HIFLD transmission lines**, the **USFWS National Wetlands Inventory**, **FEMA NFHL flood hazard zones**, and **USGS PAD-US 4.1 protected areas** from public ArcGIS services; clicking one of these cards automatically moves the map to that service's readable scale. Each query is capped for readable display and its current geographic extent is written into the layer notes. The official USGS water-service-area release is linked from the gallery for users who need the unsimplified 123 MB source ZIP.

The default view loads the nationwide USGS groundwater snapshot as an average-`gwd_ft` value heatmap and the PNNL data-center inventory as uniform dots. Density layers can aggregate record count, average measure, sum, or maximum measure, and can use blue-to-red, green-to-red, red-to-green, or single-layer-color intensity scales. The cell tooltip reports the selected value and record count. Other dense point layers use a zoom-aware display: at the country view, nearby records become count bubbles; after zooming past the national overview scale, the individual points return. Hovering a count bubble reports how many records it represents.

The map toolbar includes **Boundary lines**. Selecting **Aquifer lines** or **Both** lazy-loads the bundled USGS principal-aquifer GeoJSON coverage (`aquifers_us.geojson`); **State lines** shows the existing lower-48 state outlines. The aquifer layer preserves all 4,637 source polygon features and defaults to the six broad `ROCK_NAME` classes so the national view remains interpretable; the more detailed `AQ_NAME` field remains available in the layer data.

When an aquifer layer is selected, **Aquifer focus** appears in Layer properties. Choose a broad `ROCK_NAME` type, a specific `AQ_NAME`, or both. **Highlight matches** dims the rest of the coverage; **Show matches only** removes non-matching polygons from the map. Changing the type narrows the specific-name list.

Aquifer polygons are hoverable across their full area. Hovering raises and emphasizes the polygon and shows its specific aquifer name plus broad aquifer type.

- geometry type: point coordinates, state / region code, or source GeoJSON geometry
- latitude and longitude fields, or a state / region field
- the measure to show, plus optional label and time / category fields
- layer role, color, feature-level color field, area fill/outline style, marker size, line width, opacity, and notes

CSV files should have a header row. Atlas recognizes:

- state abbreviations or full state names in fields like `state`, `abbr`, `region`, or `code`
- latitude / longitude fields for point layers, including `lat` and `long` from `sample.csv`
- GeoJSON `FeatureCollection` geometries, which remain as points, lines, or polygons for display
- polygon coverage layers such as aquifers, protected areas, and candidate footprints; choose a broad field such as `ROCK_NAME` for distinct category colors, while detailed fields such as `AQ_NAME` remain available for inspection
- numeric measures in fields like `value`, `measure`, `gwd`, `amount`, `score`, `count`, or `total`

Wide datasets are supported: only the selected measure is rendered, so columns such as `P_1` through `P_36`, `T_1` through `T_36`, or `PET_1` through `PET_36` can become separate layers from the same file.

Point layers use a shared Web Mercator projection with the bundled lower-48 state boundaries. The `sample.csv` shape (`lat`, `long`, `gwd`) is recognized automatically: the 1,000 rows plot at their real coordinates and `gwd` is used as the default measure.

For data-center building-area work, use separate layers for candidate building footprints, transmission and road infrastructure, water or protected-land constraints, aquifer coverage, and other context. Assign each layer a role and visual style in Layer properties, then use the legend, feature colors, opacity, labels, zoom, and layer ordering to compare them. Atlas is a display and inspection tool only: it does not calculate suitability, buffers, intersections, distances, rankings, or other models. The built-in aquifer sample is illustrative rather than authoritative.

Use the map wheel or `+` / `−` controls to zoom, drag to pan, or use **Zoom to data** to fit the selected layer. Point markers stay readable as the geographic spacing expands.

All parsing and rendering happens locally in the browser. The export action downloads the current SVG map.
