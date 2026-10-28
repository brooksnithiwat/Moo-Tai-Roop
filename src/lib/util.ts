export const pad = (n: number) => String(n).padStart(2, '0');
export const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parse = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };

export const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
export const todayIso = () => iso(today());
export const offsetIso = (n: number) => { const d = today(); d.setDate(d.getDate() + n); return iso(d); };

export const baht = (n: number) => '฿' + Math.round(n).toLocaleString('th-TH');

let era: 'be' | 'ce' = 'be';
export const setEra = (e: 'be' | 'ce') => { era = e; };
export const thDate = (d: Date, o: Intl.DateTimeFormatOptions) => d.toLocaleDateString(era === 'ce' ? 'th-TH-u-ca-gregory' : 'th-TH', o);

export const durTxt = (m: number) => (m >= 60 ? (m / 60 % 1 ? (m / 60).toFixed(1) : m / 60) + ' ชม.' : m + ' นาที');
export const endTime = (time: string, dur: number) => {
  const [h, m] = time.split(':').map(Number);
  const t = h * 60 + m + dur;
  return pad(Math.floor(t / 60) % 24) + ':' + pad(t % 60);
};
/** seconds → "mm:ss" or "h:mm:ss"; negative values (overtime) get a leading + */
export const fmt = (sec: number) => {
  const neg = sec < 0; sec = Math.abs(Math.round(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return (neg ? '+' : '') + (h ? h + ':' + pad(m) : pad(m)) + ':' + pad(s);
};
export const domainOf = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return 'ลิงก์'; } };
export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(' ');
export const ageDays = (date: string) => Math.round((+today() - +parse(date)) / 864e5);
