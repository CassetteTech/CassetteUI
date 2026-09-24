'use client';

import { useId, useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, MessageSquare, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { redditCompetitions, competitionStatus } from '@/services/reddit-competitions';
import { EmptyState } from '../../../_components/empty-state';
import { Panel, SectionHeader } from '../../../_components/kit';
import { CompetitionEditor } from './competition-editor';
import { CompetitionSchedule } from './competition-schedule';

export default function RedditCompetitionsPage() {
  const controlId = useId();
  const cache = useQueryClient();
  const [subreddit, setSubreddit] = useState('');
  const [roundId, setRoundId] = useState('');
  const [dirty, setDirty] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState('');
  const communities = useQuery({ queryKey: ['reddit-communities'], queryFn: redditCompetitions.communities, refetchInterval: 30_000 });
  const community = communities.data?.find(item => item.subreddit === subreddit) ?? communities.data?.[0];
  const selectedSubreddit = community?.subreddit ?? '';
  const rounds = useQuery({ queryKey: ['reddit-rounds', selectedSubreddit], queryFn: () => redditCompetitions.rounds(selectedSubreddit),
    enabled: Boolean(selectedSubreddit), refetchInterval: 15_000 });
  const round = rounds.data?.find(item => item.id === roundId) ?? rounds.data?.[0];

  async function refresh() {
    await Promise.all([cache.invalidateQueries({ queryKey: ['reddit-communities'] }), cache.invalidateQueries({ queryKey: ['reddit-rounds'] })]);
  }
  async function prepare() {
    setPreparing(true); setError('');
    try { const created = await redditCompetitions.generate(selectedSubreddit); setRoundId(created.id); await refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not prepare the round.'); }
    finally { setPreparing(false); }
  }

  return <div className="domain-growth flex max-w-7xl flex-col gap-5">
    <Link href="/internal/marketing" className="inline-flex min-h-10 items-center gap-2 self-start rounded-md text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <ArrowLeft aria-hidden="true" className="size-4" />All automations
    </Link>
    <SectionHeader section="Marketing / Automations" title="Weekly playlist competition" actions={
      <Button variant="outline" size="sm" onClick={() => void refresh()}><RefreshCw aria-hidden="true" />Refresh</Button>
    } />
    <p className="text-sm text-muted-foreground">Review the weekly announcement, then approve it for the bot to post.</p>
    {(error || communities.error || rounds.error) && <p role="alert" className="text-sm text-destructive">{error || communities.error?.message || rounds.error?.message}</p>}
    {communities.isPending && <output>Loading connected subreddits…</output>}
    {communities.data?.length === 0 && <Panel><EmptyState icon={MessageSquare} title="Connect a subreddit" description="Enable competition sync in the bot installation after the server connection is configured. Connected subreddits appear here after the bot checks in." /></Panel>}
    {community && <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <label className="flex flex-col gap-1.5 text-sm font-medium" htmlFor={`${controlId}-competition-community`}>Subreddit
          <select id={`${controlId}-competition-community`} className="h-10 rounded-md border border-input bg-background px-3" value={selectedSubreddit} disabled={dirty}
            onChange={event => { setSubreddit(event.target.value); setRoundId(''); setError(''); }}>
            {communities.data?.map(item => <option key={item.subreddit} value={item.subreddit}>r/{item.subreddit}</option>)}
          </select>
        </label>
        <Button variant="outline" disabled={preparing || dirty || rounds.data?.some(item => item.status === 'collecting')}
          onClick={() => void prepare()}>{preparing ? 'Requesting draft…' : 'Prepare draft now'}</Button>
      </div>
      <CompetitionSchedule key={`${community.subreddit}:${community.revision}`} community={community} onSaved={refresh} />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm font-medium" htmlFor={`${controlId}-competition-round`}>Competition round
          <select id={`${controlId}-competition-round`} className="h-10 w-full rounded-md border border-input bg-background px-3" value={round?.id ?? ''} disabled={dirty || !round}
            onChange={event => setRoundId(event.target.value)}>
            {!round && <option value="">No rounds yet</option>}
            {rounds.data?.map(item => <option key={item.id} value={item.id}>{new Date(item.endUtc).toLocaleDateString()} · {competitionStatus[item.status]}</option>)}
          </select>
        </label>
        {dirty && <p className="text-sm text-muted-foreground">Save or discard edits before changing rounds.</p>}
      </div>
      {rounds.isPending && <output>Loading rounds…</output>}
      {round && <CompetitionEditor key={round.id} round={round} onSaved={refresh} onDirty={setDirty} />}
      {rounds.data?.length === 0 && <Panel><EmptyState icon={MessageSquare} title="No competition drafts yet" description="Prepare a draft now or enable the weekly schedule above. Each draft covers the previous week." /></Panel>}
    </>}
  </div>;
}
