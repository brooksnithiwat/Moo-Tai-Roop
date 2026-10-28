import { useEffect } from 'react';
import type { Occ } from '../lib/types';
import { commit, openSheet, toast, useApp } from '../lib/store';
import { isCx, isProj, occurrences, planInfo, remain, running, shotOf, sortOcc, shortLine, touched, visRefs } from '../lib/model';
import { addMinutes, closeShoot, openShoot, toggleTimer } from '../lib/actions';
import { useNow } from '../lib/now';
import { cx, durTxt, endTime, fmt } from '../lib/util';
import { ProjTag, SlotTag } from '../components/ui';
import { LinkForm, RefImage, pickRefFiles } from '../components/refs';

function Clock({ o }: { o: Occ }) {
  const now = useNow(), cfg = useApp().cfg, t = o.sl.t, r = remain(t, now);
  const frac = Math.max(0, r) / t.total;
  const col = r < 0 ? 'var(--bad)' : r < cfg.warnMin * 60 ? 'var(--warn)' : 'var(--accent)';
  return (
    <div className={cx('card flex flex-col items-center gap-3 !p-4')}>
      <div className="relative w-[min(200px,60vw)] md:w-[min(240px,70vw)] aspect-square max-w-full">
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
          <circle cx="60" cy="60" r="54" fill="none" stroke="var(--sunk)" strokeWidth="8" />
          <circle cx="60" cy="60" r="54" fill="none" stroke={col} strokeWidth="8" strokeLinecap="round" strokeDasharray="339.3" strokeDashoffset={(339.3 * (1 - frac)).toFixed(1)} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className={cx('num font-bold text-[38px] md:text-[44px] tracking-tight', r < 0 && 'text-bad')}>{fmt(r)}</div>
          <div className="text-xs text-muted">{r < 0 ? 'เกินเวลา' : running(t) ? 'กำลังถ่าย' : 'จาก ' + durTxt(Math.round(t.total / 60))}</div>
        </div>
      </div>
      <div className="flex gap-2 flex-wrap justify-center items-center">
        <button className="btn min-w-16" onClick={() => addMinutes(o, -5)}>−5</button>
        <button className="w-[72px] h-[72px] rounded-full border-0 bg-accent text-accent-ink font-display font-bold" onClick={() => toggleTimer(o)}>{running(t) ? 'พัก' : touched(t) ? 'ต่อ' : 'เริ่ม'}</button>
        <button className="btn min-w-16" onClick={() => addMinutes(o, 5)}>+5</button>
      </div>
      <div className="flex gap-2.5">
        <button className="btn btn-ghost" onClick={() => (touched(t) || t.total !== o.sl.dur * 60 ? openSheet({ kind: 'reset', id: o.id }) : toast('เวลายังไม่ได้เริ่ม'))}>รีเซ็ตเวลา</button>
        <button className="btn" onClick={() => openSheet({ kind: 'finish', id: o.id })}>จบคิวนี้</button>
      </div>
    </div>
  );
}

