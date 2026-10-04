'use client';

import { useEffect, useId, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { ExternalLink, Save, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { competitionStatus, redditCompetitions, redditPostId, type CompetitionRound } from '@/services/reddit-competitions';
import { Panel, StatusPill } from '../../../_components/kit';

export function CompetitionEditor({ round, onSaved, onDirty }: {
  round: CompetitionRound; onSaved: () => Promise<void>; onDirty: (dirty: boolean) => void;
}) {
  const controlId = useId();
  const [editing, setEditing] = useState<CompetitionRound | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [reviewNote, setReviewNote] = useState('');
  const [postLink, setPostLink] = useState('');
  const [notPostedOpen, setNotPostedOpen] = useState(false);
  const value = editing ?? round;
  const dirty = editing !== null;
  const converting = round.status === 'draft' && round.candidates.some(candidate => round.selectedPostIds.includes(candidate.postId) && !candidate.cassetteUrl && !candidate.conversionError);
  const editable = round.status === 'draft' && !converting;
  const linksReady = value.selectedPostIds.length > 0 && value.selectedPostIds.every(id => value.candidates.some(candidate => candidate.postId === id && candidate.cassetteUrl));
  const stale = editing !== null && editing.revision !== round.revision;

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  async function save() {
    setPending(true); setError('');
    try {
      await redditCompetitions.save(value, value.title, value.body, value.selectedPostIds);
      await onSaved(); setEditing(null); onDirty(false);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save the draft.'); }
    finally { setPending(false); }
  }
  async function approve() {
    setPending(true); setError('');
    try { await redditCompetitions.approve(round, reviewNote); await onSaved(); setConfirmOpen(false); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not queue publication.'); }
    finally { setPending(false); }
  }
  async function retry() {
    setPending(true); setError('');
    try { await redditCompetitions.retry(round); await onSaved(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not retry collection.'); }
    finally { setPending(false); }
  }
  async function applyTemplate() {
    setPending(true); setError('');
    try { update(await redditCompetitions.template(value)); setTemplateOpen(false); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not apply the template.'); }
    finally { setPending(false); }
  }
  async function resolvePublication(postId: string | null) {
    setPending(true); setError('');
    try { await redditCompetitions.resolvePublication(round, postId); await onSaved(); setNotPostedOpen(false); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not update the publication state.'); }
    finally { setPending(false); }
  }
  function markPublished(event: React.FormEvent) {
    event.preventDefault();
    const postId = redditPostId(postLink);
    if (postId) void resolvePublication(postId);
    else setError('Enter the Reddit post link, for example https://www.reddit.com/r/community/comments/abc123/.');
  }
  async function retryConversion(candidatePostId: string) {
    setPending(true); setError('');
    try { await redditCompetitions.retryConversion(round, candidatePostId); await onSaved(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not retry conversion.'); }
    finally { setPending(false); }
  }
  const update = (change: Partial<CompetitionRound>) => { setEditing({ ...value, ...change }); onDirty(true); };
  const publicationPending = round.status === 'queued' || round.status === 'publishing';

  return <div className="flex flex-col gap-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm text-muted-foreground">Entries: {new Date(round.startUtc).toLocaleString()} – {new Date(round.endUtc).toLocaleString()} (end excluded)</p>
      <StatusPill tone={round.status === 'published' ? 'success' : round.error ? 'warning' : 'neutral'} label={converting ? 'Preparing Cassette links' : competitionStatus[round.status]} />
    </div>
    {round.status === 'collecting' && <output className="rounded-lg border border-border bg-muted p-4 text-sm">The bot will collect this round on its next check. This page updates automatically.</output>}
    {converting && <output className="rounded-lg border border-border bg-muted p-4 text-sm">The bot is preparing Cassette links for the selected winners. You can edit the draft when these conversions finish or fail. A conversion without a result after 20 minutes is marked as failed. No Reddit post is being published.</output>}
    {publicationPending && <output className="rounded-lg border border-border bg-muted p-4 text-sm">{round.status === 'queued' ? 'Approved and queued. The bot will post the saved announcement on its next check, normally within five minutes.' : 'The bot is publishing. Wait for the Reddit link before treating this round as complete.'}</output>}
    {round.error && <div role="alert" className="rounded-lg border border-destructive/30 p-4 text-sm"><p>{round.error}</p>
      {round.status === 'generation_failed' && <Button variant="outline" disabled={pending} onClick={() => void retry()} className="mt-3">Retry collection</Button>}
      {round.status === 'publication_uncertain' && <form onSubmit={markPublished} className="mt-3 flex flex-col gap-3">
        <a href={`https://www.reddit.com/r/${round.subreddit}/new/`} target="_blank" rel="noopener noreferrer" className="self-start underline">Check posts on Reddit</a>
        <label htmlFor={`${controlId}-published-post`} className="flex flex-col gap-1.5 font-medium">Reddit post link<Input id={`${controlId}-published-post`} value={postLink} maxLength={300} onChange={event => setPostLink(event.target.value)} /></label>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="outline" disabled={pending || !postLink.trim()}>Mark as published</Button>
          <Button type="button" variant="ghost" disabled={pending} onClick={() => { setError(''); setNotPostedOpen(true); }}>Nothing was posted</Button>
        </div>
      </form>}
    </div>}
    {stale && <p role="alert" className="text-sm text-destructive">Another team member changed this round. Copy any edits you need, then discard your edits to load the saved version.</p>}
    {error && !confirmOpen && !templateOpen && !notPostedOpen && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {(round.status === 'draft' || round.body) && <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <Panel title="Announcement" bodyClassName="p-4 md:p-6">
        <Tabs defaultValue="preview">
          <TabsList aria-label="Announcement view"><TabsTrigger value="preview">Preview</TabsTrigger><TabsTrigger value="edit" disabled={!editable}>Edit</TabsTrigger></TabsList>
          <TabsContent value="preview" className="pt-5">
            <h2 className="mb-5 break-words text-xl font-semibold">{value.title}</h2>
            <div className="flex flex-col gap-3 break-words text-sm leading-7 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:font-semibold [&_a]:text-primary [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_pre]:overflow-x-auto [&_pre]:bg-muted [&_pre]:p-3">
              <ReactMarkdown skipHtml disallowedElements={['img']} components={{ a: ({ children, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer">{children}</a> }}>{value.body}</ReactMarkdown>
            </div>
          </TabsContent>
          <TabsContent value="edit" className="pt-4">
            <fieldset disabled={pending || !editable} className="flex flex-col gap-4">
              <legend className="sr-only">Edit announcement</legend>
              <label htmlFor={`${controlId}-announcement-title`} className="flex flex-col gap-2 text-sm font-medium">Post title<Input id={`${controlId}-announcement-title`} maxLength={300} value={value.title} onChange={event => update({ title: event.target.value })} /></label>
              <label htmlFor={`${controlId}-announcement-body`} className="flex flex-col gap-2 text-sm font-medium">Announcement (Markdown)<Textarea id={`${controlId}-announcement-body`} className="min-h-96 font-mono text-sm" maxLength={39000} value={value.body} onChange={event => update({ body: event.target.value })} /></label>
              <p className="text-xs text-muted-foreground">Replace each review placeholder after listening. Keep the Cassette link for each selected winner. Preview updates with your edits.</p>
            </fieldset>
          </TabsContent>
        </Tabs>
      </Panel>
      <aside className="flex min-w-0 flex-col gap-4" aria-label="Selection review">
        {round.issues.length > 0 && <Panel title={`${round.issues.length} selection issues`} bodyClassName="p-4">
          <p className="mb-3 text-sm">Resolve these before publication. Record your decision when you approve.</p>
          <ul className="flex max-h-64 list-disc flex-col gap-2 overflow-y-auto pl-4 text-xs leading-5">{round.issues.map((issue, index) => <li key={`${index}:${issue}`}>{issue}</li>)}</ul>
        </Panel>}
        <Panel title="Candidates" bodyClassName="p-4">
          <p className="mb-4 text-xs text-muted-foreground">Select first place, then second place. Apply template uses this order. Saving prepares Cassette links for the selected winners. Scores reflect collection time.</p>
          <fieldset disabled={!editable || pending} className="flex max-h-[32rem] flex-col gap-4 overflow-y-auto">
            <legend className="sr-only">Winning entries</legend>
            {value.candidates.map(candidate => <div key={candidate.postId} className="flex flex-col gap-2 border-b border-border pb-4 last:border-0 last:pb-0">
              <label className="flex items-start gap-2 text-sm font-medium"><input type="checkbox" className="mt-1 shrink-0" checked={value.selectedPostIds.includes(candidate.postId)}
                disabled={!value.selectedPostIds.includes(candidate.postId) && value.selectedPostIds.length >= 2}
                onChange={event => update({ selectedPostIds: event.target.checked ? [...value.selectedPostIds, candidate.postId] : value.selectedPostIds.filter(id => id !== candidate.postId) })} />{candidate.title}</label>
              <p className="text-xs text-muted-foreground">u/{candidate.author} · Score {candidate.score}</p>
              {value.selectedPostIds.includes(candidate.postId) && <p className="text-xs font-medium">{value.selectedPostIds.indexOf(candidate.postId) === 0 ? 'First place' : 'Second place'}</p>}
              <div className="flex gap-3 text-xs"><a className="text-primary underline" href={candidate.playlistUrl} target="_blank" rel="noopener noreferrer">Playlist</a><a className="text-primary underline" href={`https://www.reddit.com/comments/${candidate.sourcePostId.slice(3)}`} target="_blank" rel="noopener noreferrer">Original post</a></div>
              {candidate.cassetteUrl && <a className="text-xs text-primary underline" href={candidate.cassetteUrl} target="_blank" rel="noopener noreferrer">View Cassette playlist</a>}
              {value.selectedPostIds.includes(candidate.postId) && !candidate.cassetteUrl && (candidate.conversionError
                ? <div className="flex flex-col gap-2"><p role="alert" className="text-xs text-destructive">{candidate.conversionError}</p><Button variant="outline" size="sm" disabled={pending || dirty || round.status !== 'draft'} onClick={() => void retryConversion(candidate.postId)}>Retry conversion</Button></div>
                : <p className="text-xs text-muted-foreground">Preparing Cassette link…</p>)}
            </div>)}
          </fieldset>
        </Panel>
        <details className="rounded-lg border border-border p-4 text-sm"><summary className="cursor-pointer font-medium">Selection details</summary><pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap break-words text-xs leading-5">{round.report}</pre></details>
      </aside>
    </div>}
    {(round.status === 'draft' || round.body) && <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4">
      <output className="text-xs text-muted-foreground">{dirty ? 'Unsaved changes' : `Saved ${new Date(round.updatedAtUtc).toLocaleString()}`}</output>
      <div className="flex flex-wrap gap-2">
        {dirty && <Button variant="ghost" disabled={pending} onClick={() => { setEditing(null); onDirty(false); setError(''); }}>Discard edits</Button>}
        {editable && <>
          <Button variant="outline" disabled={pending || stale || value.selectedPostIds.length === 0} onClick={() => { setError(''); setTemplateOpen(true); }}>Apply template</Button>
          <Button variant="outline" disabled={!dirty || pending || stale} onClick={() => void save()}><Save aria-hidden="true" />{pending ? 'Saving…' : 'Save draft'}</Button>
          <Button disabled={dirty || pending || !linksReady} onClick={() => { setReviewed(false); setReviewNote(''); setError(''); setConfirmOpen(true); }}><Send aria-hidden="true" />Post to Reddit</Button>
        </>}
        {round.postId && <Button asChild><a href={`https://www.reddit.com/comments/${round.postId.slice(3)}`} target="_blank" rel="noopener noreferrer"><ExternalLink aria-hidden="true" />View Reddit post</a></Button>}
      </div>
    </div>}
    <AlertDialog open={templateOpen} onOpenChange={open => { if (!pending) setTemplateOpen(open); }}>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>Replace the announcement with the template?</AlertDialogTitle><AlertDialogDescription>This replaces the title and text in your editor, including any written reviews, using the selected winners and saved subreddit settings. Your saved draft stays unchanged until you click Save draft.</AlertDialogDescription></AlertDialogHeader>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <AlertDialogFooter><AlertDialogCancel disabled={pending}>Keep current text</AlertDialogCancel><AlertDialogAction disabled={pending} onClick={event => { event.preventDefault(); void applyTemplate(); }}>{pending ? 'Applying…' : 'Replace text'}</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    <AlertDialog open={notPostedOpen} onOpenChange={open => { if (!pending) setNotPostedOpen(open); }}>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>Return this round to draft?</AlertDialogTitle><AlertDialogDescription>Confirm that r/{round.subreddit} has no post from this approval. The round returns to Draft and needs a new approval. If a post exists, a new approval creates a second post.</AlertDialogDescription></AlertDialogHeader>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <AlertDialogFooter><AlertDialogCancel disabled={pending}>Keep current state</AlertDialogCancel><AlertDialogAction disabled={pending}
          onClick={event => { event.preventDefault(); void resolvePublication(null); }}>{pending ? 'Updating…' : 'Return to draft'}</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    <AlertDialog open={confirmOpen} onOpenChange={open => { if (!pending) setConfirmOpen(open); }}>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>Post to r/{round.subreddit}?</AlertDialogTitle><AlertDialogDescription>The bot will publish the saved announcement on its next check. Members of the selected community will be able to see the post.</AlertDialogDescription></AlertDialogHeader>
        <p className="text-sm font-medium">{round.title}</p>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={reviewed} onChange={event => setReviewed(event.target.checked)} />I reviewed the announcement and confirmed the selected winners.</label>
        {round.issues.length > 0 && <label htmlFor={`${controlId}-selection-resolution`} className="flex flex-col gap-2 text-sm">How were the selection issues resolved?<Textarea id={`${controlId}-selection-resolution`} value={reviewNote} maxLength={2000} onChange={event => setReviewNote(event.target.value)} /></label>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <AlertDialogFooter><AlertDialogCancel disabled={pending}>Keep draft</AlertDialogCancel><AlertDialogAction disabled={pending || !reviewed || (round.issues.length > 0 && !reviewNote.trim())}
          onClick={event => { event.preventDefault(); void approve(); }}>{pending ? 'Queuing…' : 'Confirm and queue post'}</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>;
}
