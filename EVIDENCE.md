# Evidence and scope — 28 October 2026

## Exact source basis

Private working source: `9ce126941ccd8be810634ff76d2ae933735bd469`, clean main, six commits ahead of the inspected shared source. Shared/hosted frontend basis: `d8183d4332507c6a8c34ee145760517c8b86f518`; the existing shared Quality gate passed on that revision. No open private PR was found. These statements distinguish implementation from delivery; no private main push/deployment was done for this showcase.

329 source files are represented in [SOURCE_SNAPSHOT.json](docs/SOURCE_SNAPSHOT.json). Four publication adaptations remove a personal legacy administrator bootstrap, neutralize an old hosted-domain exception, rename the public package/lock metadata and remove hosted production test commands. The initial dependency audit found 2 critical, 7 high and 1 moderate findings. The public export then refreshed affected dependencies, including Zod 4, separately from the private product. Its production-dependency audit reported zero findings; see [DEPENDENCY_REFRESH.md](docs/DEPENDENCY_REFRESH.md). One validation regression script is added to the 329-file source export. The new `.env.example` contains placeholders only. Private history/runbooks, production E2E identities/suites, environment files, database exports and customer records are excluded.

## Historical product evidence

The private backlog records a controlled 7 August pilot baseline: 16/16 public checks, 12/12 owner read-only desktop/mobile checks and three controlled write journeys, plus separate role/isolation evidence. This is historical documentation, not a new run on the current source. Subsequent billing work cannot inherit a claim of full lifecycle verification from those earlier checks.

## Current runtime observations

The existing frontend returned HTTP 200 for its public health/login routes. The health marker matched `d8183d433250`. Hosting metadata reported the same READY production deployment. The database provider reported its project INACTIVE. A health response does not prove a working authenticated workshop, an applied current schema or live billing. The local database ports were also unavailable, so PostgreSQL/RLS and local auth suites were not rerun; no paused resource was resumed.

## Publication verification

The isolated refreshed export passed lint, TypeScript, locale parity, website-engine, billing-source contracts, XRechnung fixtures, auth-redirect, invitation-error and the added validation-upgrade regression, followed by the Next.js 16.4.3 production build. The production-dependency audit reported zero findings. The original snapshot also passed the original deterministic/build checks before the refresh. Current exact-revision remote CI is visible in the workflow result badge. A test-runner import initially required the explicit server-only marker dependency; after adding it, the schema regression passed with the server boundary retained. CI runs export checks, lint, TypeScript, six deterministic scripts and build; it does not connect to production databases, charge cards, send customer messages or certify invoice compliance. See the current workflow result badge and [KNOWN_LIMITATIONS.md](docs/KNOWN_LIMITATIONS.md).

All historical/current behavior and limits above are kept separate from a commercial launch or owner acceptance. No live customer count is claimed.

A loopback-only server from the refreshed build returned 200 for `/`, `/api/health`, `/admin-login` and `/businesssite`. Both configured Checkout return paths returned 404, confirming the source finding. These were unauthenticated local HTTP checks with no database/provider credentials, not customer-workflow verification.
