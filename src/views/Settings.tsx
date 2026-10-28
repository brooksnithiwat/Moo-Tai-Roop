import type { ReactNode } from 'react';
import type { Cfg } from '../lib/types';
import { commit, openSheet, signedIn, useApp } from '../lib/store';
import { loadSample, signIn, signOut, syncNow } from '../lib/actions';
import * as Drive from '../lib/drive';
import { useNow } from '../lib/now';
import { cx } from '../lib/util';
import { Icon } from '../components/ui';

export const APP_VERSION = '1.0.0';

function Row({ icon, c, bg, title, sub, onClick }: { icon: ReactNode; c: string; bg: string; title: string; sub: ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-3.5 w-full text-left border border-line bg-surface rounded-2xl px-3.5 py-3 hover:border-accent">
      <span className="w-[46px] h-[46px] rounded-xl grid place-items-center flex-none" style={{ color: c, background: bg }}>{icon}</span>
      <span className="flex-1 min-w-0 flex flex-col"><b className="text-[15px]">{title}</b><span className="text-[13px] text-muted">{sub}</span></span>
      <span className="text-muted text-[22px]" aria-hidden="true">›</span>
    </button>
  );
}

function Seg<K extends keyof Cfg>({ k, opts }: { k: K; opts: [Cfg[K], string][] }) {
  const s = useApp();
  return (
    <div className="seg">
      {opts.map(([v, t]) => <button key={String(v)} className={cx('!flex-none !px-3 !py-1.5', s.cfg[k] === v && 'on')} onClick={() => { s.cfg[k] = v; commit(); }}>{t}</button>)}
    </div>
  );
}

function syncText(t?: number) {
  if (!t) return 'ยังไม่ได้ซิงก์ในเครื่องนี้ · กด "ซิงก์ตอนนี้"';
  const m = Math.round((Date.now() - t) / 60000);
  return `ซิงก์ล่าสุด ${m < 1 ? 'เมื่อสักครู่' : m < 60 ? m + ' นาทีที่แล้ว' : new Date(t).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })} · ใช้ข้ามอุปกรณ์ได้`;
}

