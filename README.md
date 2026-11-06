# Motoform Motorcycle Studio

A responsive motorcycle catalog and image-view studio. The viewer presents five still-image camera views instead of a live 3D viewport. It can also generate an AI concept image for the currently selected angle. AI output is explicitly labeled as illustrative—not OEM-accurate.

## Motorcycle list and view status

The selector/catalog list is driven by `data/catalog.json`. It currently has eight selectable records. The Yamaha MT-15 has manufacturer-sourced specifications; one generic dirt-bike scene uses the included CC0 model. Other catalog entries are explicitly marked as pending verified specs and OEM imagery. Until exact-model assets are sourced, their fallback images are rendered from illustrative geometry and labeled accordingly; they must not be represented as accurate OEM views. Users can request an AI concept image for one angle at a time.

## Accessory ideas

Each catalog record has an `recommendations` list grouped by theme. The UI shows these categories without prices. They are general ideas—not product listings, compatibility claims, safety certifications or installation instructions. Confirm exact model year, variant, mounts, road rules and safety with the manufacturer or qualified shop before buying/installing anything. No prices are displayed in the UI.

## Included licensed asset

The generic dirt-bike GLB is [tevy — Dirt Bike](https://tevy.dev/models/dirt-bike), v1 LOD0, CC0 1.0, stored at `assets/models/tevy-dirt-bike.glb`. It is a generic motocross asset, not a named production motorcycle. Its 250 cc description and nominal dimensions belong to the asset and are not OEM specifications. Decoder support for its meshopt and KTX2 data is configured in the Three.js loader. A studio still render is saved at `assets/images/tevy-dirt-bike-render.png`.

Yamaha MT-15 specifications link to the [Yamaha Motor Indonesia product page](https://www.yamaha-motor.co.id/product/mt15/). No licensed MT-15 3D model or actual factory-view photographs are bundled. The image views for it are explicitly illustrative.

## Add another motorcycle

1. Add a record in `data/catalog.json`, with an authoritative source or a clear pending-data status.
2. Add a view-model mapping only when a licensed model is available; record creator/license/source in `assets/ASSET-LICENSES.md`.
3. Add bike-specific recommendation groups as non-binding ideas.
4. Never claim exact OEM image accuracy or part compatibility from a generic model. The app will render the current procedural preview for catalog items without an asset and label it as illustrative.

## Run locally

No package install or build step is required. Serve the repository root over HTTP because ES modules, catalog JSON and GLB assets are loaded by the browser:

```sh
python3 -m http.server 4173
```

Open <http://localhost:4173>. Three.js and its KTX2 decoder are loaded from jsDelivr. Fallback angle renders and AI concepts are retained in browser memory for the current session.

## AI concept images

Choose a camera angle and click **Tạo ảnh AI góc này**. The app asks for confirmation before each image, lazily loads [Puter.js](https://js.puter.com/v2/) and calls its documented browser `puter.ai.txt2img` API with the selected fallback render as a reference image. Puter returns an `HTMLImageElement`; the selected still is replaced by the resulting concept if successful. The user can generate the other angles individually. Prompt and reference image are sent to Puter. Usage may consume credits or incur account/model-dependent costs; the app does not set a developer API key or make automatic generation requests. AI results are memory-only and marked as concepts, not accurate OEM vehicle images. See the [Puter image generation documentation](https://docs.puter.com/AI/txt2img/) for current models and terms.
