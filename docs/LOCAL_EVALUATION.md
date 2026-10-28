# Local evaluation

Use a separate test folder and Node.js 22. `npm ci` installs the committed dependency lock. The build and deterministic checks do not require production credentials. After building, run `npm run start -- -p 3011` from `frontend/` and open the public landing page.

For authenticated workflows, provision your own **isolated Supabase environment**. Copy `frontend/.env.example` to `.env.local`, supply only that environment's credentials and keep the file ignored. The service-role key stays server-only. Leave Stripe, Vercel, import and domain-provider integrations blank until intentionally configured.

`supabase/config.toml` describes a local evaluation stack on API port 55321. `supabase/migrations/` contains the historical ordered schema chain. Use a compatible Supabase CLI after reading its current help; inspect migration names and dependencies before applying anything. A clean full-chain install was not rerun for this publication. Do not run these files against an existing/customer database merely to try the showcase. Do not treat `schema.sql` from an old workshop app as the current multi-tenant schema; it is intentionally excluded.

There is no personal owner/admin bootstrap in this export. Create a synthetic Auth user and deliberately provision the administrator/company membership inside your test environment. The local seed and RLS/auth tools are advanced, optional tools; read their guards first. They require local credentials and can create/delete synthetic local identities and records. No hosted production E2E environment or write-test suite is shipped.

The newer billing migration has partial-rerun constraints explained in [KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md). Do not assume migration 18 is idempotent. No secrets, configured Stripe Prices, tenant identities or working production database are included.

CI runs lint, TypeScript, locale parity, website-engine, billing-source contracts, XRechnung fixtures, auth-redirect and invitation-error checks, validation-upgrade regression, then a production build and a production-dependency audit. Those checks do not run PostgreSQL authorization or a complete checkout. Optional local tests retain their original fail-closed host guards.
