# Pantry

Recipe-based inventory and ordering for restaurants and cafes.

Connect each menu item to its ingredients. Confirming an order deducts the combined quantities, blocks shortages and records stock movements. For example, three lattes consume 54 g of coffee and 600 ml of milk.

## Explore

- [Application source](Pantry_GitHub_Source/)
- [Full setup, architecture and limitations](Pantry_GitHub_Source/README.md)
- [Deployment guide](Pantry_GitHub_Source/DEPLOY.md)
- [Automated tests](Pantry_GitHub_Source/tests/)

## Run locally

Requires Node.js 24.

```sh
git clone https://github.com/bhargavkalita47/Pantry.git
cd Pantry/Pantry_GitHub_Source
npm run dev
```

Open http://127.0.0.1:4317. Local development stores one restaurant in SQLite.

```sh
npm run verify
```

This builds the app and runs its automated tests and syntax checks. Checks were not rerun for this documentation update.

## Workflows

- Ingredient stock, costs, units and low-stock thresholds.
- Menu recipes and quantities per serving.
- Multi-dish orders with deduction previews and shortage checks.
- Restocking, wastage and cancellations before preparation.
- Order history, stock movements, CSV and JSON exports.

## Storage and hosting

| Mode | Storage | Scope |
| --- | --- | --- |
| Hosted standalone demo | Browser-local | Separate sample cafe per visitor |
| Local development | SQLite | One restaurant on one machine |
| Optional hosted workspace | Server API and Supabase | One shared restaurant with an access code |

For Git-based Netlify or Vercel deployment, set the **base/root directory to `Pantry_GitHub_Source`**, build with `npm run build` and publish `dist`. Leave backend variables unset for the standalone demo. Deployment configuration is inside the source folder.

## Engineering decisions

SQLite and cloud modes use revision-guarded writes to commit inventory, orders and movements together. Operation IDs prevent duplicate deductions when retrying a request. Orders retain recipe-consumption snapshots, so later recipe edits do not change cancellation quantities. Stock and money use integer units.

See the [detailed README](Pantry_GitHub_Source/README.md) for capacity limits and concurrency tradeoffs.

## Current scope

This is a portfolio/pilot implementation. The hosted workspace uses a shared access code. Individual staff accounts, role-based permissions and multi-restaurant isolation are future work. Supplier purchasing, expiry tracking, POS integrations and payments are not implemented. Live backend operation and customer impact were not independently verified in this review.
