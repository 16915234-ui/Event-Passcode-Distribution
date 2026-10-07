import { LoaderCircle, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('skeleton-shimmer rounded-lg bg-muted', className)}/>;
}
export function LoadingStatus({ label = 'กำลังโหลดข้อมูล…', compact = false }: { label?: string; compact?: boolean }) {
  return <div role="status" aria-live="polite" className={cn('flex items-center justify-center gap-2 text-primary', compact ? 'py-2 text-xs' : 'py-5 text-sm font-bold')}><LoaderCircle className={cn('animate-spin',compact?'size-4':'size-5')} aria-hidden="true"/><span>{label}</span></div>;
}
export function DataSkeleton({ label = 'กำลังโหลดข้อมูล…', cards = false }: { label?: string; cards?: boolean }) {
  return <div aria-busy="true" className="loading-reveal rounded-2xl border border-border bg-white p-5"><LoadingStatus label={label}/><div className={cards?'grid gap-4 sm:grid-cols-3':'space-y-4'}>{Array.from({length:cards?3:5},(_,i)=><div key={i} aria-hidden="true" className={cards?'space-y-4 rounded-xl border border-border p-4':'flex items-center gap-4 border-b border-border py-2'}><Skeleton className={cards?'h-10 w-10':'size-10 shrink-0'}/><div className="w-full space-y-2"><Skeleton className="h-3 w-3/4"/><Skeleton className="h-3 w-1/2"/></div>{cards&&<Skeleton className="h-8 w-full"/>}</div>)}</div></div>;
}
export function RefreshStatus({ active }: { active: boolean }) {
  return active ? <span role="status" className="inline-flex items-center gap-1.5 text-xs text-primary"><RefreshCw className="size-3 animate-spin" aria-hidden="true"/>กำลังอัปเดต…</span> : null;
}
export function RetryLoad({ message, retry }: { message: string; retry: () => void }) {
  return <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-center text-sm text-primary"><p>{message}</p><Button className="mt-3" variant="outline" onClick={retry}><RefreshCw/>ลองใหม่</Button></div>;
}
export function Pagination({ page, pageSize, total, onChange, loading = false }: { page: number; pageSize: number; total: number; onChange: (page: number) => void; loading?: boolean }) {
  const pages = Math.max(1, Math.ceil(total/pageSize));
  return <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-xs text-muted-foreground"><span>{total ? `${(page-1)*pageSize+1}–${Math.min(page*pageSize,total)} จาก ${total} รายการ` : '0 รายการ'}</span><div className="flex items-center gap-2"><Button variant="outline" size="sm" disabled={page<=1||loading} aria-label="หน้าก่อนหน้า" onClick={()=>onChange(page-1)}><ChevronLeft/></Button><span>หน้า {page} / {pages}</span><Button variant="outline" size="sm" disabled={page>=pages||loading} aria-label="หน้าถัดไป" onClick={()=>onChange(page+1)}><ChevronRight/></Button></div></div>;
}
