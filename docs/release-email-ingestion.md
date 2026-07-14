# Release Email Ingestion

The `Ingest published release email` GitHub Actions workflow manually submits one published `CassetteTech/CassetteUI` release to CassetteBridge. It does not run when a release is published.

## Repository setup

Keep the workflow permission at `contents: read`. The workflow checks out the repository default branch, regardless of the ref selected in the manual-run UI, and uses the job's short-lived `github.token` to read release metadata. It needs these repository secrets:

- `CASSETTE_BRIDGE_RELEASE_INGESTION_URL`: the deployed CassetteBridge HTTPS endpoint ending in `/api/v1/internal/email/releases`, without a query or fragment.
- `CASSETTE_RELEASE_INGESTION_SECRET`: the dedicated release-ingestion secret. Its value must match CassetteBridge's `EMAIL_RELEASE_INGESTION_SECRET` setting; do not reuse the scheduler or another machine secret.

## Run the workflow

Open **Actions**, select **Ingest published release email**, and choose **Run workflow**. Supply:

- `release_id`: the positive numeric GitHub release ID, not its tag or version name.
- `curated_summary`: a trimmed, customer-facing summary of at most 1000 characters. The workflow never substitutes the GitHub release body.

The runner reads the current release from GitHub's API and rejects a draft, an unpublished release, a mismatched repository or release ID, a missing release name, and a noncanonical release URL. It sends the validated metadata to `POST /api/v1/internal/email/releases` with `X-Cassette-Release-Secret`.

CassetteBridge processes one persisted batch per request. The runner repeats the same request until Bridge reports completion, with a fixed limit of 400 batches (10,000 scanned recipients at Bridge's batch size of 25). A failed or interrupted run can be rerun with the exact same release ID and summary; Bridge resumes its persisted progress. Changing immutable metadata for an existing ingestion is rejected by Bridge.

Successful output contains aggregate counts only:

```text
batches=2 scanned_total=28 enqueued_total=14
```

## Local validation

From `CassetteUI`, run:

```bash
npm run test:release-email-ingestion
node --check scripts/ingest-release-email.mjs
```

These checks use mocked HTTP responses. They do not contact GitHub or CassetteBridge and do not start the hosted workflow.
