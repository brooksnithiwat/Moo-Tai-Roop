import { useLayoutEffect, useRef, useState } from 'react';
import type { Occ, Ref } from '../lib/types';
import { addRefFiles, addRefLink, copyText, folderMessage, makeRefFolder, removeRef } from '../lib/actions';
import { genRef } from '../lib/refart';
import { READ_REF_UPLOADS } from '../lib/drive';
import { commit } from '../lib/store';
import { cx, domainOf } from '../lib/util';
import { Icon } from './ui';

export const refSrc = (r: Ref): string => r.url || (r.link ? r.link : genRef(r));

/** A ref image filling its box. Pasted links that aren't direct images show a link card instead. */
export function RefImage({ r, cover, caption = true }: { r: Ref; cover?: boolean; caption?: boolean }) {
  const [broken, setBroken] = useState(false);
  if (r.link) return (
    <>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 p-4 text-center text-muted">
        <span className="text-3xl">🔗</span>
        {caption && <b className="text-ink">{domainOf(r.link)}</b>}
        {caption && <a href={r.link} target="_blank" rel="noopener" className="text-accent font-semibold" onClick={e => e.stopPropagation()}>เปิดลิงก์รูป ↗</a>}
      </div>
      {!broken && <img src={r.link} alt="" onError={() => setBroken(true)} className={cx('absolute inset-0 w-full h-full bg-sunk', cover ? 'object-cover' : 'object-contain')} />}
    </>
  );
  return <img src={refSrc(r)} alt={r.label} className={cx('absolute inset-0 w-full h-full', cover ? 'object-cover' : 'object-contain')} />;
}

/* ---------- file picker shared by every "add ref" button ---------- */
let pickTarget: Occ | null = null;
export function pickRefFiles(o: Occ) { pickTarget = o; (document.getElementById('refInput') as HTMLInputElement)?.click(); }
export function RefFileInput() {
  return (
    <input id="refInput" type="file" accept="image/*" multiple hidden
      onChange={async e => {
        const files = [...(e.target.files || [])]; e.target.value = '';
        if (pickTarget && files.length) await addRefFiles(pickTarget, files);
        pickTarget = null;
      }} />
  );
}

/* ---------- paste-a-link form ---------- */
export function LinkForm({ o, shotPicker, placeholderShot }: { o: Occ; shotPicker: boolean; placeholderShot?: string }) {
  const [url, setUrl] = useState('');
  const [shot, setShot] = useState(o.sl.shots[0]?.id);
  const inp = useRef<HTMLInputElement>(null);
  return (
    <form className="flex flex-col gap-1.5" noValidate
      onSubmit={e => { e.preventDefault(); if (addRefLink(o, url.trim(), shotPicker ? shot : undefined)) { setUrl(''); inp.current?.focus(); } }}>
      {shotPicker && (
        <select aria-label="ช็อต" value={shot} onChange={e => setShot(e.target.value)} className="inp text-sm py-2">
          {o.sl.shots.map(x => <option key={x.id} value={x.id}>{x.label}</option>)}
        </select>
      )}
      <div className="flex gap-1.5">
        <input ref={inp} type="url" inputMode="url" value={url} onChange={e => setUrl(e.target.value)} aria-label="ลิงก์รูป ref"
          placeholder={'วางลิงก์รูป ref' + (placeholderShot ? ' · ' + placeholderShot : '')} className="inp flex-1 text-sm py-2 bg-surface" />
        <button type="submit" className="btn btn-primary flex-none">เพิ่ม</button>
      </div>
    </form>
  );
}

/* ---------- looping carousel ----------
   Real slides sit between a clone of the last (left end) and a clone of the first (right end).
   Landing on a clone jumps instantly to its twin, so swiping never hits an end. */
