# Open Database License notice — pnnl_atlas_records.csv

`pnnl_atlas_records.csv` is a database derived from the **PNNL IM3 Open
Source Data Center Atlas** (Mongird, Thurber, Vernon, Burleyson, Akdemir,
Rice; Pacific Northwest National Laboratory; https://doi.org/10.57931/2550666),
whose data-center locations are in turn derived from **OpenStreetMap**,
© OpenStreetMap contributors.

Both the atlas and this derived database are made available under the
**Open Database License (ODbL) 1.0**:
https://opendatacommons.org/licenses/odbl/1-0/

You are free to copy, distribute, transform and build upon this database,
provided you attribute as above and share any derived database under the
same license.

Derivation method: the atlas GeoPackage's `building` layer, deduplicated to
one row per upstream `id` (county-straddling facilities appear upstream as
multiple rows with identical coordinates), with columns limited to
id, layer, state, state_abb, county, operator, name, sqft, lat, lon.
Reproduce with `site/pipeline/fetch_datacenter_atlas.py` in the
energy-factbook repository; upstream checksum and per-layer counts are in
`pnnl_atlas_records.meta.json`.

This file is published together with the CSV at
https://energyfactbook.com/data-centers/data/
