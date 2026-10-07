'use client';
import { useSyncExternalStore } from 'react';
import { LoaderCircle } from 'lucide-react';
import { activitySnapshot, serverActivitySnapshot, subscribeActivity } from '@/lib/request-activity';
export default function NetworkActivity() {
  const pending = useSyncExternalStore(subscribeActivity, activitySnapshot, serverActivitySnapshot);
  if (!pending) return null;
  return <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 top-0 z-[100]">
    <div className="h-1 overflow-hidden bg-primary/10"><div className="loading-bar h-full w-1/3 bg-primary"/></div>
    <div className="mx-auto mt-3 flex w-fit items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-xs font-bold text-primary shadow-lg"><LoaderCircle className="size-4 animate-spin" aria-hidden="true"/>กำลังดำเนินการ…</div>
  </div>;
}
