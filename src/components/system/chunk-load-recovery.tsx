'use client';

import { useEffect } from 'react';

const CHUNK_RELOAD_GUARD_KEY = 'cassette.chunk.reload.once';

const isChunkLoadMessage = (message: string): boolean => {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('chunkloaderror') ||
    normalized.includes('loading chunk') ||
    normalized.includes('failed to fetch dynamically imported module')
  );
};

const extractMessage = (reason: unknown): string => {
  if (typeof reason === 'string') return reason;
  if (reason instanceof Error) return reason.message;
  if (reason && typeof reason === 'object' && 'message' in reason) {
    const value = (reason as { message?: unknown }).message;
    return typeof value === 'string' ? value : '';
  }
  return '';
};

export function ChunkLoadRecovery() {
  useEffect(() => {
    const recoverFromChunkFailure = (message: string) => {
      if (!isChunkLoadMessage(message)) return;

      try {
        if (sessionStorage.getItem(CHUNK_RELOAD_GUARD_KEY) === '1') {
          return;
        }

        sessionStorage.setItem(CHUNK_RELOAD_GUARD_KEY, '1');
      } catch {
        // If sessionStorage is unavailable, still attempt one reload.
      }

      window.location.reload();
    };

    const onWindowError = (event: ErrorEvent) => {
      const message = event.message || extractMessage(event.error);
      recoverFromChunkFailure(message);
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      recoverFromChunkFailure(extractMessage(event.reason));
    };

    window.addEventListener('error', onWindowError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);

    return () => {
      window.removeEventListener('error', onWindowError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, []);

  return null;
}

