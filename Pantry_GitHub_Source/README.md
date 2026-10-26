# Pantry
Recipe-based restaurant inventory and ordering. Built as an FDE portfolio project.

Add ingredients, define the amounts for one serving of each dish, and confirm orders. The app deducts the combined ingredients, blocks shortages, and records a stock ledger.

## Quick public demo: Netlify

The supplied **Pantry_Netlify_Drop** folder is already built.

1. Open https://app.netlify.com/drop and sign in.
2. Drag **Pantry_Netlify_Drop** onto the page.
3. Open the generated .netlify.app link and share it.

Each visitor starts with a sample café. Changes stay in that browser and survive reloads. The demo needs no database, API keys or login. It is a working client-side demonstration, not a shared production database.

**Reset demo** restores the sample café or starts an empty restaurant. Export records first if needed.

Manual drag-and-drop publishes static files; it does not install the serverless backend.

## Deploy source to Netlify or Vercel

Push this source folder to a new GitHub repository, then import the repository in either platform.

| Setting | Netlify | Vercel |
| --- | --- | --- |
| Framework | Auto / static | Other |
| Build command | npm run build | npm run build |
| Publish / output directory | dist | dist |
| Node.js | 24 | 24 |
| Environment variables for public demo | None | None |

netlify.toml and vercel.json supply the deployment configuration. Leave every backend environment variable unset for the standalone browser demo.

After deploying, share the generated .netlify.app or .vercel.app URL. A purchased custom domain is optional; add it later in the platform's domain settings.

## Run locally

Requires Node.js 24+; no npm packages or API keys are needed.

~~~powershell
npm run dev
~~~

Open http://127.0.0.1:4317. You can also double-click start-pantry.cmd.

Local development uses SQLite, with a single restaurant saved at .pantry-local/pantry.sqlite. Local SQLite, browser demo and Supabase cloud data are separate. Back up the SQLite directory while the app is stopped.

## Optional Supabase-backed workspace

Use this when you need one password-protected restaurant shared across devices. The public demo works without this setup.

1. Create a separate Supabase project for Pantry.
2. Run database/supabase-setup.sql in its SQL editor.
3. In Netlify or Vercel, set all four server environment variables:

| Variable | Value |
| --- | --- |
| SUPABASE_URL | Your new Pantry project's https://...supabase.co URL |
| SUPABASE_SECRET_KEY | A server-only secret key; a legacy service-role key also works |
| SESSION_SECRET | A random string of at least 32 characters |
| PANTRY_ACCESS_CODE | A strong workspace access code of at least 12 characters |

4. Redeploy from Git.
5. Open the app and enter the workspace access code.

All devices with the access code share the same restaurant. Sessions use signed, HttpOnly, Secure cookies and expire after seven days. Keep both secrets out of source and browser code.

RLS is enabled. Anonymous and authenticated Data API roles have no table privileges. Only server-side functions use the privileged database key, after validating the signed workspace session. Stock updates use revision-guarded conditional writes.

The setup SQL is supplied as a standalone bootstrap script. It was not applied to a live Supabase project in this build. Adapter and session behavior have automated tests; live Supabase verification requires configuring the separate project.

## Features

- Ingredient stock, categories, purchase cost and low-stock thresholds.
- Grams/kilograms, millilitres/litres and whole pieces.
- Menu prices and recipes per serving.
- Multi-dish orders with a deduction preview.
- Server-validated deductions in SQLite/cloud modes.
- Shortage checks, menu availability and estimated servings left.
- Restocking and wastage with notes.
- Order cancellation before preparation, restoring the original recipe quantities.
- Order history and stock movement ledger.
- Recipe editing and menu archiving.
- Inventory CSV and full JSON export.

Prices are INR. Times are IST. Sales exclude taxes, discounts and delivery fees.

## Demo walkthrough

1. Start with the sample café.
2. Confirm an order for 3 lattes.
3. The recipe uses 18 g coffee and 200 ml milk per latte.
4. Stock falls by 54 g coffee and 600 ml milk.
5. Coffee changes from 2.4 kg to 2.346 kg; milk from 8 L to 7.4 L.
6. Open Stock activity to inspect the matching entries.
7. Cancel the order before preparation to restore those quantities.
8. Edit the recipe, restock an ingredient, and try an order larger than available stock.

## Source layout

| Path | Purpose |
| --- | --- |
| public/ | Interface, browser storage transport and standalone demo |
| lib/inventory.ts | Shared domain rules, integer stock arithmetic and snapshots |
| lib/http.mjs | API validation and optimistic concurrency |
| lib/sqlite.mjs | Native SQLite development/test adapter |
| lib/postgrest.mjs | Supabase REST database adapter |
| lib/hosted.mjs | Hosted configuration and signed access-code sessions |
| api/ | Vercel Functions |
| netlify/functions/ | Netlify Function |
| database/ | Optional Supabase setup |
| drizzle/ | Local SQLite schema |
| scripts/ | Build, local server and verification |
| tests/ | Domain, HTTP, hosting and demo-storage tests |

A hosted browser requests /api/config. With no backend environment, it uses browser demo storage. With a complete backend environment, it uses the server API. Partial backend configuration returns an error rather than silently falling back to the demo.

## Consistency and tradeoffs

In SQLite/cloud mode, a restaurant is one versioned aggregate containing inventory, menu, orders, movements and processed request IDs. A revision-guarded update commits all changes together. Competing requests re-read and retry, so two orders cannot silently consume the same last serving.

Browser demo mode reuses the same domain rules. Web Locks serialize writes across tabs in supporting browsers. It does not provide a shared server-side transaction or cross-device synchronization.

Stock uses integer thousandths of a gram/ml/piece; money uses integer paise. Orders keep a recipe-consumption snapshot, so later recipe edits do not alter cancellation refunds. Requests can be retried with the same operation ID without double deductions.

This is a bounded pilot: 200 ingredients, 100 dishes, 10,000 operations and a 1.5-million-character document. Larger workloads should use normalized tables and transactional stock updates. No supplier purchasing, expiry/batch tracking, payment processing, tax handling, individual staff roles or POS integration is implemented.

Recipes track theoretical consumption. Physical stock counts and wastage entries are still necessary. Do not cancel prepared food to restore already-used ingredients.

The shared cloud code is a small pilot access model, not individual user accounts or role-based staff permissions.

## Verification

~~~powershell
node scripts/verify.mjs
~~~

Runs the static build, 24 tests and module syntax checks. Tests include exact deductions, shared ingredients, concurrency, idempotency, shortages, cancellation snapshots, unit conversion, SQLite persistence, demo persistence, rendered order previews, signed sessions and Supabase revision guards.

Visual and real-browser click-through testing was unavailable in the authoring environment. The optional live Supabase deployment has not been configured or tested.

## FDE case study

Demonstrate the complete restaurant workflow, then show last-serving contention and duplicate submission tests. Explain why the aggregate is acceptable for a small pilot and what changes at larger scale.

Next, test with a real café owner and measure stock discrepancies and time spent counting stock or entering orders. No customer validation or business impact measurements are claimed yet.
