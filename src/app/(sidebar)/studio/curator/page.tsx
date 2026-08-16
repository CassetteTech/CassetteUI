'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { CuratorEarningsCard } from '@/components/features/curator/curator-earnings-card';
import { CuratorPayoutCard } from '@/components/features/curator/curator-payout-card';
import { CuratorPlanCard } from '@/components/features/curator/curator-plan-card';
import { CuratorProCard } from '@/components/features/curator/curator-pro-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  createCuratorProfile,
  fetchOwnCuratorProfile,
  updateCuratorProfile,
  type CuratorProfile,
  type CuratorProfileRequest,
} from '@/services/curator';

const profileQueryKey = ['curator-profile', 'me'] as const;

function formText(data: FormData, name: string): string {
  // SAFETY: every requested name belongs to a text input in this form.
  return ((data.get(name) as string | null) ?? '').trim();
}

function commaSeparated(value: string): string[] {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function CuratorProfileForm({ profile }: { profile: CuratorProfile | null }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (request: CuratorProfileRequest) => profile
      ? updateCuratorProfile(request)
      : createCuratorProfile(request),
    onSuccess: (savedProfile) => {
      queryClient.setQueryData(profileQueryKey, savedProfile);
      toast.success(profile ? 'Curator profile updated.' : 'Curator profile created.');
    },
  });

  return (
    <Card>
      <CardHeader className="sm:flex sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Your free curator profile</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Curator Pro is not required to create, edit, or keep this profile.
          </p>
        </div>
        <Badge variant="outline" className="mt-2 capitalize sm:mt-0">
          {profile?.status ?? 'Not created'}
        </Badge>
      </CardHeader>
      <CardContent>
        {profile?.suspensionReason && (
          <p className="mb-5 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
            This curator profile is suspended: {profile.suspensionReason}
          </p>
        )}

        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            mutation.mutate({
              headline: formText(data, 'headline') || null,
              about: formText(data, 'about') || null,
              declaredGenres: commaSeparated(formText(data, 'genres')),
              declaredPlatforms: commaSeparated(formText(data, 'platforms')),
            });
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="curator-headline">Headline</Label>
            <Input
              id="curator-headline"
              name="headline"
              maxLength={2000}
              defaultValue={profile?.headline ?? ''}
              placeholder="Independent curator sharing late-night electronic finds"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="curator-about">About</Label>
            <Textarea
              id="curator-about"
              name="about"
              maxLength={2000}
              defaultValue={profile?.about ?? ''}
              placeholder="Tell listeners what you curate and why."
              className="min-h-28"
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="curator-genres">Genres</Label>
              <Input
                id="curator-genres"
                name="genres"
                maxLength={2000}
                defaultValue={profile?.declaredGenres.join(', ') ?? ''}
                placeholder="Electronic, ambient, jazz"
                aria-describedby="curator-genres-help"
              />
              <p id="curator-genres-help" className="text-xs text-muted-foreground">Separate entries with commas.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="curator-platforms">Platforms</Label>
              <Input
                id="curator-platforms"
                name="platforms"
                maxLength={2000}
                defaultValue={profile?.declaredPlatforms.join(', ') ?? ''}
                placeholder="Spotify, Apple Music, SoundCloud"
                aria-describedby="curator-platforms-help"
              />
              <p id="curator-platforms-help" className="text-xs text-muted-foreground">Separate entries with commas.</p>
            </div>
          </div>

          {mutation.isError && (
            <p role="alert" className="text-sm text-destructive">
              Your changes were not saved. Check the fields and try again.
            </p>
          )}

          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending
              ? 'Saving…'
              : profile ? 'Save changes' : 'Create curator profile'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function CuratorStudio() {
  const profile = useQuery({
    queryKey: profileQueryKey,
    queryFn: ({ signal }) => fetchOwnCuratorProfile(signal),
    staleTime: 0,
  });

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:py-12">
      <header className="mb-6">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          Curator tools
        </p>
        <h1 className="mt-1 font-teko text-4xl font-bold uppercase leading-none tracking-tight sm:text-5xl">
          Curator Studio
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
          Set up your curator identity while keeping every regular Cassette feature. A paid
          subscription is only needed to lock posts or earn membership revenue.
        </p>
      </header>

      <div className="space-y-6">
        <CuratorProCard />
        <CuratorPayoutCard />
        {profile.isPending ? (
          <Card><CardContent><output>Loading curator profile…</output></CardContent></Card>
        ) : profile.isError ? (
          <Card>
            <CardContent className="space-y-4">
              <p role="alert">Could not load your curator profile.</p>
              <Button variant="outline" onClick={() => profile.refetch()}>Try again</Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <CuratorProfileForm key={profile.data?.id ?? 'new'} profile={profile.data} />
            {profile.data && <CuratorPlanCard profile={profile.data} />}
            {profile.data && <CuratorEarningsCard />}
          </>
        )}
      </div>
    </div>
  );
}

export default function CuratorStudioPage() {
  return (
    <RequireAuth>
      <CuratorStudio />
    </RequireAuth>
  );
}
