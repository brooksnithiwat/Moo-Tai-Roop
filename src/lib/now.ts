/* A shared clock. Ticks 4×/s only while some timer is running, so idle screens never re-render. */
import { useSyncExternalStore } from 'react';
import { anyRunning, watchTimers } from './actions';

let now = Date.now();
const ls = new Set<() => void>();
setInterval(() => {
  watchTimers();
  if (anyRunning()) { now = Date.now(); ls.forEach(f => f()); }
}, 250);
export const useNow = () => useSyncExternalStore(f => { ls.add(f); return () => ls.delete(f); }, () => now);
/** Force an immediate tick, e.g. right after pausing so the paused time shows exactly. */
export const tickNow = () => { now = Date.now(); ls.forEach(f => f()); };
