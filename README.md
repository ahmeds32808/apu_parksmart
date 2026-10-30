# APU ParkSmart

A responsive, static two-page campus parking demo built with plain HTML, CSS, and vanilla JavaScript. Slot counts, parking-session tracking, the grace period, registration, and checkout are simulated in the browser; there is no backend, database, or real payment processing. The dashboard loads Three.js from a CDN for its low-poly scene and shows a local SVG illustration if the library or WebGL is unavailable.

## Run locally

Open `index.html` in a modern browser, or serve the folder with any static web server. Google Fonts requires an internet connection; the site falls back to a system sans-serif font if the font service is unavailable.

## Deploy to Vercel

1. Push this project folder to a GitHub repository.
2. Go to [vercel.com](https://vercel.com), choose **Add New Project**, and import the repository.
3. Keep the framework preset as **Other**, leave the build command empty, and leave the output directory as the project root.
4. Click **Deploy**.

Alternatively, run `npx vercel` in the project folder and follow the prompts. No install or build command is required.

## Demo notes

- Slot counts are simulated in the browser and change every five seconds. The dashboard status labels and 3D bay lights follow those counts.
- The hero scene is a browser-only, animated Three.js isometric parking garage with 108 lit bays, a ramp, a lift tower, and simulated cars. One car demonstrates an upper-level ramp arrival on load, and dashboard changes dispatch cars through the same clear ramp route without overlapping. The scene's occupied-car count follows the dashboard's available-slot total; it has normal/fast speed controls and falls back to `assets/garage-fallback.svg` when WebGL is unavailable. The APU ParkSmart lettering rolls through a staggered hover animation and respects reduced-motion preferences.
- A confirmed demo booking starts a live parking-duration timer and a 10-minute grace period. The active session timestamp and zone are saved locally in the browser so the timer can resume after a refresh; no card, student, or vehicle details are saved with the timer. **Speed up demo** shortens the grace period to about 15 seconds for testing.
- The parking rate is set by `PARKING_RATE_RM_PER_HOUR` at the top of `script.js`.
- The payment dialog is a UI demo only. Do not enter real debit-card details; no payment information is sent or stored.