function Plan({ o }: { o: Occ }) {
  const now = useNow(), t = o.sl.t, pi = planInfo(o.sl, now), on = touched(t);
  const cnt = (id: string) => { const a = o.sl.refs.filter(r => r.shot === id); return `${a.filter(r => r.done).length}/${a.length}`; };
  return (
    <div className="card">
      <div className="flex items-center mb-2"><h2 className="text-[17px]">แผนเวลา</h2><span className="flex-1" /><span className="text-muted text-xs">{on ? `ตอนนี้: ${o.sl.shots[pi.i].label} · เหลือ ${fmt(pi.left)}` : 'เริ่มจับเวลาเพื่อดูช่วง'}</span></div>
      <ol className="list-none m-0 p-0 flex flex-col gap-1">
        {o.sl.shots.map((x, i) => (
          <li key={x.id}>
            <button onClick={() => { o.sl.sel = x.id; o.sl.ri = 0; commit(); }}
              className={cx('w-full flex items-center gap-2.5 border-0 bg-transparent px-2 py-[7px] rounded-lg text-left hover:bg-sunk', on && i === pi.i && '!bg-accent-soft text-accent font-semibold')}>
              <span className="num w-[34px] text-muted text-[13px]">{x.min}′</span>
              <span className={cx('flex-1 min-w-0', on && i < pi.i && 'line-through text-muted')}>{x.label}</span>
              <span className="num text-xs text-muted">{cnt(x.id)}</span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Viewer({ o }: { o: Occ }) {
  const sl = o.sl, multi = sl.shots.length > 1, vis = visRefs(sl);
  if (sl.ri >= vis.length) sl.ri = 0;
  const r = vis[sl.ri], done = vis.filter(x => x.done).length;
  const cnt = (id: string) => { const a = sl.refs.filter(x => x.shot === id); return `${a.filter(x => x.done).length}/${a.length}`; };
  const step = (d: number) => { sl.ri = (sl.ri + d + vis.length) % vis.length; commit(); };
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.target as HTMLElement).tagName === 'INPUT' || vis.length < 2) return; if (e.key === 'ArrowRight') step(1); if (e.key === 'ArrowLeft') step(-1); };
    addEventListener('keydown', k); return () => removeEventListener('keydown', k);
  });
  const cur = sl.sel !== 'all' ? shotOf(sl, sl.sel) : undefined;
  return (
    <div className="card !p-3">
      {multi && (
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-2.5 mb-1">
          {[{ id: 'all', label: 'ทั้งหมด' }, ...sl.shots].map(x => (
            <button key={x.id} onClick={() => { sl.sel = x.id; sl.ri = 0; commit(); }}
              className={cx('fchip', sl.sel === x.id && 'on')}>{x.label} <span className="num">{x.id === 'all' ? `${sl.refs.filter(y => y.done).length}/${sl.refs.length}` : cnt(x.id)}</span></button>
          ))}
        </div>
      )}
      <div className="flex items-center mb-2.5"><h2 className="text-[17px]">{cur && multi ? cur.label : 'รูป Reference'}</h2><span className="flex-1" /><span className="text-muted num text-[13px]">ถ่ายแล้ว {done}/{vis.length}</span></div>
      {cur && multi && <div className="text-muted text-[13px] -mt-1.5 mb-2.5">ในช็อต: {cur.who.map(i => o.b.people[i]?.name).join(', ')}</div>}
      <div className="relative aspect-[3/4] max-h-[62vh] w-full max-w-full rounded-[10px] overflow-hidden bg-sunk mx-auto">
        {r ? <>
          <RefImage r={r} />
          {!r.link && <span className="absolute left-3.5 right-3.5 bottom-3 text-white font-display text-lg font-semibold [text-shadow:0_1px_8px_rgba(0,0,0,.55)]">{r.label}</span>}
          <span className="num absolute top-2.5 left-2.5 bg-black/45 text-white text-xs px-2 py-[3px] rounded-full">{multi && sl.sel === 'all' ? shotOf(sl, r.shot)?.label + ' · ' : ''}{sl.ri + 1}/{vis.length}</span>
          <button onClick={() => { r.done = !r.done; commit(); }}
            className={cx('absolute top-2.5 right-2.5 border-0 rounded-full px-3 py-[5px] text-[13px] font-semibold', r.done ? 'bg-[#1F8A5B] text-white' : 'bg-white/90 text-[#1D1A24]')}>{r.done ? '✓ ถ่ายแล้ว' : 'ทำเครื่องหมายว่าถ่ายแล้ว'}</button>
          {vis.length > 1 && <>
            <button aria-label="รูปก่อน" onClick={() => step(-1)} className="absolute top-1/2 -translate-y-1/2 left-2 w-[42px] h-[42px] rounded-full border-0 bg-black/35 text-white text-xl">‹</button>
            <button aria-label="รูปถัดไป" onClick={() => step(1)} className="absolute top-1/2 -translate-y-1/2 right-2 w-[42px] h-[42px] rounded-full border-0 bg-black/35 text-white text-xl">›</button>
          </>}
        </> : <div className="absolute inset-0 flex items-center justify-center text-center text-muted p-4">{cur && multi ? 'ช็อตนี้' : 'คิวนี้'}ยังไม่มีรูป ref<br />กด + ด้านล่างเพื่อเพิ่มจากเครื่อง</div>}
      </div>
      <div className="flex gap-2 overflow-x-auto pt-2.5 px-0.5 pb-0.5">
        {vis.map((x, i) => (
          <button key={i} aria-label={x.label} onClick={() => { sl.ri = i; commit(); }}
            className={cx('relative flex-[0_0_56px] h-[72px] rounded-lg border-2 overflow-hidden p-0 bg-sunk', i === sl.ri ? 'border-accent' : 'border-transparent')}>
            <RefImage r={x} cover caption={false} />
            {x.done && <span className="absolute bottom-[3px] right-[3px] w-4 h-4 rounded-full bg-[#1F8A5B] text-white text-[10px] grid place-items-center">✓</span>}
          </button>
        ))}
        <button aria-label="เพิ่มรูป reference" onClick={() => pickRefFiles(o)} className="flex-[0_0_56px] h-[72px] rounded-lg border-[1.5px] border-dashed border-line grid place-items-center text-muted text-[22px] bg-transparent">+</button>
      </div>
      <div className="mt-3"><LinkForm key={sl.sel} o={o} shotPicker={multi && sl.sel === 'all'} placeholderShot={cur && multi ? cur.label : undefined} /></div>
    </div>
  );
}

