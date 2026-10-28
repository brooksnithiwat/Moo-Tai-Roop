import { useEffect, useState, type ReactNode } from 'react';
import type { Occ, Pkg } from '../lib/types';
import { S, closeSheet, commit, findOcc, openSheet, signedIn, toast, useApp, type SheetSpec } from '../lib/store';
import { ALLST, STAGES, elapsed, isProj, leaderName, remain, stageIdx, subLine } from '../lib/model';
import { clearAll, csvRows, deleteBooking, downloadCsv, finishSlot, copyText, openShoot, resetTimer, setPaid, setStage, signInThenFolder, toCsv } from '../lib/actions';
import { baht, cx, durTxt, endTime, fmt, parse, thDate } from '../lib/util';
import { PayChip } from '../components/ui';
import { Members } from '../components/ShootCard';
import { QueueForm } from './QueueForm';

/* ---------- frame ---------- */
export function SheetFrame({ children }: { children: ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') closeSheet(); };
    addEventListener('keydown', k); return () => removeEventListener('keydown', k);
  }, []);
  return (
    <div className="fixed inset-0 z-20 bg-[rgba(10,8,14,.45)] flex items-end justify-center" onClick={e => { if (e.target === e.currentTarget) closeSheet(); }}>
      <div role="dialog" aria-modal="true"
        className="relative bg-surface w-full max-w-[520px] rounded-t-[18px] max-h-[88vh] overflow-auto pt-[18px] pb-[calc(18px+env(safe-area-inset-bottom))] px-[max(18px,env(safe-area-inset-left))]">
        <div className="w-10 h-1 rounded-full bg-line -mt-1.5 mx-auto mb-3.5" />
        <button aria-label="ปิด" onClick={closeSheet} className="absolute top-3 right-[max(12px,env(safe-area-inset-right))] w-9 h-9 rounded-full border-0 bg-sunk text-muted text-base grid place-items-center z-[2] hover:bg-line hover:text-ink">✕</button>
        <div className="[&>h2:first-child]:pr-11 [&>.eyebrow:first-child]:pr-11">{children}</div>
      </div>
    </div>
  );
}
const Title = ({ children, className }: { children: ReactNode; className?: string }) => <h2 className={cx('text-xl mb-1.5', className)}>{children}</h2>;
const Two = ({ children }: { children: ReactNode }) => <div className="grid grid-cols-2 gap-2.5">{children}</div>;
const Muted = ({ children }: { children: ReactNode }) => <p className="text-muted mt-0 mb-4">{children}</p>;

/* ---------- payment ---------- */
function PaySheet({ o }: { o: Occ }) {
  const b = o.b, [paid, setP] = useState(String(b.paid)), [price, setPr] = useState(String(b.price));
  return (
    <>
      <div className="eyebrow">บันทึกการชำระเงิน</div>
      <Title className="!mt-0.5 !mb-1">{b.name}</Title>
      <div className="text-muted text-[13px]">{subLine(o)} · {thDate(parse(o.sl.date), { day: 'numeric', month: 'short' })} {o.sl.time}</div>
      {isProj(b) && <div className="note mt-2.5">โปรเจกต์ {b.people.length} คน · เก็บก้อนเดียวจากหัวโปร <b className="text-ink">{leaderName(b)}</b></div>}
      <div className="strip my-3.5">
        <div><b>{baht(b.price)}</b><span>ราคาแพ็กเกจ</span></div>
        <div><b className="text-ok">{baht(b.paid)}</b><span>รับแล้ว</span></div>
        <div><b className="text-bad">{baht(Math.max(0, b.price - b.paid))}</b><span>คงเหลือ</span></div>
      </div>
      <form className="flex flex-col gap-3" onSubmit={e => { e.preventDefault(); setPaid(b, +paid || 0, +price || 0); }}>
        <label className="field">ยอดที่ได้รับทั้งหมด (บาท)<input type="number" inputMode="numeric" value={paid} onChange={e => setP(e.target.value)} /></label>
        <label className="field">ราคาแพ็กเกจ (บาท)<input type="number" inputMode="numeric" value={price} onChange={e => setPr(e.target.value)} /></label>
        <button className="btn btn-primary w-full !py-3" type="submit">บันทึก</button>
      </form>
    </>
  );
}

