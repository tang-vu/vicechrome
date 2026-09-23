# Build notes

## Architecture and scope

VICECHROME is a Vite, React, and TypeScript client app. The installed `@unlayer/react-image-editor` wrapper supplies the real editor. Its flattened Save bitmap is validated and fitted without stretching into a fixed door-panel clipping path on a code-drawn coupe. The same canvas renderer produces the garage, boulevard, and 1600 × 2000 cover. Saved art lives in IndexedDB; preferences live in localStorage. Unlayer's hosted runtime requires internet access. The optional AI Assistant is disabled. There is no account, backend, paid service, 3D model, or full-body wrap.

## Finishing pass from review baseline `bdcff4467396b1e168efa6bb6d9046e6497bc143`

- A shared 1000 × 335 panel size now governs starter art and uploaded images. The upload fill covers the final row, and nonmatching aspect ratios retain centered pale margins. The compositor still contains arbitrary valid editor output dimensions.
- The garage shutter is foreground occlusion over the vehicle. `requestAnimationFrame` drives a short eased opening, followed by a sweep over the body and a boulevard composition. The decoded artwork is reused across animation frames. Skip, replay, reduced motion, home navigation, and unmount cancel the active frame.
- One trimmed display name supplies preview, reveal, renderer, and sanitized download filename. The cover renderer limits title width.
- The illustrated car received wheel, arch, seam, glass, highlight, shadow, and headlight glow refinements. The user's bitmap remains unchanged beneath the reflections.
- The SDK host has a stable desktop height. At 390 px, the editor workspace scrolls sideways to preserve a usable canvas when Draw or Text settings open; app Save and Cancel remain visible above it.
- The cover PNG is prepared when the cover appears. The Save click downloads a ready blob synchronously, avoiding a delayed programmatic download after editor and font work.
- README, actual before/after evidence, social metadata with a deployed absolute preview-image URL, and a captioned demo were added.

## Verification

- `npm run build`, `npm run typecheck`, and `npm run lint` pass.
- `node scripts/regressions.mjs` checks opaque 1000 × 335 upload output, opaque last row, centered square source, shutter occlusion at 0/0.5/1, empty and whitespace render equivalence, real import into Unlayer, and four name cases including 28 characters.
- `npm run verify:browser` draws a distinctive mark in the real SDK, saves it, verifies changed door and cover pixels, checks reload, before/after, cancel, and records three actual UI shutter frames: [closed](evidence/reveal-closed.png), [halfway](evidence/reveal-halfway.png), [open](evidence/reveal-open.png). The halfway frame leaves the roof covered while revealing the lower car.
- `npm run verify:mobile` opens Draw at 390 × 844, makes a visible diagonal edit, saves it, and compares the applied car and downloaded cover against the original. It asserts reachable Save, no page horizontal overflow, usable canvas width, PNG dimensions, and no page errors. See [edited mobile canvas](evidence/editor-mobile-edited.png), [applied car](evidence/applied-mobile.png), and [cover](evidence/mobile-cover.png).
- The actual [captioned demo video](evidence/vicechrome-demo.mp4) was recorded from the browser and inspected. The [demo cover](evidence/demo-cover.png) comes from its export click.
- GitHub Pages workflow [run 35827855458](https://github.com/tang-vu/vicechrome/actions/runs/35827855458) succeeded for commit `2ee3bc9`. The public page and absolute Open Graph preview image returned HTTP 200. Desktop and 390 px real-SDK edit/save/cover journeys also passed against `https://tang-vu.github.io/vicechrome/` with no page errors.

## Text workspace correction after live review

The reviewer reproduced a remaining Text → Heading overflow on deployed `907e5f1`: the editor frame was about 570–606 px tall while the SDK wrapper grew to 1,111 px and its canvas to 1,058 px. The installed wrapper exposes `minHeight` and `style`, but no `wrapperStyle` prop. Setting `minHeight={0}` on the SDK and making our `.editor-frame` a flex container bounds the wrapper and canvas without styling undocumented SDK internals.

The focused `npm run verify:text` check now edits a Heading in the real SDK, measures wrapper and canvas bounds, scrolls the long Text settings panel, and checks Save and Cancel. In the local 1440 × 900 run, the wrapper measured 568 px inside a 570 px frame and the canvas 515 px; the settings panel scrolled from 0 to its end. A 390 × 844 Text → Heading check also keeps the canvas inside the frame and the mobile Save control visible. See the [desktop](evidence/editor-text-fixed.png) and [mobile](evidence/editor-text-mobile-fixed.png) evidence.

The official [challenge announcement](https://www.linkedin.com/posts/unlayer_builtwithimageeditor-activity-7501266371553452032-RB8U) was rechecked on September 23, 2026. It states the September 24, 23:59 UTC deadline. The linked FAQ and form redirect were inaccessible through the available fetch tool; no unverified conditions are asserted.

## Limits

Only one door panel is editable. Editor Save flattens layers and reopening edits pixels. Browser storage is best effort. The editor itself depends on Unlayer's CDN. The reveal has no sound and is skipped under reduced motion.
