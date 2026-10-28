# PitlaneOne

[![Quality gate](https://github.com/IamRedi/pitlaneone/actions/workflows/quality.yml/badge.svg)](https://github.com/IamRedi/pitlaneone/actions/workflows/quality.yml)

**Multi-tenant automotive workshop software with a branded public website for each business.** Next.js, TypeScript, Supabase Auth/PostgreSQL/RLS, Tailwind and six interface languages.

[Deutsch](README.md) · [Architecture](docs/ARCHITECTURE.md) · [Evidence](EVIDENCE.md) · [Local evaluation](docs/LOCAL_EVALUATION.md) · [Known limitations](docs/KNOWN_LIMITATIONS.md)

The source implements company/team roles and invitations, customers and vehicles, service history, open work and line items, invoices/payments/linked corrections, inventory and counter sales, appointment requests/calendar, branded websites and accounting exports. It also contains an optional BusinessSite product surface and product-scoped grants/trials with prepared Stripe Checkout, Portal and signed webhook endpoints.

As reviewed on **28 October 2026**, this is a **source-available showcase of an advanced pilot product**, not a commercial production launch. Historical pilot evidence, current source checks and hosted-runtime observations are separate. No current active-customer count is asserted. The existing web frontend responded, while its database provider reported the project INACTIVE; it is therefore not offered as a working live demo.

Known gaps include absent Checkout return pages, a camera-scanner/Permissions-Policy conflict and a billing migration that is not safely repeatable in full. Live payments, a fresh full database installation, restore rehearsal and a new authenticated tenant-isolation run are outside this publication's verification. Invoice/XML implementation is not legal, accounting, fiscal or security certification.

The public export refreshes affected packages independently of the existing product. Its production-dependency audit then reported **0 findings**; [DEPENDENCY_REFRESH.md](docs/DEPENDENCY_REFRESH.md) records version changes and verification limits.

## Inspect and build

Use Node.js 22:

```bash
git clone https://github.com/IamRedi/pitlaneone.git
cd pitlaneone/frontend
npm ci
npm run lint
npm run typecheck
npm run test:i18n
npm run test:business-site-engine
npm run test:billing-grants
npm run test:xrechnung
npm run test:auth-redirect
npm run test:invitation-error
npm run test:validation
npm run build
npm run start -- -p 3011
```

The public landing page includes a designed dashboard illustration, not an authenticated workshop session. Operational routes require your own isolated Supabase database, schema and test identities. Read [LOCAL_EVALUATION.md](docs/LOCAL_EVALUATION.md) before doing database work. CI runs deterministic checks and builds; it does not perform production writes or establish legal compliance.

Private history, customer records, database dumps, real credentials, hosted test identities and operational reports are excluded. [SOURCE_SNAPSHOT.json](docs/SOURCE_SNAPSHOT.json) records exact source/export hashes, publication adaptations and the added validation regression script. The personal legacy administrator bootstrap is removed.

Source is available for reading/evaluation under [LICENSE](LICENSE), following the owner's other showcases. It is not an unrestricted commercial or production-use license. Dependencies and assets retain their own rights; [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
