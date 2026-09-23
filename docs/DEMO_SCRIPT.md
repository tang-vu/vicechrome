# Recorded demo

The actual 57.2-second captioned screen recording is [vicechrome-demo.mp4](evidence/vicechrome-demo.mp4). It uses the live React UI and real Unlayer editor; no callback or finished car image was substituted. The [exported cover from the recording](evidence/demo-cover.png) is available for inspection. The video is silent, with captions at each step.

## Sequence

1. Original illustrated car and garage.
2. Open Unlayer Draw and make a conspicuous diagonal mark across the starter panel.
3. Save in the editor; show the same mark on the door and toggle before/after.
4. Press ROLL OUT; show the shutter rising in front of the car, the light sweep, and the boulevard composition.
5. Click SAVE COVER and display the downloaded PNG with the same mark.

To record again while the dev server runs, use `node scripts/record-demo.mjs`. Playwright records the actual browser to WebM; convert it to MP4 with FFmpeg. The committed MP4 was inspected by sampling frames across the clip and checking its duration and exported cover.
