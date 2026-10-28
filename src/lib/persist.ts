/* Local persistence: the whole state is one record in IndexedDB (room for inline ref images). */
import type { Booking, SavedState } from './types';
import { S } from './store';
import { bumpUid, newTimer } from './model';

const DB = 'moo-thai-rup', OS = 'state', KEY = 'main';
let dbp: Promise<IDBDatabase> | null = null;
const open = () => dbp || (dbp = new Promise((res, rej) => {
  const r = indexedDB.open(DB, 1);
  r.onupgradeneeded = () => r.result.createObjectStore(OS);
  r.onsuccess = () => res(r.result);
  r.onerror = () => rej(r.error);
}));
async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const db = await open();
  return new Promise((res, rej) => {
    const t = db.transaction(OS, mode), q = fn(t.objectStore(OS));
    t.oncomplete = () => res(q ? q.result : undefined);
    t.onerror = () => rej(t.error);
  });
}
export const loadLocal = () => tx<SavedState>('readonly', s => s.get(KEY)).catch(() => undefined);
export const saveLocal = (d: SavedState) => tx('readwrite', s => { s.put(d, KEY); });
export const clearLocal = () => tx('readwrite', s => { s.delete(KEY); });

export function serialize(): SavedState {
  // keys starting with _ are runtime caches (e.g. generated sample images) and are never stored
  return JSON.parse(JSON.stringify({ v: 2, updatedAt: S.updatedAt || Date.now(), cfg: S.cfg, drive: S.drive, shoots: S.shoots }, (k, v) => (k.startsWith('_') ? undefined : v)));
}

/** Accepts v2 (this app) and v1 (the earlier plain-JS version) data. */
export function hydrate(d: any): boolean {
  if (!d || !Array.isArray(d.shoots)) return false;
  let max = 100;
  const bump = (n: unknown) => { const m = +String(n).replace(/\D/g, ''); if (m > max) max = m; };
  S.shoots = d.shoots.map((b: any): Booking => {
    bump(b.id);
    b.slots = (b.slots || []).map((sl: any) => {
      bump(sl.id); (sl.shots || []).forEach((x: any) => bump(x.id));
      const t = sl.t || {};
      if (t.base === undefined) {
        // v1 timer {total, remain, running, wall} → timestamps
        const nt = newTimer(sl.dur);
        nt.total = t.total ?? sl.dur * 60;
        const el = nt.total - (t.remain ?? nt.total);
        if (t.running) { nt.start = (t.wall || Date.now()) - el * 1000; } else nt.base = Math.max(0, el);
        sl.t = nt;
      }
      sl.refs = (sl.refs || []).map((r: any) => { const { _img, ...rest } = r; return rest; });
      sl.shots = sl.shots || []; sl.ri = sl.ri || 0; sl.sel = sl.sel || 'all'; sl.done = !!sl.done;
      delete sl.seg; delete sl._ci;
      return sl;
    });
    b.series = b.series || '—'; b.leader = b.leader || 0;
    return b as Booking;
  });
  if (d.cfg) Object.assign(S.cfg, d.cfg);
  if ((S.cfg.theme as string) !== 'dark') S.cfg.theme = 'light';
  S.drive = d.drive || null;
  S.updatedAt = d.updatedAt || 0;
  bumpUid(max);
  return true;
}

/* ---------- save on change, debounced ---------- */
let saveT: ReturnType<typeof setTimeout> | undefined, last = '';
export function scheduleSave(after?: () => void) {
  clearTimeout(saveT);
  saveT = setTimeout(async () => {
    const snap = serialize();
    const key = JSON.stringify({ ...snap, updatedAt: 0, drive: { ...snap.drive, lastSync: 0 } });
    if (key === last) return;
    last = key;
    S.updatedAt = snap.updatedAt = Date.now();
    try { await saveLocal(snap); } catch (e) { console.warn('save failed', e); }
    after?.();
  }, 600);
}
export const flushSave = () => { try { saveLocal(serialize()); } catch { /* ignore */ } };

/* ---------- uploaded images: downscale to keep storage and sync light ---------- */
export function fileToDataURL(file: Blob, max = 1400): Promise<string> {
  return new Promise((res, rej) => {
    const img = new Image(), u = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(u);
      res(c.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => { URL.revokeObjectURL(u); rej(new Error('อ่านไฟล์รูปไม่ได้')); };
    img.src = u;
  });
}
