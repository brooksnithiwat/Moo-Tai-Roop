import type { Tab } from './lib/store';
import { S, commit, findOcc, go, openSheet, signedIn, useApp } from './lib/store';
import { isBacklog, occurrences, running } from './lib/model';
import { openShoot } from './lib/actions';
import { useNow } from './lib/now';
import { cx, fmt } from './lib/util';
import { remain } from './lib/model';
import { Icon } from './components/ui';
import { RefFileInput } from './components/refs';
import { SheetHost } from './sheets/Sheets';
import { Today } from './views/Today';
import { Jobs } from './views/Jobs';
import { Calendar } from './views/Calendar';
import { Money } from './views/Money';
import { Settings } from './views/Settings';
import { Session } from './views/Session';

const TABS: { k: Tab; t: string; icon: keyof typeof Icon }[] = [
  { k: 'today', t: 'วันนี้', icon: 'camera' },
  { k: 'jobs', t: 'งานทั้งหมด', icon: 'jobs' },
  { k: 'cal', t: 'ปฏิทิน', icon: 'cal' },
  { k: 'money', t: 'รายรับ', icon: 'money' },
  { k: 'settings', t: 'ตั้งค่า', icon: 'gear' },
];

function TabBar() {
  const s = useApp(), backlog = s.shoots.filter(isBacklog).length;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-[6] bg-bar border-t border-line grid grid-cols-5 pb-[env(safe-area-inset-bottom)] px-[env(safe-area-inset-left)]">
      {TABS.map(x => {
        const I = Icon[x.icon], on = s.ui.tab === x.k;
        return (
          <button key={x.k} onClick={() => go(x.k)} className={cx('border-0 bg-transparent pt-2 pb-2.5 px-1 flex flex-col items-center gap-0.5 text-[11px]', on ? 'text-accent font-semibold' : 'text-muted')}>
            <span className="relative block w-[22px] h-[22px]">
              <I />
              {x.k === 'jobs' && backlog > 0 && <b className="absolute -top-1.5 -right-3 min-w-[18px] h-[18px] px-[5px] rounded-full bg-accent text-accent-ink text-[11px] font-bold leading-[18px] text-center num">{backlog}</b>}
              {x.k === 'settings' && !signedIn() && <b title="ยังไม่ได้เข้าสู่ระบบ Google" className="absolute -top-0.5 -right-1 w-[9px] h-[9px] rounded-full bg-warn border-2 border-bar" />}
            </span>
            {x.t}
          </button>
        );
      })}
    </nav>
  );
}

/** Pinned bar while a timer runs and the shoot screen is closed. */
function LiveBar() {
  const now = useNow(), s = useApp();
  const live = occurrences(s.shoots).find(o => running(o.sl.t));
  if (!live || s.ui.open !== null) return null;
  return (
    <button onClick={() => openShoot(live)}
      className="fixed z-[7] bottom-[calc(68px+env(safe-area-inset-bottom))] left-[max(12px,env(safe-area-inset-left))] right-[max(12px,env(safe-area-inset-right))] max-w-[520px] mx-auto flex items-center gap-2.5 bg-accent text-accent-ink border-0 rounded-[14px] px-3.5 py-2.5 text-left shadow-[0_6px_20px_rgba(0,0,0,.18)]">
      <span className="pulse-dot" />
      <span className="flex-1 min-w-0 truncate">กำลังถ่าย · {live.b.name}</span>
      <span className="num font-bold">{fmt(remain(live.sl.t, now))}</span><span>›</span>
    </button>
  );
}

function Menu() {
  const s = useApp(), m = s.ui.menu;
  if (!m) return null;
  const close = () => { S.ui.menu = null; commit(); };
  return (
    <>
      <div className="fixed inset-0 z-[24]" onClick={close} onWheel={close} onTouchMove={close} />
      <div role="menu" className="fixed z-[25] min-w-[150px] bg-surface border border-line rounded-xl shadow-[0_10px_30px_rgba(0,0,0,.18)] p-1.5 flex flex-col" style={{ top: m.top, right: m.right }}>
        <button role="menuitem" autoFocus className="border-0 bg-transparent text-left px-3 py-2.5 rounded-lg text-[15px] hover:bg-sunk focus-visible:bg-sunk" onClick={() => openSheet({ kind: 'form', id: m.id })}>แก้ไข</button>
        <button role="menuitem" className="border-0 bg-transparent text-left px-3 py-2.5 rounded-lg text-[15px] text-bad hover:bg-sunk focus-visible:bg-sunk" onClick={() => openSheet({ kind: 'del', id: m.id })}>ลบ</button>
      </div>
    </>
  );
}

function ToastHost() {
  const t = useApp().ui.toast;
  if (!t) return null;
  return (
    <div key={t.key} role="status" className="fixed z-30 left-1/2 -translate-x-1/2 bottom-[calc(84px+env(safe-area-inset-bottom))] bg-ink text-bg px-4 py-2.5 rounded-full text-sm flex items-center gap-3 max-w-[calc(100vw-32px)]">
      <span>{t.text}</span>
      {t.action && <button className="border-0 bg-transparent text-accent font-bold p-0 text-sm" onClick={() => { const a = t.action!; S.ui.toast = null; a.run(); }}>{t.action.label}</button>}
    </div>
  );
}

export function App() {
  const s = useApp();
  if (!s.loaded) return null;
  const open = findOcc(s.ui.open);
  const view = { today: <Today />, jobs: <Jobs />, cal: <Calendar />, money: <Money />, settings: <Settings /> }[s.ui.tab];
  return (
    <>
      <header className="sticky top-[env(safe-area-inset-top)] z-[5] bg-bg border-b border-line flex flex-wrap items-center gap-2.5 pt-3.5 pb-2.5 gutter">
        <div className="font-display font-bold text-xl tracking-[.01em] flex items-center gap-2 flex-[1_0_auto] text-accent whitespace-nowrap">
          <span className="w-2.5 h-2.5 rounded-full bg-accent shadow-[0_0_0_4px_var(--accent-soft)]" />หมูถ่ายรูป
        </div>
        <button className="flex items-center gap-1.5 border-0 bg-accent text-accent-ink rounded-xl pl-2.5 pr-3.5 py-2 font-semibold text-sm whitespace-nowrap flex-none" onClick={() => openSheet({ kind: 'form' })}>
          <span className="text-xl leading-none font-medium" aria-hidden="true">+</span>เพิ่มคิวลูกค้า
        </button>
      </header>
      <main className="max-w-[960px] mx-auto pt-[18px] pb-[150px] gutter">{view}</main>
      <TabBar />
      <LiveBar />
      {open && <Session o={open} />}
      <Menu />
      <SheetHost />
      <ToastHost />
      <RefFileInput />
    </>
  );
}
