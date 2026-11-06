# Motoform Motorcycle Studio

A responsive motorcycle studio built with Three.js. The catalog contains manufacturer-sourced Yamaha MT-15 specifications and price data plus one licensed, generic dirt-bike GLB. That GLB is loaded as real geometry in the viewer. The MT-15 model remains an illustrative procedural preview, and the appearance controls do not claim to be real aftermarket products or validated fitment. Builds are saved locally in the browser.

## Turntable photos and generated models

Use **360 Photos** to load 12–72 motorcycle photos captured around one full turn at a consistent height. The viewer sorts filenames naturally and lets you scrub through the sequence by dragging, using the frame controls, or enabling auto-rotate. These images remain in the browser and are not uploaded to a server. A photo sequence is a 360° image viewer, not 3D geometry.

Use **Import 3D** to load an existing `.glb` model and inspect its actual geometry in the Three.js viewer. A self-contained GLB is recommended; GLTF files that refer to external texture or buffer files may not load. This app does not include an image-to-3D/photogrammetry generation service. To create a realistic mesh from photos, generate a GLB with a photogrammetry or image-to-3D processor first, then import it. Aftermarket compatibility is not inferred for imported models or the generic catalog GLB.

## Run locally

No package install or build step is required. Serve the repository root over HTTP (the ES module and Three.js import map need a web server):

```sh
python3 -m http.server 4173
```

Then open <http://localhost:4173>. The Three.js ES module is loaded from jsDelivr, and fonts are loaded from Google Fonts. The viewer displays a clear fallback if WebGL is unavailable.

## Current catalog scope

The catalog is driven by `data/catalog.json`. It currently contains one manufacturer-sourced model/specification record (Yamaha MT-15, 2026 Indonesia) and one generic licensed 3D asset. Each entry carries its source and data status. Adding a motorcycle means adding a sourced catalog record and, if offered in the 3D viewer, its separately licensed GLB asset and supported component mappings. The generic asset is not a substitute for a manufacturer-specific bike. The existing MT-15 mesh and component swatches remain visual-only until a licensed MT-15 model and confirmed fitment data are available.

## Verified catalog records and included asset

`data/catalog.json` contains a Yamaha MT-15 2026 Indonesia record based on the [Yamaha Motor Indonesia product page](https://www.yamaha-motor.co.id/product/mt15/), accessed 2026-11-06. The listed price is Yamaha's recommended Jakarta OTR price (Rp 41,215,000), not a universal out-the-door price. Specifications in the UI link back to Yamaha.

The selector also includes one real, generic dirt-bike GLB: [tevy — Dirt Bike](https://tevy.dev/models/dirt-bike), v1 LOD0, CC0 1.0. `assets/models/tevy-dirt-bike.glb` is the included 2.6 MB mesh. It is a generic 250 cc motocross asset, not a named production bike and not verified for road use or part compatibility. Its 0.85 × 1.24 × 2.16 m dimensions are the asset's nominal dimensions, not OEM specifications. The generated catalog image is a studio render captured from this mesh; it is not an AI-generated image or a product photograph.

The existing MT-15 configurator mesh is still an illustrative stand-in because no licensed Yamaha-specific GLB is included. Paint, wheel, exhaust, and accessory controls are visual-only previews, not real products. No aftermarket prices are invented: only an unmodified MT-15 shows Yamaha's sourced base price; modified builds and the generic asset show “Not priced”.
