# APU ParkSmart

A responsive, static two-page campus parking demo built with plain HTML, CSS, and vanilla JavaScript. There is no build step, backend, or real payment processing.

## Run locally

Open `index.html` in a modern browser, or serve the folder with any static web server. Google Fonts requires an internet connection; the site falls back to a system sans-serif font if the font service is unavailable.

## Deploy to Vercel

1. Push this project folder to a GitHub repository.
2. Go to [vercel.com](https://vercel.com), choose **Add New Project**, and import the repository.
3. Keep the framework preset as **Other**, leave the build command empty, and leave the output directory as the project root.
4. Click **Deploy**.

Alternatively, run `npx vercel` in the project folder and follow the prompts. No install or build command is required.

## Demo notes

- Slot counts are simulated in the browser and change every five seconds.
- The parking rate is set by `PARKING_RATE_RM_PER_HOUR` at the top of `script.js`.
- The payment dialog is a UI demo only. Do not enter real debit-card details; no payment information is sent or stored.
