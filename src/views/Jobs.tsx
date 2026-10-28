import type { Occ, StageKey } from '../lib/types';
import { commit, openSheet, useApp } from '../lib/store';
import { ALLST, isBacklog, isCx, keyOcc, matchQ, payStatus, sortOcc, subLine } from '../lib/model';
import { advance, openShoot, setStage } from '../lib/actions';
import { ageDays, baht, cx, parse, thDate } from '../lib/util';
import { FilterChips, MoreButton, PayChip, ProjTag, SearchBox, StageSelect, Strip } from '../components/ui';

function ageColor(days: number, post: boolean, warn: number, bad: number) {
  return post ? (days > bad ? 'var(--bad)' : days > warn ? 'var(--warn)' : 'var(--muted)') : 'var(--muted)';
}

/** Full card: used when one stage is selected. */
function JobCard({ o }: { o: Occ }) {
  const s = useApp(), b = o.b, a = ageDays(o.sl.date), k = b.stage, post = isBacklog(b);
  const [age, unit] = a < 0 ? [`${-a}`, 'วันข้างหน้า'] : a === 0 ? ['วันนี้', ''] : [`${a}`, post ? 'วันแล้ว' : 'วันก่อน'];
  return (
    <div className={cx('card', isCx(b) && 'opacity-70')}>
      <div className="flex items-start gap-2.5">
        <div className="min-w-0 flex-1">
          <div className={cx('font-display font-semibold text-[17px]', isCx(b) && 'line-through')}>{b.name}<ProjTag b={b} />{o.count > 1 && <span className="tag ml-1 bg-accent-soft text-accent">{o.count} ช่วง</span>}</div>
          <div className="text-muted text-sm">{subLine(o)}</div>
        </div>
        <div className="flex flex-col items-end leading-tight flex-none" style={{ color: ageColor(a, post, s.cfg.warnDays, s.cfg.badDays) }}>
          <b className="num text-[22px]">{age}</b><span className="text-[11px]">{unit}</span>
        </div>
        <MoreButton o={o} className="-mt-1 -mr-1.5" />
      </div>
      {o.count > 1 ? (
        <div className="flex flex-col gap-0.5 mt-1.5 text-[13px] text-muted">
          {b.slots.map((x, i) => (
            <span key={x.id} className={cx(x.done && 'text-ok')}>{x.done ? '✓' : i + 1} {thDate(parse(x.date), { weekday: 'short', day: 'numeric', month: 'short' })} {x.time} · {x.place}{x.char && b.type !== 'project' ? ` · ${x.char}` : ''}</span>
          ))}
        </div>
      ) : (
        <div className="text-[13px] text-muted flex flex-wrap gap-x-3 mt-0.5">
          <span>{thDate(parse(o.sl.date), { weekday: 'short', day: 'numeric', month: 'short' })} {o.sl.time} · {o.sl.place}</span><span>ref {o.sl.refs.length} ท่า</span>
        </div>
      )}
      <div className="mt-3"><StageSelect b={b} /></div>
      <div className="flex gap-2 mt-3 flex-wrap items-center">
        <PayChip b={b} />
        {payStatus(b) !== 'paid' && !isCx(b) && <button className="btn btn-ghost !px-2.5 !py-1 text-[13px]" onClick={() => openSheet({ kind: 'pay', id: o.id })}>ค้าง {baht(b.price - b.paid)}</button>}
        <span className="flex-1" />
        {k === 'cancelled' ? <button className="btn" onClick={() => setStage(b, 'wait')}>กู้คืนเป็นรอคิว</button>
          : k === 'wait' || k === 'shooting' ? <button className="btn btn-primary" onClick={() => openShoot(o)}>{k === 'shooting' ? 'กลับไปหน้าถ่าย' : o.count > 1 ? `เปิดหน้าถ่าย ช่วง ${o.no}` : 'เปิดหน้าถ่าย'}</button>
            : k === 'shot' ? <button className="btn btn-primary" onClick={() => advance(b)}>เริ่มแต่งรูป</button>
              : k === 'editing' ? <button className="btn btn-primary" onClick={() => advance(b)}>ส่งงานแล้ว ✓</button> : null}
      </div>
    </div>
  );
}