export function Settings() {
  const s = useApp(), c = s.cfg, d = s.drive, on = signedIn();
  useNow();
  return (
    <>
      <div className="mb-4"><h1 className="text-[26px]">ตั้งค่า</h1><div className="text-muted text-sm">บัญชี ข้อมูล และการทำงานของแอป</div></div>

      {on ? (
        <div className="flex items-center gap-3.5 rounded-[18px] px-4 py-3.5 border border-accent/45 bg-gradient-to-r from-surface from-30% to-accent-soft">
          {d?.picture ? <img src={d.picture} alt="" referrerPolicy="no-referrer" className="w-[52px] h-[52px] rounded-full object-cover flex-none" />
            : <span className="w-[52px] h-[52px] rounded-full bg-accent text-accent-ink grid place-items-center text-2xl font-display flex-none">{(d?.name || '?').slice(0, 1).toUpperCase()}</span>}
          <div className="flex-1 min-w-0 flex flex-col"><b className="text-base">{d?.name}</b><span className="text-[13px] text-muted truncate">{d?.email}</span><small className="text-xs text-muted">เข้าสู่ระบบด้วย Google</small></div>
          <button className="w-10 h-10 rounded-[10px] grid place-items-center text-bad hover:bg-bad-soft flex-none" aria-label="ออกจากระบบ" onClick={signOut}><Icon.logout /></button>
        </div>
      ) : (
        <div className="flex items-center gap-3.5 rounded-[18px] px-4 py-3.5 border border-line bg-surface">
          <span className="w-11 h-11 rounded-full bg-sunk grid place-items-center font-bold text-xl text-accent flex-none" aria-hidden="true">G</span>
          <div className="flex-1 min-w-0 flex flex-col"><b className="text-base">ยังไม่ได้เข้าสู่ระบบ</b><span className="text-[13px] text-muted">เก็บข้อมูลไว้ใน Google Drive ของคุณ</span></div>
          <button className="btn btn-primary" onClick={signIn}>เข้าสู่ระบบ</button>
        </div>
      )}

      <div className="mt-4 border border-line bg-surface rounded-[18px] px-4 pt-5 pb-5 text-center">
        <img src={`${import.meta.env.BASE_URL}pig.svg`} alt="" className="w-[150px] max-w-full h-auto block mx-auto mb-1.5" />
        <h2 className="text-xl">หมูถ่ายรูป</h2>
        <p className="mt-1 mb-0 text-muted text-sm">จัดคิวถ่าย งานค้างส่ง และรายรับ สำหรับตากล้องคอสเพลย์</p>
      </div>

      {on ? (
        <div className="mt-4 rounded-2xl px-4 py-3.5 text-center text-sm font-medium bg-ok-soft">ข้อมูลซิงก์กับ Google Drive ในโฟลเดอร์ <b>หมูถ่ายรูป/</b><br />{syncText(d?.lastSync)}</div>
      ) : (
        <div className="mt-4 rounded-2xl px-4 py-3.5 text-center text-sm font-medium bg-accent-soft">หมายเหตุ: ตอนนี้ข้อมูลทั้งหมดเก็บอยู่บนอุปกรณ์นี้เท่านั้น<br />เข้าสู่ระบบ Google เพื่อสำรองข้อมูลไว้ใน Drive และใช้ข้ามอุปกรณ์</div>
      )}

      <h2 className="text-lg mt-6 mb-3">จัดการข้อมูล</h2>
      <div className="flex flex-col gap-2.5">
        <Row icon={<Icon.install />} c="var(--info)" bg="var(--info-soft)" title="ติดตั้งแอป" sub="เพิ่มไปยังหน้าจอหลัก" onClick={() => openSheet({ kind: 'install' })} />
        {on && <Row icon={<Icon.sync />} c="var(--ok)" bg="var(--ok-soft)" title="ซิงก์ตอนนี้" sub="ดึงและบันทึกข้อมูลกับ Google Drive" onClick={syncNow} />}
        <Row icon={<Icon.export />} c="var(--ok)" bg="var(--ok-soft)" title="ส่งออกข้อมูล" sub={`คิวทั้งหมด ${s.shoots.length} คิว เป็นไฟล์ CSV เปิดใน Excel / Google Sheets ได้`} onClick={() => openSheet({ kind: 'export' })} />
        <Row icon={<Icon.sparkle />} c="var(--accent)" bg="var(--accent-soft)" title="ลองใช้ข้อมูลตัวอย่าง" sub="เพิ่มคิวตัวอย่างไว้ลองใช้ ลบทิ้งได้ทีหลัง" onClick={loadSample} />
        <Row icon={<Icon.trash />} c="var(--bad)" bg="var(--bad-soft)" title="ล้างข้อมูลในเครื่อง" sub={on ? 'ข้อมูลใน Drive ยังอยู่ครบ' : 'ลบคิวทั้งหมดในอุปกรณ์นี้'} onClick={() => openSheet({ kind: 'clear' })} />
      </div>

      <h2 className="text-lg mt-6 mb-3">การทำงาน</h2>
      <div className="flex flex-col gap-2.5">
        <Row icon={<Icon.tag />} c="var(--accent)" bg="var(--accent-soft)" title="แพ็กเกจราคา" sub={c.packages.length ? `${c.packages.length} แพ็กเกจ · เลือกได้ตอนเพิ่มคิว` : 'ยังไม่มีแพ็กเกจ'} onClick={() => openSheet({ kind: 'list', list: 'pkg' })} />
        <Row icon={<Icon.pin />} c="var(--warn)" bg="var(--warn-soft)" title="สถานที่ที่ใช้บ่อย" sub={c.places.length ? `${c.places.length} แห่ง · ${c.places.slice(0, 2).join(', ')}${c.places.length > 2 ? '…' : ''}` : 'ยังไม่มีสถานที่'} onClick={() => openSheet({ kind: 'list', list: 'place' })} />
        <Row icon={<Icon.timer />} c="var(--info)" bg="var(--info-soft)" title="ตัวจับเวลา" sub={`เตือนก่อนหมด ${c.warnMin} นาที · เสียง${c.sound ? 'เปิด' : 'ปิด'} · ถ่ายรวม ${c.groupPct}%`} onClick={() => openSheet({ kind: 'num', num: 'timer' })} />
        <Row icon={<Icon.clock />} c="var(--warn)" bg="var(--warn-soft)" title="เตือนงานค้างส่ง" sub={`สีส้มเมื่อเกิน ${c.warnDays} วัน · สีแดงเมื่อเกิน ${c.badDays} วัน`} onClick={() => openSheet({ kind: 'num', num: 'backlog' })} />
      </div>

      <h2 className="text-lg mt-6 mb-3">การแสดงผล</h2>
      <div className="card flex flex-col gap-3">
        <div className="flex items-center gap-2.5 flex-wrap"><span className="flex-1 min-w-[100px] font-medium">ธีม</span><Seg k="theme" opts={[['light', 'สว่าง'], ['dark', 'มืด']]} /></div>
        <div className="flex items-center gap-2.5 flex-wrap"><span className="flex-1 min-w-[100px] font-medium">สัปดาห์เริ่มวัน</span><Seg k="weekStart" opts={[[0, 'อาทิตย์'], [1, 'จันทร์']]} /></div>
        <div className="flex items-center gap-2.5 flex-wrap"><span className="flex-1 min-w-[100px] font-medium">ปีที่แสดง</span><Seg k="era" opts={[['be', 'พ.ศ.'], ['ce', 'ค.ศ.']]} /></div>
      </div>
      <p className="text-muted text-center text-xs mt-6">หมูถ่ายรูป · เวอร์ชัน {APP_VERSION}{Drive.configured() ? '' : ' · ยังไม่ได้ตั้งค่า Google Drive (ดู README)'}</p>
    </>
  );
}