export function Session({ o }: { o: Occ }) {
  const s = useApp();
  const next = occurrences(s.shoots).filter(x => x.sl.date === o.sl.date && x.sl.time > o.sl.time && !isCx(x.b)).sort(sortOcc)[0];
  const b = o.b, multi = o.sl.shots.length > 1;
  useEffect(() => { document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = ''; }; }, []);
  return (
    <div className="fixed inset-0 z-[15] bg-bg overflow-y-auto pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]" role="dialog" aria-label={`หน้าถ่าย ${b.name}`}>
      <div className="sticky top-0 z-[2] bg-bg flex items-center gap-2.5 border-b border-line py-3 gutter">
        <button className="w-9 h-9 rounded-[10px] border border-line bg-surface text-lg" aria-label="กลับไปที่รายการคิว" onClick={closeShoot}>‹</button>
        <span className="eyebrow !text-[13px]">หน้าถ่าย</span>
      </div>
      <div className="max-w-[960px] mx-auto pt-4 pb-7 gutter">
        <section className="rounded-[18px] px-[18px] py-4 mb-4 border border-accent/30 bg-gradient-to-br from-accent-soft to-surface to-70%">
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            <SlotTag o={o} /><ProjTag b={b} />
            <span className="tag num bg-surface text-ink border border-line !ml-0">{o.sl.time}–{endTime(o.sl.time, o.sl.dur)} · {durTxt(o.sl.dur)}</span>
          </div>
          <h1 className="text-[30px] leading-tight">{b.name}</h1>
          {isProj(b) ? (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {b.people.map((p, i) => (
                <span key={i} className="flex items-baseline gap-1.5 bg-surface border border-line rounded-[10px] px-2.5 py-[5px] text-sm text-muted">
                  <b className="text-ink text-[15px]">{p.name}</b>{p.char}{i === b.leader && <em className="not-italic font-bold text-accent text-xs">หัวโปร</em>}
                </span>
              ))}
            </div>
          ) : (
            <div className="font-display text-xl font-semibold text-accent mt-0.5">{shortLine(o)}{b.series !== '—' && <span className="font-body text-[15px] font-normal text-muted"> · {b.series}</span>}</div>
          )}
          <div className="mt-2 text-[15px]">📍 {o.sl.place}</div>
        </section>
        <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] md:items-start gap-4">
          <div className="flex flex-col gap-3">
            <Clock o={o} />
            {multi && <Plan o={o} />}
            {next && (
              <button onClick={() => openShoot(next)} className="flex items-center gap-2.5 w-full py-2 px-3 border border-line bg-bg rounded-xl text-left hover:border-accent">
                <span className="flex flex-col flex-1 min-w-0 text-xs text-muted"><span>คิวถัดไป · {next.sl.time}</span><span className="text-[15px] text-ink font-semibold">{next.b.name} · {shortLine(next)}</span></span>
                <span className="text-accent text-[22px]">›</span>
              </button>
            )}
          </div>
          <Viewer o={o} />
        </div>
      </div>
    </div>
  );
}
