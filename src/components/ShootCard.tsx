import type { Occ } from '../lib/types';
import { isCx, isProj, running, subLine, touched } from '../lib/model';
import { openShoot } from '../lib/actions';
import { openSheet } from '../lib/store';
import { baht, cx, durTxt, endTime } from '../lib/util';
import { useNow } from '../lib/now';
import { Icon, MoreButton, PayChip, ProjTag, SlotTag, StageSelect, TimerText } from './ui';
import { RefImage, RefPlan } from './refs';

/** Members as small labelled chips; the leader gets a mark. */
export function Members({ o }: { o: Occ }) {
  if (!isProj(o.b)) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-2.5">
      {o.b.people.map((p, i) => (
        <span key={i} className="text-xs text-muted bg-sunk rounded-lg px-2 py-[3px]">
          <b className="text-ink font-semibold">{p.name}</b> {p.char}{i === o.b.leader && <em className="not-italic font-bold text-accent ml-1">หัวโปร</em>}
        </span>
      ))}
    </div>
  );
}

/** Row at the bottom of a Today card: ref thumbnails, timer, and the button into the shoot screen. */
export function SessRow({ o }: { o: Occ }) {
  useNow();
  const refs = o.sl.refs, done = refs.filter(r => r.done).length, t = o.sl.t;
  return (
    <button onClick={() => openShoot(o)}
      className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 w-full mt-3 py-2 pl-2 pr-3 border border-line bg-bg rounded-xl text-left hover:border-accent">
      {refs.length ? (
        <span className="flex items-center flex-none">
          {refs.slice(0, 2).map((r, i) => (
            <i key={i} className={cx('relative block w-[30px] h-10 rounded-md border-2 border-surface overflow-hidden bg-sunk', i > 0 && '-ml-2.5')}><RefImage r={r} cover caption={false} /></i>
          ))}
          {refs.length > 2 && <b className="text-[11px] ml-1 text-muted font-semibold">+{refs.length - 2}</b>}
        </span>
      ) : <span className="flex-none w-[30px] h-10 rounded-md border-[1.5px] border-dashed border-line grid place-items-center text-muted">+</span>}
      <span className="flex flex-col flex-1 min-w-0 text-xs text-muted leading-snug">
        <span className="truncate">{isProj(o.b) ? `${o.sl.shots.length} ช็อต · ` : ''}{refs.length ? `ref ${done}/${refs.length}` : 'ยังไม่มี ref'}</span>
        <TimerText o={o} className="text-sm text-ink font-bold whitespace-nowrap" />
      </span>
      <span className="flex-none flex items-center justify-center gap-1.5 bg-accent text-accent-ink rounded-[10px] px-3 py-2 text-sm font-semibold whitespace-nowrap w-full sm:w-auto">
        <Icon.camera className="w-[18px] h-[18px]" />{running(t) ? 'กำลังถ่าย' : touched(t) ? 'ถ่ายต่อ' : 'เริ่มถ่าย'}
      </span>
    </button>
  );
}

/**
 * A booking slot as a card.
 *  full — Today: money, stage dropdown, and the way into the shoot screen.
 *  plan — Calendar: same card, but refs are prepared here instead (no shoot button: the day hasn't come).
 */
export function ShootCard({ o, mode }: { o: Occ; mode: 'full' | 'plan' }) {
  const b = o.b;
  return (
    <div className={cx('card mb-3', b.stage === 'shooting' && 'border-accent shadow-[0_0_0_3px_var(--accent-soft)]', isCx(b) && 'opacity-70')}>
      <div className="flex items-start gap-2.5">
        <div className="min-w-0 flex-1">
          <div className={cx('font-display font-semibold text-[17px]', isCx(b) && 'line-through')}>{b.name}<ProjTag b={b} /><SlotTag o={o} /></div>
          <div className="text-muted text-sm">{subLine(o)}</div>
        </div>
        <MoreButton o={o} className="-mt-1 -mr-1.5" />
      </div>
      <Members o={o} />
      <div className="text-[13px] text-muted flex flex-wrap gap-x-3 gap-y-1 mt-0.5"><span>📍 {o.sl.place}</span><span>{durTxt(o.sl.dur)}</span></div>
      <div className="flex items-center gap-2.5 mt-3"><StageSelect b={b} /></div>
      <div className="flex gap-2 mt-3 flex-wrap items-center">
        <PayChip b={b} /><span className="flex-1" />
        <button className="btn" onClick={() => openSheet({ kind: 'pay', id: o.id })}>{baht(b.paid)} / {baht(b.price)}</button>
      </div>
      {mode === 'plan' ? <RefPlan o={o} /> : <SessRow o={o} />}
    </div>
  );
}

/** Cards on a time rail; consecutive slots at the same place get one location header. */
export function Timeline({ list, mode }: { list: Occ[]; mode: 'full' | 'plan' }) {
  return (
    <div>
      {list.map((o, i) => {
        const prev = list[i - 1];
        let n = 0; for (let j = i; j < list.length && list[j].sl.place === o.sl.place; j++) n++;
        const head = (!prev || prev.sl.place !== o.sl.place) && n > 1;
        return (
          <div key={o.id}>
            {head && <div className="flex items-baseline gap-2 flex-wrap ml-[74px] mt-1 mb-2.5 text-[13px] font-semibold"><span>📍 {o.sl.place}</span><span className="text-muted">{n} คิวต่อเนื่อง</span></div>}
            <div className="grid grid-cols-[62px_1fr] gap-3">
              <div className="num text-[15px] font-bold pt-3.5 text-right">{o.sl.time}<small className="block font-medium text-[11px] text-muted">{endTime(o.sl.time, o.sl.dur)}</small></div>
              <ShootCard o={o} mode={mode} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