const carouselPos = new Map<number, number>();
export function Carousel({ o }: { o: Occ }) {
  const refs = o.sl.refs, n = refs.length, multi = o.sl.shots.length > 1;
  const track = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const t = track.current; if (!t || n < 2) return;
    const w = () => t.clientWidth;
    const go = (i: number, smooth?: boolean) => t.scrollTo({ left: i * w(), behavior: smooth ? 'smooth' : 'instant' as ScrollBehavior });
    go(Math.min(n, Math.max(1, (carouselPos.get(o.id) ?? 0) + 1)));
    let to: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      clearTimeout(to);
      to = setTimeout(() => {
        const i = Math.round(t.scrollLeft / w());
        if (i === 0) go(n); else if (i === n + 1) go(1);
        carouselPos.set(o.id, (i === 0 ? n : i === n + 1 ? 1 : i) - 1);
      }, 90);
    };
    t.addEventListener('scroll', onScroll, { passive: true });
    (t as any)._step = (d: number) => go(Math.round(t.scrollLeft / w()) + d, true);
    return () => { t.removeEventListener('scroll', onScroll); clearTimeout(to); };
  }, [n, o.id]);
  if (carouselPos.get(o.id)! >= n) carouselPos.set(o.id, 0);

  const slide = (r: Ref, i: number, clone?: boolean) => (
    <div key={(clone ? 'c' : '') + i + (clone && i === 0 ? 'f' : '')} className="cs" aria-hidden={clone || undefined}>
      <RefImage r={r} cover />
      <span className="absolute inset-x-0 bottom-0 px-3 pt-5 pb-2.5 bg-gradient-to-t from-black/55 to-transparent text-white flex flex-col leading-snug">
        <b className="text-sm font-semibold truncate">{r.link ? domainOf(r.link) : r.label}</b>
        {multi && <small className="text-[11px] opacity-85">{o.sl.shots.find(x => x.id === r.shot)?.label}</small>}
      </span>
      <span className="num absolute top-2 left-2 bg-black/45 text-white text-[11px] px-2 py-0.5 rounded-full">{i + 1}/{n}</span>
      <button tabIndex={clone ? -1 : 0} aria-label="ลบรูป ref นี้" onClick={() => removeRef(o, i)}
        className="absolute top-1.5 right-1.5 w-[30px] h-[30px] rounded-full border-0 bg-black/45 text-white text-[13px] grid place-items-center">✕</button>
    </div>
  );
  const nav = (d: number, side: string, label: string) => (
    <button aria-label={label} onClick={() => (track.current as any)?._step?.(d)}
      className={cx('absolute top-1/2 -translate-y-1/2 w-[34px] h-[34px] rounded-full border-0 bg-white/85 text-[#2B1520] text-xl grid place-items-center shadow', side)}>
      {d < 0 ? '‹' : '›'}
    </button>
  );
  return (
    <div className="relative">
      <div ref={track} className="ctrack">
        {n > 1 && slide(refs[n - 1], n - 1, true)}
        {refs.map((r, i) => slide(r, i))}
        {n > 1 && slide(refs[0], 0, true)}
      </div>
      {n > 1 && <>{nav(-1, 'left-1.5', 'รูปก่อนหน้า')}{nav(1, 'right-1.5', 'รูปถัดไป')}</>}
    </div>
  );
}

/* ---------- Ref folder to send to the cosplayer ---------- */
export function FolderBox({ o }: { o: Occ }) {
  const f = o.b.refFolder;
  if (!f) return (
    <button onClick={() => makeRefFolder(o)}
      className="flex items-center gap-3 text-left w-full rounded-xl px-3 py-2.5 bg-surface border-[1.5px] border-dashed border-accent/45 hover:bg-accent-soft">
      <Icon.folder className="w-[26px] h-[26px] text-accent flex-none" />
      <span className="flex flex-col min-w-0 flex-1">
        <b className="text-sm text-ink">สร้างโฟลเดอร์ Ref ให้ลูกค้า</b>
        <small className="text-xs text-muted">ได้ลิงก์ให้คอสเพลเยอร์อัปโหลดรูป ref เข้า Drive ของคุณเอง</small>
      </span>
    </button>
  );
  return (
    <div className="rounded-xl px-3 py-2.5 bg-surface border border-accent/35 flex flex-col gap-2">
      <div className="flex items-center gap-2.5">
        <Icon.folder className="w-[26px] h-[26px] text-accent flex-none" />
        <span className="flex flex-col min-w-0 flex-1"><b className="text-sm">โฟลเดอร์ Ref พร้อมแล้ว</b><small className="text-xs text-muted">{f.path}</small></span>
      </div>
      <div className="num text-[11px] text-muted bg-sunk rounded-lg px-2 py-1.5 break-all">{f.url}</div>
      <button className="btn btn-primary w-full text-[13px]" onClick={() => copyText(folderMessage(o), 'คัดลอกข้อความแล้ว ส่งให้ลูกค้าได้เลย')}>คัดลอกข้อความส่งลูกค้า</button>
      <div className="flex gap-1.5 flex-wrap">
        <button className="btn flex-[1_1_120px] text-[13px]" onClick={() => copyText(f.url, 'คัดลอกลิงก์โฟลเดอร์แล้ว')}>คัดลอกลิงก์</button>
        <a className="btn flex-[1_1_120px] text-[13px]" href={f.url} target="_blank" rel="noopener">เปิดโฟลเดอร์ ↗</a>
      </div>
      <small className="text-muted text-xs">ทุกคนที่มีลิงก์อัปโหลดรูปเข้าโฟลเดอร์นี้ได้{READ_REF_UPLOADS ? ' · กดซิงก์แล้วรูปในโฟลเดอร์จะขึ้นเป็น ref ของคิวนี้' : ' · เปิดโฟลเดอร์เพื่อดูรูปที่ลูกค้าส่งมา'}</small>
    </div>
  );
}

/** Calendar-card block for preparing refs ahead of the shoot day. */
export function RefPlan({ o }: { o: Occ }) {
  const multi = o.sl.shots.length > 1;
  return (
    <div className="mt-3 border border-line bg-bg rounded-xl px-3 py-2.5 flex flex-col gap-2">
      <div className="flex items-baseline gap-2 text-sm"><b>รูป ref</b><span className="text-muted text-xs">{o.sl.refs.length ? o.sl.refs.length + ' รูป' : 'ยังไม่มี'}</span></div>
      {o.sl.refs.length > 0 && <Carousel o={o} />}
      <LinkForm o={o} shotPicker={multi} />
      <FolderBox o={o} />
    </div>
  );
}

export const markRefDone = (o: Occ, r: Ref) => { r.done = !r.done; commit(); };
