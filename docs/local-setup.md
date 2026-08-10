# CassetteUI local setup

This is the source of truth for configuring and running the web app locally.
The guided launcher supports local or hosted Bridge and Supabase independently,
preserves unrelated `.env.local` values, validates prerequisites, and remembers
the last run choice.

| UI | Bridge | Supabase | Typical use |
| --- | --- | --- | --- |
| local | local | local | Fully local feature/auth development |
| local | local | hosted | UI and API development against shared data |
| local | hosted | local | Uncommon contract testing with a local auth/data stack |
| local | hosted | hosted | Fastest UI-only setup |

The local browser origin is always `http://local.cassette.tech:3000`. Do not
switch to `localhost:3000` during a session. Cookies, session storage, and
Deezer OAuth state are hostname-specific.

## Prerequisites

- Git.
- Node.js 20.9 or newer and npm. Use the Node version required by
  `package.json`; `npm ci` is the supported package-manager path.
- A running Bridge for API-backed flows: local at `http://localhost:5001` or a
  hosted development URL.
- Supabase public/server values for the chosen project. Local defaults match
  the Supabase stack configured in the adjacent CassetteBridge repo. For the
  shared hosted project, install the AWS CLI and authenticate the `cassette-dev`
  profile so the launcher can reuse `BridgeServiceSecrets` without displaying
  or prompting for its values.

Check versions:

```powershell
# Windows PowerShell
node --version
npm --version
```

```bash
# macOS or Linux
node --version
npm --version
```

## First-time setup

1. Clone the repo and switch to the desired branch.
2. Install Node.js 20.9 or newer.
3. Run the launcher from the repo root:

   ```powershell
   # Windows PowerShell
   npm run local
   ```

   ```bash
   # macOS or Linux
   npm run local
   ```

4. Choose local/hosted Bridge and local/hosted Supabase.
5. The standard local Bridge URL is applied automatically. For hosted Bridge,
   the launcher first reuses a saved URL or loads `NEXT_PUBLIC_API_URL` from the
   `CassetteUI` Amplify app with the selected AWS profile. It prompts only when
   neither source is accessible.
6. For hosted Supabase, the launcher first reuses valid hosted values or loads
   them from `BridgeServiceSecrets` with the adjacent Bridge launcher's AWS
   profile. It prompts for the URL and keys only when neither source is
   accessible. Values are stored only in ignored `.env.local`.
7. Choose whether to configure the UI-owned Spotify/Apple charts and search API
   routes. These credentials are not needed for Bridge-proxied conversion flows.
8. Allow the launcher to run `npm ci` when dependencies are absent or stale.
9. Open exactly `http://local.cassette.tech:3000`.

Non-secret choices are saved in ignored `.local-dev/state.json`. A random
`NEXTAUTH_SECRET` is generated on first setup and retained on later runs so
local browser sessions do not break unexpectedly.

The saved AWS profile, region, secret ID, and Amplify app name are non-secret discovery settings.
The launcher never saves AWS credentials or prints retrieved Supabase values.

## Commands

The commands are identical in PowerShell, macOS, and Linux shells:

```bash
# Interactive menu / first-time setup
npm run local

# Choose new modes and start
npm run local -- run

# Repeat the last run type
npm run local:rerun

# Check Node/npm, dependency freshness, DNS, env values, and Bridge reachability
npm run local:check

# Update .env.local and save choices without starting Next.js
npm run local -- configure

# Forget saved choices but preserve .env.local
npm run local -- reset
```

`npm run dev` remains available as a raw Next.js command, but it does not check
or repair configuration. Prefer `npm run local` for normal work.

## Environment behavior

The launcher updates only the variables it owns and leaves comments and
unrelated `.env.local` entries in place:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_API_URL_LOCAL` | Selected Bridge URL for a local Next.js process |
| `NEXT_PUBLIC_API_URL` | Retained hosted Bridge URL; updated when hosted is selected |
| `NEXT_PUBLIC_SUPABASE_URL` | Selected local or hosted Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser-safe Supabase key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only Supabase key; never client-imported |
| `NEXTAUTH_URL` | Fixed to `http://local.cassette.tech:3000` |
| `NEXT_PUBLIC_APP_DOMAIN` | Fixed to `http://local.cassette.tech:3000` |
| `NEXTAUTH_SECRET` | Stable generated local session secret |

Optional direct music API variables are documented in
[Music API Setup](music-api-setup.md). The launcher reports them as warnings,
not blockers, when only Bridge-backed flows are needed.

Do not commit `.env.local`, copy its service-role key into client code, or paste
the file into issues/logs. `reset` intentionally preserves `.env.local`; delete
or rotate credentials separately when that is your intent.

## Local service order and ports

For a fully local stack, use three terminals:

1. Start `MusicPlatformLambdas` on `http://127.0.0.1:3001`.
2. Start `CassetteBridge` on `http://localhost:5001`, selecting the same
   Supabase mode and local Lambdas.
3. Start this repo with `npm run local`, selecting local Bridge and local
   Supabase.

| Component | Address |
| --- | --- |
| UI | `http://local.cassette.tech:3000` |
| Local SAM API | `http://127.0.0.1:3001` |
| Bridge | `http://localhost:5001` |
| Local Supabase API | `http://127.0.0.1:55321` |
| Local Supabase Studio | `http://127.0.0.1:55323` |

The UI does not call MusicPlatformLambdas directly. Bridge owns that boundary,
so the UI launcher asks only for the Bridge target.

## Verification

Before review, use the narrowest relevant commands:

```bash
npm run typecheck
npm run test:unit
npm run lint
npm run build
```

Use `npm run test:analytics` when analytics changes and targeted Playwright
specs for browser-flow changes. Local setup changes should at minimum pass the
launcher syntax check, typecheck, lint, and build.

## Troubleshooting

`local.cassette.tech` does not resolve:

- Confirm `nslookup local.cassette.tech` (Windows) or
  `dig local.cassette.tech` (macOS/Linux) returns loopback.
- Flush the DNS cache or temporarily add
  `127.0.0.1 local.cassette.tech` to the system hosts file if a network DNS
  service overrides the public record.

OAuth repeatedly restarts or callbacks are rejected:

- Clear cookies/site data for both `localhost` and `local.cassette.tech`.
- Confirm `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_DOMAIN` are both the exact local
  origin.
- Confirm Bridge is on `localhost:5001` and its provider callback configuration
  matches its local setup guide.

API requests fail while the page renders:

- Run `npm run local:check` and start the selected Bridge.
- Inspect `NEXT_PUBLIC_API_URL_LOCAL`; it intentionally takes precedence in a
  development build even when `NEXT_PUBLIC_API_URL` contains a hosted URL.
- Re-run `npm run local -- configure` when switching Bridge targets.

Supabase auth/data behavior targets the wrong project:

- Re-run configure and choose the same Supabase mode as Bridge.
- Restart Next.js after changing `.env.local`; public variables are compiled
  into the development bundle.

Dependencies or Next.js behavior seem stale:

- Let the launcher run `npm ci`. It compares
  `node_modules/.package-lock.json` with the committed lockfile.
- Delete `.next` only when a concrete cache issue remains; the launcher does not
  remove build output automatically.

Port `3000` is occupied:

```powershell
Get-NetTCPConnection -LocalPort 3000 | Select-Object LocalAddress,LocalPort,OwningProcess
```

```bash
lsof -nP -iTCP:3000 -sTCP:LISTEN
```

Stop only a process you recognize. The launcher never kills processes.
