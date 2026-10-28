import type { ReactNode } from 'react';
import type { Booking, Occ, StageKey } from '../lib/types';
import { ALLST, PAY_TXT, STAGES, isCx, payStatus, remain, running, stageIdx, stageOf, touched, type StageDef } from '../lib/model';
import { setStage } from '../lib/actions';
import { S, commit } from '../lib/store';
import { baht, cx, durTxt, fmt } from '../lib/util';
import { useNow } from '../lib/now';

/* ---------- icons (inline SVG, stroke = currentColor) ---------- */
const svg = (d: ReactNode, sw = 1.8) => ({ className = 'w-[22px] h-[22px]' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} className={className} aria-hidden="true">{d}</svg>
);
export const Icon = {
  camera: svg(<><rect x="3" y="7" width="18" height="13" rx="3" /><path d="M8 7l1.5-3h5L16 7" /><circle cx="12" cy="13.5" r="3.5" /></>),
  jobs: svg(<><rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="9" cy="10" r="2" /><path d="M3 17l5-4 4 3 3-2 6 4" /></>),
  cal: svg(<><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /></>),
  money: svg(<><rect x="3" y="6" width="18" height="13" rx="3" /><path d="M3 10h18" /><circle cx="16" cy="14.5" r="1.5" /></>),
  gear: svg(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>),
  timer: svg(<><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2.5M10 2h4" /></>),
  folder: svg(<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />),
  install: svg(<><rect x="6" y="2.5" width="12" height="19" rx="2.5" /><path d="M11 18.5h2" /></>),
  sync: svg(<><path d="M20 11a8 8 0 0 0-14.3-4.6L4 8" /><path d="M4 4v4h4" /><path d="M4 13a8 8 0 0 0 14.3 4.6L20 16" /><path d="M20 20v-4h-4" /></>),
  export: svg(<><path d="M12 3v12M7 10l5 5 5-5" /><path d="M4 17v2.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5V17" /></>),
  trash: svg(<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />),
  tag: svg(<><path d="M3 12V4h8l10 10-8 8z" /><circle cx="7.5" cy="8.5" r="1.5" /></>),
  pin: svg(<><path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z" /><circle cx="12" cy="9" r="2.5" /></>),
  clock: svg(<><rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="9" cy="10" r="2" /><path d="M3 17l5-4 4 3 3-2 6 4" /></>),
  sparkle: svg(<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />),
  logout: svg(<><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" /><path d="M10 16l-4-4 4-4M6 12h10" /></>, 2),
};

/* ---------- stage controls ---------- */
const stVars = (x: StageDef) => ({ '--stc': x.c, '--stbg': x.bg } as React.CSSProperties);

export function StageSelect({ b, small }: { b: Booking; small?: boolean }) {
  const x = stageOf(b.stage);
  return (
    <label className={cx('stsel', small && 'sm')} style={stVars(x)}>
      <span className="sr-only">สถานะงานของ {b.name}</span>
      <select value={b.stage} onChange={e => setStage(b, e.target.value as StageKey)}>
        {ALLST.map(s => <option key={s.k} value={s.k}>{s.t}</option>)}
      </select>
    </label>
  );
}

/** Five tappable bars: tap any to jump to that stage. Used on the shoot screen and detail sheet. */
export function StageSteps({ b }: { b: Booking }) {
  const x = stageOf(b.stage), i = stageIdx(b.stage);
  return (
    <div className="grid grid-cols-5 gap-1 flex-1 min-w-0">
      {STAGES.map((y, j) => (
        <button key={y.k} title={y.t} aria-label={`เปลี่ยนเป็น ${y.t}`} onClick={() => setStage(b, y.k)}
          className="h-[22px] border-0 bg-transparent p-0 relative">
          <span className="absolute inset-x-0 top-2 h-1.5 rounded-full" style={{ background: j <= i ? x.c : 'var(--sunk)' }} />
        </button>
      ))}
    </div>
  );
}

export function StageBadge({ b }: { b: Booking }) {
  const x = stageOf(b.stage);
  return <span className="chip" style={{ background: x.bg, color: x.c }}>● {x.t}</span>;
}

export function PayChip({ b }: { b: Booking }) {
  if (isCx(b)) return b.paid ? <span className="chip bg-sunk text-muted">เก็บมัดจำไว้ {baht(b.paid)}</span> : null;
  const k = payStatus(b);
  const cls = { paid: 'bg-ok-soft text-ok', dep: 'bg-warn-soft text-warn', due: 'bg-bad-soft text-bad', cancel: '' }[k];
  return <span className={cx('chip', cls)}>{PAY_TXT[k]}</span>;
}

export const ProjTag = ({ b }: { b: Booking }) => (b.type === 'project' ? <span className="tag ml-1 bg-info-soft text-info">โปรเจกต์</span> : null);
export const SlotTag = ({ o }: { o: Occ }) => (o.count > 1 ? <span className="tag ml-1 bg-accent-soft text-accent">ช่วง {o.no}/{o.count}</span> : null);

/** Time left on a slot's timer; live while running. */
export function TimerText({ o, className }: { o: Occ; className?: string }) {
  useNow();
  const t = o.sl.t, r = remain(t);
  const txt = running(t) ? '● ' + fmt(r) : touched(t) ? 'พักไว้ ' + fmt(r) : '⏱ ' + durTxt(o.sl.dur);
  return <span className={cx('num', running(t) && 'text-accent', r < 0 && 'text-bad', className)}>{txt}</span>;
}

/* ---------- filter chips + search ---------- */
export function FilterChips({ value, onChange, counts, total, show }: {
  value: string; onChange: (k: string) => void; counts: (k: StageKey) => number; total: number; show: (x: StageDef) => boolean;
}) {
  return (
    <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 mb-2.5" role="tablist">
      <button className={cx('fchip', value === 'all' && 'on')} onClick={() => onChange('all')}>ทั้งหมด <span className="num">{total}</span></button>
      {ALLST.filter(show).map(x => (
        <button key={x.k} className={cx('fchip', value === x.k && 'on')} style={stVars(x)} onClick={() => onChange(x.k)}>
          <i />{x.t} <span className="num">{counts(x.k)}</span>
        </button>
      ))}
    </div>
  );
}
export function SearchBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className="block mb-1.5">
      <span className="sr-only">ค้นหา</span>
      <input type="search" value={value} onChange={e => onChange(e.target.value)} autoComplete="off" placeholder="ค้นหาชื่อ ตัวละคร เรื่อง หรือสถานที่"
        className="w-full border border-line bg-surface rounded-[10px] px-3 py-2.5 text-[15px]" />
    </label>
  );
}

export function Strip({ cells }: { cells: [ReactNode, ReactNode][] }) {
  return <div className="strip mt-3.5 mb-5">{cells.map(([v, l], i) => <div key={i}><b>{v}</b><span>{l}</span></div>)}</div>;
}

/** The ⋯ button that opens the edit/delete menu for a booking. */
export function MoreButton({ o, className }: { o: Occ; className?: string }) {
  return (
    <button className={cx('more-btn', className)} aria-haspopup="menu" aria-label={`ตัวเลือกของคิว ${o.b.name}`}
      onClick={e => {
        e.stopPropagation();
        if (S.ui.menu?.id === o.id) { S.ui.menu = null; commit(); return; }
        const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const below = r.bottom + 6, h = 110;
        S.ui.menu = { id: o.id, top: below + h > innerHeight - 80 ? r.top - 6 - h : below, right: Math.max(8, innerWidth - r.right) };
        commit();
      }}>⋯</button>
  );
}
