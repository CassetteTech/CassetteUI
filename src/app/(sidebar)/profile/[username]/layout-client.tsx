'use client';

import { ProfileLayoutContext } from './layout-context';

export default function ProfileLayoutClient({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <ProfileLayoutContext.Provider value={{ hasLayout: true }}>
      <div className="hidden lg:flex lg:flex-col lg:h-screen lg:min-h-0 lg:overflow-hidden">
        {children}
      </div>
      <div className="lg:hidden">
        {children}
      </div>
    </ProfileLayoutContext.Provider>
  );
}
