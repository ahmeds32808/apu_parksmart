# APU ParkSmart — Project Documentation

## 1. Project overview

APU ParkSmart is a four-page campus-parking prototype for Asia Pacific University (APU). It demonstrates account setup, saved vehicles, parking-session timing and pricing, simulated parking availability, and an approximate daily website-visitor count.

The public demo is available at [https://ahmeds32808.github.io/apu_parksmart/](https://ahmeds32808.github.io/apu_parksmart/).

This is a student-project demonstration, not a live campus parking reservation or payment service. Parking sensors and a real payment processor are not connected.

## 2. Pages and user journeys

| Page | File | Purpose |
|---|---|---|
| Home | `index.html` | Dashboard, simulated availability, visitor count, profile and saved vehicles, active parking session, and demo payment result |
| Account Registration | `account.html` | Create an account once or sign in; the first vehicle is saved with the account |
| Register Parking | `parking.html` | Start parking using a vehicle already saved to the signed-in account |
| Guide | `guide.html` | Instructions, pricing rules, demo limitations, and FAQs |

Typical journey:

1. Register an account with name, email, password, account type, and first vehicle. Students enter a TP number; Lecturer / Staff enter a staff ID.
2. Sign in on later visits and optionally add more vehicles from the Home profile.
3. Open Register Parking and start a session using one of the saved vehicles.
4. Home displays the active vehicle, elapsed time, price estimate, and sensor location when available.
5. End parking on Home. The server calculates the final demo amount. For a positive amount, the user may select the debit-card demo action.

## 3. Account and pricing rules

| Account type | Parking rate | Grace period |
|---|---:|---|
| Visitor | RM 1.00 per hour | None; charges begin at the start |
| Student | RM 5.00 per Malaysia calendar day | 10 minutes |
| Lecturer / Staff | RM 5.00 per Malaysia calendar day | 10 minutes |

For Students and Lecturer / Staff, ending parking during the first 10 minutes records RM 0. Otherwise, the daily amount is based on the number of Malaysia calendar dates touched by the session, including its start and end dates.

The server-side Supabase functions are the source of truth for starting and ending sessions. The Home page separately shows a live estimate while a session is active.

## 4. Parking zones and availability

- The Home dashboard’s zone counts and the animated parking scene are simulated in the browser. They do not reserve actual spaces or communicate with APU sensors.
- Zone C is labeled **Visitors only** on the availability dashboard and campus map, as an informational visual rule.
- The live Supabase parking flow does not let a user select a zone and does not assign a zone to a session. Zone assignment requires a real sensor or parking-system integration; the current label does not enforce access.
- The exact vehicle location is unavailable until a connected sensor reports it. The session table has a `sensor_location` field for that future integration.

## 5. Daily website-visitor counter

The Home page displays an approximate count of distinct browser IDs recorded for the current Malaysia calendar day:

1. The browser creates a random UUID and stores it in local storage under `apusmart.dailyVisitorId`.
2. The browser calls the Supabase `record_daily_visitor` RPC with that ID.
3. The RPC derives the date in the `Asia/Kuala_Lumpur` time zone and inserts `(visit_date, visitor_id)` into `daily_website_visitors`.
4. The table’s composite primary key prevents the same browser ID from being counted twice on the same day. A new Malaysia calendar date creates a new daily count automatically.

The count is an estimate of browsers, not people. Clearing browser storage, using another browser/device, or blocking local storage can change whether a visit is counted.

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
- `app.js` implements Supabase access, account/profile display, simulated dashboard availability, the visitor counter, and Home parking-session display.
- `parking-app.js` loads the signed-in user’s vehicles and starts a session through Supabase.
- `garage-scene.js` renders the illustrated/simulated campus parking scene.
- `style.css` contains layout, responsive styling, and component styles.
- `supabase-config.js` contains the Supabase project URL and browser-safe publishable/anon key. It must never contain a service-role key or other secret.

### Supabase

`supabase-setup.sql` sets up the following principal tables:

- `profiles`: one account profile per Supabase Auth user.
- `vehicles`: saved vehicle plates and display colours.
- `parking_sessions`: active/completed/cancelled sessions, rates, timestamps, and optional sensor location.
- `daily_website_visitors`: approximate daily browser counts.

Important RPC functions:

- `start_parking_session(p_vehicle_id)`: checks the signed-in account and vehicle, then starts one active session.
- `end_parking_session(p_session_id)`: ends the caller’s active session and calculates the amount according to account type and Malaysia time.
- `record_daily_visitor(p_visitor_id)`: records or reuses the browser’s daily counter entry.

Row-level security and restricted table/function privileges protect account-owned profile, vehicle, and session operations. The browser calls the public RPCs with the signed-in user’s Supabase session.

### Hosting

GitHub Pages publishes the repository root using `.github/workflows/deploy-pages.yml` when the configured branch is updated. The Supabase Auth Site URL and allowed redirect URL should match the published Pages URL.

## 8. Supabase setup and operations

1. Set the project URL and browser-safe publishable/anon key in `supabase-config.js`.
2. Run `supabase-setup.sql` in the project’s Supabase SQL Editor.
3. In Supabase Auth URL Configuration, set the Site URL to the public GitHub Pages site and allow its redirect path.
4. Keep credentials and service-role keys out of the repository and browser.
5. The current demo project has email confirmation disabled in the Supabase dashboard so test users can sign in without a confirmation email. Email and password are still required. This is a dashboard setting, not a setting applied by the SQL setup file.

For a real service, verify user email addresses, configure a reliable SMTP provider, add appropriate abuse protection, and review data retention and privacy requirements before opening registration publicly.

## 9. Privacy and security notes

- Do not use real sensitive personal details in this demo.
- Student TP numbers, staff IDs, names, email addresses, and vehicle plates are user-entered demo information and are not independently validated against APU records.
- Email confirmation is currently disabled for this demo; a registrant can enter an email address they do not own. Re-enable confirmation before relying on account ownership.
- The visitor metric uses a random local-storage UUID rather than an audited identity. Clearing storage can cause a repeat count.
- Never store payment-card details in this application. The debit-card UI is intentionally non-functional and collects no card data.
- Parking slot availability and location are not live sensor data.

## 10. Verification performed for these changes

Date: 3 November 2026.

- `node --check app.js`, `node --check parking-app.js`, and `node --check script.js` passed.
- `git diff --check` passed.
- Local browser checks confirmed the dashboard renders the Zone C **Visitors only** note, the visitor-count status identifies Malaysia time, and the payment section is hidden before a charged session ends.
- Local browser checks confirmed the parking map and Guide describe the Zone C visual rule and the simulated payment.
- At a 390 px viewport, the Home page and parking map had no horizontal overflow.
- A browser UI check exercised the debit-card demo completion state with a test amount. It displayed that no real transaction was made and no card details were collected; the payment section contains no card input fields.
- The visitor-counter implementation was inspected: the RPC uses the `Asia/Kuala_Lumpur` calendar date and a `(visit_date, visitor_id)` uniqueness constraint.
- Existing live parking-rate RPC checks (performed earlier) covered the Student grace-period cancellation and the RM 5.00 charge at the 10-minute boundary in a rolled-back SQL transaction.

These checks do not connect real parking sensors or a payment processor. The new debit-card interaction is a frontend-only simulation, and Zone C is informational rather than enforced.
