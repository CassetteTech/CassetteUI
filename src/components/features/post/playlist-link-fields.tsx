'use client';

/** The post owner's own playlist link for each service, shared by Add music and Edit post. */

import { useId } from 'react';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { getPlatformDefinition, type PlatformUiKey } from '@/lib/platforms';
import { curatorLinkPlatforms, type ByService } from '@/lib/playlist-copy-placement';

/** One field for each service but the source, whose row always opens the original playlist. */
export function PlaylistLinkFields({
  sourcePlatform,
  values,
  errors,
  onChange,
  disabled = false,
}: {
  sourcePlatform: PlatformUiKey | null;
  values: ByService<string>;
  errors: ByService<string>;
  onChange: (platform: PlatformUiKey, value: string) => void;
  disabled?: boolean;
}) {
  // Add music mounts its form once per layout, so each instance needs its own ids.
  const idPrefix = useId();
  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted-foreground">
        Have your own copy of this playlist on another service? Paste its link, and fans open it there.
        Leave a field empty to let fans get a copy from Cassette.
      </p>
      {curatorLinkPlatforms(sourcePlatform).map((platform) => {
        const definition = getPlatformDefinition(platform);
        if (!definition) return null;
        const id = `${idPrefix}-${platform}`;
        const error = errors[platform];
        return (
          <div key={platform} className="grid gap-1.5">
            <label htmlFor={id} className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Image src={definition.logoSrc} alt="" width={16} height={16} className="size-4 object-contain" />
              {definition.displayName}
            </label>
            <Input
              id={id}
              type="url"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              placeholder={`Your ${definition.displayName} playlist link`}
              value={values[platform] ?? ''}
              onChange={(event) => onChange(platform, event.target.value)}
              disabled={disabled}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${id}-error` : undefined}
              data-testid={`playlist-link-${platform}`}
            />
            {/* Announced as it appears: focus stays on the save button that found it. */}
            {error && (
              <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
                {error}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
