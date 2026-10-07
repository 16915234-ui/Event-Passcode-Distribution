'use client';
import { createContext, useContext, useMemo, useState } from 'react';
import { SWRConfig } from 'swr';
import type { Profile } from '@/types';
const ProfileContext = createContext<Profile | null>(null);
export function useProfile() { return useContext(ProfileContext); }
export default function DataProvider({ user, children }: { user: Profile; children: React.ReactNode }) {
  // Cache lives only inside this authenticated portal; never shared between users or persisted.
  const [cache] = useState(() => new Map());
  const config = useMemo(() => ({ provider: () => cache, dedupingInterval: 2000, revalidateOnFocus: false, revalidateOnReconnect: true, errorRetryCount: 1, errorRetryInterval: 3000, keepPreviousData: false }), [cache]);
  return <ProfileContext.Provider value={user}><SWRConfig value={config}>{children}</SWRConfig></ProfileContext.Provider>;
}
