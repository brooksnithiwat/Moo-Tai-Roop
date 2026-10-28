/* Everything that changes data. Components call these; each ends with commit(). */
import type { Booking, Occ, Person, StageKey } from './types';
import { S, commit, closeSheet, findOcc, toast, openSheet, signedIn } from './store';
import { STAGES, isProj, makeBooking, makeSlot, newTimer, nextId, occOf, planInfo, remain, running, stageIdx, stageOf, visRefs, type BookingSeed } from './model';
import { clearLocal, fileToDataURL } from './persist';
import * as Drive from './drive';
import { sampleBookings } from './sample';
import { thDate, parse, todayIso } from './util';

/* ---------- bookings ---------- */
export function addBooking(seed: BookingSeed) {
  const b = makeBooking(seed, S.cfg.groupPct);
  S.shoots.push(b);
  const d = parse(b.slots[0].date);
  S.ui.selDay = b.slots[0].date; S.ui.month = new Date(d.getFullYear(), d.getMonth(), 1);
  closeSheet();
  toast(b.slots.length > 1 ? `เพิ่มคิวแล้ว · ${b.slots.length} ช่วงเวลา` : 'เพิ่มคิวแล้ว');
}

export interface SlotInput { date: string; time: string; dur: number; place: string; char: string | null }
/** Edit keeps each slot's shots, refs and timer; members removed lose their solo shots, new members get one. */
export function updateBooking(b: Booking, f: { name: string; series: string; price: number; people?: Person[]; slots: SlotInput[] }) {
  b.price = f.price;
  if (isProj(b) && f.people) {
    const oldP = b.people, map = oldP.map(p => f.people!.findIndex(q => q.name === p.name));
    b.slots.forEach(sl => {
      sl.shots = sl.shots
        .map(x => { const all = x.who.length === oldP.length && oldP.length > 1; return { ...x, who: all ? f.people!.map((_, i) => i) : x.who.map(i => map[i]).filter(i => i >= 0) }; })
        .filter(x => x.who.length);
      const keep = new Set(sl.shots.map(x => x.id));
      sl.refs = sl.refs.filter(r => keep.has(r.shot));
      if (sl.sel !== 'all' && !keep.has(sl.sel)) sl.sel = 'all';
      f.people!.forEach((p, i) => { if (!oldP.some(o => o.name === p.name)) sl.shots.push({ id: 'sh' + nextId(), label: 'เดี่ยว ' + p.name, who: [i], min: 20 }); });
    });
    b.people = f.people; b.name = f.name; b.series = f.name;
  } else {
    b.name = f.name; b.series = f.series || '—'; b.people = [{ name: f.name, char: f.slots[0].char || '—' }];
  }
  b.slots.slice(f.slots.length).forEach(x => { if (S.ui.open === x.id) S.ui.open = null; });
  b.slots = f.slots.map((r, i) => {
    const ex = b.slots[i];
    if (!ex) return makeSlot({ ...r }, b.people, b.type, S.cfg.groupPct);
    const durCh = ex.dur !== r.dur;
    Object.assign(ex, r);
    if (!isProj(b)) ex.shots[0].min = r.dur;
    if (durCh && !running(ex.t) && ex.t.base === 0) ex.t = newTimer(r.dur);
    return ex;
  });
  closeSheet(); toast('บันทึกการแก้ไขแล้ว');
}

export function deleteBooking(b: Booking) {
  const i = S.shoots.indexOf(b);
  if (b.slots.some(x => x.id === S.ui.open)) S.ui.open = null;
  S.shoots.splice(i, 1);
  closeSheet();
  toast(`ลบคิว ${b.name} แล้ว`, { label: 'เลิกทำ', run: () => { S.shoots.splice(i, 0, b); toast(`กู้คิว ${b.name} คืนแล้ว`); } });
}

export function setStage(b: Booking, k: StageKey) { b.stage = k; commit(); toast(`${b.name} · ย้ายไป "${stageOf(k).t}"`); }
export function advance(b: Booking) { const nx = STAGES[stageIdx(b.stage) + 1]; if (nx) setStage(b, nx.k); }
export function setPaid(b: Booking, paid: number, price: number) { b.paid = Math.max(0, paid); b.price = Math.max(0, price); closeSheet(); toast('บันทึกแล้ว'); }

/* ---------- shoot screen & timer ---------- */
export const openShoot = (o: Occ) => { S.ui.open = o.id; S.ui.menu = null; S.ui.sheet = null; commit(); };
export const closeShoot = () => { S.ui.open = null; commit(); };

