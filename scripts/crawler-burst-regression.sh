#!/usr/bin/env bash
set -euo pipefail

ui_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
bridge_root="${ui_root}/../CassetteBridge"

if [[ ! -f "${bridge_root}/CassetteBridge.sln" ]]; then
  echo "CassetteBridge must be checked out next to CassetteUI." >&2
  exit 1
fi

cd "${ui_root}"
npm run test:crawler-burst

cd "${bridge_root}"
dotnet test CassetteBridge.UnitTests/CassetteBridge.UnitTests.csproj \
  --settings test.runsettings \
  --filter "FullyQualifiedName~CrawlerBurst|FullyQualifiedName~GetPublicPostPageMetadata|FullyQualifiedName~WhenDownstreamIsCancelled"
