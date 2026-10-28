/* Google Drive: sign-in with Google Identity Services (token flow) and sync to the photographer's own Drive.
   Layout:  หมูถ่ายรูป/data.json   and   หมูถ่ายรูป/ref/<ลูกค้า · วันที่>/  (one shared folder per booking) */
import type { Booking, RefFolder } from './types';
import { S } from './store';
import { fileToDataURL, hydrate, saveLocal, serialize } from './persist';

const CLIENT_ID: string = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
export const READ_REF_UPLOADS = String(import.meta.env.VITE_READ_REF_UPLOADS) === 'true';
const ROOT = 'หมูถ่ายรูป', DATA_FILE = 'data.json';
const API = 'https://www.googleapis.com/drive/v3', UP = 'https://www.googleapis.com/upload/drive/v3';
const FOLDER = 'application/vnd.google-apps.folder';
const SCOPES = ['https://www.googleapis.com/auth/drive.file', 'openid', 'email', 'profile']
  .concat(READ_REF_UPLOADS ? ['https://www.googleapis.com/auth/drive.readonly'] : []).join(' ');

declare global { interface Window { google?: any } }

let token: string | null = null, expires = 0, gisP: Promise<void> | null = null, busy = false;
let pushT: ReturnType<typeof setTimeout> | undefined;

export const configured = () => !!CLIENT_ID;
export const ready = () => !!token && Date.now() < expires - 60_000;
const info = () => (S.drive || (S.drive = {}));

function loadGis() {
  return gisP || (gisP = new Promise<void>((res, rej) => {
    if (window.google?.accounts?.oauth2) return res();
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
    s.onload = () => res();
    s.onerror = () => { gisP = null; rej(new Error('โหลดระบบเข้าสู่ระบบของ Google ไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองใหม่')); };
    document.head.append(s);
  }));
}
/** Call from a click: browsers only allow Google's popup in response to the user. */
async function getToken(interactive: boolean): Promise<string> {
  if (ready()) return token!;
  if (!configured()) throw new Error('ยังไม่ได้ตั้งค่า VITE_GOOGLE_CLIENT_ID (ดู README)');
  await loadGis();
  return new Promise((res, rej) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID, scope: SCOPES, hint: S.drive?.email || undefined,
      callback: (r: any) => {
        if (r.error) return rej(new Error(r.error === 'access_denied' ? 'ยกเลิกการเข้าสู่ระบบ' : 'เข้าสู่ระบบไม่สำเร็จ: ' + r.error));
        token = r.access_token; expires = Date.now() + (r.expires_in || 3600) * 1000; res(token!);
      },
      error_callback: (e: any) => rej(new Error(e?.type === 'popup_closed' ? 'ปิดหน้าต่างเข้าสู่ระบบไปก่อน' : 'เปิดหน้าต่างเข้าสู่ระบบไม่ได้ (เบราว์เซอร์อาจบล็อกป๊อปอัป)')),
    });
    client.requestAccessToken({ prompt: interactive && !S.drive?.email ? 'consent' : '' });
  });
}
async function api(path: string, opt: RequestInit = {}, base = API) {
  const t = await getToken(false);
  const r = await fetch(base + path, { ...opt, headers: { Authorization: 'Bearer ' + t, ...(opt.headers || {}) } });
  if (r.status === 401) { token = null; throw new Error('การเข้าสู่ระบบหมดอายุ กด "ซิงก์ตอนนี้" อีกครั้ง'); }
  if (!r.ok) throw new Error('Google Drive ตอบกลับ ' + r.status + (r.status === 403 ? ' (ไม่มีสิทธิ์)' : ''));
  return r;
}
const json = async (p: string, o?: RequestInit, b?: string) => (await api(p, o, b)).json();
const q = encodeURIComponent;
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

