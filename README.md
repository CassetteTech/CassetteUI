# CassetteUI

CassetteUI is the Next.js frontend for Cassette. It owns the web user experience, browser auth proxy routes, analytics instrumentation, and Playwright user-flow coverage.

## Core Responsibilities

- Render the Cassette web app with Next.js App Router.
- Proxy browser cookie auth flows to CassetteBridge.
- Present music conversion, search, profile, feed, release notes, and post experiences.
- Keep frontend analytics sanitized and tested.
- Exercise user-facing flows through Playwright and focused unit tests.

## Development

Install dependencies:

```bash
npm install
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
npm run build
npm run test:e2e
```

Run `npm run test:analytics` for analytics changes and targeted Playwright specs for user-flow changes. Do not treat `npm run lint` as canonical until the Next 15 lint setup is verified.

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
- [Signup URL Attribution Guide](docs/signup-attribution-guide.md)

## Release Notes

- `/release-notes` reads published GitHub Releases from `CassetteTech/CassetteUI`.
- Local development fetches fresh data on each request; deployed environments revalidate every 5 minutes.
- `GITHUB_TOKEN` is optional and can be set for higher GitHub API limits or private repository access.
- Run `npm run release:draft -- vX.Y.Z` from `CassetteUI` to create a draft GitHub release from `.github/release-draft-template.md`.