let wake: any = null;
export function toggleTimer(o: Occ) {
  const t = o.sl.t;
  if (running(t)) {
    t.base += (Date.now() - t.start!) / 1000; t.start = null;
    wake?.release?.().catch(() => {}); wake = null;
  } else {
    for (const x of S.shoots.flatMap(b => b.slots)) if (x !== o.sl && running(x.t)) {
      x.t.base += (Date.now() - x.t.start!) / 1000; x.t.start = null;
      toast(`พักเวลาของ ${S.shoots.find(b => b.slots.includes(x))?.name} ไว้ให้`);
    }
    t.start = Date.now();
    if (o.b.stage === 'wait') o.b.stage = 'shooting';
    beeper.unlock();
    (navigator as any).wakeLock?.request('screen').then((w: any) => (wake = w)).catch(() => {});
  }
  commit();
}
export function addMinutes(o: Occ, m: number) { const t = o.sl.t; t.total = Math.max(60, t.total + m * 60); commit(); }
export function resetTimer(o: Occ) { o.sl.t = newTimer(o.sl.dur); closeSheet(); toast('รีเซ็ตเวลาแล้ว'); }
export function finishSlot(o: Occ) {
  const t = o.sl.t;
  if (running(t)) { t.base += (Date.now() - t.start!) / 1000; t.start = null; }
  o.sl.done = true;
  const left = o.b.slots.filter(x => !x.done).length;
  if (!left && stageIdx(o.b.stage) < 2) o.b.stage = 'shot';
  else if (o.b.stage === 'wait') o.b.stage = 'shooting';
  closeSheet();
  toast(left ? `จบช่วง ${o.no}/${o.count} · เหลืออีก ${left} ช่วง` : `${o.b.name} · ${stageOf(o.b.stage).t}`);
}

/* ---------- refs ---------- */
export async function addRefFiles(o: Occ, files: File[]) {
  const shot = o.sl.sel === 'all' ? o.sl.shots[0].id : o.sl.sel;
  const list = (await Promise.all(files.map(f => fileToDataURL(f).then(url => ({ label: f.name.replace(/\.[^.]+$/, ''), url, done: false, shot })).catch(() => null)))).filter(Boolean) as any[];
  if (list.length < files.length) toast('บางไฟล์อ่านไม่ได้ เพิ่มเฉพาะไฟล์ที่เป็นรูป');
  if (!list.length) return;
  o.sl.refs.push(...list);
  o.sl.ri = Math.max(0, visRefs(o.sl).length - list.length);
  const label = o.sl.shots.find(x => x.id === shot)?.label;
  toast(S.ui.open === o.id ? `เพิ่มรูป ${list.length} รูป · ${label}` : `เพิ่มรูป ref ${list.length} รูปให้ ${o.b.name}${o.sl.shots.length > 1 ? ' · ' + label : ''}`);
}
export function addRefLink(o: Occ, url: string, shotId?: string): boolean {
  let ok = false; try { ok = /^https?:$/.test(new URL(url).protocol); } catch { /* not a URL */ }
  if (!ok) { toast('ลิงก์ต้องขึ้นต้นด้วย https://'); return false; }
  const shot = shotId || (o.sl.sel !== 'all' ? o.sl.sel : o.sl.shots[0].id);
  let host = 'ลิงก์'; try { host = new URL(url).hostname.replace(/^www\./, ''); } catch { /* keep */ }
  o.sl.refs.push({ label: host, link: url, done: false, shot });
  if (S.ui.open === o.id) o.sl.ri = Math.max(0, visRefs(o.sl).length - 1);
  toast(`เพิ่มลิงก์รูป ref ให้ ${o.b.name} แล้ว`);
  return true;
}
export function removeRef(o: Occ, idx: number) {
  const [r] = o.sl.refs.splice(idx, 1);
  if (o.sl.ri >= visRefs(o.sl).length) o.sl.ri = 0;
  toast(`ลบรูป ref ${r.label} แล้ว`);
}

