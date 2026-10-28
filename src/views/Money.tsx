import { commit, openSheet, useApp } from '../lib/store';
import { isCx, isProj, leaderName, occOf, payStatus, shortLine, sortOcc } from '../lib/model';
import { baht, cx, parse, thDate } from '../lib/util';
import { MonthNav } from './Calendar';

const FILTERS: [string, string][] = [['all', 'ทั้งหมด'], ['due', 'ยังไม่จ่าย'], ['dep', 'มัดจำ'], ['paid', 'ครบ']];

export function Money() {
  const s = useApp(), ui = s.ui, m = ui.month, y = m.getFullYear(), mo = m.getMonth();
  const list = s.shoots.map(b => occOf(b, b.slots[0])).filter(o => { const d = parse(o.sl.date); return d.getFullYear() === y && d.getMonth() === mo; }).sort(sortOcc);
  const got = list.reduce((a, o) => a + Math.min(o.b.paid, o.b.price), 0);
  const owed = list.filter(o => !isCx(o.b)).reduce((a, o) => a + Math.max(0, o.b.price - o.b.paid), 0);
  const tot = got + owed, ncx = list.filter(o => isCx(o.b)).length;
  const cnt = (k: string) => list.filter(o => payStatus(o.b) === k).length;
  const shown = ui.finFilter === 'all' ? list : list.filter(o => payStatus(o.b) === ui.finFilter);
  return (
    <>
      <div className="flex items-center gap-2 mb-2.5">
        <h1 className="flex-1 text-[26px]">รายรับ {thDate(m, { month: 'short', year: '2-digit' })}</h1>
        <MonthNav />
      </div>
      <div className="card mt-3 mb-4">
        <div className="eyebrow">ได้รับแล้ว</div>
        <div className="num text-[34px] font-bold leading-tight">{baht(got)}</div>
        <div className="h-2.5 rounded-full bg-bad-soft overflow-hidden flex mt-1.5 mb-1"><i className="block h-full bg-ok" style={{ width: `${tot ? (got / tot) * 100 : 0}%` }} /></div>
        <div className="flex items-center text-[13px]">
          <span className="text-muted">ยอดงานทั้งหมด <span className="num">{baht(tot)}</span></span><span className="flex-1" />
          <span className="text-bad">ค้างรับ <span className="num">{baht(owed)}</span></span>
        </div>
        {ncx > 0 && <div className="text-muted text-xs mt-1.5">ไม่นับคิวที่ยกเลิก {ncx} คิว ยกเว้นเงินที่เก็บไว้แล้ว</div>}
      </div>
      <div className="seg mt-1.5 mb-3" role="tablist">
        {FILTERS.map(([k, t]) => <button key={k} className={cx(ui.finFilter === k && 'on')} onClick={() => { ui.finFilter = k; commit(); }}>{t} {k === 'all' ? list.length : cnt(k)}</button>)}
      </div>
      {shown.length ? (
        <div className="bg-surface border border-line rounded-[14px] overflow-hidden">
          {shown.map(o => {
            const b = o.b, cxd = isCx(b);
            const col = cxd ? 'var(--muted)' : b.paid >= b.price ? 'var(--ok)' : b.paid > 0 ? 'var(--warn)' : 'var(--bad)';
            return (
              <button key={b.id} onClick={() => openSheet({ kind: 'pay', id: o.id })}
                className="grid grid-cols-[1fr_auto] gap-x-2.5 gap-y-0.5 px-3.5 py-3 border-t border-line first:border-t-0 w-full text-left bg-transparent">
                <span className="font-semibold truncate min-w-0">{b.name} <span className="text-muted font-normal">· {shortLine(o)}</span></span>
                <span className="num text-right font-bold whitespace-nowrap" style={{ color: col }}>{baht(b.paid)}<span className="font-normal text-muted text-[13px]"> / {baht(b.price)}</span></span>
                <span className="text-xs text-muted">{thDate(parse(o.sl.date), { day: 'numeric', month: 'short' })} · {o.sl.time}{b.slots.length > 1 ? ` · ${b.slots.length} ช่วง` : ''}{isProj(b) ? ` · เก็บจาก ${leaderName(b)}` : ''}</span>
                <span className={cx('text-xs num text-right', !cxd && b.paid < b.price ? 'text-bad' : 'text-muted')}>{cxd ? 'ยกเลิกคิว' : b.paid >= b.price ? 'ครบแล้ว' : `ค้าง ${baht(b.price - b.paid)}`}</span>
              </button>
            );
          })}
        </div>
      ) : <div className="empty">ไม่มีรายการในหมวดนี้</div>}
    </>
  );
}