/* ---------- booking detail (opened from list rows) ---------- */
function DetailSheet({ o }: { o: Occ }) {
  const b = o.b;
  return (
    <>
      <div className="eyebrow">{thDate(parse(o.sl.date), { weekday: 'short', day: 'numeric', month: 'short' })} · {o.sl.time}–{endTime(o.sl.time, o.sl.dur)}</div>
      <Title className="!mt-0.5 !mb-0.5">{b.name}</Title>
      <div className="text-muted text-[13px] mb-3.5">{subLine(o)} · {o.sl.place}</div>
      {isProj(b) && <div className="-mt-1.5 mb-3.5"><Members o={o} /></div>}
      {o.count > 1 && <>
        <div className="eyebrow mb-1.5">ช่วงเวลา {o.count} ช่วง</div>
        <div className="flex flex-col gap-1.5 mb-3.5">
          {b.slots.map((x, i) => (
            <div key={x.id} className={cx('flex items-center gap-2.5 border rounded-xl px-3 py-2 text-[13px]', x.id === o.id ? 'border-accent' : 'border-line')}>
              <div className="min-w-0 flex-1"><b>ช่วง {i + 1}</b> <span className="num">{thDate(parse(x.date), { weekday: 'short', day: 'numeric', month: 'short' })} {x.time}</span><br />
                <span className="text-muted">{x.place}{x.char && !isProj(b) ? ' · ' + x.char : ''}</span></div>
              {x.done && <span className="chip bg-ok-soft text-ok">ถ่ายเสร็จ</span>}
              <button className="btn !px-3 !py-1" onClick={() => { const t = findOcc(x.id); if (t) openShoot(t); }}>เปิด</button>
            </div>
          ))}
        </div>
      </>}
      <div className="eyebrow mb-1.5">สถานะงาน</div>
      <div className="flex flex-col gap-1.5">
        {[...STAGES, ALLST[ALLST.length - 1]].map((x, j) => {
          const on = x.k === b.stage, cancel = x.k === 'cancelled';
          return (
            <button key={x.k} onClick={() => setStage(b, x.k)} style={{ ['--stc' as string]: x.c }}
              className={cx('flex items-center gap-3 border rounded-xl px-3.5 py-2.5 text-left bg-surface', on ? 'border-[var(--stc)] bg-sunk font-semibold' : 'border-line', cancel && 'mt-1.5 text-bad')}>
              <i className="w-3 h-3 rounded-full border-2 border-[var(--stc)] flex-none" style={{ background: on ? x.c : undefined }} />
              {cancel ? 'ยกเลิกคิว' : x.t}<small className="ml-auto text-muted text-xs">{cancel ? 'ไม่นับในยอดงาน' : `${j + 1}/5`}</small>
            </button>
          );
        })}
      </div>
      <div className="eyebrow mt-4 mb-1.5">การชำระเงิน</div>
      <div className="flex items-center gap-2.5"><PayChip b={b} /><span className="num">{baht(b.paid)} / {baht(b.price)}</span><span className="flex-1" /><button className="btn" onClick={() => openSheet({ kind: 'pay', id: o.id })}>บันทึกเงิน</button></div>
      {stageIdx(b.stage) <= 1 && <button className="btn btn-primary w-full mt-4" onClick={() => openShoot(o)}>เปิดหน้าถ่าย (จับเวลา + ref)</button>}
      <div className="mt-2.5"><Two>
        <button className="btn btn-ghost" onClick={() => openSheet({ kind: 'form', id: o.id })}>แก้ไข</button>
        <button className="btn btn-ghost btn-danger" onClick={() => openSheet({ kind: 'del', id: o.id })}>ลบ</button>
      </Two></div>
    </>
  );
}

