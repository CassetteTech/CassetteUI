// Server-only guard to prevent client-side imports
// This file should be imported at the top of server-only music API services

if (typeof window !== 'undefined') {
  throw new Error(
    'Music API services contain sensitive credentials and must only be used server-side. ' +
    'Use API routes (/api/music/*) to access music functionality from client components.'
  );
}

export const SERVER_ONLY_GUARD = true;