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

This is an experimental, edge-based visual estimator, **not a trained bottle detector**. It looks for vertical bottle boundaries and a strong interior horizontal change that might be the water line. It works best on a single upright, transparent, unlabelled bottle against a plain background. It can mistake labels, background edges, reflections, or other objects for a bottle or water line. Always check the overlay. If the image has no clear candidate, the app withholds the automatic percentage and requests manual adjustment.

The green dashed guide indicates the usable height; the blue line indicates the water surface. Set the top and bottom of the usable bottle with the sliders, then align the water line. Mark empty/full is available when the surface isn't visible. Percentage is `(bottom − water line) / (bottom − top) × 100`, clamped to 0–100. This measures **height**, not volume; curved and tapered bottles require calibration for a volume estimate. Empty is 0–5%; full is 95–100%.

For dependable automatic bottle recognition across arbitrary scenes, the next step is a trained bottle/meniscus segmentation model and a labelled real-photo evaluation set. The current tests cover the percentage mapping, rejection of uniform images, and edge detection on a synthetic fixture; they do not establish real-world accuracy.

The optional Google Fonts stylesheet loads typography only; no image data is sent. System fonts are used if it is unavailable.