/* ---------- Drive ---------- */
export async function signIn() {
  if (!Drive.configured()) return openSheet({ kind: 'setup' });
  toast('กำลังเข้าสู่ระบบ Google…');
  try { const r = await Drive.signIn(); toast(r === 'pulled' ? 'เข้าสู่ระบบแล้ว · โหลดข้อมูลจาก Drive' : 'เข้าสู่ระบบแล้ว · สำรองข้อมูลไว้ใน Drive'); }
  catch (e: any) { toast(e.message); }
}
export function signOut() { Drive.signOut(); toast('ออกจากระบบแล้ว ข้อมูลในเครื่องยังอยู่'); }
export async function syncNow() {
  toast('กำลังซิงก์…');
  try { const r = await Drive.sync(); toast(r === 'busy' ? 'กำลังซิงก์อยู่' : r === 'pulled' ? 'โหลดข้อมูลล่าสุดจาก Drive แล้ว' : 'บันทึกขึ้น Drive แล้ว'); }
  catch (e: any) { toast(e.message); }
}
export async function makeRefFolder(o: Occ) {
  if (!signedIn()) return openSheet({ kind: 'signinFolder', id: o.id });
  const b = o.b, title = `${b.name} · ${thDate(parse(b.slots[0].date), { day: 'numeric', month: 'short', year: '2-digit' })}`;
  toast('กำลังสร้างโฟลเดอร์ใน Google Drive…');
  try { b.refFolder = await Drive.createRefFolder(title); toast('สร้างโฟลเดอร์ Ref แล้ว คัดลอกข้อความส่งลูกค้าได้เลย'); }
  catch (e: any) { toast(e.message); }
}
export async function signInThenFolder(id: number) {
  if (!Drive.configured()) return openSheet({ kind: 'setup' });
  closeSheet();
  try { await Drive.signIn(); const o = findOcc(id); if (o) await makeRefFolder(o); } catch (e: any) { toast(e.message); }
}
export function folderMessage(o: Occ) {
  const b = o.b;
  const sl = b.slots.map(x => `${thDate(parse(x.date), { weekday: 'short', day: 'numeric', month: 'short' })} ${x.time} · ${x.place}`).join('\n');
  return `สวัสดี ${isProj(b) ? b.people[b.leader]?.name + ' และทีม ' + b.name : b.name} 📸\nคิวถ่าย:\n${sl}\n\nฝากอัปโหลดรูป ref ท่าที่อยากได้ไว้ในโฟลเดอร์นี้ได้เลย${isProj(b) ? ' (แยกรูปถ่ายรวม/รูปเดี่ยวได้ตามสะดวก)' : ''}\n👉 ${b.refFolder!.url}\n\nขอบคุณมาก 🙏`;
}
export function copyText(text: string, ok: string) {
  try { navigator.clipboard.writeText(text).then(() => toast(ok)).catch(() => openSheet({ kind: 'copy', text })); }
  catch { openSheet({ kind: 'copy', text }); }
}

/* ---------- data ---------- */
export function loadSample() { S.shoots.push(...sampleBookings(S.cfg.groupPct)); S.ui.tab = 'today'; toast('เพิ่มคิวตัวอย่างแล้ว'); }
export async function clearAll() { S.shoots = []; S.ui.open = null; S.updatedAt = Date.now(); await clearLocal(); closeSheet(); toast('ล้างข้อมูลในเครื่องแล้ว'); }
export function csvRows() {
  const rows: (string | number)[][] = [['ชื่อ', 'ประเภท', 'สมาชิก', 'ช่วง', 'วันที่', 'เวลา', 'นาที', 'สถานที่', 'ตัวละคร', 'สถานะงาน', 'ราคา', 'ได้รับแล้ว']];
  S.shoots.forEach(b => b.slots.forEach((x, i) => rows.push([
    b.name, isProj(b) ? 'โปรเจกต์' : 'เดี่ยว', b.people.map(p => p.name).join(' / '), `${i + 1}/${b.slots.length}`, x.date, x.time, x.dur, x.place,
    x.char || b.people.map(p => p.char).join(' / '), stageOf(b.stage).t, i ? '' : b.price, i ? '' : b.paid,
  ])));
  return rows;
}
export const toCsv = (rows: (string | number)[][]) => rows.map(r => r.map(v => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }).join(',')).join('\n');
export function downloadCsv() {
  const blob = new Blob(['﻿' + toCsv(csvRows())], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = `หมูถ่ายรูป-${todayIso()}.csv`;
  document.body.append(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  toast('ดาวน์โหลดไฟล์แล้ว');
}

/* ---------- sound + background checks (overtime beep, shot-segment change) ---------- */
export const beeper = (() => {
  let ctx: AudioContext | null = null;
  return {
    unlock() { try { ctx = ctx || new AudioContext(); } catch { /* no audio */ } },
    beep() {
      if (!S.cfg.sound) return;
      try {
        ctx = ctx || new AudioContext();
        [0, 0.25, 0.5].forEach(d => {
          const o = ctx!.createOscillator(), g = ctx!.createGain();
          o.frequency.value = 880; g.gain.value = 0.15; o.connect(g).connect(ctx!.destination);
          o.start(ctx!.currentTime + d); o.stop(ctx!.currentTime + d + 0.15);
        });
      } catch { /* no audio */ }
    },
  };
})();
const beeped = new Set<number>(), segs = new Map<number, number>();
export function watchTimers() {
  const now = Date.now();
  for (const b of S.shoots) for (const sl of b.slots) {
    if (!running(sl.t)) continue;
    if (remain(sl.t, now) <= 0 && !beeped.has(sl.id)) { beeped.add(sl.id); beeper.beep(); }
    if (remain(sl.t, now) > 0) beeped.delete(sl.id);
    if (sl.shots.length > 1) {
      const i = planInfo(sl, now).i, prev = segs.get(sl.id);
      if (prev !== undefined && prev !== i) { beeper.beep(); toast(`ถึงช่วง: ${sl.shots[i].label}`); }
      segs.set(sl.id, i);
    }
  }
}
export const anyRunning = () => S.shoots.some(b => b.slots.some(sl => running(sl.t)));
export { occOf };
