# APU ParkSmart — Project Documentation

## 1. Project overview

APU ParkSmart is a six-page campus-parking prototype for Asia Pacific University (APU). It demonstrates account setup, saved vehicles, parking-session timing and pricing, simulated parking availability, an About Us page, and a demo rating dashboard.

The public demo is available at [https://ahmeds32808.github.io/apu_parksmart/](https://ahmeds32808.github.io/apu_parksmart/).

This is a student-project demonstration, not a live campus parking reservation or payment service. Parking sensors and a real payment processor are not connected.

## 2. Development history: requirements and changes from start to current release

This section records the project decisions in the order they evolved, including ideas that were later removed or changed. The current behavior is described in the later sections.

### Phase 1 — Initial idea and four-page structure

The original request described a parking duration, a registration page, a Home-page 10-minute timer/pricing box, car information, a parking registration page, car location, and a count of website visitors. The user asked for four pages total and clarified that account registration should happen once, separately from the user's profile/vehicle management. The visitor counter was later removed at the user's request.

The resulting page structure is:

1. **Home** for the dashboard, profile, and active parking session.
2. **Account Registration** for first-time account creation and later sign-in.
3. **Register Parking** for starting a parking session using a previously registered car.
4. **Guide** for instructions, pricing, and limitations.

Profile and saved-car management are a panel on Home, not a fifth page.

The Home dashboard also includes an overall space count and per-zone availability cards, an animated garage/parking scene, last-updated time, an Instagram link/QR code, and a profile panel. These are demonstration features; the animated availability changes are not connected to real parking occupancy.

### Phase 2 — Separate account setup from parking

Account creation was designed as one-time setup. It captures the account type and identity field (student TP number or staff ID), plus the first vehicle plate and colour. Users can add more cars later from Home.

The user explicitly removed vehicle zone, duration, amount, and available-slot inputs from the registration/parking form. The final Supabase parking form asks the signed-in user to choose a saved car and start or end parking; it does not ask them to book a duration or select a zone.

The project initially explored a different browser-only booking/checkout flow with zone selection, duration, generated sample amounts, and card-shaped form inputs. That design is not the current four-page Supabase flow. A separate legacy `script.js` remains in the repository but is not loaded by the current four HTML pages; do not treat it as the live account-backed flow.

### Phase 3 — Finalize account types, rates, and grace period

The final pricing rules are:

- Visitors pay RM 1.00 per hour from the start; there is no grace period.
- Students and Lecturer / Staff pay RM 5.00 per day.
- Students and Lecturer / Staff can end parking within 10 minutes without a charge.
- Student and staff daily charges count Malaysia calendar dates touched by the session.

The user clarified that visitor grace must be zero and that students and lecturers/staff share the same 10-minute grace period. A parking session starts when the user registers parking and ends when the user ends it. There is no user-selected session duration.

### Phase 4 — Home active-session experience and vehicle artwork

Home was changed to show the regular dashboard when no parking is active, and a separate active-session panel when a session exists. The active panel includes a parked-car visual, elapsed timer, vehicle identity, estimated price, rate, grace-period status for students/staff, and sensor location when available.

The artwork went through multiple revisions after the user rejected early cartoon-like versions. A visual preview mode (`?carPreview=<colour>`) was added so the parked-car view can be inspected without creating a real parking session.

The final car view uses a free model from Kenney's CC0 Car Kit. The two yellow bay lines are geometry inside the GLB model, so they rotate with the car instead of being a fixed page overlay. The car paint can display the seven saved colours: orange, blue, red, green, purple, silver, and black. A local illustration is retained as a fallback if the 3D model viewer cannot load.

The Home dashboard's availability values total 108 sample bays (36 in Zone A, 42 in Zone B, and 30 in Zone C) and update in the browser on a timer. The garage animation reflects this simulated availability only.

The user also reported that an unnecessary local Python preview server was blocking further prompts. Preview work was subsequently done through the browser without leaving a development server running.

### Phase 5 — Supabase connection and database

The browser app was connected to the user's Supabase project using its project URL and browser-safe publishable key. The key is intended for browser use; a Supabase secret or `service_role` key must never be put in frontend code.

The SQL setup creates profile, vehicle, and parking-session tables; row-level security and access policies; a new-user trigger that creates the profile and first vehicle; and RPC functions for starting and ending sessions. An outdated revoke statement for an earlier `start_parking_session` function signature caused the first setup attempt to fail. That stale statement was removed, after which the user ran the setup successfully in Supabase.

Supabase Auth redirect settings were later corrected to use the published GitHub Pages site as the Site URL and allowed redirect destination. Email confirmation initially sent users to a broken local URL. At the user's request, the Supabase dashboard's **Confirm email** setting was then disabled so new demo accounts could sign in without waiting for email delivery. Email and password are still required; an email address is no longer verified by this demo configuration.

### Phase 6 — Hosting and public access

The project was published as a GitHub Pages site at [https://ahmeds32808.github.io/apu_parksmart/](https://ahmeds32808.github.io/apu_parksmart/). A GitHub Actions workflow deploys the repository root after pushes to `main`. The user asked for a shareable website URL and received the Pages address.

Earlier repository milestones include publishing the site/Instagram link, adding the animated garage, adding parking-session/grace tracking, and then moving to the GitHub Pages workflow. The final Pages workflow is the deployment path in use; an earlier Vercel deployment trigger is historical, not the current source of public hosting.

### Phase 7 — Live-flow testing and fixes

The public pages, account form validations, signed-out UI, mobile layouts, Guide navigation/FAQ, visitor counter (before its removal), and car-colour views were tested. Testing found a Supabase `AuthSessionMissingError` on a signed-out visit; the app was updated to show the regular sign-in prompt instead. A cache-busting query version was added to all four pages so browsers fetch the new `app.js`.

With the user's permission, Visitor and Student test accounts were created and their live flows tested. The Visitor flow confirmed hourly charging with no grace period, duplicate-active-session prevention, and ending sessions. The Student flow confirmed the 10-minute countdown and zero charge when ended within the grace period. A temporary extra vehicle was added to verify multi-car selection and then removed. Test sessions were ended; no active test parking session remained after that test round.

Two short Visitor test sessions each recorded RM 0.02 in the live test history; no real payment occurred. The account flow also rejected a duplicate vehicle plate, accepted a second distinct vehicle, showed both vehicles in the parking selector, and the extra test vehicle was removed afterward. Sign-out was tested and the browser was left signed out at the end of that test round.

Staff signup was initially blocked by Supabase's email rate limit (HTTP 429). After the user asked to stop relying on email, confirmation was disabled in the Supabase dashboard. A Staff account then registered and appeared signed in on Home without confirmation email. The broader Staff parking flow was not separately completed.

The Student server-side charge procedure was also tested in a transaction that was rolled back afterward: an under-10-minute session returned RM 0 and a cancelled/not-charged status; a session at the 10-minute boundary returned RM 5 and a completed/charged status. A read-only check after testing confirmed no Staff test user existed at that point and no active Student session remained. The Staff account was created later, when email confirmation was disabled.

### Phase 8 — Current visitor-counter removal, zone, payment, and documentation updates

The website-visitor counter was removed from Home at the user's request. The browser no longer creates or stores visitor IDs or calls the visitor-count RPC. The SQL setup drops the old `record_daily_visitor` function if the setup script is rerun; an existing `daily_website_visitors` table is left untouched to preserve any prior records.

The user requested that Zone C be for visitors. Because live sessions do not have a zone-selection or sensor-assignment flow, the agreed implementation is a visual rule only: Zone C is labeled **Visitors only** on the Home availability dashboard and parking map. No zone is assigned or access-controlled by the current live flow.

The user also requested a debit-card option but chose a demo-only interaction. After ending a session with a positive calculated charge, Home offers **Pay by debit card (demo)**. Selecting it shows a simulated completion message without asking for card information, calling a payment provider, or charging money.

This document was added to record the full project history, current architecture, setup, testing, and known limitations.

## 3. Pages and user journeys

| Page | File | Purpose |
|---|---|---|
| Home | `index.html` | Dashboard, simulated availability, profile and saved vehicles, active parking session, and demo payment result |
| Account Registration | `account.html` | Create an account once or sign in; the first vehicle is saved with the account |
| Register Parking | `parking.html` | Start parking using a vehicle already saved to the signed-in account |
| Guide | `guide.html` | Instructions, pricing rules, demo limitations, and FAQs |

Typical journey:

1. Register an account with name, email, password, account type, and first vehicle. Students enter a TP number; Lecturer / Staff enter a staff ID.
2. Sign in on later visits and optionally add more vehicles from the Home profile.
3. Open Register Parking and start a session using one of the saved vehicles.
4. Home displays the active vehicle, elapsed time, price estimate, and sensor location when available.
5. End parking on Home. The server calculates the final demo amount. For a positive amount, the user may select the debit-card demo action.

## 4. Account and pricing rules

| Account type | Parking rate | Grace period |
|---|---:|---|
| Visitor | RM 1.00 per hour | None; charges begin at the start |
| Student | RM 5.00 per day | 10 minutes |
| Lecturer / Staff | RM 5.00 per day | 10 minutes |

For Students and Lecturer / Staff, ending parking during the first 10 minutes records RM 0. Otherwise, the daily amount is based on the number of Malaysia calendar dates touched by the session, including its start and end dates.

The server-side Supabase functions are the source of truth for starting and ending sessions. The Home page separately shows a live estimate while a session is active.

## 5. Parking zones and availability

- The Home dashboard’s zone counts and the animated parking scene are simulated in the browser. They do not reserve actual spaces or communicate with APU sensors.
- The displayed sample zone capacities are 36 for A, 42 for B, and 30 for C (108 total). Availability changes locally in the browser and should not be interpreted as live inventory.
- Zone C is labeled **Visitors only** on the availability dashboard and campus map, as an informational visual rule.
- The live Supabase parking flow does not let a user select a zone and does not assign a zone to a session. Zone assignment requires a real sensor or parking-system integration; the current label does not enforce access.
- The exact vehicle location is unavailable until a connected sensor reports it. The session table has a `sensor_location` field for that future integration.

## 6. Demo debit-card option

After a parking session ends with a positive calculated amount, Home offers **Pay by debit card (demo)**. Selecting it changes the page to a simulated completion message.

- No card number, expiry date, CVV, PIN, or other payment credential is requested.
- No payment provider is called.
- No transaction is submitted and no payment details are stored.
- The simulated result is a page-only demonstration; it does not mark a real bank payment as settled.
- A zero-amount session does not offer a payment action.

Real payments require a payment provider with a hosted checkout, server-side payment creation and verification, webhook handling, and appropriate security/compliance review. Never add raw card collection to this static frontend.

## 7. Technical architecture

### Frontend

- Static HTML and CSS with vanilla JavaScript; no frontend framework or build step is required.
- `app.js` implements Supabase access, account/profile display, simulated dashboard availability, and Home parking-session display.
- `parking-app.js` loads the signed-in user’s vehicles and starts a session through Supabase.
- `garage-scene.js` renders the illustrated/simulated campus parking scene.
- `style.css` contains layout, responsive styling, and component styles.
- `supabase-config.js` contains the Supabase project URL and browser-safe publishable/anon key. It must never contain a service-role key or other secret.
- `ratings-dashboard.html` and `ratings-dashboard.js` display the anonymized parking-rating summary returned by Supabase.
- `script.js` is a legacy standalone browser-only booking prototype and is not included by the current HTML pages.
- `assets/parked-car.glb` is the car model with the yellow bay-line meshes embedded. The bay lines use their own material so vehicle paint recolouring does not change them.
- `assets/Textures/colormap.png` supplies the model's car-paint texture used by the colour preview.
- `assets/parked-car.svg` is the local illustration/fallback used by the parked-car display.

### Supabase

`supabase-setup.sql` sets up the following principal tables:

- `profiles`: one account profile per Supabase Auth user.
- `vehicles`: saved vehicle plates and display colours.
- `parking_sessions`: active/completed/cancelled sessions, rates, timestamps, and optional sensor location.
- `parking_ratings`: one 1–5 star rating per ended parking session.
Important RPC functions:

- `start_parking_session(p_vehicle_id)`: checks the signed-in account and vehicle, then starts one active session.
- `end_parking_session(p_session_id)`: ends the caller’s active session and calculates the amount according to account type and Malaysia time.
- `get_parksmart_rating_summary()`: returns only anonymized rating totals after at least five responses for the demo dashboard.
Row-level security and restricted table/function privileges protect account-owned profile, vehicle, and session operations. The browser calls the public RPCs with the signed-in user’s Supabase session. The ratings dashboard uses an aggregate-only function and never reads individual rating records.

### Hosting

GitHub Pages publishes the repository root using `.github/workflows/deploy-pages.yml` when the configured branch is updated. The Supabase Auth Site URL and allowed redirect URL should match the published Pages URL.

## 8. Supabase setup and operations

1. Set the project URL and browser-safe publishable/anon key in `supabase-config.js`.
2. Run `supabase-setup.sql` in the project’s Supabase SQL Editor.
3. In Supabase Auth URL Configuration, set the Site URL to the public GitHub Pages site and allow its redirect path.
4. Keep credentials and service-role keys out of the repository and browser.
5. The current demo project has email confirmation disabled in the Supabase dashboard so test users can sign in without a confirmation email. Email and password are still required. This is a dashboard setting, not a setting applied by the SQL setup file.

The visitor-count RPC is removed when this setup script is rerun. Any existing `daily_website_visitors` table is retained and is no longer used by the app.

For a real service, verify user email addresses, configure a reliable SMTP provider, add appropriate abuse protection, and review data retention and privacy requirements before opening registration publicly.

## 9. Privacy and security notes

- Do not use real sensitive personal details in this demo.
- Student TP numbers, staff IDs, names, email addresses, and vehicle plates are user-entered demo information and are not independently validated against APU records.
- Email confirmation is currently disabled for this demo; a registrant can enter an email address they do not own. Re-enable confirmation before relying on account ownership.
- Never store payment-card details in this application. The debit-card UI is intentionally non-functional and collects no card data.
- Parking slot availability and location are not live sensor data.

## 10. Verification performed

Date: 3 November 2026.

- `node --check app.js`, `node --check parking-app.js`, and `node --check script.js` passed. Earlier browser sessions also ran syntax checks for `garage-scene.js`.
- `git diff --check` passed.
- Local browser checks confirmed the dashboard renders the Zone C **Visitors only** note and the payment section is hidden before a charged session ends.
- Local browser checks confirmed the parking map and Guide describe the Zone C visual rule and the simulated payment.
- At a 390 px viewport, the Home page and parking map had no horizontal overflow.
- A browser UI check exercised the debit-card demo completion state with a test amount. It displayed that no real transaction was made and no card details were collected; the payment section contains no card input fields.
- The visitor counter was removed from the Home page and browser code; the SQL setup now removes the old RPC without deleting its existing table/data.
- Existing live parking-rate RPC checks (performed earlier) covered the Student grace-period cancellation and the RM 5.00 charge at the 10-minute boundary in a rolled-back SQL transaction.
- Earlier responsive checks covered all four pages at a 390 px viewport. Account-field validation, visitor/student profile switching, mobile navigation, Guide FAQ/navigation, all seven car colours, signed-out UI, and public page loading were exercised.
- Visitor and Student live account/parking flows passed in earlier testing. Staff account creation/sign-in passed after email confirmation was disabled; Staff parking remains unverified.
- GitHub Actions deployment for commit `f1d3c3c` completed successfully. The public Home, parking map, and Guide were checked after deployment; Home loaded `app.js?v=3`.

These checks do not connect real parking sensors or a payment processor. The new debit-card interaction is a frontend-only simulation, and Zone C is informational rather than enforced.