/* ---------- confirmations ---------- */
function DeleteSheet({ o }: { o: Occ }) {
  return (
    <>
      <Title>ลบคิว {o.b.name}?</Title>
      <Muted>{o.count > 1 ? `ทั้ง ${o.count} ช่วงเวลา` : `${thDate(parse(o.sl.date), { weekday: 'short', day: 'numeric', month: 'short' })} ${o.sl.time} · ${o.sl.place}`}<br />รูป ref และบันทึกเงินของคิวนี้จะถูกลบไปด้วย</Muted>
      <Two><button className="btn" onClick={closeSheet}>ยกเลิก</button><button className="btn btn-dangerfill" onClick={() => deleteBooking(o.b)}>ลบคิว</button></Two>
    </>
  );
}
function FinishSheet({ o }: { o: Occ }) {
  const left = o.b.slots.filter(x => !x.done && x !== o.sl).length, r = remain(o.sl.t);
  return (
    <>
      <Title>จบ{o.count > 1 ? `ช่วงที่ ${o.no}` : 'คิวนี้'}?</Title>
      <Muted>{o.b.name} · ถ่ายไป {fmt(elapsed(o.sl.t))}{r > 0 ? ` เหลือเวลาอีก ${fmt(r)}` : ''}<br />{left ? `ยังเหลืออีก ${left} ช่วงเวลาของคิวนี้` : 'สถานะงานจะเปลี่ยนเป็น "ถ่ายแล้ว"'}</Muted>
      <Two><button className="btn" onClick={closeSheet}>ถ่ายต่อ</button><button className="btn btn-primary" onClick={() => finishSlot(o)}>จบ{o.count > 1 ? 'ช่วงนี้' : 'คิว'}</button></Two>
    </>
  );
}
function ResetSheet({ o }: { o: Occ }) {
  return (
    <>
      <Title>รีเซ็ตเวลา?</Title>
      <Muted>เวลาที่ถ่ายไปแล้ว {fmt(elapsed(o.sl.t))} จะถูกล้าง และนาฬิกากลับไปเริ่มที่ {durTxt(o.sl.dur)}</Muted>
      <Two><button className="btn" onClick={closeSheet}>ยกเลิก</button><button className="btn btn-dangerfill" onClick={() => resetTimer(o)}>รีเซ็ตเวลา</button></Two>
    </>
  );
}
function SigninFolderSheet({ o }: { o: Occ }) {
  return (
    <>
      <Title>เข้าสู่ระบบ Google ก่อน</Title>
      <Muted>โฟลเดอร์ Ref จะถูกสร้างใน Google Drive ของคุณ ในโฟลเดอร์ หมูถ่ายรูป/ref/</Muted>
      <Two><button className="btn" onClick={closeSheet}>ยกเลิก</button><button className="btn btn-primary" onClick={() => signInThenFolder(o.id)}>เข้าสู่ระบบและสร้าง</button></Two>
    </>
  );
}
function SetupSheet() {
  return (
    <>
      <Title>ยังไม่ได้ตั้งค่า Google Drive</Title>
      <p className="text-muted mt-0 mb-3">ต้องสร้าง OAuth Client ID ใน Google Cloud แล้วใส่ไว้ในไฟล์ <b>.env.local</b> เป็น <code>VITE_GOOGLE_CLIENT_ID</code> ขั้นตอนอยู่ในไฟล์ README.md</p>
      <div className="note">ระหว่างนี้แอปใช้งานได้ตามปกติ ข้อมูลเก็บไว้ในเครื่องนี้</div>
    </>
  );
}
function ClearSheet() {
  const on = signedIn();
  return (
    <>
      <Title>ล้างข้อมูลในเครื่อง?</Title>
      <Muted>{on ? 'คิวทั้งหมดจะถูกลบออกจากอุปกรณ์นี้ ข้อมูลใน Google Drive ยังอยู่ครบ และจะโหลดกลับมาเมื่อซิงก์ครั้งถัดไป' : `คิวทั้งหมด ${S.shoots.length} คิวจะถูกลบถาวร เพราะยังไม่ได้สำรองไว้ใน Drive`}</Muted>
      <Two><button className="btn" onClick={closeSheet}>ยกเลิก</button><button className="btn btn-dangerfill" onClick={clearAll}>ล้างข้อมูล</button></Two>
    </>
  );
}
function CopySheet({ text }: { text: string }) {
  return (
    <>
      <Title>คัดลอกข้อความ</Title>
      <p className="text-muted text-[13px] mt-0 mb-2.5">คัดลอกอัตโนมัติไม่ได้ เลือกข้อความไว้ให้แล้ว กดคัดลอกเองได้เลย</p>
      <textarea readOnly autoFocus onFocus={e => e.currentTarget.select()} defaultValue={text} className="inp h-[200px]" />
    </>
  );
}