async function findOrCreateFolder(name: string, parent?: string): Promise<string> {
  const cond = `name='${esc(name)}' and mimeType='${FOLDER}' and trashed=false` + (parent ? ` and '${parent}' in parents` : '');
  const f = await json(`/files?q=${q(cond)}&fields=files(id,name)&spaces=drive`);
  if (f.files?.length) return f.files[0].id;
  const c = await json('/files?fields=id', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, mimeType: FOLDER, ...(parent ? { parents: [parent] } : {}) }) });
  return c.id;
}
async function rootId() { const i = info(); return i.rootId || (i.rootId = await findOrCreateFolder(ROOT)); }
async function dataFileId() {
  const i = info();
  if (i.fileId) return i.fileId;
  const r = await rootId();
  const f = await json(`/files?q=${q(`name='${DATA_FILE}' and '${r}' in parents and trashed=false`)}&fields=files(id)`);
  return (i.fileId = f.files?.[0]?.id || null);
}
async function pullRemote() {
  const id = await dataFileId();
  if (!id) return null;
  try { return await (await api(`/files/${id}?alt=media`)).json(); } catch { info().fileId = null; return null; }
}
async function pushLocal() {
  const body = JSON.stringify(serialize());
  const id = await dataFileId();
  if (id) { await api(`/files/${id}?uploadType=media`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body }, UP); return; }
  const fd = new FormData();
  fd.append('metadata', new Blob([JSON.stringify({ name: DATA_FILE, parents: [await rootId()], mimeType: 'application/json' })], { type: 'application/json' }));
  fd.append('file', new Blob([body], { type: 'application/json' }));
  const r = await json('/files?uploadType=multipart&fields=id', { method: 'POST', body: fd }, UP);
  info().fileId = r.id;
}

export async function signIn() {
  await getToken(true);
  const u = await (await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: 'Bearer ' + token } })).json();
  Object.assign(info(), { email: u.email, name: u.name || u.email, picture: u.picture || '' });
  return sync();
}
export function signOut() {
  try { if (token) window.google?.accounts?.oauth2?.revoke(token, () => {}); } catch { /* ignore */ }
  token = null; expires = 0; S.drive = null;
}
/** Last write wins on the whole file: the side saved more recently replaces the other. */
export async function sync(): Promise<'pushed' | 'pulled' | 'busy'> {
  if (busy) return 'busy';
  busy = true;
  try {
    await getToken(true);
    const remote = await pullRemote();
    let result: 'pushed' | 'pulled' = 'pushed';
    if (remote && (remote.updatedAt || 0) > (S.updatedAt || 0)) {
      const keep = { ...info() };
      hydrate(remote); S.drive = { ...(remote.drive || {}), ...keep }; result = 'pulled';
      await saveLocal(serialize());
    } else await pushLocal();
    if (READ_REF_UPLOADS) await pullRefUploads();
    info().lastSync = Date.now();
    return result;
  } finally { busy = false; }
}
/** Called after every local save while signed in. */
export function queuePush(done?: () => void) {
  if (!ready()) return;
  clearTimeout(pushT);
  pushT = setTimeout(() => {
    if (ready() && !busy) pushLocal().then(() => { info().lastSync = Date.now(); done?.(); }).catch(e => console.warn(e));
  }, 4000);
}
/** One shared folder per booking; anyone with the link can add files (role writer). */
export async function createRefFolder(title: string): Promise<RefFolder> {
  await getToken(true);
  const ref = await findOrCreateFolder('ref', await rootId());
  const id = await findOrCreateFolder(title, ref);
  await api(`/files/${id}/permissions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'anyone', role: 'writer' }) });
  const f = await json(`/files/${id}?fields=webViewLink`);
  return { id, url: f.webViewLink || `https://drive.google.com/drive/folders/${id}`, path: `${ROOT}/ref/${title}` };
}
/** Needs VITE_READ_REF_UPLOADS=true: copies images the cosplayer put in each Ref folder into that booking's refs. */
async function pullRefUploads() {
  for (const b of S.shoots as Booking[]) {
    const f = b.refFolder; if (!f?.id) continue;
    const list = await json(`/files?q=${q(`'${f.id}' in parents and mimeType contains 'image/' and trashed=false`)}&fields=files(id,name)&pageSize=100`);
    const have = new Set(b.slots.flatMap(sl => sl.refs.map(r => r.driveId)).filter(Boolean));
    for (const file of list.files || []) {
      if (have.has(file.id)) continue;
      const blob = await (await api(`/files/${file.id}?alt=media`)).blob();
      const url = await fileToDataURL(blob);
      const sl = b.slots.find(x => !x.done) || b.slots[0];
      sl.refs.push({ label: file.name.replace(/\.[^.]+$/, ''), url, driveId: file.id, done: false, shot: sl.shots[0].id });
    }
  }
}
