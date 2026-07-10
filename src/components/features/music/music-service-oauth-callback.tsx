'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageLoader } from '@/components/ui/page-loader';
import { appLogger } from '@/lib/observability/logger';
import { apiService } from '@/services/api';
import { platformConnectService } from '@/services/platform-connect';
import { pendingActionService } from '@/utils/pending-action';

type RedirectOAuthPlatform = 'spotify' | 'deezer';

interface MusicServiceOAuthCallbackProps {
  platform: RedirectOAuthPlatform;
  displayName: string;
}

export function MusicServiceOAuthCallback({
  platform,
  displayName,
}: MusicServiceOAuthCallbackProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const getReturnUrl = (): string | null => {
      const platformReturnUrl = platformConnectService.getReturnUrl(platform);
      if (platformReturnUrl) return platformReturnUrl;
      return pendingActionService.get()?.returnUrl || null;
    };

    const redirectTo = (baseUrl: string, param?: string) => {
      const separator = baseUrl.includes('?') ? '&' : '?';
      window.location.href = param ? `${baseUrl}${separator}${param}` : baseUrl;
    };

    const exchangeCode = async (code: string, state: string) => {
      if (platform === 'spotify') {
        await apiService.handleSpotifyCallback(code, state);
        return;
      }

      await apiService.handleDeezerCallback(code, state);
    };

    const handleCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');
      const returnUrl = getReturnUrl();

      if (error) {
        appLogger.warn(`${platform}_callback_authorization_denied`, {
          error_code: error,
          route: `/${platform}_callback`,
        });
        platformConnectService.clearReturnUrl(platform);
        pendingActionService.clear();
        if (returnUrl) {
          redirectTo(returnUrl, `error=${platform}-auth-denied`);
        } else {
          router.replace(`/profile?error=${platform}-auth-denied`);
        }
        return;
      }

      if (!code || !state) {
        appLogger.error(`${platform}_callback_invalid_request`, {
          route: `/${platform}_callback`,
        });
        platformConnectService.clearReturnUrl(platform);
        pendingActionService.clear();
        if (returnUrl) {
          redirectTo(returnUrl, `error=${platform}-invalid-callback`);
        } else {
          router.replace(`/profile?error=${platform}-invalid-callback`);
        }
        return;
      }

      try {
        await exchangeCode(code, state);
        platformConnectService.clearReturnUrl(platform);
        if (returnUrl) {
          redirectTo(returnUrl, `${platform}_connected=true`);
        } else {
          window.location.href = `/profile?success=${platform}-connected`;
        }
      } catch (callbackError) {
        appLogger.error(`${platform}_callback_processing_failed`, {
          error: callbackError,
          route: `/${platform}_callback`,
        });
        platformConnectService.clearReturnUrl(platform);
        pendingActionService.clear();
        if (returnUrl) {
          redirectTo(returnUrl, `error=${platform}-callback-failed`);
        } else {
          router.replace(`/profile?error=${platform}-callback-failed`);
        }
      }
    };

    void handleCallback();
  }, [platform, router, searchParams]);

  return (
    <PageLoader
      message={`Connecting your ${displayName} account...`}
      subtitle="Please wait while we securely save your connection."
    />
  );
}