/* ---------- settings sheets ---------- */
function ListSheet({ list }: { list: 'pkg' | 'place' }) {
  const pk = list === 'pkg';
  const [pkgs, setPkgs] = useState<Pkg[]>(S.cfg.packages.map(p => ({ ...p })));
  const [places, setPlaces] = useState<string[]>([...S.cfg.places]);
  const save = () => {
    if (pk) S.cfg.packages = pkgs.filter(x => x.name.trim()).map(x => ({ ...x, name: x.name.trim(), dur: +x.dur || 60, price: +x.price || 0 }));
    else S.cfg.places = [...new Set(places.map(x => x.trim()).filter(Boolean))];
    closeSheet(); toast('บันทึกแล้ว');
  };
  const inp = 'border border-line bg-bg rounded-[10px] px-2.5 py-2 text-sm min-w-0 w-full';
  return (
    <>
      <Title className="!mb-1">{pk ? 'แพ็กเกจราคา' : 'สถานที่ที่ใช้บ่อย'}</Title>
      <p className="text-muted mt-0 mb-3.5 text-[13px]">{pk ? 'ตอนเพิ่มคิว กดเลือกแพ็กเกจแล้วระบบเติมระยะเวลาและราคาให้' : 'ตอนกรอกสถานที่ จะมีรายการนี้ให้เลือก ชื่อสถานที่จะได้สะกดตรงกันทุกคิว'}</p>
      {pk && <div className="grid grid-cols-[1fr_70px_90px_34px] gap-1.5 text-xs text-muted mb-1.5"><span>ชื่อ</span><span>นาที</span><span>ราคา (฿)</span><span /></div>}
      <div className="flex flex-col gap-2">
        {pk ? pkgs.map((p, i) => (
          <div key={i} className="grid grid-cols-[1fr_70px_90px_34px] gap-1.5 items-center">
            <input className={inp} placeholder="ชื่อแพ็กเกจ" value={p.name} onChange={e => setPkgs(a => a.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
            <input className={inp} type="number" aria-label="ระยะเวลา (นาที)" value={p.dur} onChange={e => setPkgs(a => a.map((x, j) => (j === i ? { ...x, dur: +e.target.value } : x)))} />
            <input className={inp} type="number" aria-label="ราคา (บาท)" value={p.price} onChange={e => setPkgs(a => a.map((x, j) => (j === i ? { ...x, price: +e.target.value } : x)))} />
            <button className="more-btn !text-sm" aria-label="ลบ" onClick={() => setPkgs(a => a.filter((_, j) => j !== i))}>✕</button>
          </div>
        )) : places.map((p, i) => (
          <div key={i} className="grid grid-cols-[1fr_34px] gap-1.5 items-center">
            <input className={inp} placeholder="ชื่อสถานที่" value={p} onChange={e => setPlaces(a => a.map((x, j) => (j === i ? e.target.value : x)))} />
            <button className="more-btn !text-sm" aria-label="ลบ" onClick={() => setPlaces(a => a.filter((_, j) => j !== i))}>✕</button>
          </div>
        ))}
      </div>
      <button className="btn btn-ghost w-full mt-2.5" onClick={() => (pk ? setPkgs(a => [...a, { name: '', dur: 60, price: 0 }]) : setPlaces(a => [...a, '']))}>+ เพิ่ม{pk ? 'แพ็กเกจ' : 'สถานที่'}</button>
      <button className="btn btn-primary w-full mt-2.5" onClick={save}>บันทึก</button>
    </>
  );
}
function NumSheet({ num }: { num: 'timer' | 'backlog' }) {
  const c = S.cfg, tm = num === 'timer';
  const [warn, setWarn] = useState(c.warnMin), [sound, setSound] = useState(c.sound), [pct, setPct] = useState(c.groupPct);
  const [wd, setWd] = useState(c.warnDays), [bd, setBd] = useState(c.badDays);
  const save = () => {
    if (tm) { c.warnMin = Math.max(1, +warn || 5); c.sound = sound; c.groupPct = +pct; }
    else { const w = Math.max(1, +wd || 7); c.warnDays = w; c.badDays = Math.max(w + 1, +bd || 14); }
    closeSheet(); toast('บันทึกแล้ว');
  };
  return (
    <>
      <Title className="!mb-3.5">{tm ? 'ตัวจับเวลา' : 'เตือนงานค้างส่ง'}</Title>
      <div className="flex flex-col gap-3">
        {tm ? <>
          <label className="field">เตือนก่อนหมดเวลา (นาที)<input type="number" min={1} max={30} value={warn} onChange={e => setWarn(+e.target.value)} /></label>
          <label className="flex items-center gap-2.5 text-sm"><input type="checkbox" className="w-5 h-5 accent-[var(--accent)]" checked={sound} onChange={e => setSound(e.target.checked)} />เสียงเตือนเมื่อหมดเวลาและเมื่อเปลี่ยนช่วงช็อต</label>
          <label className="field">สัดส่วนเวลาถ่ายรวมของโปรเจกต์ใหม่ <b className="text-ink">{pct}%</b>
            <input type="range" min={10} max={70} step={5} value={pct} onChange={e => setPct(+e.target.value)} className="!p-0 accent-[var(--accent)]" /></label>
          <div className="note">ใช้ตอนสร้างคิวโปรเจกต์ใหม่ เวลาที่เหลือแบ่งเท่ากันเป็นช็อตเดี่ยวของแต่ละคน</div>
        </> : <>
          <Two>
            <label className="field">สีส้มเมื่อค้างเกิน (วัน)<input type="number" min={1} value={wd} onChange={e => setWd(+e.target.value)} /></label>
            <label className="field">สีแดงเมื่อค้างเกิน (วัน)<input type="number" min={2} value={bd} onChange={e => setBd(+e.target.value)} /></label>
          </Two>
          <div className="note">นับจากวันที่ถ่ายช่วงสุดท้าย ใช้กับคิวที่ "ถ่ายแล้ว" และ "รอแต่งรูป"</div>
        </>}
        <button className="btn btn-primary w-full" onClick={save}>บันทึก</button>
      </div>
    </>
  );
}
function ExportSheet() {
  const rows = csvRows();
  return (
    <>
      <Title className="!mb-1">ส่งออกข้อมูล</Title>
      <p className="text-muted mt-0 mb-3.5 text-[13px]">{S.shoots.length} คิว · {rows.length - 1} ช่วงเวลา · หนึ่งแถวต่อหนึ่งช่วง ราคาอยู่ในแถวแรกของแต่ละคิว</p>
      <div className="overflow-x-auto border border-line rounded-[10px]">
        <table className="border-collapse text-xs whitespace-nowrap">
          <tbody>{rows.slice(0, 6).map((r, i) => <tr key={i}>{r.map((v, j) => (i ? <td key={j} className="px-2.5 py-1.5 border-b border-line">{v}</td> : <th key={j} className="px-2.5 py-1.5 border-b border-line bg-sunk text-left">{v}</th>))}</tr>)}</tbody>
        </table>
      </div>
      <div className="flex flex-col gap-2.5 mt-3">
        <button className="btn btn-primary w-full" onClick={downloadCsv}>ดาวน์โหลดไฟล์ CSV</button>
        <button className="btn w-full" onClick={() => copyText(toCsv(rows), 'คัดลอก CSV แล้ว วางใน Google Sheets ได้เลย')}>คัดลอกไปวางใน Google Sheets</button>
      </div>
    </>
  );
}

/* PWA install prompt (Chrome/Android) */
let installEvt: any = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; });
addEventListener('appinstalled', () => { installEvt = null; toast('ติดตั้งแอปแล้ว'); });
function InstallSheet() {
  useApp();
  const standalone = matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
  return (
    <>
      <Title className="!mb-3">ติดตั้งแอปลงหน้าจอหลัก</Title>
      <div className="flex flex-col gap-3.5">
        {standalone ? <div className="rounded-2xl px-4 py-3.5 text-center text-sm bg-ok-soft">แอปติดตั้งอยู่แล้วในเครื่องนี้</div>
          : installEvt && <button className="btn btn-primary w-full" onClick={() => { installEvt.prompt(); installEvt.userChoice.finally(() => { installEvt = null; closeSheet(); }); }}>ติดตั้งแอป</button>}
        <div><b>iPhone / iPad (Safari)</b><ol className="mt-1.5 mb-0 pl-5 text-sm"><li>แตะปุ่มแชร์ ⬆︎ ด้านล่างของ Safari</li><li>เลือก "เพิ่มไปยังหน้าจอโฮม"</li><li>แตะ "เพิ่ม"</li></ol></div>
        <div><b>Android (Chrome)</b><ol className="mt-1.5 mb-0 pl-5 text-sm"><li>แตะเมนู ⋮ มุมขวาบน</li><li>เลือก "ติดตั้งแอป" หรือ "เพิ่มลงในหน้าจอหลัก"</li></ol></div>
        <div className="note">หลังติดตั้ง แอปจะเปิดเต็มจอเหมือนแอปทั่วไป และเปิดดูคิวได้แม้ไม่มีอินเทอร์เน็ต</div>
      </div>
    </>
  );
}

