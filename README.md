# APU ParkSmart

APU ParkSmart is a four-page campus parking demo built with HTML, CSS, and vanilla JavaScript:

- `index.html` — Home dashboard, account profile, saved cars, active parking details, and 3D garage.
- `account.html` — One-time account registration and sign-in. Account setup saves one vehicle and its display colour.
- `parking.html` — Choose a saved vehicle and start an untimed parking session.
- `guide.html` — How-to information and project limitations.

The Profile panel is on Home; users can add additional vehicles and choose their display colours there.

See [PROJECT-DOCUMENTATION.md](./PROJECT-DOCUMENTATION.md) for the complete requirements history, implementation decisions, system architecture, Supabase setup, validation record, and known limitations.

## Run locally

Serve the project folder with a static web server and open its local URL. Supabase Auth requires a configured Supabase project. Set the project URL and browser-safe publishable key (or legacy anon key) in `supabase-config.js`, then run `supabase-setup.sql` in the Supabase SQL Editor. Never put a Supabase secret or `service_role` key in this frontend project.

Without that setup, account and parking actions remain unavailable. Google Fonts, Three.js, `<model-viewer>`, QRCode, and Supabase JS load from CDNs. The parked-car view uses Kenney's `sedan-sports.glb` from the [CC0 Car Kit](https://kenney.nl/assets/car-kit); its two yellow parking-bay lines are part of the 3D model and rotate with it. The local illustration remains as a fallback if the model viewer is unavailable.

## Deploy to GitHub Pages

The included GitHub Actions workflow publishes the project root whenever changes are pushed to `main`.

1. In the repository, open **Settings → Pages** and set the build and deployment source to **GitHub Actions**.
2. Push the site files to `main`; the **Deploy static site to GitHub Pages** workflow will publish them.
3. Find the public website URL in the workflow run or under **Settings → Pages**.
4. In Supabase, set the Auth Site URL to the published website URL and add it to the allowed redirect URLs.

The Supabase publishable key in `supabase-config.js` is intended for browser use. Keep database passwords and secret or `service_role` keys private.

## Rates and demo limitations

- Visitor parking is RM 1.00 per hour, charged from the start with no grace period. The session ends when the user ends parking.
- Student and Lecturer / Staff parking is RM 5.00 per day. Ending the session within 10 minutes avoids a charge; otherwise, the daily rate is recorded for each day parked.
- Zone C is labeled Visitors only as an informational campus rule. Zones are not assigned to parking sessions until sensor integration is available.
- The Home page shows the registered car, live time parked, and a live price estimate. After ending a session with a charge, users can view a simulated debit-card result. No card details are collected and no payment is processed.
- Parking availability and the 3D garage are simulated in each browser; they are not connected to campus sensors. The active-session schema includes a sensor location field, but the prototype cannot populate it until a sensor integration is added. Supabase stores accounts, registered car plates, and the user's active parking session.
- Account type, student TP number, and staff ID are user-entered demo information and are not independently verified. Do not use this prototype as an access-control or payment system.
- Supabase row-level policies restrict profile and vehicle data to the signed-in owner. `supabase-setup.sql` creates the required tables, policies, and server-side parking-session/charge procedures.
