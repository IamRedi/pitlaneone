# Dependency refresh for the public export

Review date: 28 October 2026. These changes exist in the isolated public export, not in the private working product or its hosting environment.

The initial production-dependency audit reported 2 critical, 7 high and 1 moderate package findings. A compatible dependency refresh, an explicit Zod 4 update and a same-major transitive brace-expansion update were then prepared. No `npm audit fix --force` was used. The resulting `npm audit --omit=dev` reported **0 findings** at preparation time. This is package-advisory evidence, not complete application security assurance.

| Package | Original lock | Public export |
| --- | --- | --- |
| `next` | 16.3.0 | 16.4.3 |
| `eslint-config-next` | 16.3.0 | 16.4.3 |
| `@sentry/nextjs` | 10.69.0 | 10.78.0 |
| `zod` | 3.25.76 | 4.6.7 |
| `sharp` | 0.35.3 | 0.35.5 |

Next.js remains on major 16, with its ESLint config aligned. Sentry remains on major 10. Zod changes major version; its migration guide was reviewed and a new deterministic regression check exercises the actual exported BusinessSite request/draft schemas, defaults, collection limits and identifier parsing. Existing application source was retained; lint, TypeScript and existing deterministic/build checks are rerun against the refreshed dependencies.

Primary advisory/migration references:

- [Next.js patched release evidence](https://github.com/advisories/GHSA-673q-mjm6-r5xr)
- [Sentry tunnel advisory](https://github.com/advisories/GHSA-mchm-gjx6-7h55)
- [Zod bounded-collection advisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5)
- [Zod 4 migration guide](https://zod.dev/v4/changelog)

Authenticated PostgreSQL/RLS, hosted billing and a full browser role matrix were not rerun; those remain separate product-release gates. The public CI includes a production-dependency audit at high severity in addition to deterministic checks and build. Current advisories can change after publication.

The `server-only` marker package is explicitly declared so the schema regression can import the server module with the React-server condition outside Next.js. The application already imported that marker; the boundary was not removed or bypassed.
