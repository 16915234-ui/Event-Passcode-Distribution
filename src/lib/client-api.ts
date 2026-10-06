'use client';
import { useCallback, useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from './supabase/client';
export async function api<T>(url: string, body?: unknown, method = 'POST'): Promise<T> {
  const res = await fetch(url, { ...(body === undefined ? {} : { method, headers: { 'Content-Type':'application/json' }, body: JSON.stringify(body) }), cache:'no-store' });
  const data = await res.json();
  if(!res.ok || data.success === false) throw new Error(data.error || data.message || 'ไม่สามารถเชื่อมต่อระบบได้');
  return data as T;
}
export function useResource<T>(url: string | null) {
  const [state, setState] = useState<{ url: string; data: T } | null>(null);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    if(!url) return;
    try { const data = await api<T>(url); setState({ url, data }); setError(''); } catch(e) { setError(e instanceof Error ? e.message : 'ไม่สามารถโหลดข้อมูลได้'); }
  }, [url]);
  useEffect(() => { let active = true; if(url) api<T>(url).then(data => { if(active) { setState({url,data}); setError(''); } }).catch(e => { if(active) setError(e.message); }); return () => { active = false; }; }, [url]);
  return { data: state?.url === url ? state.data : undefined, error, refresh };
}
export function useAttendanceRealtime(filter: string | null, refresh: () => Promise<void>) {
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    if(!filter) return;
    const client = getSupabaseBrowserClient();
    const channel = client.channel(`attendance:${filter}:${crypto.randomUUID()}`).on('postgres_changes', { event:'*',schema:'public',table:'event_registrations',filter }, () => { void refresh(); }).subscribe((status: string) => { setConnected(status === 'SUBSCRIBED'); if(status === 'SUBSCRIBED') void refresh(); });
    // Reconcile missed messages on reconnect, focus and periodically.
    const timer = setInterval(() => { void refresh(); }, 15000);
    const focus = () => { void refresh(); }; window.addEventListener('focus', focus);
    return () => { clearInterval(timer); window.removeEventListener('focus', focus); void client.removeChannel(channel); };
  }, [filter, refresh]);
  return connected;
}
export function errorText(e: unknown) { return e instanceof Error ? e.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่'; }
