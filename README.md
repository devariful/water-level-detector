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

Bottle recognition uses the pretrained TensorFlow.js COCO-SSD model (MobileNet V2 Lite). On first use, model files download from `storage.googleapis.com`; an internet connection and access to that domain are required. Images remain on your device. Only detections classified as bottles with at least 50% model confidence are offered. If multiple bottles are found, use the bottle selector. Recognition confidence is **not** water-level accuracy. If recognition fails or finds no bottle, no automatic percentage is shown; retry or adjust all four boundaries manually.

Water level is still an experimental edge-based estimate **inside the detected bottle**. It looks for horizontal changes spanning most of the bottle interior, rather than scanning the whole scene. Labels, reflections, opaque bottles, caps, and tilted bottles can still produce incorrect results. The usable top and bottom are initial estimates from the detected box; adjust them and check the blue water line. No real-world accuracy percentage has been established.

The green dashed guide indicates the usable height; the blue line indicates the water surface. Set the top and bottom of the usable bottle with the sliders, then align the water line. Mark empty/full is available when the surface isn't visible. Percentage is `(bottom − water line) / (bottom − top) × 100`, clamped to 0–100. This measures **height**, not volume; curved and tapered bottles require calibration for a volume estimate. Empty is 0–5%; full is 95–100%.

## Extract bottle label text

Upload or capture a photo, select the bottle, and click **Extract label text**. Tesseract.js reads English text locally. Adjust the bottle boundaries to include the label if necessary. You can edit the extracted text and copy it. Sharp, front-facing label photos work best; curved labels, glare, small printing, and other languages may not read correctly. Always verify numbers and spelling.

`npm install` / `npm ci` runs `scripts/prepare-ocr.mjs`, copying the OCR worker, WebAssembly runtime, and English language data into ignored `public/ocr/`. These assets are included in `dist/` at build time. They are served locally, so OCR needs no external model host or API key. If installation scripts were disabled, run `npm run postinstall` before starting or building.

## Validation

`npm test` covers water-height calculations, image analysis within an off-centre bottle, detection filtering, and blank images. Browser tests exercise actual OCR and graceful model-download failure:

```sh
npx playwright install chromium
npm run test:e2e
```

The browser test deliberately blocks the bottle model download. It verifies the fallback and actual Tesseract output, not real-world bottle recognition accuracy. The cloud used during development blocked `storage.googleapis.com`, so end-to-end trained-model inference on real bottle photos was not verified there. Evaluate representative photos before relying on automatic results.

## Updating on Windows

Stop Vite with Ctrl+C, then run:

```powershell
git pull origin main
npm.cmd install
npm.cmd run dev
```

The optional Google Fonts stylesheet loads typography only; no image data is sent. System fonts are used if it is unavailable.
