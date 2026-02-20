'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthState } from '@/hooks/use-auth';
import { useUserBio, useProfileAnalytics } from '@/hooks/use-profile';
import { ProfileAnalytics } from '@/components/features/profile/profile-analytics';
import { analyticsService } from '@/services/analytics';
import { Container } from '@/components/ui/container';
import { theme } from '@/lib/theme';
import { ArrowLeft, BarChart3, Lock } from 'lucide-react';
import Link from 'next/link';

export default function AnalyticsPage() {
  const { username } = useParams();
  const router = useRouter();
  const { user } = useAuthState();
  const trackedProfileRef = useRef<string | null>(null);

  const userIdentifier = Array.isArray(username) ? username[0] : username;

  const { data: userBio, isLoading: isLoadingBio } = useUserBio(userIdentifier);

  const isCurrentUser = useMemo(() => {
    if (!userBio || !user) return false;
    return userBio.isOwnProfile ||
           user.id === userBio.id ||
           user.username?.toLowerCase() === userBio.username?.toLowerCase();
  }, [userBio, user]);

  const {
    data: analyticsSummary,
    isLoading: isLoadingAnalytics,
  } = useProfileAnalytics(userIdentifier, {
    enabled: !!isCurrentUser
  });

  // Track profile view
  useEffect(() => {
    if (!userBio?.username) return;
    const trackingKey = userBio.id || userBio.username.toLowerCase();
    if (trackedProfileRef.current === trackingKey) return;
    trackedProfileRef.current = trackingKey;
    void analyticsService.trackProfileView(userBio.username, 'analytics_page').catch(() => {});
  }, [userBio?.id, userBio?.username]);

  // Unauthorized state — not the profile owner
  if (!isLoadingBio && userBio && !isCurrentUser) {
    return (
      <>
        <div className="bg-background lg:hidden">
          <Container className="min-h-screen bg-transparent p-0 flex items-center justify-center">
            <UnauthorizedMessage username={userIdentifier} />
          </Container>
        </div>
        <div className="hidden lg:flex items-center justify-center flex-1">
          <UnauthorizedMessage username={userIdentifier} />
        </div>
      </>
    );
  }

  // Not logged in
  if (!user && !isLoadingBio) {
    return (
      <>
        <div className="bg-background lg:hidden">
          <Container className="min-h-screen bg-transparent p-0 flex items-center justify-center">
            <div className="text-center px-6">
              <h1 className="text-2xl font-bold text-foreground mb-4">Sign In Required</h1>
              <p className="text-muted-foreground mb-4">You need to be signed in to view analytics.</p>
              <button
                onClick={() => router.push('/auth/login')}
                className="text-white px-6 py-2 rounded-lg font-medium"
                style={{ background: `linear-gradient(to right, ${theme.colors.brandRed}, ${theme.colors.brandRedD})` }}
              >
                Sign In
              </button>
            </div>
          </Container>
        </div>
        <div className="hidden lg:flex items-center justify-center flex-1">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Sign In Required</h1>
            <p className="text-muted-foreground mb-4">You need to be signed in to view analytics.</p>
            <button
              onClick={() => router.push('/auth/login')}
              className="text-white px-6 py-2 rounded-lg font-medium"
              style={{ background: `linear-gradient(to right, ${theme.colors.brandRed}, ${theme.colors.brandRedD})` }}
            >
              Sign In
            </button>
          </div>
        </div>
      </>
    );
  }

  const pageHeader = (
    <div className="flex items-center gap-3 mb-6">
      <div
        className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${theme.colors.brandRed}15` }}
      >
        <BarChart3 className="h-5 w-5" style={{ color: theme.colors.brandRed }} />
      </div>
      <div>
        <h1
          className="text-2xl font-bold text-foreground leading-tight"
          style={{ fontFamily: theme.fonts.teko, letterSpacing: '0.02em' }}
        >
          Analytics
        </h1>
        <p className="text-xs text-muted-foreground">
          Track how people discover and interact with your music
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* ─── MOBILE & TABLET ─── */}
      <div className="bg-background lg:hidden">
        <Container className="min-h-screen bg-transparent p-0">
          <div className="max-w-4xl mx-auto">
            {/* Mobile header with back button */}
            <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-sm border-b border-border/40">
              <div className="flex items-center gap-3 px-4 py-3">
                <Link
                  href={`/profile/${userIdentifier}`}
                  className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted/50 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4 text-muted-foreground" />
                </Link>
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" style={{ color: theme.colors.brandRed }} />
                  <span
                    className="text-lg font-bold text-foreground"
                    style={{ fontFamily: theme.fonts.teko, letterSpacing: '0.02em' }}
                  >
                    Analytics
                  </span>
                </div>
              </div>
            </div>
            <div className="p-3 sm:p-4 md:p-6">
              <ProfileAnalytics
                summary={analyticsSummary}
                isLoading={isLoadingBio || isLoadingAnalytics}
              />
            </div>
          </div>
        </Container>
      </div>

      {/* ─── DESKTOP ─── */}
      <div className="hidden lg:flex lg:flex-col lg:flex-1 lg:min-h-0">
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 lg:p-8 max-w-5xl">
            {pageHeader}
            <ProfileAnalytics
              summary={analyticsSummary}
              isLoading={isLoadingBio || isLoadingAnalytics}
            />
          </div>
        </div>
      </div>
    </>
  );
}

function UnauthorizedMessage({ username }: { username?: string }) {
  return (
    <div className="text-center px-6">
      <div className="h-14 w-14 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-muted/50">
        <Lock className="h-7 w-7 text-muted-foreground" />
      </div>
      <h1 className="text-2xl font-bold text-foreground mb-2">Private Analytics</h1>
      <p className="text-muted-foreground mb-6 max-w-xs mx-auto">
        Analytics are only visible to the profile owner.
      </p>
      <Link
        href={username ? `/profile/${username}` : '/explore'}
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to profile
      </Link>
    </div>
  );
}
