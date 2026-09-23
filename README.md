# VICECHROME

**Design the wrap. Own the boulevard.** VICECHROME is a client-side custom-car studio set in the fictional Solera Bay. Pick one of three original commissions or a blank panel, edit the image with the real [Unlayer React Image Editor](https://github.com/unlayer/react-image-editor), save, and see the returned bitmap mapped onto an original illustrated coupe. Roll into a dusk boulevard shot and download a 1600 × 2000 cover PNG plus the flat panel image.

**Live studio:** https://tang-vu.github.io/vicechrome/ · **Source:** https://github.com/tang-vu/vicechrome

## Run

Requires Node 20.19+ or 22.12+ and npm.

```bash
npm ci
npm run dev
```

Open the local URL printed by Vite. `npm run build`, `npm run typecheck`, and `npm run lint` are production checks. `npm run preview` serves the production build. Browser evidence scripts use Playwright and Chrome. Set `CHROME_PATH` if Chrome is in a nonstandard location, or install Playwright Chromium. Then run `npm run verify:browser`, `npm run verify:mobile`, and `npm run verify:calibration` while the dev server is running. Set `VICECHROME_URL` to test the deployed site with the browser and mobile scripts.

## How the artwork reaches the car

The editor gets a stable 1000 × 335 starter bitmap or the latest applied image. Its desktop Save callback supplies `{ dataUrl, blob }`. VICECHROME validates the flattened result and fits those pixels without stretching through a fixed door-panel clipping path. Body shading, seams, windows, lamps, and wheels stay above or outside the artwork. The same renderer produces the garage view, boulevard view, and cover. Mobile provides a labeled Save action that calls the documented editor `getImage()` method because the SDK's narrow toolbar uses an unlabeled icon.

Only **panel art** is supported. Saved text and stickers are flattened; reopening edits the resulting bitmap, not independent layers. A local upload accepts PNG, JPEG, or WebP up to 8 MB and dimensions from 64 to 6000 pixels. It is fitted without cropping to the 1000 × 335 panel canvas, with pale margins when aspect ratios differ. If a user resizes or crops in Unlayer, the saved result is contained within the panel without stretching. The latest applied revision lives in IndexedDB; build preferences live in localStorage. Storage failure leaves editing and downloads available for the current session.

The editor runtime loads from Unlayer's CDN, so internet access is needed even though the app has no backend, account, API key, or paid runtime service. The optional AI Assistant is disabled. Retry the editor from its error state if the CDN or artwork fails to load. The original coupe and environments are code-drawn illustrations, presented as a stylized vehicle preview rather than 3D or a full-body wrap.

This is an original fan concept. Solera Bay, VICECHROME, the car illustration, artwork, and copy are fictional and do not use Rockstar or GTA assets.

See [build notes](docs/BUILD_NOTES.md), [submission checklist](docs/SUBMISSION.md), [demo script](docs/DEMO_SCRIPT.md), and [asset credits](docs/ASSETS.md).
