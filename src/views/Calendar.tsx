import { commit, useApp } from '../lib/store';
import { ALLST, isCx, occurrences, sortOcc, stageOf } from '../lib/model';
import { baht, cx, iso, parse, thDate, todayIso } from '../lib/util';
import { Strip } from '../components/ui';
import { Timeline } from '../components/ShootCard';

const DOW = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

export function MonthNav() {
  const ui = useApp().ui;
  const step = (d: number) => { ui.month = new Date(ui.month.getFullYear(), ui.month.getMonth() + d, 1); commit(); };
  return (
    <div className="flex gap-2">
      <button className="w-9 h-9 rounded-[10px] border border-line bg-surface text-lg" aria-label="เดือนก่อน" onClick={() => step(-1)}>‹</button>
      <button className="w-9 h-9 rounded-[10px] border border-line bg-surface text-lg" aria-label="เดือนถัดไป" onClick={() => step(1)}>›</button>
    </div>
  );
}

export function Calendar() {
  const s = useApp(), ui = s.ui, m = ui.month, y = m.getFullYear(), mo = m.getMonth();
  const occ = occurrences(s.shoots);
  const inMonth = occ.filter(o => { const d = parse(o.sl.date); return !isCx(o.b) && d.getFullYear() === y && d.getMonth() === mo; });
  const days = new Set(inMonth.map(o => o.sl.date)).size;
  const value = [...new Set(inMonth.map(o => o.b))].reduce((a, b) => a + b.price, 0);
  const ws = s.cfg.weekStart;
  const first = new Date(y, mo, 1), start = new Date(first);
  start.setDate(1 - ((first.getDay() - ws + 7) % 7));
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    if (i >= 35 && d.getMonth() !== mo) break;
    const k = iso(d), ds = occ.filter(o => o.sl.date === k).sort(sortOcc), sel = k === ui.selDay;
    cells.push(
      <button key={k} aria-label={`${thDate(d, { day: 'numeric', month: 'long' })} ${ds.length} คิว`}
        onClick={() => { ui.selDay = k; ui.month = new Date(d.getFullYear(), d.getMonth(), 1); commit(); }}
        className={cx('aspect-[1/1.05] max-w-full rounded-[10px] border border-transparent bg-surface pt-1.5 px-1 flex flex-col items-center gap-[3px] num text-[13px] min-w-0',
          d.getMonth() !== mo && 'opacity-35', k === todayIso() && 'border-accent', sel && '!bg-accent text-accent-ink')}>
        {d.getDate()}
        <span className="flex gap-0.5 justify-center mt-auto mb-1">
          {ds.slice(0, 3).map(o => <i key={o.id} className="flex-none w-[9px] h-[9px] rounded-full" style={{ background: sel ? 'var(--accent-ink)' : stageOf(o.b.stage).c }} />)}
        </span>
        {ds.length > 3 && <span className={cx('text-[10px] -mt-1 mb-0.5', sel ? 'text-accent-ink' : 'text-muted')}>+{ds.length - 3}</span>}
      </button>,
    );
  }
  const dow = [...DOW.slice(ws), ...DOW.slice(0, ws)];
  const selList = occ.filter(o => o.sl.date === ui.selDay).sort(sortOcc);
  return (
    <>
      <div className="flex items-center gap-2 mb-2.5">
        <h1 className="flex-1 text-[26px]">{thDate(m, { month: 'long', year: 'numeric' })}</h1>
        <MonthNav />
      </div>
      <Strip cells={[[inMonth.length, 'ช่วงถ่ายเดือนนี้'], [days, 'วันที่มีงาน'], [baht(value), 'มูลค่างาน']]} />
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs -mt-2 mb-3">
        {ALLST.map(x => <span key={x.k} className="flex items-center gap-1.5 text-muted"><i className="block w-2 h-2 rounded-full" style={{ background: x.c }} />{x.t}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {dow.map(d => <div key={d} className="text-xs text-muted text-center py-1">{d}</div>)}
        {cells}
      </div>
      <div className="mt-5 flex flex-col gap-3">
        <h2 className="text-[17px]">{thDate(parse(ui.selDay), { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
        {selList.length ? <Timeline list={selList} mode="plan" /> : <div className="empty !p-4">ว่าง ไม่มีคิว</div>}
      </div>
    </>
  );
}
