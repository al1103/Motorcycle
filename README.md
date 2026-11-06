# Motoform Motorcycle Studio

A responsive, browser-based motorcycle configurator MVP built with Three.js. The viewer creates a real interactive 3D scene with separately modeled body panels, wheels, exhaust, frame, suspension, lighting, and optional frame sliders. Paint, wheel-set, exhaust, and accessory choices update the scene and build estimate immediately. Builds are saved locally in the browser.

## Turntable photos and generated models

Use **360 Photos** to load 12–72 motorcycle photos captured around one full turn at a consistent height. The viewer sorts filenames naturally and lets you scrub through the sequence by dragging, using the frame controls, or enabling auto-rotate. These images remain in the browser and are not uploaded to a server. A photo sequence is a 360° image viewer, not 3D geometry.

Use **Import 3D** to load an existing `.glb` model and inspect its actual geometry in the Three.js viewer. A self-contained GLB is recommended; GLTF files that refer to external texture or buffer files may not load. This app does not include an image-to-3D/photogrammetry generation service. To create a realistic mesh from photos, generate a GLB with a photogrammetry or image-to-3D processor first, then import it. The demo's aftermarket component mappings do not automatically apply to imported models.

## Run locally

No package install or build step is required. Serve the repository root over HTTP (the ES module and Three.js import map need a web server):

```sh
python3 -m http.server 4173
```

Then open <http://localhost:4173>. The Three.js ES module is loaded from jsDelivr, and fonts are loaded from Google Fonts. The viewer displays a clear fallback if WebGL is unavailable.

## Demo scope

The catalog currently includes Yamaha MT-15, Honda CBR150R, and Kawasaki Ninja 400 (2024 demo configurations). The motorcycles are procedural Three.js mesh assemblies, not manufacturer CAD or GLB assets. Aftermarket options are illustrative visual previews with estimated prices, not real products or verified physical fitment. The interface explicitly labels preview fitment as unverified. Suspension and brake replacements remain unavailable until a supported model mapping and compatible part data exist. Builds are stored in `localStorage`; there is no account, server, marketplace, or admin backend in this MVP.
