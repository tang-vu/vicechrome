# Build notes

## Plan and decisions

1. Verify challenge and SDK requirements, scaffold Vite + React + TypeScript.
2. Prove the editor's returned bitmap can be fitted to a deterministic car panel.
3. Build the garage, reveal, boulevard cover, persistence, mobile workspace, and exports.
4. Test the actual SDK path in Chrome, capture evidence, and prepare submission materials.

The repository was empty apart from `.gitattributes`, and `main` was clean. The official wrapper API documents a required `image` and `onSave({ dataUrl, blob })`. Installed `@unlayer/react-image-editor` is 1.0.2; its types were checked before integration. A fixed 2.5D original coupe was selected to keep panel alignment and export deterministic. The supported claim is **door-panel art**, not an arbitrary body wrap. The optional AI Assistant is explicitly disabled.

The app stores one latest applied blob in IndexedDB. A separate active editor session holds a stable input image; switching a commission selects a fresh seed for the next session. Cancel leaves the applied revision intact. Save results are validated, sequenced, and persisted in order. Cover export renders locally at 1600 × 2000. Unlayer requires its remote editor bundle and related assets; failure shows a retry path.

## Verified status

- `npm run build` and `npm run lint` pass.
- Chrome browser automation loaded the real Unlayer editor, selected Draw, drew a diagonal mark, clicked its Save button, and saw the mark on the car and the exported cover. No callback was injected.
- The downloaded cover is a 1600 × 2000 PNG; the flat artwork download opened as PNG. Evidence lives in `docs/evidence/`.
- Chrome flow tested reload restoration, same-view before/after, opening the saved revision, and cancel without losing the applied revision.
- A calibration bitmap with LEFT, RIGHT, an arrow, checkerboard, and diamond stayed correctly oriented on the panel (`calibration-panel.png` and `calibration-car.png`).
- At 390 × 844, the editor loaded with a reachable labeled mobile Save action, and the page had no horizontal overflow. The mobile Save path was exercised separately.

## Limitations

- The coupe is an original stylized 2.5D illustration with one mapped door area. Other panels cannot be edited.
- The image is flattened by Unlayer. There is no layer serialization or live preview before Save.
- Cover typography uses bundled fonts. The image-editing UI itself depends on Unlayer's CDN and may change with its hosted runtime.
- Browser storage is best effort. Only the latest revision is retained to bound storage.
- Reveal has visual motion only; no sound. It is skippable and bypassed for reduced motion.
- The Unlayer challenge FAQ and submission form redirect could not be read through the available web fetch tool. The public announcement requirements were checked separately.
