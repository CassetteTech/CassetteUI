'use client';

import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { redditCompetitions, type CompetitionCommunity } from '@/services/reddit-competitions';

const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function CompetitionSchedule({ community, onSaved }: { community: CompetitionCommunity; onSaved: () => Promise<void> }) {
  const controlId = useId();
  const [value, setValue] = useState(community);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  async function save(event: React.FormEvent) {
    event.preventDefault(); setPending(true); setError('');
    try { await redditCompetitions.schedule(value); await onSaved(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save the schedule.'); }
    finally { setPending(false); }
  }
  const stale = Date.now() - new Date(community.lastSeenUtc).getTime() > 10 * 60_000;
  return <details className="rounded-lg border border-border bg-card p-4">
    <summary className="cursor-pointer text-sm font-medium">Weekly drafts: {community.enabled ? `${days[community.dayOfWeek]}, ${String(community.hour).padStart(2, '0')}:${String(community.minute).padStart(2, '0')} ${community.timeZone}` : 'Paused'}{community.testMode ? ' · Test subreddit' : ''}</summary>
    <div className="mt-3 flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">{community.nextRunUtc ? `Next draft: ${new Date(community.nextRunUtc).toLocaleString(undefined, { timeZone: community.timeZone })} (${community.timeZone}). ` : ''}The bot checks every five minutes. Publication always requires approval.</p>
      <p className="text-xs text-muted-foreground">Last bot check: {new Date(community.lastSeenUtc).toLocaleString()}{stale ? ' — connection needs attention' : ''}</p>
      <form onSubmit={event => void save(event)} className="flex flex-col gap-4">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={value.enabled} onChange={event => setValue({ ...value, enabled: event.target.checked })} />Prepare a draft every week</label>
        <fieldset disabled={pending} className="grid gap-4 sm:grid-cols-3">
          <legend className="sr-only">Weekly draft schedule</legend>
          <label className="flex flex-col gap-1 text-sm">Day<select className="h-10 rounded-md border border-input bg-background px-3" value={value.dayOfWeek} onChange={event => setValue({ ...value, dayOfWeek: Number(event.target.value) })}>
            {days.map((day, index) => <option key={day} value={index}>{day}</option>)}
          </select></label>
          <label htmlFor={`${controlId}-weekly-time`} className="flex flex-col gap-1 text-sm">Time<Input id={`${controlId}-weekly-time`} type="time" required value={`${String(value.hour).padStart(2, '0')}:${String(value.minute).padStart(2, '0')}`} onChange={event => {
            const [hour, minute] = event.target.value.split(':').map(Number); setValue({ ...value, hour, minute });
          }} /></label>
          <label htmlFor={`${controlId}-weekly-zone`} className="flex flex-col gap-1 text-sm">Timezone<Input id={`${controlId}-weekly-zone`} required maxLength={100} value={value.timeZone} onChange={event => setValue({ ...value, timeZone: event.target.value })} placeholder="America/New_York" /></label>
          <label htmlFor={`${controlId}-weekly-flairs`} className="flex flex-col gap-1 text-sm sm:col-span-3">Excluded flairs<Input id={`${controlId}-weekly-flairs`} value={value.excludedFlairs} maxLength={1000} onChange={event => setValue({ ...value, excludedFlairs: event.target.value })} /><span className="text-xs text-muted-foreground">Separate flair names with commas.</span></label>
        </fieldset>
        <fieldset disabled={pending} className="flex flex-col gap-3 border-t border-border pt-4">
          <legend className="text-sm font-medium">Announcement template</legend>
          <label htmlFor={`${controlId}-week-one`} className="flex flex-col gap-1 text-sm">Week 1 announcement date<Input id={`${controlId}-week-one`} type="date" aria-describedby={`${controlId}-week-one-help`} value={value.weekOneDate ?? ''} onChange={event => setValue({ ...value, weekOneDate: event.target.value || null })} /></label>
          <p id={`${controlId}-week-one-help`} className="text-xs text-muted-foreground">Use the date of your first winners announcement to continue your week numbering. Leave empty to omit week numbers.</p>
          <label htmlFor={`${controlId}-introduction`} className="flex flex-col gap-1 text-sm">Introduction<Textarea id={`${controlId}-introduction`} rows={5} maxLength={5000} value={value.introduction} onChange={event => setValue({ ...value, introduction: event.target.value })} /></label>
          <label htmlFor={`${controlId}-closing`} className="flex flex-col gap-1 text-sm">Closing<Textarea id={`${controlId}-closing`} rows={3} maxLength={5000} value={value.closing} onChange={event => setValue({ ...value, closing: event.target.value })} /></label>
          <p className="text-xs text-muted-foreground">{'Available values: {subreddit}, {round}, {date}, {nextRound}, {nextDate}. The next date uses the weekly schedule above. Changes apply to new drafts. Use Apply template to update an existing draft.'}</p>
        </fieldset>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button type="submit" variant="outline" disabled={pending} className="self-start">{pending ? 'Saving…' : 'Save settings'}</Button>
      </form>
    </div>
  </details>;
}
