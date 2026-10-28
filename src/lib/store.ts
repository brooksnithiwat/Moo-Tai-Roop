/* App state lives in one mutable object. Actions mutate it and call commit(), which re-renders
   subscribed components and schedules a save. Small app, one store: no extra state library needed. */
import { useSyncExternalStore } from 'react';
import type { Booking, Cfg, DriveInfo, Occ } from './types';
import { occurrences } from './model';
import { todayIso, today, setEra } from './util';

export type Tab = 'today' | 'jobs' | 'cal' | 'money' | 'settings';
export type SheetSpec =
  | { kind: 'pay' | 'detail' | 'del' | 'finish' | 'reset' | 'signinFolder'; id: number }
  | { kind: 'form'; id?: number }
  | { kind: 'list'; list: 'pkg' | 'place' }
  | { kind: 'num'; num: 'timer' | 'backlog' }
  | { kind: 'export' | 'install' | 'clear' | 'setup' }
  | { kind: 'copy'; text: string };

export interface Toast { text: string; action?: { label: string; run: () => void }; key: number }

export const defaultCfg = (): Cfg => ({
  packages: [
    { name: 'เดี่ยว 1 ชม.', dur: 60, price: 1500 },
    { name: 'เดี่ยว 2 ชม.', dur: 120, price: 2500 },
    { name: 'โปรเจกต์ครึ่งวัน', dur: 240, price: 8000 },
  ],
  places: [],
  warnMin: 5, sound: true, groupPct: 35, warnDays: 7, badDays: 14, theme: 'light', weekStart: 0, era: 'be',
});

const savedTab = (() => { try { const t = localStorage.getItem('moo_tab'); return ['today', 'jobs', 'cal', 'money', 'settings'].includes(t || '') ? (t as Tab) : 'today'; } catch { return 'today' as Tab; } })();

export const S = {
  shoots: [] as Booking[],
  cfg: defaultCfg(),
  drive: null as DriveInfo | null,
  updatedAt: 0,
  loaded: false,
  ui: {
    tab: savedTab,
    month: (() => { const d = today(); return new Date(d.getFullYear(), d.getMonth(), 1); })(),
    selDay: todayIso(),
    todayFilter: 'all' as string,
    jobFilter: 'all' as string,
    finFilter: 'all' as string,
    tq: '',
    q: '',
    /** slot id of the open shoot screen */
    open: null as number | null,
    sheet: null as SheetSpec | null,
    menu: null as { id: number; top: number; right: number } | null,
    toast: null as Toast | null,
  },
};
export const signedIn = () => !!S.drive?.email;

/* ---------- subscription ---------- */
let version = 0;
const listeners = new Set<() => void>();
const subscribe = (f: () => void) => { listeners.add(f); return () => listeners.delete(f); };
export function useApp() { useSyncExternalStore(subscribe, () => version); return S; }

let saveHook: (() => void) | null = null;
export const onCommit = (f: () => void) => { saveHook = f; };

export function commit() {
  version++;
  setEra(S.cfg.era);
  document.documentElement.dataset.theme = S.cfg.theme;
  try { localStorage.setItem('moo_tab', S.ui.tab); } catch { /* storage may be blocked */ }
  listeners.forEach(f => f());
  if (S.loaded) saveHook?.();
}

/* ---------- lookups ---------- */
export const allOcc = () => occurrences(S.shoots);
export const findOcc = (id: number | null | undefined): Occ | undefined => (id == null ? undefined : allOcc().find(o => o.id === id));

/* ---------- ui helpers ---------- */
let toastT: ReturnType<typeof setTimeout> | undefined;
export function toast(text: string, action?: Toast['action']) {
  clearTimeout(toastT);
  S.ui.toast = { text, action, key: Date.now() };
  commit();
  toastT = setTimeout(() => { S.ui.toast = null; commit(); }, action ? 5000 : 2000);
}
export const openSheet = (s: SheetSpec) => { S.ui.menu = null; S.ui.sheet = s; commit(); };
export const closeSheet = () => { S.ui.sheet = null; commit(); };
export const go = (tab: Tab) => { S.ui.tab = tab; S.ui.menu = null; commit(); window.scrollTo(0, 0); };