/** Compact row: used in the "all" view so every stage fits on screen. */
function JobRow({ o }: { o: Occ }) {
  const s = useApp(), b = o.b, a = ageDays(o.sl.date), post = isBacklog(b);
  const when = a < 0 ? `อีก ${-a} วัน` : a === 0 ? 'วันนี้' : `${a} วันก่อน`;
  const owe = payStatus(b) === 'due' || payStatus(b) === 'dep';
  return (
    <div className={cx('card !py-2 !pl-0 !pr-1.5 flex items-center gap-2', isCx(b) && 'opacity-70')}>
      <button className="flex-1 min-w-0 flex flex-col text-left border-0 bg-transparent pl-3 py-0.5" onClick={() => openSheet({ kind: 'detail', id: o.id })}>
        <span className={cx('font-display font-semibold text-[15px] truncate', isCx(b) && 'line-through')}>{b.name}<ProjTag b={b} />{o.count > 1 && <span className="tag ml-1 bg-accent-soft text-accent">{o.count} ช่วง</span>}</span>
        <span className="text-xs text-muted flex flex-wrap gap-x-3">
          <span className="num">{thDate(parse(o.sl.date), { day: 'numeric', month: 'short' })} {o.sl.time}</span>
          <span style={{ color: ageColor(a, post, s.cfg.warnDays, s.cfg.badDays), fontWeight: post && a > s.cfg.warnDays ? 600 : 400 }}>{when}</span>
          {owe && <span className="text-bad">ค้าง {baht(b.price - b.paid)}</span>}
        </span>
      </button>
      <StageSelect b={b} small />
      <MoreButton o={o} />
    </div>
  );
}

const stageSort = (k: StageKey) => (k === 'delivered' || k === 'cancelled' ? (a: Occ, b: Occ) => sortOcc(b, a) : sortOcc);

export function Jobs() {
  const s = useApp(), ui = s.ui;
  const q = ui.q.trim().toLowerCase();
  const backlog = s.shoots.filter(isBacklog).map(keyOcc);
  const oldest = backlog.length ? Math.max(...backlog.map(o => ageDays(o.sl.date))) : 0;
  const n = (k: string) => s.shoots.filter(b => b.stage === k).length;
  const sections = (ui.jobFilter === 'all' ? ALLST : ALLST.filter(x => x.k === ui.jobFilter)).map(x => {
    const arr = s.shoots.filter(b => b.stage === x.k).map(keyOcc).filter(o => matchQ(o, q)).sort(stageSort(x.k));
    if (!arr.length) return null;
    return (
      <section key={x.k}>
        <div className="flex items-baseline gap-2 mt-5 mb-2.5">
          <span className="w-2.5 h-2.5 rounded-full self-center flex-none" style={{ background: x.c }} />
          <h2 className="text-[17px]">{x.t}</h2><span className="text-muted num text-[13px]">{arr.length} คิว</span>
        </div>
        <div className={cx('flex flex-col', ui.jobFilter === 'all' ? 'gap-1.5' : 'gap-3')}>
          {arr.map(o => (ui.jobFilter === 'all' ? <JobRow key={o.b.id} o={o} /> : <JobCard key={o.b.id} o={o} />))}
        </div>
      </section>
    );
  }).filter(Boolean);
  return (
    <>
      <h1 className="text-[26px]">งานทั้งหมด</h1>
      <Strip cells={[
        [s.shoots.length, 'คิวทั้งหมด'],
        [backlog.length, 'รอแต่ง / รอส่ง'],
        [<span style={{ color: oldest > s.cfg.badDays ? 'var(--bad)' : oldest > s.cfg.warnDays ? 'var(--warn)' : undefined }}>{oldest} วัน</span>, 'ค้างส่งนานสุด'],
      ]} />
      <FilterChips value={ui.jobFilter} onChange={k => { ui.jobFilter = k; commit(); window.scrollTo(0, 0); }} counts={n} total={s.shoots.length} show={() => true} />
      <SearchBox value={ui.q} onChange={v => { ui.q = v; commit(); }} />
      {sections.length ? sections : <div className="empty mt-4">{q ? 'ไม่พบงานที่ตรงกับคำค้น' : 'ไม่มีงานในสถานะนี้'}</div>}
    </>
  );
}