/* ---------- host ---------- */
export function SheetHost() {
  const s = useApp(), sp: SheetSpec | null = s.ui.sheet;
  if (!sp) return null;
  const withOcc = (f: (o: Occ) => ReactNode) => { const o = findOcc((sp as any).id); if (!o) { queueMicrotask(closeSheet); return null; } return f(o); };
  let body: ReactNode = null;
  switch (sp.kind) {
    case 'pay': body = withOcc(o => <PaySheet key={o.id} o={o} />); break;
    case 'detail': body = withOcc(o => <DetailSheet o={o} />); break;
    case 'del': body = withOcc(o => <DeleteSheet o={o} />); break;
    case 'finish': body = withOcc(o => <FinishSheet o={o} />); break;
    case 'reset': body = withOcc(o => <ResetSheet o={o} />); break;
    case 'signinFolder': body = withOcc(o => <SigninFolderSheet o={o} />); break;
    case 'form': body = sp.id ? withOcc(o => <QueueForm key={o.b.id} edit={o.b} />) : <QueueForm />; break;
    case 'list': body = <ListSheet list={sp.list} />; break;
    case 'num': body = <NumSheet num={sp.num} />; break;
    case 'export': body = <ExportSheet />; break;
    case 'install': body = <InstallSheet />; break;
    case 'clear': body = <ClearSheet />; break;
    case 'setup': body = <SetupSheet />; break;
    case 'copy': body = <CopySheet text={sp.text} />; break;
  }
  return <SheetFrame key={sp.kind + ((sp as any).id ?? '')}>{body}</SheetFrame>;
}
