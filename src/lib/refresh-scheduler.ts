// Coalesce a burst of attendance updates, with at most one refresh in flight.
// An event arriving during a request schedules one final refresh afterwards.
export function createRefreshScheduler(refresh: () => Promise<unknown>, delay = 350) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let running = false;
  let dirty = false;
  let disposed = false;
  const run = async () => {
    timer = undefined;
    if (disposed || running) return;
    dirty = false; running = true;
    try { await refresh(); } catch { /* The resource exposes its own error state. */ }
    finally { running = false; if (dirty && !disposed) schedule(); }
  };
  const schedule = () => {
    if (disposed) return;
    dirty = true;
    if (!running && !timer) timer = setTimeout(() => { void run(); }, delay);
  };
  return { schedule, dispose: () => { disposed = true; if (timer) clearTimeout(timer); } };
}
