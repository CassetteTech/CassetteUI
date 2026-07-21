export type WebShareResult = 'shared' | 'cancelled' | 'busy';

type ShareFunction = (data: ShareData) => Promise<void>;

let activeShare: Promise<void> | undefined;

export function canShareWebContent(nav: Navigator = navigator): boolean {
  const share = (nav as Navigator & { share?: ShareFunction }).share;
  return typeof share === 'function';
}

export async function shareWebContent(
  data: ShareData,
  share: ShareFunction = (shareData) => navigator.share(shareData),
): Promise<WebShareResult> {
  if (activeShare) return 'busy';

  try {
    const shareAttempt = share(data);
    activeShare = shareAttempt;
    await shareAttempt;
    return 'shared';
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'name' in error &&
      error.name === 'AbortError'
    ) {
      return 'cancelled';
    }

    throw error;
  } finally {
    activeShare = undefined;
  }
}
