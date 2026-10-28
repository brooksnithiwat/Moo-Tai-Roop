/* Local persistence: the whole app state is one record in IndexedDB.
   Uploaded ref images are stored inline as resized JPEG data URLs, so IndexedDB (not localStorage) is used for room. */
const Store = (() => {
  const DB = 'moo-thai-rup', OS = 'state', KEY = 'main';
  let dbp = null;
  const open = () => dbp || (dbp = new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(OS);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  }));
  const tx = async (mode, fn) => {
    const db = await open();
    return new Promise((res, rej) => {
      const t = db.transaction(OS, mode), q = fn(t.objectStore(OS));
      t.oncomplete = () => res(q && q.result);
      t.onerror = () => rej(t.error);
    });
  };
  return {
    load: () => tx('readonly', s => s.get(KEY)).catch(() => null),
    save: data => tx('readwrite', s => s.put(data, KEY)),
    clear: () => tx('readwrite', s => s.delete(KEY)),
  };
})();

/* ---- serialize: strip runtime-only fields (proxies, caches, carousel position) ---- */
function serializeState() {
  const clean = v => JSON.parse(JSON.stringify(v, (k, x) => (k.startsWith('_') ? undefined : x)));
  return {
    v: 1,
    updatedAt: S.updatedAt || Date.now(),
    cfg: clean(S.cfg),
    drive: clean(S.driveInfo || null),
    shoots: S.shoots.map(b => {
      const o = clean({ ...b, slots: undefined });
      o.slots = b.slots.map(sl => {
        const x = clean({ ...sl, t: undefined });
        x.t = { total: sl.t.total, remain: sl.t.remain, running: sl.t.running, wall: Date.now(), beeped: sl.t.beeped };
        x.refs = sl.refs.map(r => clean(r));
        return x;
      });
      return o;
    }),
  };
}
function hydrateState(d) {
  if (!d || !Array.isArray(d.shoots)) return false;
  let max = 100;
  const bump = n => { const m = +String(n).replace(/\D/g, ''); if (m > max) max = m; };
  S.shoots = d.shoots.map(b => {
    bump(b.id);
    b.slots = (b.slots || []).map(sl => {
      bump(sl.id); (sl.shots || []).forEach(x => bump(x.id));
      const t = sl.t || {};
      const remain = t.running ? t.remain - (Date.now() - (t.wall || Date.now())) / 1000 : (t.remain ?? sl.dur * 60);
      sl.t = { total: t.total ?? sl.dur * 60, remain, running: !!t.running, last: performance.now(), beeped: !!t.beeped };
      sl.refs = sl.refs || []; sl.shots = sl.shots || []; sl.ri = sl.ri || 0; sl.sel = sl.sel || 'all'; sl.seg = sl.seg || 0;
      return sl;
    });
    return b;
  });
  if (d.cfg) Object.assign(S.cfg, d.cfg);
  S.driveInfo = d.drive || null;
  S.drive = !!(S.driveInfo && S.driveInfo.email);
  S.updatedAt = d.updatedAt || 0;
  uid = Math.max(uid, max + 1);
  return true;
}

/* ---- save on change, debounced; also pushes to Drive when signed in ---- */
let _saveT = null, _lastSaved = '';
function scheduleSave() {
  clearTimeout(_saveT);
  _saveT = setTimeout(async () => {
    const snap = serializeState();
    const key = JSON.stringify({ ...snap, updatedAt: 0, shoots: snap.shoots.map(b => ({ ...b, slots: b.slots.map(s => ({ ...s, t: { ...s.t, wall: 0, remain: Math.round(s.t.remain / 30) } })) })) });
    if (key === _lastSaved) return;
    _lastSaved = key;
    S.updatedAt = snap.updatedAt = Date.now();
    try { await Store.save(snap); } catch (e) { console.warn('save failed', e); }
    if (window.Drive && Drive.ready()) Drive.queuePush();
  }, 600);
}

/* ---- uploaded images: downscale to keep storage and Drive sync light ---- */
function fileToRefDataURL(file, max = 1400) {
  return new Promise((res, rej) => {
    const img = new Image(), u = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(u);
      res(c.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => { URL.revokeObjectURL(u); rej(new Error('อ่านไฟล์รูปไม่ได้')); };
    img.src = u;
  });
}
