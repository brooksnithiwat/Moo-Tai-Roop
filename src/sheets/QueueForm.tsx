import { useState } from 'react';
import type { Booking, Person } from '../lib/types';
import { S, toast } from '../lib/store';
import { isProj } from '../lib/model';
import { addBooking, updateBooking, type SlotInput } from '../lib/actions';
import { baht, cx, todayIso } from '../lib/util';

const clean = (s?: string | null) => (s && s !== '—' ? s : '');

/** Add or edit a booking: solo (one person) or project (group, paid by the leader), with one or more time slots. */
export function QueueForm({ edit }: { edit?: Booking }) {
  const cfg = S.cfg;
  const [type, setType] = useState<'solo' | 'project'>(edit?.type || 'solo');
  const [name, setName] = useState(edit && !isProj(edit) ? edit.name : '');
  const [series, setSeries] = useState(edit && !isProj(edit) ? clean(edit.series) : '');
  const [pName, setPName] = useState(edit && isProj(edit) ? edit.name : '');
  const [members, setMembers] = useState<Person[]>(edit && isProj(edit) ? edit.people.map(p => ({ name: p.name, char: clean(p.char) })) : [{ name: '', char: '' }, { name: '', char: '' }]);
  const [slots, setSlots] = useState<SlotInput[]>(edit
    ? edit.slots.map((x, i) => ({ date: x.date, time: x.time, dur: x.dur, place: clean(x.place), char: clean(x.char || (i === 0 && !isProj(edit) ? edit.people[0].char : '')) }))
    : [{ date: S.ui.tab === 'cal' ? S.ui.selDay : todayIso(), time: '10:00', dur: 60, place: '', char: '' }]);
  const [price, setPrice] = useState(String(edit ? edit.price : cfg.packages[0]?.price ?? 1500));
  const [pkg, setPkg] = useState(-1);
  const proj = type === 'project';

  const setSlot = (i: number, k: keyof SlotInput, v: string | number) => setSlots(a => a.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const setMem = (i: number, k: keyof Person, v: string) => setMembers(a => a.map((x, j) => (j === i ? { ...x, [k]: v } : x)));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const rows: SlotInput[] = slots.map(r => ({ date: r.date || todayIso(), time: r.time || '10:00', dur: +r.dur || 60, place: r.place.trim() || '—', char: proj ? null : r.char?.trim() || null }));
    const people = members.map(p => ({ name: p.name.trim(), char: p.char.trim() || '—' })).filter(p => p.name);
    if (proj && (!pName.trim() || people.length < 2)) return toast('ใส่ชื่อโปรเจกต์และสมาชิกอย่างน้อย 2 คน');
    if (!proj && !name.trim()) return toast('ใส่ชื่อลูกค้าก่อน');
    const p = +price || 0;
    if (edit) return updateBooking(edit, { name: proj ? pName.trim() : name.trim(), series: series.trim(), price: p, people: proj ? people : undefined, slots: rows });
    addBooking(proj
      ? { type: 'project', name: pName.trim(), series: pName.trim(), people, price: p, slots: rows }
      : { name: name.trim(), series: series.trim() || '—', price: p, slots: rows.map(r => ({ ...r, refs: [] })) });
  };

  return (
    <>
      <h2 className="text-xl mb-2.5">{edit ? 'แก้ไขคิว' : 'เพิ่มคิวถ่าย'}</h2>
      {edit ? <div className="text-muted text-[13px] -mt-1.5 mb-3">{proj ? 'โปรเจกต์ (ถ่ายกลุ่ม)' : 'คิวเดี่ยว'}</div> : (
        <div className="seg mb-3">
          <button type="button" className={cx(!proj && 'on')} onClick={() => setType('solo')}>คิวเดี่ยว</button>
          <button type="button" className={cx(proj && 'on')} onClick={() => setType('project')}>โปรเจกต์ (ถ่ายกลุ่ม)</button>
        </div>
      )}
      <form className="flex flex-col gap-3" noValidate onSubmit={submit}>
        {!proj ? (
          <div className="grid grid-cols-2 gap-2.5">
            <label className="field">ชื่อลูกค้า / แอคเคาท์<input value={name} onChange={e => setName(e.target.value)} placeholder="เช่น Pim.cos" /></label>
            <label className="field">เรื่อง<input value={series} onChange={e => setSeries(e.target.value)} placeholder="ชื่อเรื่อง" /></label>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <label className="field">ชื่อโปรเจกต์<input value={pName} onChange={e => setPName(e.target.value)} placeholder="เช่น Garden of Ash" /></label>
            {members.map((m, i) => (
              <div key={i} className="grid grid-cols-2 gap-2.5">
                <label className="field">{i === 0 ? 'หัวโปร' : 'สมาชิก ' + (i + 1)}<input value={m.name} onChange={e => setMem(i, 'name', e.target.value)} placeholder="ชื่อ / แอคเคาท์" /></label>
                <label className="field">ตัวละคร<input value={m.char} onChange={e => setMem(i, 'char', e.target.value)} placeholder="ตัวละคร" /></label>
              </div>
            ))}
            <button type="button" className="btn btn-ghost" onClick={() => setMembers(a => [...a, { name: '', char: '' }])}>+ เพิ่มสมาชิก</button>
            <div className="note">{edit ? 'ลบชื่อออกจากช่องเพื่อเอาสมาชิกออก · สมาชิกใหม่จะได้ช็อตเดี่ยวของตัวเองในทุกช่วง' : 'จะสร้างช็อต "ถ่ายรวม" และ "เดี่ยว" ของแต่ละคนให้ทุกช่วงเวลา แบ่งเวลาตามระยะเวลาช่วง'} · เงินเก็บก้อนเดียวจากหัวโปร</div>
          </div>
        )}

        {slots.map((x, i) => (
          <fieldset key={i} className="border border-line rounded-xl px-3 pt-2.5 pb-3 m-0 flex flex-col gap-2.5 min-w-0">
            <legend className="flex items-center gap-2 px-1.5 text-[13px] font-semibold">
              <span>ช่วงที่ <b>{i + 1}</b></span>
              {i > 0 && <button type="button" className="btn btn-ghost btn-danger !px-2 !py-0.5 text-xs" onClick={() => setSlots(a => a.filter((_, j) => j !== i))}>ลบช่วงนี้</button>}
            </legend>
            {!proj && <label className="field">ตัวละครช่วงนี้<input value={x.char || ''} onChange={e => setSlot(i, 'char', e.target.value)} placeholder="เช่น แม่มดดอกไม้" /></label>}
            <div className="grid grid-cols-2 gap-2.5">
              <label className="field">วันที่<input type="date" value={x.date} onChange={e => setSlot(i, 'date', e.target.value)} /></label>
              <label className="field">เวลา<input type="time" value={x.time} onChange={e => setSlot(i, 'time', e.target.value)} /></label>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <label className="field">ระยะเวลา (นาที)<input type="number" min={15} step={15} value={x.dur} onChange={e => setSlot(i, 'dur', +e.target.value)} /></label>
              <label className="field">สถานที่<input list="placeList" value={x.place} onChange={e => setSlot(i, 'place', e.target.value)} placeholder="เช่น สวนเบญจกิติ" /></label>
            </div>
          </fieldset>
        ))}
        <button type="button" className="btn btn-ghost" onClick={() => setSlots(a => { const l = a[a.length - 1]; return [...a, { date: l.date, time: '', dur: l.dur, place: l.place, char: '' }]; })}>+ เพิ่มช่วงเวลา</button>

        {cfg.packages.length > 0 && (
          <div className="field">แพ็กเกจ
            <div className="flex gap-1.5 overflow-x-auto pb-0.5">
              {cfg.packages.map((k, i) => (
                <button type="button" key={i} onClick={() => { setPkg(i); setPrice(String(k.price)); setSlot(0, 'dur', k.dur); }}
                  className={cx('flex-none flex flex-col items-start border rounded-[10px] px-3 py-1.5 text-[13px] text-ink', pkg === i ? 'border-accent bg-accent-soft' : 'border-line bg-surface')}>
                  <b>{k.name}</b><span className="num text-[11px] text-muted">{k.dur} นาที · {baht(k.price)}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <datalist id="placeList">{cfg.places.map(p => <option key={p} value={p} />)}</datalist>
        <label className="field">ราคารวมทั้งก้อน (บาท)<input type="number" min={0} step={100} value={price} onChange={e => setPrice(e.target.value)} /></label>
        <button className="btn btn-primary w-full !py-3" type="submit">{edit ? 'บันทึกการแก้ไข' : 'เพิ่มคิว'}</button>
      </form>
    </>
  );
}
