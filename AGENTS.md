# CassetteUI Agent Guide

CassetteUI is the Next.js frontend for Cassette. It owns the web user experience, auth proxy routes, analytics instrumentation, and Playwright browser flows.

## Architecture

- Next.js 16 App Router lives under `src/app`.
- Shared UI primitives live under `src/components/ui`; feature UI belongs under `src/components/features`, `src/components/pages`, or the closest route folder.
- Client-side service wrappers live under `src/services`.
- Server-only helpers live under `src/lib/server` or route handlers under `src/app/api`.
- Auth routes proxy browser cookie flows to Bridge through `src/lib/server/auth-proxy.ts`. Native/mobile bearer auth is not owned here.
- Keep config split: client code uses `src/lib/config-client.ts`; server/API code uses `src/lib/config-server.ts`. Avoid new imports from legacy `src/lib/config.ts`.
- Analytics code lives under `src/lib/analytics`, `scripts/posthog`, and related tests.
- E2E mocks live under `e2e/support`; extend shared mocks before adding isolated route stubs.

## Design System

- Check `src/app/globals.css` and `tailwind.config.js` before changing colors or tokens.
- Use semantic CSS variables and existing Tailwind tokens.
- Do not hardcode hex colors, generic gray scales, or manual `dark:` inversions unless the surrounding component already requires it.
- Use shadcn/Radix patterns and `lucide-react` icons when adding controls.
- Use Next.js `Image` for app images unless a narrow exception is already established nearby.

## Implementation Rules

- Keep server/client boundaries explicit. Add `"use client"` only where interaction or browser APIs require it.
- Preserve mobile and desktop behavior; many layouts change significantly at `md` and `lg`.
- Handle loading and error states for music conversion, search, auth, profile, and platform-connection flows.
- Do not create frontend fallbacks for backend contract gaps. Trace the Bridge API route or document the missing contract.
- Keep analytics payloads sanitized and avoid logging raw source links or sensitive user data.
- Do not import `supabaseAdmin`, tokens, cookies, OAuth codes, or server config into client paths.
- In Playwright, remember `/api/v1/[...path]` intentionally returns 503 while `PLAYWRIGHT_TEST=true`; use fixtures.

## Linear Coordination

- Use the shared `cassette-linear` skill for work that maps to `Cassette Eng`.
- Resolve the existing `CAS-###` issue before editing, keep its state accurate, and update it at handoff even when work remains open.
- Give actionable issues created by agents an effort estimate using Cassette's Fibonacci `1, 2, 3, 5, 8` scale and split work larger than `8`.
- Preserve only material decisions, blockers, cross-repo contracts, rollout concerns, and meaningful verification in ticket notes; do not post an activity diary.
- Create or update milestones only for meaningful multi-issue delivery gates, with the relevant issues assigned.
- Update project state, health, and the project update when a milestone, blocker, rollout, or delivery confidence materially changes.
- Default locally complete, verified work to `In Review`. When `Done` is also plausible, ask the user at handoff and leave the issue in review unless they confirm.
- Mark work `Done` only after its actual acceptance and required verification, merge, deployment, or rollout. Never put secrets or sensitive data in Linear.

## Verification

- `npm run typecheck`
- `npm run test:unit`
- `npm run test:analytics` when analytics code changes.
- `npm run lint`
- `npm run build` for routing, server, or dependency changes.
- `npm run test:e2e` or a targeted Playwright spec when user flows change.

Use `PLAYWRIGHT_TEST=true` behavior and the existing `playwright.config.ts` server settings for E2E assumptions.
Keep `typescript` as the TypeScript 7 package that compiler scripts and Next's
experimental CLI checker resolve. Oxlint owns TypeScript-aware linting because
typescript-eslint still depends on the removed JavaScript compiler API.
