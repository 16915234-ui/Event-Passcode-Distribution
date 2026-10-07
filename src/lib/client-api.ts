'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import { getSupabaseBrowserClient } from './supabase/client';
import { beginActivity } from './request-activity';
import { createRefreshScheduler } from './refresh-scheduler';

type RequestOptions = { background?: boolean; signal?: AbortSignal };
export async function api<T>(url: string, body?: unknown, method = 'POST', options: RequestOptions = {}): Promise<T> {
  const finish = options.background ? () => {} : beginActivity();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), body === undefined ? 30_000 : 300_000);
  const abort = () => controller.abort();
  options.signal?.addEventListener('abort', abort, { once: true });
  if (options.signal?.aborted) abort();
  try {
    const res = await fetch(url, { ...(body === undefined ? {} : { method, headers: { 'Content-Type':'application/json' }, body: JSON.stringify(body) }), cache:'no-store', signal: controller.signal });
    const data = await res.json().catch(() => { throw new Error('เซิร์ฟเวอร์ไม่ตอบกลับข้อมูล กรุณาลองใหม่'); });
    if(!res.ok || data.success === false) throw new Error(data.error || data.message || 'ไม่สามารถเชื่อมต่อระบบได้');
    return data as T;
  } catch (error) {
    if (controller.signal.aborted && !options.signal?.aborted) throw new Error('การเชื่อมต่อใช้เวลานานเกินไป กรุณาลองใหม่');
    throw error;
  } finally { clearTimeout(timeout); options.signal?.removeEventListener('abort', abort); finish(); }
}

export function useResource<T>(url: string | null, options?: {keepPreviousData?: boolean}) {
  const { data: result, error, isLoading, isValidating, mutate } = useSWR<{key:string;value:T}, Error>(
    url, async key => ({ key, value: await api<T>(key, undefined, 'GET', { background: true }) }), options,
  );
  // Keep the search form mounted while a new page/filter loads, but never show
  // the old page as a successful response if the new request fails.
  const data = error && result?.key !== url ? undefined : result?.value;
  const refresh = useCallback(async () => { await mutate().catch(() => undefined); }, [mutate]);
  return { data, error: error?.message || '', isLoading, isRefreshing: isValidating && !!data && !isLoading, refresh };
}

export function useDebouncedValue<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => { const timer = setTimeout(() => setDebounced(value), delay); return () => clearTimeout(timer); }, [value, delay]);
  return debounced;
}

export function useAttendanceRealtime(filter: string | null, refresh: () => Promise<void>) {
  const [connected, setConnected] = useState(false);
  const refreshRef = useRef(refresh);
  useEffect(() => { refreshRef.current = refresh; }, [refresh]);
  useEffect(() => {
    if(!filter) return;
    let active = true;
    let subscribed = false;
    let lastRefresh = Date.now();
    const updates = createRefreshScheduler(async () => {
      if (document.visibilityState === 'hidden') return;
      lastRefresh = Date.now(); await refreshRef.current();
    });
    const client = getSupabaseBrowserClient();
    const channel = client.channel(`attendance:${filter}:${crypto.randomUUID()}`)
      .on('postgres_changes', { event:'*', schema:'public', table:'event_registrations', filter }, updates.schedule)
      .subscribe((status: string) => {
        if (!active) return;
        subscribed = status === 'SUBSCRIBED'; setConnected(subscribed);
        if (subscribed) updates.schedule(); // Reconcile the subscription gap/reconnect.
      });
    const timer = setInterval(() => {
      if (Date.now() - lastRefresh >= (subscribed ? 60_000 : 15_000)) updates.schedule();
    }, 15_000);
    const visible = () => { if (document.visibilityState === 'visible') updates.schedule(); };
    window.addEventListener('focus', visible); document.addEventListener('visibilitychange', visible);
    return () => { active = false; updates.dispose(); clearInterval(timer); window.removeEventListener('focus', visible); document.removeEventListener('visibilitychange', visible); void client.removeChannel(channel); };
  }, [filter]);
  return connected;
}
export function errorText(e: unknown) { return e instanceof Error ? e.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่'; }
