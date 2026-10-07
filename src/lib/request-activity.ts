// UI-only activity, never contains response data or credentials.
const listeners = new Set<() => void>();
let pending = 0;
export const subscribeActivity = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export const activitySnapshot = () => pending;
export const serverActivitySnapshot = () => 0;
export function beginActivity() {
  pending++; listeners.forEach(fn => fn());
  let complete = false;
  return () => { if (complete) return; complete = true; pending = Math.max(0, pending - 1); listeners.forEach(fn => fn()); };
}
