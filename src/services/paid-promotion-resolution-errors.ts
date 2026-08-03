export type PaidPromotionResolutionErrorKind =
  | 'invalid_link'
  | 'unsupported_link'
  | 'missing_post'
  | 'canonical_record';

export type PaidPromotionResolutionAction = 'edit_link' | 'retry' | 'contact_support';

export type PaidPromotionResolutionFailure = {
  title: string;
  message: string;
  action: PaidPromotionResolutionAction;
  actionLabel: string;
};

export class PaidPromotionResolutionError extends Error {
  constructor(readonly kind: PaidPromotionResolutionErrorKind) {
    super(kind);
    this.name = 'PaidPromotionResolutionError';
  }
}

const FAILURES = {
  invalid_link: {
    title: 'Check the music link',
    message: 'Paste a complete public share link, including https://, then try again.',
    action: 'edit_link',
    actionLabel: 'Edit link',
  },
  unsupported_link: {
    title: 'Use a supported music link',
    message: 'Paste a public Spotify, Apple Music, or Deezer link so Cassette can find the music.',
    action: 'edit_link',
    actionLabel: 'Choose another link',
  },
  conversion_required: {
    title: 'Cassette needs to import this music',
    message: 'We have not finished adding this release to Cassette yet. Start the import again to continue.',
    action: 'retry',
    actionLabel: 'Try import again',
  },
  source_incomplete: {
    title: 'This music is still being imported',
    message: 'Cassette needs help finishing this release before it can be promoted. Send us the link and we will take it from here.',
    action: 'contact_support',
    actionLabel: 'Contact support',
  },
  missing_post: {
    title: 'We imported the music but could not open it',
    message: 'The import finished without a usable Cassette post. Try once more to reconnect the record.',
    action: 'retry',
    actionLabel: 'Try resolving again',
  },
  canonical_record: {
    title: 'We could not verify this music record',
    message: 'The result did not match a promotable Cassette record. Send us the link so we can correct it.',
    action: 'contact_support',
    actionLabel: 'Contact support',
  },
  not_found: {
    title: 'We could not find that music',
    message: 'The link may be private, expired, or unavailable. Copy a fresh public share link and try again.',
    action: 'edit_link',
    actionLabel: 'Use a fresh link',
  },
  unavailable: {
    title: 'Cassette could not finish the import',
    message: 'A music service or Cassette is temporarily unavailable. Your link is still here, so you can retry safely.',
    action: 'retry',
    actionLabel: 'Try again',
  },
  unknown: {
    title: 'We could not resolve this music link',
    message: 'Check that the link is public and complete, then try again. If it keeps failing, contact support.',
    action: 'retry',
    actionLabel: 'Try again',
  },
} as const satisfies Record<string, PaidPromotionResolutionFailure>;

function errorDetails(error: unknown): { code: string; message: string; status?: number } {
  if (!error || typeof error !== 'object') return { code: '', message: '' };
  const candidate = error as { errorCode?: unknown; message?: unknown; status?: unknown };
  return {
    code: typeof candidate.errorCode === 'string' ? candidate.errorCode.toLowerCase() : '',
    message: typeof candidate.message === 'string' ? candidate.message.toLowerCase() : '',
    status: typeof candidate.status === 'number' ? candidate.status : undefined,
  };
}

export function getPaidPromotionResolutionFailure(
  error: unknown,
): PaidPromotionResolutionFailure {
  if (error instanceof PaidPromotionResolutionError) {
    return FAILURES[error.kind];
  }

  const { code, message, status } = errorDetails(error);
  const signal = `${code} ${message}`;

  if (
    signal.includes('paid_promotion_subject_source_incomplete') ||
    signal.includes('paid_promotion_track_source_incomplete')
  ) {
    return FAILURES.source_incomplete;
  }
  if (
    signal.includes('paid_promotion_subject_conversion_required') ||
    signal.includes('paid_promotion_track_conversion_required')
  ) {
    return FAILURES.conversion_required;
  }
  if (code.includes('not_found') || status === 404) return FAILURES.not_found;
  if (
    status === 429 ||
    (status !== undefined && status >= 500) ||
    /timeout|timed out|network|fetch|unavailable|upstream|rate.?limit|still processing/.test(signal)
  ) {
    return FAILURES.unavailable;
  }

  return FAILURES.unknown;
}
