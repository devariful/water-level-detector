# Clarity — bottle water level scanner

A responsive web app that accepts device photos, mobile camera photos, and webcam captures. Images are processed in the browser and are never uploaded to a server. No API keys or backend services are required.

## Develop

Use Node.js 20.19+ or 22.12+.

```sh
npm ci
npm run dev
```

Open the Vite address in a browser. The project can be opened directly in VS Code. Use `npm test` for image-analysis unit tests and `npm run build` for the production build. Deploy the generated `dist/` directory to any static HTTPS host. `npm run preview` serves the production build locally.

## Camera and image requirements

Webcam/live mobile camera access requires HTTPS (or localhost), browser permission, and an attached camera. The separate phone-photo button requests the device's native camera where supported. Upload supports JPG, PNG, and WebP up to 15 MB. Convert HEIC images to JPG first.

## Understanding the result

Bottle recognition uses the pretrained TensorFlow.js COCO-SSD model (full MobileNet V2). Installation downloads about 67 MB of model files from the official `storage.googleapis.com` source, verifies pinned SHA-256 hashes, and saves them in ignored `public/models/bottle/`. The browser loads these local files; deployment includes them in `dist/`. If installation could not download the model, run `npm run prepare:model` (Windows PowerShell: `npm.cmd run prepare:model`). The app tries the official online model if local assets are missing or cannot load. Images remain on your device. Only detections classified as bottles with at least 50% model confidence are offered. Detection scans the full photo and a closer central crop, merges overlapping results, and prioritizes the larger foreground bottle. If multiple bottles are found, use the bottle selector. Recognition confidence is **not** water-level accuracy. If recognition fails or finds no bottle, no box or automatic percentage is shown. Detection status appears immediately below the photo. Click **Draw bottle boundary** and drag across the bottle on the enlarged image (mouse or touch), or use the four boundary sliders. Green outlines mean detected areas; amber outlines mean manually selected areas. Water analysis and OCR require a selected area. These rectangles are bounding boxes, not pixel-perfect bottle silhouette segmentation.

Water level is still an experimental edge-based estimate **inside the detected bottle**. It scores edges spanning most of the bottle interior with consistent contrast direction, masks saturated coloured label bands and their borders, and rejects edges continuing across the background. Several similarly strong edges at different heights are treated as ambiguous (for example, repeated ridges), so no automatic percentage is shown. These are heuristics, not proof that a line is water. Labels, reflections, opaque bottles, caps, and tilted bottles can still produce incorrect results. The usable top and bottom are initial estimates from the detected box; adjust them and check the blue water line. No real-world accuracy percentage has been established.

The green dashed guide indicates the usable height; the blue line indicates the water surface. Set the top and bottom of the usable bottle with the sliders, then align the water line. Mark empty/full is available when the surface isn't visible. Percentage is `(bottom − water line) / (bottom − top) × 100`, clamped to 0–100. This measures **height**, not volume; curved and tapered bottles require calibration for a volume estimate. Empty is 0–5%; full is 95–100%. After adjusting the boundaries, **Find water line in selected area** reruns the surface search without requiring bottle-model recognition. It preserves your selected top and bottom. A manual water-line adjustment remains available when the search is uncertain.

**Optional volume estimate** offers a cylinder or a cylinder with a tapered shoulder. For the latter, enter shoulder height as a percentage of usable height and neck width as a percentage of body width. The estimate integrates squared width along the bottle height, assuming a circular cross-section, a linear shoulder taper, a flat base, and an upright bottle. These dimensions are supplied by the user; they are not recovered from the photo. The main result always remains water-height percentage. Volume is not calibrated and can be wrong for irregular bottles, thick bases, or incorrect dimensions.

## Extract bottle label text

Upload or capture a photo, select the bottle, and click **Extract label text**. Tesseract.js reads English text locally. Adjust the bottle boundaries to include the label if necessary. You can edit the extracted text and copy it. Sharp, front-facing label photos work best; curved labels, glare, small printing, and other languages may not read correctly. Always verify numbers and spelling.

`npm install` / `npm ci` prepares the bottle model and runs `scripts/prepare-ocr.mjs`, copying the OCR worker, WebAssembly runtime, and English language data into ignored `public/ocr/`. These assets are included in `dist/` at build time. They are served locally, so OCR needs no external model host or API key. If installation scripts were disabled, run `npm run postinstall` before starting or building.

## Validation

`npm test` covers water-height and shape-volume calculations, off-centre bottle analysis, coloured-label exclusion, curved/repeated ridge rejection, background-edge rejection, detection filtering, and blank images. The label/ridge scenes are synthetic regression fixtures, not a real-photo accuracy benchmark. The example photo shared in chat was visually inspected, but was not available as a local test file; the algorithm has not been verified to reproduce the visual estimate on that exact photo. Browser tests exercise actual OCR and graceful model-download failure:

```sh
npx playwright install chromium
npm run test:e2e
```

The default browser tests deliberately block both local and online bottle model loading. It verifies the fallback and actual Tesseract output, not real-world bottle recognition accuracy. The model host is now accessible in the development cloud. The actual local full model was tested on COCO reference image 000000000283: it recognized the foreground wine bottle with 97% model confidence; the displayed usable-height box overlapped its annotation by about 78% IoU. This single reference check is not a general accuracy benchmark or verification of the user’s attached bottle photo. Evaluate representative photos before relying on automatic results. To exercise the real model with your own local photo, set `BOTTLE_TEST_IMAGE` to its absolute path and run `npm run test:e2e`.

## Updating on Windows

Stop Vite with Ctrl+C, then run:

```powershell
git pull origin main
npm.cmd install
npm.cmd run dev
```

The optional Google Fonts stylesheet loads typography only; no image data is sent. System fonts are used if it is unavailable.
