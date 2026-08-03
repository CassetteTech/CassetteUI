# Public post crawler-burst regression

Run from `CassetteUI` in the local multi-repo workspace:

```bash
./scripts/crawler-burst-regression.sh
```

The fixture-only harness never accepts a remote URL. It verifies that a synchronized 30-request burst across three repeated post IDs produces one upstream metadata fetch per ID, reports statuses and latency, rejects work above the Bridge public-read limit with fast `503` responses, and releases active query work after cancellation.

Expected bounds: all fixture metadata responses are `200`, the UI burst completes within one second, each post ID has one upstream fetch, excess Bridge requests return `503` before starting query work, and active query work returns to zero.
