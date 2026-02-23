export type ElementTypeDimension = 'track' | 'album' | 'artist' | 'playlist';
export type PlatformDimension = 'spotify' | 'apple' | 'deezer' | 'unknown';
export type SourceSurface =
  | 'home'
  | 'add_music'
  | 'post'
  | 'post_direct'
  | 'profile'
  | 'onboarding'
  | 'explore'
  | 'auth'
  | 'unknown';

export type SourceContextDimension =
  | 'destination_open_button'
  | 'playlist_convert_button'
  | 'playlist_open_button'
  | string;

export type AnalyticsEventName =
  | 'auth_signup_submitted'
  | 'auth_signed_up'
  | 'auth_signup_failed'
  | 'auth_signin_submitted'
  | 'auth_signed_in'
  | 'auth_signin_failed'
  | 'auth_google_oauth_started'
  | 'auth_google_oauth_completed'
  | 'auth_google_oauth_failed'
  | 'account_deleted'
  | 'account_delete_failed'
  | 'onboarding_started'
  | 'onboarding_step_completed'
  | 'onboarding_completed'
  | 'onboarding_failed'
  | 'profile_viewed'
  | 'profile_shared'
  | 'profile_updated'
  | 'profile_update_failed'
  | 'profile_music_preferences_updated'
  | 'profile_music_preferences_update_failed'
  | 'music_service_connected'
  | 'music_service_connection_failed'
  | 'music_service_disconnected'
  | 'music_service_disconnect_failed'
  | 'link_conversion_submitted'
  | 'link_converted'
  | 'link_conversion_failed'
  | 'post_created'
  | 'post_create_failed'
  | 'post_updated'
  | 'post_update_failed'
  | 'post_deleted'
  | 'post_delete_failed'
  | 'post_viewed'
  | 'post_shared'
  | 'streaming_link_opened'
  | 'post_platform_conversion_clicked'
  | 'preview_playback_started'
  | 'preview_playback_failed'
  | 'playlist_creation_submitted'
  | 'playlist_created_on_platform'
  | 'playlist_creation_failed'
  | 'playlist_opened_on_platform'
  | 'music_link_pasted'
  | 'unsupported_music_link_pasted'
  | 'search_submitted'
  | 'search_result_selected'
  | 'conversion_entry_started'
  | 'issue_report_submitted'
  | 'issue_reported'
  | 'issue_report_failed';

export type AnalyticsBaseProps = {
  element_type?: ElementTypeDimension;
  source_platform?: PlatformDimension;
  target_platform?: PlatformDimension;
  source_surface?: SourceSurface;
  route?: string;
  is_authenticated?: boolean;
  user_id?: string;
  organization_id?: string;
  role?: string;
  plan?: string;
  post_id?: string;
  music_element_id?: string;
  status?: 'submitted' | 'succeeded' | 'failed';
  success?: boolean;
  core_action?: boolean;
  reason_code?: string;
  source_domain?: string;
  element_type_guess?: ElementTypeDimension;
  report_type?: 'conversion_issue' | 'ui_bug' | 'general_feedback' | 'missing_track' | 'wrong_match';
  source_context?: SourceContextDimension;
  has_description?: boolean;
  has_conversion_context?: boolean;
  platform_count?: number;
  result_count?: number;
  step?: 'handle' | 'avatar' | 'music';
  service?: 'spotify' | 'apple' | 'deezer' | 'unknown';
  account_type?: 'Regular' | 'Verified' | 'CassetteTeam' | string;
  internal_actor?: boolean;
};

export type AnalyticsEventPropsMap = {
  [K in AnalyticsEventName]: AnalyticsBaseProps;
};

export type CapturePayload<E extends AnalyticsEventName> = {
  event: E;
  properties: AnalyticsEventPropsMap[E];
};

export const CANONICAL_SUCCESS_EVENTS = new Set<AnalyticsEventName>([
  'auth_signed_up',
  'auth_signed_in',
  'auth_google_oauth_completed',
  'account_deleted',
  'onboarding_completed',
  'profile_updated',
  'profile_music_preferences_updated',
  'music_service_connected',
  'music_service_disconnected',
  'link_converted',
  'post_created',
  'post_updated',
  'post_deleted',
  'playlist_created_on_platform',
  'issue_reported',
]);

export const CORE_ACTION_EVENTS = new Set<AnalyticsEventName>([
  'link_converted',
  'post_created',
  'profile_updated',
  'playlist_created_on_platform',
  'music_service_connected',
  'onboarding_completed',
]);

export function isCanonicalSuccessEvent(event: AnalyticsEventName): boolean {
  return CANONICAL_SUCCESS_EVENTS.has(event);
}

export function normalizeStatus(event: AnalyticsEventName, props: AnalyticsBaseProps): AnalyticsBaseProps {
  const next: AnalyticsBaseProps = { ...props };

  if (event.endsWith('_submitted')) {
    next.status = 'submitted';
    next.success = false;
  } else if (event.endsWith('_failed')) {
    next.status = 'failed';
    next.success = false;
  } else if (isCanonicalSuccessEvent(event)) {
    next.status = 'succeeded';
    next.success = true;
  }

  if (isCanonicalSuccessEvent(event) && (next.status === 'failed' || next.status === 'submitted')) {
    next.status = 'succeeded';
    next.success = true;
  }

  return next;
}

export function withCoreAction(event: AnalyticsEventName, props: AnalyticsBaseProps): AnalyticsBaseProps {
  const normalized = normalizeStatus(event, props);

  if (CORE_ACTION_EVENTS.has(event) && (normalized.success === true || normalized.status === 'succeeded')) {
    return {
      ...normalized,
      core_action: true,
    };
  }

  if (normalized.core_action) {
    return {
      ...normalized,
      core_action: false,
    };
  }

  return normalized;
}
