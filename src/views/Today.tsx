import { commit, openSheet, useApp } from '../lib/store';
import { isCx, matchQ, occurrences, sortOcc } from '../lib/model';
import { loadSample } from '../lib/actions';
import { baht, durTxt, thDate, today, todayIso } from '../lib/util';
import { FilterChips, SearchBox, Strip } from '../components/ui';
import { Timeline } from '../components/ShootCard';

export function Today() {
  const s = useApp(), ui = s.ui;
  const all = occurrences(s.shoots).filter(o => o.sl.date === todayIso()).sort(sortOcc);
  const live = all.filter(o => !isCx(o.b));
  const mins = live.reduce((a, o) => a + o.sl.dur, 0);
  const due = [...new Set(live.map(o => o.b))].reduce((a, b) => a + Math.max(0, b.price - b.paid), 0);
  const q = ui.tq.trim().toLowerCase();
  const list = all.filter(o => (ui.todayFilter === 'all' || o.b.stage === ui.todayFilter) && matchQ(o, q));
  const n = (k: string) => all.filter(o => o.b.stage === k).length;
  const d = today();
  return (
    <>
      <div className="eyebrow">{thDate(d, { weekday: 'long' })}</div>
      <h1 className="text-[26px] leading-tight">{thDate(d, { day: 'numeric', month: 'long', year: 'numeric' })}</h1>
      <Strip cells={[
        [live.length, <>คิววันนี้{all.length > live.length && <span className="text-bad"> (ยกเลิก {all.length - live.length})</span>}</>],
        [durTxt(mins), 'เวลาถ่ายรวม'],
        [baht(due), 'ต้องเก็บเพิ่ม'],
      ]} />
      {all.length > 0 && <>
        <FilterChips value={ui.todayFilter} onChange={k => { ui.todayFilter = k; commit(); }} counts={n} total={all.length}
          show={x => (x.k !== 'delivered' && x.k !== 'cancelled') || n(x.k) > 0} />
        <SearchBox value={ui.tq} onChange={v => { ui.tq = v; commit(); }} />
      </>}
      {list.length ? <Timeline list={list} mode="full" />
        : !all.length ? (
          <div className="empty">
            {s.shoots.length ? 'วันนี้ไม่มีคิวถ่าย' : 'ยังไม่มีคิวเลย เริ่มจากเพิ่มคิวลูกค้าคนแรก'}<br />
            <button className="btn btn-primary mt-3" onClick={() => openSheet({ kind: 'form' })}>เพิ่มคิวลูกค้า</button>
            {!s.shoots.length && <><br /><button className="btn btn-ghost mt-2" onClick={() => { loadSample(); }}>ลองดูด้วยข้อมูลตัวอย่าง</button></>}
          </div>
        ) : q ? <div className="empty">ไม่พบคิววันนี้ที่ตรงกับ "{ui.tq.trim()}"</div>
          : <div className="empty">วันนี้ไม่มีคิวในสถานะนี้<br /><button className="btn mt-3" onClick={() => { ui.todayFilter = 'all'; commit(); }}>ดูคิวทั้งหมดของวันนี้</button></div>}
    </>
  );
}
