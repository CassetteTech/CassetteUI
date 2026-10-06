import type { Page } from '@playwright/test';
import type { CompetitionCommunity, CompetitionRound } from '../../src/services/reddit-competitions';

export async function mockRedditCompetitions(page: Page) {
  const community: CompetitionCommunity = {
    subreddit: 'cassette_bot_dev', revision: '11111111-1111-4111-8111-111111111111', enabled: false,
    timeZone: 'America/New_York', dayOfWeek: 0, hour: 18, minute: 0, excludedFlairs: 'WINNERS,REQUEST',
    nextRunUtc: null, lastSeenUtc: '2026-09-18T20:00:00Z', testMode: true,
    introduction: 'Hello r/{subreddit}!', closing: 'Next: {nextRound} on {nextDate}.', weekOneDate: '2026-09-11',
  };
  const round: CompetitionRound = {
    id: '22222222-2222-4222-8222-222222222222', revision: '33333333-3333-4333-8333-333333333333',
    subreddit: community.subreddit, startUtc: '2026-09-11T22:00:00Z', endUtc: '2026-09-18T22:00:00Z',
    updatedAtUtc: '2026-09-18T22:05:00Z', status: 'draft', title: 'Weekly playlist competition',
    body: '## First place: Weekend selections\n\nA **community favorite** for the weekend.\n\n[Listen to the playlist](https://open.spotify.com/playlist/example)',
    report: 'Scanned 32 posts. Scores observed September 18. One duplicate needs review.',
    candidates: [{ postId: 't3_one', sourcePostId: 't3_one', title: 'Weekend selections', author: 'test_curator', score: 42, playlistUrl: 'https://open.spotify.com/playlist/example', cassettePostId: 'p_example', cassetteUrl: 'https://dev.cassette.tech/post/p_example', conversionJobId: null, conversionError: null, conversionAttempt: 0 }],
    selectedPostIds: ['t3_one'], issues: ['One duplicate entry needs a selection decision.'], postId: null, error: null, approvedAtUtc: null, reviewNote: null,
  };
  const state = { community, round, failSave: false, approvals: 0 };
  await page.route('**/api/v1/internal/reddit/**', async route => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (pathname.endsWith('/communities')) return route.fulfill({ json: [state.community] });
    if (pathname.endsWith('/rounds') && request.method() === 'GET') return route.fulfill({ json: [state.round] });
    if (pathname.endsWith('/schedule')) {
      Object.assign(state.community, request.postDataJSON(), { revision: '44444444-4444-4444-8444-444444444444' });
      return route.fulfill({ json: state.community });
    }
    if (pathname.endsWith('/approve')) {
      state.approvals++; Object.assign(state.round, { status: 'queued', reviewNote: request.postDataJSON().reviewNote });
      return route.fulfill({ json: state.round });
    }
    if (pathname.endsWith('/resolve-publication')) {
      const { postId, notPublished } = request.postDataJSON();
      Object.assign(state.round, postId ? { status: 'published', postId } : notPublished ? { status: 'draft', approvedAtUtc: null } : {}, { error: null });
      return route.fulfill({ json: state.round });
    }
    if (pathname.endsWith('/retry-conversion')) {
      const candidate = state.round.candidates.find(value => value.postId === request.postDataJSON().candidatePostId)!;
      candidate.conversionError = null; candidate.conversionAttempt = (candidate.conversionAttempt ?? 0) + 1;
      return route.fulfill({ json: state.round });
    }
    if (pathname.endsWith('/template')) {
      return route.fulfill({ json: { title: '9/18/26 | Week 2 Playlist Competition Winners', body: 'Hello r/cassette_bot_dev!\n\n## First Place Winner: u/test_curator — "Weekend selections"\n\n[Add an editorial review after listening.]\n\nNext: Week 3 Playlist Competition on 9/20/26.' } });
    }
    if (request.method() === 'PUT') {
      if (state.failSave) return route.fulfill({ status: 409, json: { message: 'Another team member changed the draft.' } });
      Object.assign(state.round, request.postDataJSON(), { revision: '55555555-5555-4555-8555-555555555555' });
      return route.fulfill({ json: state.round });
    }
    return route.fulfill({ status: 400, json: { message: 'Unexpected competition request.' } });
  });
  return state;
}
