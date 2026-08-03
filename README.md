# CassetteUI

CassetteUI is the Next.js frontend for Cassette. It owns the web user experience, browser auth proxy routes, analytics instrumentation, and Playwright user-flow coverage.

## Core Responsibilities

- Render the Cassette web app with Next.js App Router.
- Proxy browser cookie auth flows to CassetteBridge.
- Present music conversion, search, profile, feed, release notes, and post experiences.
- Keep frontend analytics sanitized and tested.
- Exercise user-facing flows through Playwright and focused unit tests.

## Development

Node.js 20.9 or newer is required.
`npm ci` is the canonical and verified installation path; pnpm is not currently verified.

Install dependencies:

```bash
npm ci
```

Run locally:

```bash
npm run dev
```

Copy `.env.local.example` to `.env.local`. For browser OAuth testing, open the
app at [http://local.cassette.tech:3000](http://local.cassette.tech:3000).
Public DNS maps `local.cassette.tech` to `127.0.0.1`.

Do not switch between `localhost:3000` and `local.cassette.tech:3000` during a
signin or music-service authorization flow. Browser cookies and session storage
are hostname-specific, and Deezer callbacks must remain under the
`cassette.tech` application domain. The local Bridge continues to listen at
`http://localhost:5001`.

## Verification

Use the narrowest relevant command:

```bash
npm run typecheck
npm run test:unit
npm run test:analytics
npm run lint
npm run build
npm run test:e2e
```

TypeScript 7 is the project's only TypeScript compiler. The pinned Next.js 16
canary uses its TypeScript CLI integration during production builds, while linting
uses Oxlint's TypeScript Go engine instead of the legacy JavaScript compiler API.
The targeted Sentry override opts its documented Next 16 peer into this explicit
Next prerelease; do not replace it with a broad peer-dependency bypass.
Run `npm run test:analytics` for analytics changes and targeted Playwright specs
for user-flow changes.

## Architecture

- Routes and route handlers live under `src/app`.
- Shared UI primitives live under `src/components/ui`.
- Feature components live under `src/components/features`, `src/components/pages`, or the closest route folder.
- Browser service clients live under `src/services`.
- Server helpers live under `src/lib/server`.
- Client config uses `src/lib/config-client.ts`; server/API config uses `src/lib/config-server.ts`.
- E2E support and mocks live under `e2e/support`.

## Documentation

- [Documentation Index](docs/README.md)
- [Music API Setup](docs/music-api-setup.md)
- [Music Conversion Test Flow](docs/music-conversion-test-flow.md)
- [Release Email Ingestion](docs/release-email-ingestion.md)
- [Signup URL Attribution Guide](docs/signup-attribution-guide.md)

## Release Notes

- `/release-notes` reads published GitHub Releases from `CassetteTech/CassetteUI`.
- Local development fetches fresh data on each request; deployed environments revalidate every 5 minutes.
- `GITHUB_TOKEN` is optional and can be set for higher GitHub API limits or private repository access.
- Run `npm run release:draft -- vX.Y.Z` from `CassetteUI` to create a draft GitHub release from `.github/release-draft-template.md`.
- After publishing, use the manual release-email workflow described in [Release Email Ingestion](docs/release-email-ingestion.md) when a customer email should be queued.
