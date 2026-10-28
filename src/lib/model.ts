import type { Booking, BookingType, Occ, Person, Ref, Shot, Slot, StageKey, Timer } from './types';

/* ---------- ids ---------- */
let uid = 100;
export const nextId = () => uid++;
export const bumpUid = (n: number) => { if (n >= uid) uid = n + 1; };

/* ---------- work stages ---------- */
export interface StageDef { k: StageKey; t: string; c: string; bg: string }
export const STAGES: StageDef[] = [
  { k: 'wait', t: 'รอคิว', c: 'var(--muted)', bg: 'var(--sunk)' },
  { k: 'shooting', t: 'กำลังถ่าย', c: 'var(--accent)', bg: 'var(--accent-soft)' },
  { k: 'shot', t: 'ถ่ายแล้ว', c: 'var(--info)', bg: 'var(--info-soft)' },
  { k: 'editing', t: 'รอแต่งรูป', c: 'var(--warn)', bg: 'var(--warn-soft)' },
  { k: 'delivered', t: 'ส่งงานแล้ว', c: 'var(--ok)', bg: 'var(--ok-soft)' },
];
export const CANCEL: StageDef = { k: 'cancelled', t: 'ยกเลิก', c: 'var(--bad)', bg: 'var(--bad-soft)' };
export const ALLST: StageDef[] = [...STAGES, CANCEL];
export const stageOf = (k: StageKey) => ALLST.find(x => x.k === k) || STAGES[0];
export const stageIdx = (k: StageKey) => STAGES.findIndex(x => x.k === k);
export const isCx = (b: Booking) => b.stage === 'cancelled';
export const isBacklog = (b: Booking) => b.stage === 'shot' || b.stage === 'editing';

/* ---------- money ---------- */
export type PayKey = 'paid' | 'dep' | 'due' | 'cancel';
export const payStatus = (b: Booking): PayKey => (isCx(b) ? 'cancel' : b.paid >= b.price ? 'paid' : b.paid > 0 ? 'dep' : 'due');
export const PAY_TXT: Record<PayKey, string> = { paid: 'จ่ายครบ', dep: 'มัดจำแล้ว', due: 'ยังไม่จ่าย', cancel: 'ยกเลิก' };

/* ---------- people ---------- */
export const isProj = (b: Booking) => b.type === 'project';
export const leaderName = (b: Booking) => b.people[b.leader]?.name || '';

/* ---------- timer ---------- */
export const newTimer = (dur: number): Timer => ({ total: dur * 60, base: 0, start: null });
export const elapsed = (t: Timer, now = Date.now()) => t.base + (t.start ? (now - t.start) / 1000 : 0);
export const remain = (t: Timer, now = Date.now()) => t.total - elapsed(t, now);
export const running = (t: Timer) => t.start !== null;
export const touched = (t: Timer) => running(t) || t.base > 0;

/* ---------- shots & slots ---------- */
export interface ShotSeed { label: string; who: number[] | 'all'; min: number; refs?: Omit<Ref, 'done' | 'shot'>[] }
export interface SlotSeed { date: string; time: string; dur: number; place?: string; char?: string | null; done?: boolean; refs?: Omit<Ref, 'done' | 'shot'>[]; shots?: ShotSeed[] }

export function autoShots(people: Person[], dur: number, groupPct: number): ShotSeed[] {
  const g = Math.round((dur * groupPct) / 100 / 5) * 5;
  const each = Math.max(5, Math.floor((dur - g) / people.length));
  return [{ label: 'ถ่ายรวม', who: 'all', min: g }, ...people.map((p, i) => ({ label: 'เดี่ยว ' + p.name, who: [i], min: each }))];
}

