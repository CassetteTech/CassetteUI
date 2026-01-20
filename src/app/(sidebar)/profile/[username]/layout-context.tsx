'use client';

import { createContext, useContext } from 'react';

interface ProfileLayoutContextType {
  hasLayout: boolean;
}

export const ProfileLayoutContext = createContext<ProfileLayoutContextType>({
  hasLayout: false,
});

export function useProfileLayout() {
  return useContext(ProfileLayoutContext);
}
