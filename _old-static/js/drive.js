/* Google Drive: sign-in (Google Identity Services token flow) and sync to the photographer's own Drive.
   Layout in Drive:  หมูถ่ายรูป/data.json   and   หมูถ่ายรูป/ref/<ลูกค้า · วันที่>/  (one shared folder per booking) */
const Drive = (() => {
  const C = window.APP_CONFIG || {};
  const API = 'https://www.googleapis.com/drive/v3', UP = 'https://www.googleapis.com/upload/drive/v3';
  const FOLDER = 'application/vnd.google-apps.folder';
  const SCOPES = ['https://www.googleapis.com/auth/drive.file', 'openid', 'email', 'profile']
    .concat(C.READ_REF_UPLOADS ? ['https://www.googleapis.com/auth/drive.readonly'] : []).join(' ');
  let token = null, expires = 0, client = null, gisP = null, pushT = null, busy = false;

  const configured = () => !!C.GOOGLE_CLIENT_ID;
  const ready = () => !!token && Date.now() < expires - 60000;
  const info = () => (S.driveInfo || (S.driveInfo = {}));

  function loadGis() {
    return gisP || (gisP = new Promise((res, rej) => {
      if (window.google?.accounts?.oauth2) return res();
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
      s.onload = () => res(); s.onerror = () => { gisP = null; rej(new Error('โหลดระบบเข้าสู่ระบบของ Google ไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองใหม่')); };
      document.head.append(s);
    }));
  }
  /* Must be called from a click: the browser only allows Google's popup in response to the user. */
  async function getToken(interactive) {
    if (ready()) return token;
    if (!configured()) throw new Error('ยังไม่ได้ใส่ GOOGLE_CLIENT_ID ใน js/config.js');
    await loadGis();
    return new Promise((res, rej) => {
      client = google.accounts.oauth2.initTokenClient({
        client_id: C.GOOGLE_CLIENT_ID, scope: SCOPES,
        hint: S.driveInfo?.email || undefined,
        callback: r => {
          if (r.error) return rej(new Error(r.error === 'access_denied' ? 'ยกเลิกการเข้าสู่ระบบ' : 'เข้าสู่ระบบไม่สำเร็จ: ' + r.error));
          token = r.access_token; expires = Date.now() + (r.expires_in || 3600) * 1000; res(token);
        },
        error_callback: e => rej(new Error(e?.type === 'popup_closed' ? 'ปิดหน้าต่างเข้าสู่ระบบไปก่อน' : 'เปิดหน้าต่างเข้าสู่ระบบไม่ได้ (เบราว์เซอร์อาจบล็อกป๊อปอัป)')),
      });
      client.requestAccessToken({ prompt: interactive && !S.driveInfo?.email ? 'consent' : '' });
    });
  }
  async function api(path, opt = {}, base = API) {
    const t = await getToken(false);
    const r = await fetch(base + path, { ...opt, headers: { Authorization: 'Bearer ' + t, ...(opt.headers || {}) } });
    if (r.status === 401) { token = null; throw new Error('การเข้าสู่ระบบหมดอายุ กด "ซิงก์ตอนนี้" อีกครั้ง'); }
    if (!r.ok) throw new Error('Google Drive ตอบกลับ ' + r.status + (r.status === 403 ? ' (ไม่มีสิทธิ์)' : ''));
    return r;
  }
  const json = async (p, o, b) => (await api(p, o, b)).json();
  const q = s => encodeURIComponent(s);

  async function findOrCreateFolder(name, parent) {
    const cond = `name='${name.replace(/'/g, "\\'")}' and mimeType='${FOLDER}' and trashed=false` + (parent ? ` and '${parent}' in parents` : '');
    const f = await json(`/files?q=${q(cond)}&fields=files(id,name)&spaces=drive`);
    if (f.files?.length) return f.files[0].id;
    const c = await json('/files?fields=id', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, mimeType: FOLDER, ...(parent ? { parents: [parent] } : {}) }) });
    return c.id;
  }
  async function rootId() {
    const i = info();
    if (i.rootId) return i.rootId;
    return (i.rootId = await findOrCreateFolder(C.ROOT_FOLDER || 'หมูถ่ายรูป'));
  }
  async function dataFileId() {
    const i = info();
    if (i.fileId) return i.fileId;
    const r = await rootId();
    const f = await json(`/files?q=${q(`name='${C.DATA_FILE || 'data.json'}' and '${r}' in parents and trashed=false`)}&fields=files(id,modifiedTime)`);
    return (i.fileId = f.files?.[0]?.id || null);
  }
  async function pullRemote() {
    const id = await dataFileId();
    if (!id) return null;
    try { return await (await api(`/files/${id}?alt=media`)).json(); } catch (e) { info().fileId = null; return null; }
  }
  async function pushLocal() {
    const body = JSON.stringify(serializeState());
    const id = await dataFileId();
    if (id) { await api(`/files/${id}?uploadType=media`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body }, UP); return; }
    const meta = { name: C.DATA_FILE || 'data.json', parents: [await rootId()], mimeType: 'application/json' };
    const fd = new FormData();
    fd.append('metadata', new Blob([JSON.stringify(meta)], { type: 'application/json' }));
    fd.append('file', new Blob([body], { type: 'application/json' }));
    const r = await json('/files?uploadType=multipart&fields=id', { method: 'POST', body: fd }, UP);
    info().fileId = r.id;
  }

  return {
    configured, ready,
    async signIn() {
      await getToken(true);
      const u = await (await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: 'Bearer ' + token } })).json();
      Object.assign(info(), { email: u.email, name: u.name || u.email, picture: u.picture || '' });
      S.drive = true;
      return this.sync();
    },
    signOut() {
      try { if (token && window.google?.accounts?.oauth2) google.accounts.oauth2.revoke(token, () => {}); } catch (e) {}
      token = null; expires = 0; S.driveInfo = null; S.drive = false;
    },
    /* Last write wins on the whole file: whichever side was saved more recently replaces the other. */
    async sync() {
      if (busy) return 'busy';
      busy = true;
      try {
        await getToken(true);
        const remote = await pullRemote();
        let result = 'pushed';
        if (remote && (remote.updatedAt || 0) > (S.updatedAt || 0)) {
          const keep = { ...info() };
          hydrateState(remote); S.driveInfo = { ...remote.drive, ...keep }; S.drive = true; result = 'pulled';
          await Store.save(serializeState());
        } else await pushLocal();
        if (C.READ_REF_UPLOADS) await this.pullRefUploads();
        info().lastSync = Date.now();
        return result;
      } finally { busy = false; }
    },
    queuePush() {
      clearTimeout(pushT);
      pushT = setTimeout(() => { if (ready() && !busy) pushLocal().then(() => { info().lastSync = Date.now(); paintSync?.(); }).catch(e => console.warn(e)); }, 4000);
    },
    /* One shared folder per booking; anyone with the link can add files (role writer). */
    async createRefFolder(b, title) {
      await getToken(true);
      const ref = await findOrCreateFolder('ref', await rootId());
      const id = await findOrCreateFolder(title, ref);
      await api(`/files/${id}/permissions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'anyone', role: 'writer' }) });
      const f = await json(`/files/${id}?fields=webViewLink`);
      return { id, url: f.webViewLink || `https://drive.google.com/drive/folders/${id}`, path: `${C.ROOT_FOLDER || 'หมูถ่ายรูป'}/ref/${title}` };
    },
    /* Needs READ_REF_UPLOADS: copies images the cosplayer put in each Ref folder into that booking's refs. */
    async pullRefUploads() {
      for (const b of S.shoots) {
        const f = b.refFolder; if (!f?.id) continue;
        const list = await json(`/files?q=${q(`'${f.id}' in parents and mimeType contains 'image/' and trashed=false`)}&fields=files(id,name)&pageSize=100`);
        const have = new Set(b.slots.flatMap(sl => sl.refs.map(r => r.driveId)).filter(Boolean));
        for (const file of list.files || []) {
          if (have.has(file.id)) continue;
          const blob = await (await api(`/files/${file.id}?alt=media`)).blob();
          const url = await fileToRefDataURL(blob);
          const sl = b.slots.find(x => !x.done) || b.slots[0];
          sl.refs.push({ label: file.name.replace(/\.[^.]+$/, ''), url, driveId: file.id, done: false, shot: sl.shots[0].id });
        }
      }
    },
  };
})();