export function makeSlot(sd: SlotSeed, people: Person[], type: BookingType, groupPct: number, done = false): Slot {
  const raw: ShotSeed[] = type === 'project'
    ? sd.shots || autoShots(people, sd.dur, groupPct)
    : [{ label: 'ช็อตเดี่ยว', who: [0], min: sd.dur, refs: sd.refs || [] }];
  const ids = raw.map(() => 'sh' + nextId());
  const shots: Shot[] = raw.map((x, i) => ({ id: ids[i], label: x.label, who: x.who === 'all' ? people.map((_, j) => j) : x.who, min: x.min || 0 }));
  const refs: Ref[] = raw.flatMap((x, i) => (x.refs || []).map(r => ({ ...r, done: false, shot: ids[i] })));
  return {
    id: nextId(), date: sd.date, time: sd.time, dur: sd.dur, place: sd.place || '—', char: sd.char || null,
    shots, refs, t: newTimer(sd.dur), ri: 0, sel: 'all', done: !!(sd.done || done),
  };
}

export interface BookingSeed {
  type?: BookingType; name: string; series?: string; price: number; paid?: number; stage?: StageKey;
  people?: Person[]; slots: SlotSeed[];
}
export function makeBooking(o: BookingSeed, groupPct: number): Booking {
  const type = o.type || 'solo';
  const people = type === 'project' ? o.people! : [{ name: o.name, char: o.slots[0]?.char || '—' }];
  const stage = o.stage || 'wait';
  const past = ['shot', 'editing', 'delivered'].includes(stage);
  return {
    id: nextId(), type, name: o.name, series: o.series || '—', price: o.price, paid: o.paid || 0, people, leader: 0, stage,
    slots: o.slots.map(sd => makeSlot(sd, people, type, groupPct, past)),
  };
}

/* ---------- occurrences: a booking seen through one time slot ---------- */
export const occurrences = (shoots: Booking[]): Occ[] =>
  shoots.flatMap(b => b.slots.map((sl, i) => ({ id: sl.id, b, sl, no: i + 1, count: b.slots.length })));
export const occOf = (b: Booking, sl: Slot): Occ => ({ id: sl.id, b, sl, no: b.slots.indexOf(sl) + 1, count: b.slots.length });
/** The slot that represents a booking in lists: next unshot slot before shooting, the last slot after. */
export const keyOcc = (b: Booking): Occ => {
  const pre = b.stage === 'wait' || b.stage === 'shooting';
  const sl = pre ? b.slots.find(x => !x.done) || b.slots[b.slots.length - 1] : b.slots[b.slots.length - 1];
  return occOf(b, sl);
};
export const sortOcc = (a: Occ, b: Occ) => (a.sl.date + a.sl.time).localeCompare(b.sl.date + b.sl.time);

export const occChar = (o: Occ) => o.sl.char || o.b.people[0]?.char || '—';
/** short line next to a name: character for solo, member count for a project */
export const shortLine = (o: Occ) => (isProj(o.b) ? `โปรเจกต์ ${o.b.people.length} คน` : occChar(o));
/** line under a name on a card */
export const subLine = (o: Occ) => (isProj(o.b) ? `${o.b.people.length} คน · หัวโปร ${leaderName(o.b)}` : `${occChar(o)} · ${o.b.series}`);

export const visRefs = (sl: Slot) => (sl.sel === 'all' ? sl.refs : sl.refs.filter(r => r.shot === sl.sel));
export const shotOf = (sl: Slot, id: string) => sl.shots.find(x => x.id === id);

/** Which planned shot the timer is in, and seconds left in it. */
export function planInfo(sl: Slot, now = Date.now()) {
  const el = elapsed(sl.t, now) / 60;
  let cum = 0;
  for (let i = 0; i < sl.shots.length; i++) { cum += sl.shots[i].min; if (el < cum) return { i, left: (cum - el) * 60 }; }
  return { i: sl.shots.length - 1, left: (cum - el) * 60 };
}

export const matchQ = (o: Occ, q: string) =>
  !q || [o.b.name, o.b.series, ...o.b.slots.flatMap(x => [x.place, x.char || '']), ...o.b.people.flatMap(p => [p.name, p.char])]
    .join(' ').toLowerCase().includes(q);
