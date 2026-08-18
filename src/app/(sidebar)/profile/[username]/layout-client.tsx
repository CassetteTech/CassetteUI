'use client';

/** Provides profile layout context without mounting duplicate desktop and mobile page trees. */

import { ProfileLayoutContext } from './layout-context';

export default function ProfileLayoutClient({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <ProfileLayoutContext.Provider value={{ hasLayout: true }}>
      <div className="min-h-svh lg:flex lg:h-screen lg:min-h-0 lg:flex-col lg:overflow-hidden">
        {children}
      </div>
    </ProfileLayoutContext.Provider>
  );
}
