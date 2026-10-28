const pad=n=>String(n).padStart(2,'0');
const iso=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const parse=s=>{const[y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)};
const TODAY=new Date();TODAY.setHours(0,0,0,0);const TODAY_ISO=iso(TODAY);
const off=n=>{const d=new Date(TODAY);d.setDate(d.getDate()+n);return iso(d)};
const baht=n=>'฿'+Math.round(n).toLocaleString('th-TH');
const thDate=(d,o)=>d.toLocaleDateString(CFG.era==='ce'?'th-TH-u-ca-gregory':'th-TH',o);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

const CFG={packages:[{name:'เดี่ยว 1 ชม.',dur:60,price:1500},{name:'เดี่ยว 2 ชม.',dur:120,price:2500},{name:'โปรเจกต์ครึ่งวัน',dur:240,price:8000}],
    places:['สวนเบญจกิติ','สวนลุมพินี','สตูดิโอ Room 9 อารีย์','งาน Cos Fest · สามย่านมิตรทาวน์','คาเฟ่ Mellow · อารีย์'],
    warnMin:5,sound:true,groupPct:35,warnDays:7,badDays:14,theme:'light',weekStart:0,era:'be'};
const P=(label,h)=>({label,h});
let uid=100;
function newT(s){return {total:s.dur*60,remain:s.dur*60,running:false,last:0,beeped:false}}
function autoShots(people,dur){const g=Math.round(dur*CFG.groupPct/100/5)*5,each=Math.max(5,Math.floor((dur-g)/people.length));
  return [{label:'ถ่ายรวม',who:'all',min:g},...people.map((p,i)=>({label:'เดี่ยว '+p.name,who:[i],min:each}))]}
function mkSlot(sd,people,type,doneAll){
  const raw=type==='project'?(sd.shots||autoShots(people,sd.dur)):[{label:'ช็อตเดี่ยว',who:[0],min:sd.dur,refs:sd.refs||[]}];
  const ids=raw.map(()=>'sh'+(uid++));
  const shots=raw.map((x,i)=>({id:ids[i],label:x.label,who:x.who==='all'?people.map((_,j)=>j):x.who,min:x.min||0}));
  const refs=raw.flatMap((x,i)=>(x.refs||[]).map(r=>({...r,done:false,shot:ids[i]})));
  return {id:uid++,date:sd.date,time:sd.time,dur:sd.dur,place:sd.place||'—',char:sd.char||null,shots,refs,t:newT(sd),ri:0,sel:'all',seg:0,done:!!(sd.done||doneAll)};
}
function norm(o){
  const type=o.type||'solo';
  const sds=o.slots||[{date:o.date,time:o.time,dur:o.dur,place:o.place,char:o.char,refs:o.refs,shots:o.shots},...(o.more||[])];
  const people=type==='project'?o.people:[{name:o.name,char:sds[0].char||o.char||'—'}];
  const stage=o.stage||'wait',past=['shot','editing','delivered'].includes(stage);
  return {type,name:o.name,series:o.series,price:o.price,paid:o.paid||0,people,leader:0,id:uid++,stage,slots:sds.map(sd=>mkSlot(sd,people,type,past))};
}
/* a "view" = one booking seen through one of its time slots; slot fields read/write the slot, everything else the booking */
const SLOTK=new Set(['date','time','dur','place','shots','refs','t','ri','sel','seg','done']);
function view(b,sl){
  if(sl._v&&sl._b===b)return sl._v;
  sl._b=b;sl._v=new Proxy({},{get(_,k){if(k==='id')return sl.id;if(k==='booking')return b;if(k==='slot')return sl;if(k==='slotNo')return b.slots.indexOf(sl)+1;if(k==='slotCount')return b.slots.length;if(k==='slotChar')return sl.char;return SLOTK.has(k)?sl[k]:b[k]},
    set(_,k,v){if(SLOTK.has(k))sl[k]=v;else b[k]=v;return true}});
  return sl._v;
}
const occ=()=>S.shoots.flatMap(b=>b.slots.map(sl=>view(b,sl)));
const keyView=b=>{const pre=b.stage==='wait'||b.stage==='shooting';const sl=pre?(b.slots.find(x=>!x.done)||b.slots[b.slots.length-1]):b.slots[b.slots.length-1];return view(b,sl)};
const slotTag=s=>s.slotCount>1?`<span class="tag slot">ช่วง ${s.slotNo}/${s.slotCount}</span>`:'';
const S={shoots:[],updatedAt:0,driveInfo:null,
  tab:'today',month:new Date(TODAY.getFullYear(),TODAY.getMonth(),1),selDay:TODAY_ISO,finFilter:'all',jobFilter:'all',todayFilter:'all',tq:'',q:'',drive:false,
  open:null,cfg:CFG};
try{const t=localStorage.getItem('cos_tab');if(['today','jobs','cal','money','settings'].includes(t))S.tab=t}catch(e){}

const isProj=s=>s.type==='project';
const leaderName=s=>s.people[s.leader]?.name||'';
const short=s=>isProj(s)?`โปรเจกต์ ${s.people.length} คน`:(s.slotChar||s.people[0].char);
const sub=s=>isProj(s)?`${s.people.length} คน · หัวโปร ${leaderName(s)}`:`${s.slotChar||s.people[0].char} · ${s.series}`;
const projTag=s=>isProj(s)?`<span class="tag">โปรเจกต์</span>`:'';
const members=s=>isProj(s)?`<div class="members">${s.people.map((p,i)=>`<span class="mem"><b>${esc(p.name)}</b> ${esc(p.char)}${i===s.leader?'<em>หัวโปร</em>':''}</span>`).join('')}</div>`:'';
const visRefs=s=>s.sel==='all'?s.refs:s.refs.filter(r=>r.shot===s.sel);
const shotOf=(s,id)=>s.shots.find(x=>x.id===id);
function planInfo(s){const el=(s.t.total-s.t.remain)/60;let cum=0;for(let i=0;i<s.shots.length;i++){cum+=s.shots[i].min;if(el<cum)return{i,left:(cum-el)*60}}return{i:s.shots.length-1,left:(cum-el)*60}}
const isCx=s=>s.stage==='cancelled';
const status=s=>isCx(s)?'cancel':s.paid>=s.price?'paid':s.paid>0?'dep':'due';
const statusTxt={paid:'จ่ายครบ',dep:'มัดจำแล้ว',due:'ยังไม่จ่าย',cancel:'ยกเลิก'};
const chip=s=>isCx(s)?(s.paid?`<span class="chip example">เก็บมัดจำไว้ ${baht(s.paid)}</span>`:''):`<span class="chip ${status(s)}">${statusTxt[status(s)]}</span>`;
const STAGES=[
  {k:'wait',t:'รอคิว',c:'var(--muted)',bg:'var(--sunk)'},
  {k:'shooting',t:'กำลังถ่าย',c:'var(--accent)',bg:'var(--accent-soft)'},
  {k:'shot',t:'ถ่ายแล้ว',c:'var(--info)',bg:'var(--info-soft)'},
  {k:'editing',t:'รอแต่งรูป',c:'var(--warn)',bg:'var(--warn-soft)'},
  {k:'delivered',t:'ส่งงานแล้ว',c:'var(--ok)',bg:'var(--ok-soft)'}];
const CANCEL={k:'cancelled',t:'ยกเลิก',c:'var(--bad)',bg:'var(--bad-soft)'},ALLST=[...STAGES,CANCEL];
const stg=s=>ALLST.find(x=>x.k===s.stage)||STAGES[0];
const stIdx=s=>STAGES.indexOf(stg(s));
const stageChip=s=>{const x=stg(s);return `<button class="chip stg" style="background:${x.bg};color:${x.c}" data-act="detail" data-id="${s.id}">● ${x.t}</button>`};
const steps=s=>{const x=stg(s),i=stIdx(s);return `<div class="steps" style="--stc:${x.c}">${STAGES.map((y,j)=>`<button class="${j<=i?'fill':''}" data-act="setstage" data-id="${s.id}" data-k="${y.k}" aria-label="เปลี่ยนเป็น ${y.t}" title="${y.t}"></button>`).join('')}</div>`};
const stageSelect=s=>`<label class="stsel" style="--stc:${stg(s).c};--stbg:${stg(s).bg}"><span class="sr">สถานะงานของ ${esc(s.name)}</span><select data-stage-id="${s.id}">${ALLST.map(x=>`<option value="${x.k}" ${x.k===s.stage?'selected':''}>${x.t}</option>`).join('')}</select></label>`;
const sessRow=s=>{const done=s.refs.filter(r=>r.done).length;return `<button class="sess" data-act="open" data-id="${s.id}">
  ${s.refs.length?`<span class="sthumbs">${s.refs.slice(0,2).map(r=>`<i>${refThumb(r)}</i>`).join('')}${s.refs.length>2?`<b>+${s.refs.length-2}</b>`:''}</span>`:'<span class="sthumbs empty-ref">+</span>'}
  <span class="sinfo"><span>${isProj(s)?`${s.shots.length} ช็อต · `:''}${s.refs.length?`ref ${done}/${s.refs.length}`:'ยังไม่มี ref'}</span><span class="num stime" data-timer="${s.id}">${tLabel(s)}</span></span>
  <span class="gobtn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="7" width="18" height="13" rx="3"/><path d="M8 7l1.5-3h5L16 7"/><circle cx="12" cy="13.5" r="3.5"/></svg>${s.t.running?'กำลังถ่าย':s.t.remain!==s.t.total?'ถ่ายต่อ':'เริ่มถ่าย'}</span></button>`};
function shootCard(s,mode){
  if(mode==='compact')return `<div class="card compact ${isCx(s)?'cx':''}"><button class="cmain" data-act="detail" data-id="${s.id}">
    <div class="top"><span class="num" style="font-weight:700">${s.time}</span><span class="who" style="font-size:15px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(s.name)}</span>${slotTag(s)}<span class="muted" style="font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(short(s))}</span>
    ${s.date!==S.selDay?`<span class="spacer"></span><span class="muted num" style="font-size:12px">${thDate(parse(s.date),{day:'numeric',month:'short'})}</span>`:''}</div>
    <div class="meta">${esc(s.place)}</div>
    <div class="chips"><span class="chip" style="background:${stg(s).bg};color:${stg(s).c}">● ${stg(s).t}</span>${chip(s)}${s.t.running||s.t.remain!==s.t.total?`<span class="chip example num" data-timer="${s.id}">${tLabel(s)}</span>`:''}</div></button>
    <button class="more" data-act="more" aria-haspopup="menu" data-id="${s.id}" aria-label="ตัวเลือกของคิว ${esc(s.name)}">⋯</button></div>`;
  const i=stIdx(s);
  return `<div class="card ${s.stage==='shooting'?'now':''} ${isCx(s)?'cx':''}">
    <div class="row" style="align-items:flex-start"><div style="min-width:0;flex:1"><div class="who">${esc(s.name)} ${projTag(s)}${slotTag(s)}</div><div class="muted" style="font-size:14px">${esc(sub(s))}</div></div>
    <button class="more" data-act="more" aria-haspopup="menu" data-id="${s.id}" aria-label="ตัวเลือกของคิว ${esc(s.name)}">⋯</button></div>${members(s)}
    <div class="meta"><span>📍 ${esc(s.place)}</span><span>${durTxt(s.dur)}</span></div>
    <div class="stagebar">${stageSelect(s)}</div>
    <div class="acts">${chip(s)}<span class="spacer"></span>
      <button class="btn" data-act="pay" data-id="${s.id}">${baht(s.paid)} / ${baht(s.price)}</button>
</div>
    ${mode==='plan'?refPlan(s):sessRow(s)}
  </div>`}
const byId=id=>occ().find(s=>s.id===+id);
const sortT=(a,b)=>(a.date+a.time).localeCompare(b.date+b.time);
const endTime=s=>{const[h,m]=s.time.split(':').map(Number);const t=h*60+m+s.dur;return pad(Math.floor(t/60)%24)+':'+pad(t%60)};
const durTxt=m=>m>=60?(m/60%1?(m/60).toFixed(1):m/60)+' ชม.':m+' นาที';
const refBg=r=>r.url?'':`background:linear-gradient(160deg,hsl(${r.h} 60% 62%),hsl(${(r.h+40)%360} 55% 34%))`;
const refSrc=r=>r.url||genRef(r);
const domainOf=u=>{try{return new URL(u).hostname.replace(/^www\./,'')}catch(e){return 'ลิงก์'}};
const refThumb=r=>r.link?`<span class="lk">🔗</span><img data-link src="${esc(r.link)}" alt="">`:`<img src="${refSrc(r)}" alt="">`;
const refEl=r=>r.link?`<div class="linkph"><span>🔗</span><b>${esc(domainOf(r.link))}</b><a href="${esc(r.link)}" target="_blank" rel="noopener">เปิดลิงก์รูป ↗</a></div><img data-link src="${esc(r.link)}" alt="${esc(r.label)}">`
  :`<img src="${refSrc(r)}" alt="${esc(r.label)}"><span class="cap">${esc(r.label)}</span>`;
function carousel(s){
  const n=s.refs.length,multi=s.shots.length>1;
  const slide=(r,i,clone)=>`<div class="cs" ${clone?'aria-hidden="true"':''} data-i="${i}">
    ${r.link?`<div class="linkph"><span>🔗</span><b>${esc(domainOf(r.link))}</b><a href="${esc(r.link)}" target="_blank" rel="noopener" ${clone?'tabindex="-1"':''}>เปิดลิงก์รูป ↗</a></div><img data-link src="${esc(r.link)}" alt="">`:`<img src="${refSrc(r)}" alt="${esc(r.label)}">`}
    <span class="cs-cap"><b>${esc(r.link?domainOf(r.link):r.label)}</b>${multi?`<small>${esc(shotOf(s,r.shot)?.label||'')}</small>`:''}</span>
    <span class="cs-num num">${i+1}/${n}</span>
    <button class="cs-x" data-act="rmref" data-id="${s.id}" data-i="${i}" aria-label="ลบรูป ref นี้" ${clone?'tabindex="-1"':''}>✕</button>
  </div>`;
  const items=s.refs.map((r,i)=>slide(r,i));
  const track=n>1?[slide(s.refs[n-1],n-1,1),...items,slide(s.refs[0],0,1)]:items;
  return `<div class="carousel" data-sid="${s.id}" data-n="${n}">
    <div class="ctrack">${track.join('')}</div>
    ${n>1?`<button class="cnav l" data-act="cnav" data-d="-1" aria-label="รูปก่อนหน้า">‹</button><button class="cnav r" data-act="cnav" data-d="1" aria-label="รูปถัดไป">›</button>`:''}
  </div>`}
/* looping carousel: real slides sit between a clone of the last (left) and of the first (right); landing on a clone jumps to its twin */
function initCarousels(){document.querySelectorAll('.carousel').forEach(c=>{
  const n=+c.dataset.n,t=c.querySelector('.ctrack'),sl=byId(c.dataset.sid)?.slot;if(!t||n<2)return;
  const w=()=>t.clientWidth,go=(i,sm)=>t.scrollTo({left:i*w(),behavior:sm?'smooth':'instant'});
  let cur=Math.min(n,Math.max(1,(sl?._ci??0)+1));go(cur,false);
  let to;t.addEventListener('scroll',()=>{clearTimeout(to);to=setTimeout(()=>{const i=Math.round(t.scrollLeft/w());
    if(i===0)go(n,false);else if(i===n+1)go(1,false);cur=i===0?n:i===n+1?1:i;if(sl)sl._ci=cur-1},90)},{passive:true});
  c._step=d=>{const i=Math.round(t.scrollLeft/w());go(i+d,true)};
})}
function refPlan(s){
  const multi=s.shots.length>1;
  return `<div class="refplan">
    <div class="rp-head"><b>รูป ref</b><span class="muted">${s.refs.length?s.refs.length+' รูป':'ยังไม่มี'}</span></div>
    ${s.refs.length?carousel(s):''}
    <form class="rp-add" data-id="${s.id}" novalidate>
      ${multi?`<select class="rpShot" aria-label="ช็อต">${s.shots.map(x=>`<option value="${x.id}">${esc(x.label)}</option>`).join('')}</select>`:''}
      <div class="rp-in"><input class="rpUrl" type="url" inputmode="url" placeholder="วางลิงก์รูป ref" aria-label="ลิงก์รูป ref"><button class="btn primary" type="submit">เพิ่ม</button></div>
    </form>
    ${folderBox(s)}
  </div>`}
const FOLDER_IC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>';
function folderBox(s){
  const f=s.booking.refFolder;
  if(!f)return `<button class="btn mkfolder" data-act="mkfolder" data-id="${s.id}">${FOLDER_IC}<span><b>สร้างโฟลเดอร์ Ref ให้ลูกค้า</b><small>ได้ลิงก์ให้คอสเพลเยอร์อัปโหลดรูป ref เข้า Drive ของคุณเอง</small></span></button>`;
  return `<div class="folderbox">
    <div class="fb-top">${FOLDER_IC}<span><b>โฟลเดอร์ Ref พร้อมแล้ว</b><small>${esc(f.path)}</small></span></div>
    <div class="fb-link num">${esc(f.url)}</div>
    <button class="btn primary block" data-act="cpmsg" data-id="${s.id}">คัดลอกข้อความส่งลูกค้า</button>
    <div class="fb-row"><button class="btn" data-act="cpfolder" data-id="${s.id}">คัดลอกลิงก์</button><a class="btn" href="${esc(f.url)}" target="_blank" rel="noopener">เปิดโฟลเดอร์ ↗</a></div>
    <small class="muted">ทุกคนที่มีลิงก์อัปโหลดรูปเข้าโฟลเดอร์นี้ได้${(window.APP_CONFIG||{}).READ_REF_UPLOADS?' · กดซิงก์แล้วรูปในโฟลเดอร์จะขึ้นเป็น ref ของคิวนี้':' · เปิดโฟลเดอร์เพื่อดูรูปที่ลูกค้าส่งมา'}</small>
  </div>`}
const folderMsg=s=>{const b=s.booking,sl=b.slots.map(x=>`${thDate(parse(x.date),{weekday:'short',day:'numeric',month:'short'})} ${x.time} · ${x.place}`).join('\n');
  return `สวัสดี ${b.type==='project'?leaderName(s)+' และทีม '+b.name:b.name} 📸\nคิวถ่าย:\n${sl}\n\nฝากอัปโหลดรูป ref ท่าที่อยากได้ไว้ในโฟลเดอร์นี้ได้เลย${b.type==='project'?' (แยกรูปถ่ายรวม/รูปเดี่ยวได้ตามสะดวก)':''}\n👉 ${b.refFolder.url}\n\nขอบคุณมาก 🙏`};
async function makeFolder(s){
  const b=s.booking,title=`${b.name} · ${thDate(parse(b.slots[0].date),{day:'numeric',month:'short',year:'2-digit'})}`;
  toast('กำลังสร้างโฟลเดอร์ใน Google Drive…');
  try{b.refFolder=await Drive.createRefFolder(b,title);render();toast('สร้างโฟลเดอร์ Ref แล้ว คัดลอกข้อความส่งลูกค้าได้เลย')}
  catch(e){toast(e.message)}}
function copyText(t,ok){const fb=()=>{sheet(`<h2 style="font-size:20px;margin-bottom:8px">คัดลอกข้อความ</h2><p class="muted" style="margin:0 0 10px;font-size:13px">คัดลอกอัตโนมัติไม่ได้ เลือกข้อความไว้ให้แล้ว กดคัดลอกเองได้เลย</p><textarea id="cpBox" style="width:100%;height:200px;border:1px solid var(--line);border-radius:10px;padding:10px;background:var(--bg);color:var(--ink);font:inherit">${esc(t)}</textarea>`);const a=document.getElementById('cpBox');a.focus();a.select()};
  try{navigator.clipboard.writeText(t).then(()=>toast(ok)).catch(fb)}catch(e){fb()}}


/* ---------- views ---------- */
function todayList(){
  const all=occ().filter(s=>s.date===TODAY_ISO).sort(sortT),q=S.tq.trim().toLowerCase();
  const list=all.filter(s=>(S.todayFilter==='all'||s.stage===S.todayFilter)&&matchQ(s,q));
  if(!list.length)return !all.length?`<div class="empty">${S.shoots.length?'วันนี้ไม่มีคิวถ่าย':'ยังไม่มีคิวเลย เริ่มจากเพิ่มคิวลูกค้าคนแรก'}<br><button class="btn primary" style="margin-top:12px" data-act="add">เพิ่มคิวลูกค้า</button>${S.shoots.length?'':'<br><button class="btn ghost" style="margin-top:8px" data-act="s-sample">ลองดูด้วยข้อมูลตัวอย่าง</button>'}</div>`
    :q?`<div class="empty">ไม่พบคิววันนี้ที่ตรงกับ "${esc(S.tq.trim())}"</div>`
    :`<div class="empty">วันนี้ไม่มีคิวในสถานะนี้<br><button class="btn" style="margin-top:12px" data-act="tf" data-k="all">ดูคิวทั้งหมดของวันนี้</button></div>`;
  return timelineHTML(list);
}
function timelineHTML(list,mode='full'){
  return `<div class="timeline">${list.map((s,i)=>{
    const prev=list[i-1];let n=0;for(let j=i;j<list.length&&list[j].place===s.place;j++)n++;
    const head=(!prev||prev.place!==s.place)&&n>1?`<div class="evhead"><span>📍 ${esc(s.place)}</span><span class="muted">${n} คิวต่อเนื่อง</span></div>`:'';
    return head+`<div class="slot"><div class="t">${s.time}<small>${endTime(s)}</small></div>${shootCard(s,mode)}</div>`}).join('')}</div>`;
}
function vToday(){
  const all=occ().filter(s=>s.date===TODAY_ISO).sort(sortT);
  const live=all.filter(s=>!isCx(s)),mins=live.reduce((a,s)=>a+s.dur,0), due=live.reduce((a,s)=>a+Math.max(0,s.price-s.paid),0);
  const n=k=>all.filter(s=>s.stage===k).length;
  return `<div class="eyebrow">${thDate(TODAY,{weekday:'long'})}</div>
  <h1>${thDate(TODAY,{day:'numeric',month:'long',year:'numeric'})}</h1>
  <div class="strip"><div><b>${live.length}</b><span>คิววันนี้${all.length>live.length?` <span style="color:var(--bad)">(ยกเลิก ${all.length-live.length})</span>`:''}</span></div><div><b>${durTxt(mins)}</b><span>เวลาถ่ายรวม</span></div><div><b>${baht(due)}</b><span>ต้องเก็บเพิ่ม</span></div></div>
  ${all.length?`<div class="stfilter" role="tablist">
    <button class="${S.todayFilter==='all'?'on':''}" data-act="tf" data-k="all">ทั้งหมด <span class="num">${all.length}</span></button>
    ${ALLST.filter(x=>(x.k!=='delivered'&&x.k!=='cancelled')||n(x.k)).map(x=>`<button class="${S.todayFilter===x.k?'on':''}" style="--stc:${x.c}" data-act="tf" data-k="${x.k}"><i></i>${x.t} <span class="num">${n(x.k)}</span></button>`).join('')}
  </div>
  <label class="search"><input id="todayQ" type="search" placeholder="ค้นหาชื่อ ตัวละคร เรื่อง หรือสถานที่" value="${esc(S.tq)}" autocomplete="off"></label>`:''}
  <div id="todayList">${todayList()}</div>`;
}


function vCal(){
  const m=S.month,y=m.getFullYear(),mo=m.getMonth();
  const inMonth=occ().filter(s=>{const d=parse(s.date);return !isCx(s)&&d.getFullYear()===y&&d.getMonth()===mo});
  const days=new Set(inMonth.map(s=>s.date));
  const first=new Date(y,mo,1),start=new Date(first);start.setDate(1-((first.getDay()-S.cfg.weekStart+7)%7));
  let cells='';
  for(let i=0;i<42;i++){const d=new Date(start);d.setDate(start.getDate()+i);const k=iso(d);
    if(i>=35&&d.getMonth()!==mo)break;
    const ds=occ().filter(s=>s.date===k).sort(sortT),n=ds.length;
    cells+=`<button class="day ${d.getMonth()!==mo?'out':''} ${k===TODAY_ISO?'today':''} ${k===S.selDay?'sel':''}" data-act="day" data-d="${k}" aria-label="${thDate(d,{day:'numeric',month:'long'})} ${n} คิว">
      ${d.getDate()}<span class="dots">${ds.slice(0,3).map(s=>`<i style="background:${k===S.selDay?'var(--accent-ink)':stg(s).c}"></i>`).join('')}</span>${n>3?`<span class="cnt">+${n-3}</span>`:''}</button>`}
  const sel=occ().filter(s=>s.date===S.selDay).sort(sortT);
  return `<div class="cal-head"><h1>${thDate(m,{month:'long',year:'numeric'})}</h1>
    <button class="navbtn" data-act="mon" data-d="-1" aria-label="เดือนก่อน">‹</button><button class="navbtn" data-act="mon" data-d="1" aria-label="เดือนถัดไป">›</button></div>
  <div class="strip"><div><b>${inMonth.length}</b><span>ช่วงถ่ายเดือนนี้</span></div><div><b>${days.size}</b><span>วันที่มีงาน</span></div><div><b>${baht([...new Set(inMonth.map(s=>s.booking))].reduce((a,b)=>a+b.price,0))}</b><span>มูลค่างาน</span></div></div>
  <div class="row" style="flex-wrap:wrap;gap:4px 12px;font-size:12px;margin:-8px 0 12px">${ALLST.map(x=>`<span class="row" style="gap:5px;color:var(--muted)"><i style="width:8px;height:8px;border-radius:50%;background:${x.c};display:block"></i>${x.t}</span>`).join('')}</div>
  <div class="grid7">${[...['อา','จ','อ','พ','พฤ','ศ','ส'].slice(S.cfg.weekStart),...['อา','จ','อ','พ','พฤ','ศ','ส'].slice(0,S.cfg.weekStart)].map(d=>`<div class="dow">${d}</div>`).join('')}${cells}</div>
  <div style="margin-top:20px" class="stack"><h2>${thDate(parse(S.selDay),{weekday:'long',day:'numeric',month:'long'})}</h2>
  ${sel.length?timelineHTML(sel,'plan')
   :`<div class="empty" style="padding:18px">ว่าง ไม่มีคิว</div>`}</div>`;
}

function vMoney(){
  const m=S.month,y=m.getFullYear(),mo=m.getMonth();
  let list=S.shoots.map(b=>view(b,b.slots[0])).filter(s=>{const d=parse(s.date);return d.getFullYear()===y&&d.getMonth()===mo}).sort(sortT);
  const got=list.reduce((a,s)=>a+Math.min(s.paid,s.price),0),owed=list.filter(s=>!isCx(s)).reduce((a,s)=>a+Math.max(0,s.price-s.paid),0),tot=got+owed,ncx=list.filter(isCx).length;
  const cnt=k=>list.filter(s=>status(s)===k).length;
  const shown=S.finFilter==='all'?list:list.filter(s=>status(s)===S.finFilter);
  return `<div class="cal-head"><h1>รายรับ ${thDate(m,{month:'short',year:'2-digit'})}</h1>
    <button class="navbtn" data-act="mon" data-d="-1" aria-label="เดือนก่อน">‹</button><button class="navbtn" data-act="mon" data-d="1" aria-label="เดือนถัดไป">›</button></div>
  <div class="card" style="margin:12px 0 16px">
    <div class="eyebrow">ได้รับแล้ว</div>
    <div class="num" style="font-size:34px;font-weight:700;line-height:1.2">${baht(got)}</div>
    <div class="bar"><i style="width:${tot?got/tot*100:0}%;background:var(--ok)"></i></div>
    <div class="row" style="font-size:13px"><span class="muted">ยอดงานทั้งหมด <span class="num">${baht(tot)}</span></span><span class="spacer"></span><span style="color:var(--bad)">ค้างรับ <span class="num">${baht(owed)}</span></span></div>
    ${ncx?`<div class="muted" style="font-size:12px;margin-top:6px">ไม่นับคิวที่ยกเลิก ${ncx} คิว ยกเว้นเงินที่เก็บไว้แล้ว</div>`:''}
  </div>
  <div class="seg" role="tablist">${[['all','ทั้งหมด '+list.length],['due','ยังไม่จ่าย '+cnt('due')],['dep','มัดจำ '+cnt('dep')],['paid','ครบ '+cnt('paid')]].map(([k,t])=>`<button class="${S.finFilter===k?'on':''}" data-act="ff" data-k="${k}">${t}</button>`).join('')}</div>
  ${shown.length?`<div class="ledger">${shown.map(s=>`<button class="lrow" data-act="pay" data-id="${s.id}">
    <span class="nm">${esc(s.name)} <span class="muted" style="font-weight:400">· ${esc(short(s))}</span></span><span class="amt" style="color:${isCx(s)?'var(--muted)':s.paid>=s.price?'var(--ok)':s.paid>0?'var(--warn)':'var(--bad)'}">${baht(s.paid)}<span class="of"> / ${baht(s.price)}</span></span>
    <span class="sub">${thDate(parse(s.date),{day:'numeric',month:'short'})} · ${s.time}${s.slotCount>1?` · ${s.slotCount} ช่วง`:''}${isProj(s)?` · เก็บจาก ${esc(leaderName(s))}`:''}</span><span class="sub num" style="text-align:right;${!isCx(s)&&s.paid<s.price?'color:var(--bad)':''}">${isCx(s)?'ยกเลิกคิว':s.paid>=s.price?'ครบแล้ว':`ค้าง ${baht(s.price-s.paid)}`}</span>
  </button>`).join('')}</div>`:`<div class="empty">ไม่มีรายการในหมวดนี้</div>`}`;
}

/* ---------- shoot session (one per queue) ---------- */
function vSession(s){
  const vis=visRefs(s);if(s.ri>=vis.length)s.ri=0;
  const r=vis[s.ri];
  const done=vis.filter(x=>x.done).length;
  const next=occ().filter(x=>x.date===s.date&&x.time>s.time&&!isCx(x)).sort(sortT)[0];
  const multi=s.shots.length>1;
  const cnt=id=>{const a=s.refs.filter(x=>x.shot===id);return `${a.filter(x=>x.done).length}/${a.length}`};
  return `<div class="session" role="dialog" aria-label="หน้าถ่าย ${esc(s.name)}">
  <div class="sess-head">
    <button class="navbtn" data-act="close-session" aria-label="กลับไปที่รายการคิว">‹</button>
    <div class="t"><span class="eyebrow">หน้าถ่าย</span></div>
  </div>
  <div class="sess-body">
  <section class="shootinfo">
    <div class="si-tags">${s.slotCount>1?`<span class="tag slot">ช่วง ${s.slotNo}/${s.slotCount}</span>`:''}${projTag(s)}<span class="tag time num">${s.time}–${endTime(s)} · ${durTxt(s.dur)}</span></div>
    <h1 class="si-name">${esc(s.name)}</h1>
    ${isProj(s)?`<div class="si-mem">${s.people.map((p,i)=>`<span><b>${esc(p.name)}</b>${esc(p.char)}${i===s.leader?'<em>หัวโปร</em>':''}</span>`).join('')}</div>`
      :`<div class="si-char">${esc(s.slotChar||s.people[0].char)}${s.series&&s.series!=='—'?`<span> · ${esc(s.series)}</span>`:''}</div>`}
    <div class="si-place">📍 ${esc(s.place)}</div>
  </section>
  <div class="shoot-split">
  <div class="stack">
    <div class="timer-card" id="timerCard">
      <div class="ring"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="54" fill="none" stroke="var(--sunk)" stroke-width="8"/><circle id="arc" cx="60" cy="60" r="54" fill="none" stroke="var(--accent)" stroke-width="8" stroke-linecap="round" stroke-dasharray="339.3" stroke-dashoffset="0"/></svg>
        <div class="read"><div class="clock" id="clock">00:00</div><div class="lbl" id="clockLbl"></div></div></div>
      <div class="ctrls">
        <button class="btn" data-act="tadd" data-m="-5">−5</button>
        <button class="go" data-act="toggle" id="goBtn">เริ่ม</button>
        <button class="btn" data-act="tadd" data-m="5">+5</button>
      </div>
      <div class="row"><button class="btn ghost" data-act="treset">รีเซ็ตเวลา</button><button class="btn" data-act="finish" data-id="${s.id}">จบคิวนี้</button></div>
    </div>
    ${multi?`<div class="card plan" style="margin:0"><div class="row" style="margin-bottom:8px"><h2>แผนเวลา</h2><span class="spacer"></span><span class="muted" style="font-size:12px" id="planNow"></span></div>
      <ol>${s.shots.map((x,i)=>`<li><button data-act="shotsel" data-k="${x.id}" data-pi="${i}"><span class="pm num">${x.min}′</span><span class="pl">${esc(x.label)}</span><span class="pc num">${cnt(x.id)}</span></button></li>`).join('')}</ol></div>`:''}
    ${next?`<button class="sess" style="margin:0" data-act="open" data-id="${next.id}"><span class="sinfo"><span>คิวถัดไป · ${next.time}</span><span style="font-size:15px;color:var(--ink);font-weight:600">${esc(next.name)} · ${esc(short(next))}</span></span><span class="sgo">›</span></button>`:''}
  </div>
  <div class="viewer">
    ${multi?`<div class="shottabs"><button class="${s.sel==='all'?'on':''}" data-act="shotsel" data-k="all">ทั้งหมด <span class="num">${s.refs.filter(x=>x.done).length}/${s.refs.length}</span></button>${s.shots.map(x=>`<button class="${s.sel===x.id?'on':''}" data-act="shotsel" data-k="${x.id}">${esc(x.label)} <span class="num">${cnt(x.id)}</span></button>`).join('')}</div>`:''}
    <div class="row" style="margin-bottom:10px"><h2>${s.sel==='all'||!multi?'รูป Reference':esc(shotOf(s,s.sel).label)}</h2><span class="spacer"></span><span class="muted num" style="font-size:13px">ถ่ายแล้ว ${done}/${vis.length}</span></div>
    ${multi&&s.sel!=='all'?`<div class="muted" style="font-size:13px;margin:-6px 0 10px">ในช็อต: ${shotOf(s,s.sel).who.map(i=>esc(s.people[i].name)).join(', ')}</div>`:''}
    ${r?`<div class="stage">${refEl(r)}
      <span class="idx">${multi&&s.sel==='all'?esc(shotOf(s,r.shot).label)+' · ':''}${s.ri+1}/${vis.length}</span>
      <button class="done ${r.done?'on':''}" data-act="rdone">${r.done?'✓ ถ่ายแล้ว':'ทำเครื่องหมายว่าถ่ายแล้ว'}</button>
      ${vis.length>1?`<button class="nav l" data-act="rnav" data-d="-1" aria-label="รูปก่อน">‹</button><button class="nav r" data-act="rnav" data-d="1" aria-label="รูปถัดไป">›</button>`:''}
    </div>`:`<div class="stage"><div class="ph" style="color:var(--muted);text-shadow:none;align-items:center;justify-content:center;font-size:15px;text-align:center">${multi&&s.sel!=='all'?'ช็อตนี้':'คิวนี้'}ยังไม่มีรูป ref<br>กด + ด้านล่างเพื่อเพิ่มจากเครื่อง</div></div>`}
    <div class="thumbs">${vis.map((x,i)=>`<button class="thumb ${i===s.ri?'on':''}" data-act="rpick" data-i="${i}" aria-label="${esc(x.label)}">${refEl(x)}${x.done?'<span class="ck">✓</span>':''}</button>`).join('')}
      <button type="button" class="addref" data-act="addref" data-id="${s.id}" aria-label="เพิ่มรูป reference">+</button></div>
    ${multi&&s.sel==='all'?`<div class="muted" style="font-size:12px;margin-top:8px">รูปที่เพิ่มตอนเลือก "ทั้งหมด" จะเข้าช็อต ${esc(s.shots[0].label)}</div>`:''}
    <form class="rp-add sess-link" data-id="${s.id}" novalidate>
      ${multi&&s.sel==='all'?`<select class="rpShot" aria-label="ช็อต">${s.shots.map(x=>`<option value="${x.id}">${esc(x.label)}</option>`).join('')}</select>`:''}
      <div class="rp-in"><input class="rpUrl" type="url" inputmode="url" placeholder="วางลิงก์รูป ref${multi&&s.sel!=='all'?' · '+esc(shotOf(s,s.sel).label):''}" aria-label="ลิงก์รูป ref"><button class="btn primary" type="submit">เพิ่ม</button></div>
    </form>
  </div></div></div></div>`;
}

/* ---------- render ---------- */
const backlogList=()=>S.shoots.filter(s=>s.stage==='shot'||s.stage==='editing').map(keyView).sort(sortT);
const ageDays=s=>Math.round((TODAY-parse(s.date))/864e5);
function blCard(s){
  const a=ageDays(s),k=s.stage,post=k==='shot'||k==='editing';
  const ac=post?(a>S.cfg.badDays?'var(--bad)':a>S.cfg.warnDays?'var(--warn)':'var(--muted)'):'var(--muted)';
  const ageTxt=a<0?[`${-a}`,'วันข้างหน้า']:a===0?['วันนี้','']:[`${a}`,post?'วันแล้ว':'วันก่อน'];
  const act=k==='cancelled'?`<button class="btn" data-act="restore" data-id="${s.id}">กู้คืนเป็นรอคิว</button>`:k==='wait'||k==='shooting'?`<button class="btn primary" data-act="open" data-id="${s.id}">${k==='shooting'&&s.t.remain!==s.t.total?'กลับไปหน้าถ่าย':s.slotCount>1?`เปิดหน้าถ่าย ช่วง ${s.slotNo}`:'เปิดหน้าถ่าย'}</button>`
    :k==='shot'?`<button class="btn primary" data-act="advance" data-id="${s.id}">เริ่มแต่งรูป</button>`
    :k==='editing'?`<button class="btn primary" data-act="advance" data-id="${s.id}">ส่งงานแล้ว ✓</button>`:'';
  return `<div class="card ${isCx(s)?'cx':''}" style="margin:0">
    <div class="row" style="align-items:flex-start"><div style="min-width:0;flex:1"><div class="who">${esc(s.name)} ${projTag(s)}${s.slotCount>1?`<span class="tag slot">${s.slotCount} ช่วง</span>`:''}</div><div class="muted" style="font-size:14px">${esc(sub(s))}</div></div>
      <div class="age" style="color:${ac}"><b class="num">${ageTxt[0]}</b><span>${ageTxt[1]}</span></div><button class="more" data-act="more" aria-haspopup="menu" data-id="${s.id}" aria-label="ตัวเลือกของคิว ${esc(s.name)}">⋯</button></div>
    ${s.slotCount>1?`<div class="slotmini">${s.booking.slots.map((x,i)=>`<span class="${x.done?'ok':''}">${x.done?'✓':i+1} ${thDate(parse(x.date),{weekday:'short',day:'numeric',month:'short'})} ${x.time} · ${esc(x.place)}${x.char&&!isProj(s)?` · ${esc(x.char)}`:''}</span>`).join('')}</div>`
      :`<div class="meta"><span>${thDate(parse(s.date),{weekday:'short',day:'numeric',month:'short'})} ${s.time} · ${esc(s.place)}</span><span>ref ${s.refs.length} ท่า</span></div>`}
    <div class="stagebar">${stageSelect(s)}</div>
    <div class="acts">${chip(s)}${status(s)!=='paid'&&!isCx(s)?`<button class="btn ghost" style="padding:4px 10px;font-size:13px" data-act="pay" data-id="${s.id}">ค้าง ${baht(s.price-s.paid)}</button>`:''}<span class="spacer"></span>${act}</div>
  </div>`}
function jobRow(s){
  const a=ageDays(s),post=s.stage==='shot'||s.stage==='editing';
  const ac=post?(a>S.cfg.badDays?'var(--bad)':a>S.cfg.warnDays?'var(--warn)':'var(--muted)'):'var(--muted)';
  const when=a<0?`อีก ${-a} วัน`:a===0?'วันนี้':`${a} วันก่อน`;
  return `<div class="card jrow ${isCx(s)?'cx':''}">
    <button class="jmain" data-act="detail" data-id="${s.id}"><span class="who">${esc(s.name)}${projTag(s)}${s.slotCount>1?`<span class="tag slot">${s.slotCount} ช่วง</span>`:''}</span>
      <span class="meta"><span class="num">${thDate(parse(s.date),{day:'numeric',month:'short'})} ${s.time}</span><span style="color:${ac};font-weight:${post&&a>S.cfg.warnDays?600:400}">${when}</span>${status(s)==='due'||status(s)==='dep'?`<span style="color:var(--bad)">ค้าง ${baht(s.price-s.paid)}</span>`:''}</span></button>
    ${stageSelect(s)}
    <button class="more" data-act="more" aria-haspopup="menu" data-id="${s.id}" aria-label="ตัวเลือกของคิว ${esc(s.name)}">⋯</button>
  </div>`}
/* sort per stage: upcoming soonest first, backlog oldest first, delivered newest first */
const stageSort=k=>k==='delivered'||k==='cancelled'?(a,b)=>sortT(b,a):sortT;
const matchQ=(s,q)=>!q||[s.name,s.series,...s.booking.slots.flatMap(x=>[x.place,x.char||'']),...s.people.flatMap(p=>[p.name,p.char])].join(' ').toLowerCase().includes(q);
function jobsList(){
  const q=S.q.trim().toLowerCase();
  const match=s=>matchQ(s,q);
  const sec=x=>{const arr=S.shoots.filter(b=>b.stage===x.k).map(keyView).filter(match).sort(stageSort(x.k));
    return arr.length?`<div class="section-h"><span class="sdot" style="background:${x.c}"></span><h2>${x.t}</h2><span class="muted num" style="font-size:13px">${arr.length} คิว</span></div>
      <div class="stack ${S.jobFilter==='all'?'jrows':''}">${arr.map(S.jobFilter==='all'?jobRow:blCard).join('')}</div>`:''};
  const html=(S.jobFilter==='all'?ALLST:ALLST.filter(x=>x.k===S.jobFilter)).map(sec).join('');
  return html||`<div class="empty">${q?'ไม่พบงานที่ตรงกับคำค้น':'ไม่มีงานในสถานะนี้'}</div>`;
}
function vJobs(){
  const bl=backlogList(),oldest=bl.length?Math.max(...bl.map(ageDays)):0;
  const n=k=>S.shoots.filter(s=>s.stage===k).length;
  return `<h1>งานทั้งหมด</h1>
  <div class="strip"><div><b>${S.shoots.length}</b><span>คิวทั้งหมด</span></div><div><b>${bl.length}</b><span>รอแต่ง / รอส่ง</span></div><div><b style="${oldest>S.cfg.badDays?'color:var(--bad)':oldest>S.cfg.warnDays?'color:var(--warn)':''}">${oldest} วัน</b><span>ค้างส่งนานสุด</span></div></div>
  <div class="stfilter" role="tablist">
    <button class="${S.jobFilter==='all'?'on':''}" data-act="jf" data-k="all">ทั้งหมด <span class="num">${S.shoots.length}</span></button>
    ${ALLST.map(x=>`<button class="${S.jobFilter===x.k?'on':''}" style="--stc:${x.c}" data-act="jf" data-k="${x.k}"><i></i>${x.t} <span class="num">${n(x.k)}</span></button>`).join('')}
  </div>
  <label class="search"><input id="jobQ" type="search" placeholder="ค้นหาชื่อ ตัวละคร เรื่อง หรือสถานที่" value="${esc(S.q)}" autocomplete="off"></label>
  <div id="jobList">${jobsList()}</div>`;
}

/* ---------- settings ---------- */
const PIG=`<svg viewBox="0 0 200 170" class="pig" aria-hidden="true">
  <ellipse cx="100" cy="160" rx="62" ry="7" fill="rgba(0,0,0,.08)"/>
  <path d="M46 52 L38 18 Q36 10 44 14 L74 36 Z" fill="#F4A3BA" stroke="#C9637F" stroke-width="3" stroke-linejoin="round"/>
  <path d="M154 52 L162 18 Q164 10 156 14 L126 36 Z" fill="#F4A3BA" stroke="#C9637F" stroke-width="3" stroke-linejoin="round"/>
  <path d="M48 46 L44 24 L66 38 Z" fill="#E77F9C"/><path d="M152 46 L156 24 L134 38 Z" fill="#E77F9C"/>
  <ellipse cx="100" cy="82" rx="66" ry="56" fill="#F9C2D1" stroke="#C9637F" stroke-width="3"/>
  <ellipse cx="62" cy="96" rx="11" ry="7" fill="#F28EAA" opacity=".7"/><ellipse cx="138" cy="96" rx="11" ry="7" fill="#F28EAA" opacity=".7"/>
  <ellipse cx="76" cy="70" rx="6" ry="8" fill="#3B2230"/><ellipse cx="124" cy="70" rx="6" ry="8" fill="#3B2230"/>
  <circle cx="78" cy="67" r="2.2" fill="#fff"/><circle cx="126" cy="67" r="2.2" fill="#fff"/>
  <ellipse cx="100" cy="90" rx="20" ry="14" fill="#F4A3BA" stroke="#C9637F" stroke-width="3"/>
  <ellipse cx="93" cy="90" rx="3.5" ry="5" fill="#B5506D"/><ellipse cx="107" cy="90" rx="3.5" ry="5" fill="#B5506D"/>
  <g transform="translate(58 104)">
    <rect x="0" y="10" width="84" height="48" rx="10" fill="#3B2230"/>
    <rect x="12" y="2" width="22" height="12" rx="4" fill="#3B2230"/>
    <circle cx="42" cy="34" r="18" fill="#5C3A4C" stroke="#F9C2D1" stroke-width="3"/>
    <circle cx="42" cy="34" r="10" fill="#1E1018"/><circle cx="38" cy="30" r="3.5" fill="#fff" opacity=".8"/>
    <circle cx="72" cy="20" r="4" fill="#FF6FA6"/>
  </g>
  <ellipse cx="56" cy="128" rx="11" ry="9" fill="#F9C2D1" stroke="#C9637F" stroke-width="3"/>
  <ellipse cx="144" cy="128" rx="11" ry="9" fill="#F9C2D1" stroke="#C9637F" stroke-width="3"/>
</svg>`;
const IC={
  install:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M11 18.5h2"/></svg>',
  sync:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 11a8 8 0 0 0-14.3-4.6L4 8"/><path d="M4 4v4h4"/><path d="M4 13a8 8 0 0 0 14.3 4.6L20 16"/><path d="M20 20v-4h-4"/></svg>',
  export:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 17v2.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5V17"/></svg>',
  trash:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  tag:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.5"/></svg>',
  pin:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/></svg>',
  timer:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M10 2h4"/></svg>',
  clock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="M3 17l5-4 4 3 3-2 6 4"/></svg>',
  logout:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/><path d="M10 16l-4-4 4-4M6 12h10"/></svg>',
};
const srow=(act,ic,c,bg,title,sub)=>`<button class="srow" data-act="${act}"><span class="sicon" style="color:${c};background:${bg}">${IC[ic]}</span><span class="stxt"><b>${title}</b><span>${sub}</span></span><span class="chev" aria-hidden="true">›</span></button>`;
const segCtl=(key,opts)=>`<div class="seg mini">${opts.map(([v,t])=>`<button class="${S.cfg[key]===v?'on':''}" data-act="cfg" data-k="${key}" data-v="${v}">${t}</button>`).join('')}</div>`;
const APP_VERSION='1.0.0';
function syncTxt(){const t=S.driveInfo?.lastSync;if(!t)return 'ยังไม่ได้ซิงก์ในเครื่องนี้ · กด "ซิงก์ตอนนี้"';
  const m=Math.round((Date.now()-t)/60000);return `ซิงก์ล่าสุด ${m<1?'เมื่อสักครู่':m<60?m+' นาทีที่แล้ว':new Date(t).toLocaleString('th-TH',{dateStyle:'short',timeStyle:'short'})} · ใช้ข้ามอุปกรณ์ได้`}
function paintSync(){const e=document.getElementById('syncTxt');if(e)e.textContent=syncTxt()}
function vSettings(){
  const c=S.cfg;
  return `<div class="set-head"><h1>ตั้งค่า</h1><div class="muted">บัญชี ข้อมูล และการทำงานของแอป</div></div>
  ${S.drive?`<div class="acct on">${S.driveInfo?.picture?`<img class="avatar" src="${esc(S.driveInfo.picture)}" alt="" referrerpolicy="no-referrer">`:`<span class="avatar">${esc((S.driveInfo?.name||'?').slice(0,1).toUpperCase())}</span>`}<div class="stxt"><b>${esc(S.driveInfo?.name||'')}</b><span>${esc(S.driveInfo?.email||'')}</span><small>เข้าสู่ระบบด้วย Google</small></div>
      <button class="iconlink" data-act="signout" aria-label="ออกจากระบบ">${IC.logout}</button></div>`
   :`<div class="acct"><span class="gmark" aria-hidden="true">G</span><div class="stxt"><b>ยังไม่ได้เข้าสู่ระบบ</b><span>เก็บข้อมูลไว้ใน Google Drive ของคุณ</span></div>
      <button class="btn primary" data-act="signin">เข้าสู่ระบบ</button></div>`}
  <div class="ident">${PIG}<h2>หมูถ่ายรูป</h2><p>จัดคิวถ่าย งานค้างส่ง และรายรับ สำหรับตากล้องคอสเพลย์</p></div>
  ${S.drive?`<div class="notice ok">ข้อมูลซิงก์กับ Google Drive ในโฟลเดอร์ <b>${esc((window.APP_CONFIG||{}).ROOT_FOLDER||'หมูถ่ายรูป')}/</b><br><span id="syncTxt">${syncTxt()}</span></div>`
   :`<div class="notice">หมายเหตุ: ตอนนี้ข้อมูลทั้งหมดเก็บอยู่บนอุปกรณ์นี้เท่านั้น<br>เข้าสู่ระบบ Google เพื่อสำรองข้อมูลไว้ใน Drive และใช้ข้ามอุปกรณ์</div>`}
  <h2 class="set-sec">จัดการข้อมูล</h2>
  <div class="srows">
    ${srow('s-install','install','var(--info)','var(--info-soft)','ติดตั้งแอป','เพิ่มไปยังหน้าจอหลัก')}
    ${S.drive?srow('s-sync','sync','var(--ok)','var(--ok-soft)','ซิงก์ตอนนี้','ดึงและบันทึกข้อมูลกับ Google Drive'):''}
    ${srow('s-export','export','var(--ok)','var(--ok-soft)','ส่งออกข้อมูล',`คิวทั้งหมด ${S.shoots.length} คิว เป็นไฟล์ CSV เปิดใน Excel / Google Sheets ได้`)}
    ${srow('s-sample','clock','var(--accent)','var(--accent-soft)','ลองใช้ข้อมูลตัวอย่าง','เพิ่มคิวตัวอย่าง 15 คิวไว้ลองใช้ ลบทิ้งได้ทีหลัง')}
    ${srow('s-clear','trash','var(--bad)','var(--bad-soft)','ล้างข้อมูลในเครื่อง',S.drive?'ข้อมูลใน Drive ยังอยู่ครบ':'ลบคิวทั้งหมดในอุปกรณ์นี้')}
  </div>
  <h2 class="set-sec">การทำงาน</h2>
  <div class="srows">
    ${srow('s-pkg','tag','var(--accent)','var(--accent-soft)','แพ็กเกจราคา',c.packages.length?`${c.packages.length} แพ็กเกจ · เลือกได้ตอนเพิ่มคิว`:'ยังไม่มีแพ็กเกจ')}
    ${srow('s-place','pin','var(--warn)','var(--warn-soft)','สถานที่ที่ใช้บ่อย',c.places.length?`${c.places.length} แห่ง · ${esc(c.places.slice(0,2).join(', '))}${c.places.length>2?'…':''}`:'ยังไม่มีสถานที่')}
    ${srow('s-timer','timer','var(--info)','var(--info-soft)','ตัวจับเวลา',`เตือนก่อนหมด ${c.warnMin} นาที · เสียง${c.sound?'เปิด':'ปิด'} · ถ่ายรวม ${c.groupPct}%`)}
    ${srow('s-backlog','clock','var(--warn)','var(--warn-soft)','เตือนงานค้างส่ง',`สีส้มเมื่อเกิน ${c.warnDays} วัน · สีแดงเมื่อเกิน ${c.badDays} วัน`)}
  </div>
  <h2 class="set-sec">การแสดงผล</h2>
  <div class="card prefs" style="margin:0">
    <div class="prow"><span>ธีม</span>${segCtl('theme',[['light','สว่าง'],['dark','มืด']])}</div>
    <div class="prow"><span>สัปดาห์เริ่มวัน</span>${segCtl('weekStart',[[0,'อาทิตย์'],[1,'จันทร์']])}</div>
    <div class="prow"><span>ปีที่แสดง</span>${segCtl('era',[['be','พ.ศ.'],['ce','ค.ศ.']])}</div>
  </div>
  <p class="muted" style="text-align:center;font-size:12px;margin:22px 0 0">หมูถ่ายรูป · เวอร์ชัน ${APP_VERSION}${Drive.configured()?'':' · ยังไม่ได้ตั้งค่า Google Drive (ดู README)'}</p>`;
}
function applyTheme(){if(S.cfg.theme!=='dark')S.cfg.theme='light';document.documentElement.dataset.theme=S.cfg.theme}
function saveCfg(){scheduleSave()}
function listSheet(kind){
  const pk=kind==='pkg',items=pk?S.cfg.packages:S.cfg.places;
  const row=(x={})=>pk?`<div class="lrow2"><input class="kName" placeholder="ชื่อแพ็กเกจ" value="${esc(x.name||'')}"><input class="kDur" type="number" min="15" step="15" placeholder="นาที" value="${x.dur||''}" aria-label="ระยะเวลา (นาที)"><input class="kPrice" type="number" min="0" step="100" placeholder="ราคา" value="${x.price??''}" aria-label="ราคา (บาท)"><button type="button" class="more" data-act="rmrow" aria-label="ลบ">✕</button></div>`
    :`<div class="lrow2 one"><input class="kName" placeholder="ชื่อสถานที่" value="${esc(x||'')}"><button type="button" class="more" data-act="rmrow" aria-label="ลบ">✕</button></div>`;
  sheet(`<h2 style="font-size:20px;margin-bottom:4px">${pk?'แพ็กเกจราคา':'สถานที่ที่ใช้บ่อย'}</h2>
  <p class="muted" style="margin:0 0 14px;font-size:13px">${pk?'ตอนเพิ่มคิว กดเลือกแพ็กเกจแล้วระบบเติมระยะเวลาและราคาให้':'ตอนกรอกสถานที่ จะมีรายการนี้ให้เลือก ชื่อสถานที่จะได้สะกดตรงกันทุกคิว'}</p>
  ${pk?'<div class="lrow2 hdr"><span>ชื่อ</span><span>นาที</span><span>ราคา (฿)</span><span></span></div>':''}
  <div id="kList" class="stack" data-kind="${kind}" style="gap:8px">${items.map(row).join('')}</div>
  <template id="kTpl">${row()}</template>
  <button class="btn ghost block" style="margin-top:10px" data-act="addrow">+ เพิ่ม${pk?'แพ็กเกจ':'สถานที่'}</button>
  <button class="btn primary block" style="margin-top:10px" data-act="savelist">บันทึก</button>`)}
function numSheet(kind){
  const c=S.cfg,tm=kind==='timer';
  sheet(`<h2 style="font-size:20px;margin-bottom:14px">${tm?'ตัวจับเวลา':'เตือนงานค้างส่ง'}</h2>
  <div class="stack">${tm?`
    <label class="field">เตือนก่อนหมดเวลา (นาที)<input id="cWarn" type="number" min="1" max="30" value="${c.warnMin}"></label>
    <label class="tgl"><input id="cSound" type="checkbox" ${c.sound?'checked':''}><span>เสียงเตือนเมื่อหมดเวลาและเมื่อเปลี่ยนช่วงช็อต</span></label>
    <label class="field">สัดส่วนเวลาถ่ายรวมของโปรเจกต์ใหม่ <b id="cPctV" style="color:var(--ink)">${c.groupPct}%</b><input id="cPct" type="range" min="10" max="70" step="5" value="${c.groupPct}"></label>
    <div class="note">ใช้ตอนสร้างคิวโปรเจกต์ใหม่ เวลาที่เหลือแบ่งเท่ากันเป็นช็อตเดี่ยวของแต่ละคน</div>`
  :`<div class="two"><label class="field">สีส้มเมื่อค้างเกิน (วัน)<input id="cWd" type="number" min="1" value="${c.warnDays}"></label><label class="field">สีแดงเมื่อค้างเกิน (วัน)<input id="cBd" type="number" min="2" value="${c.badDays}"></label></div>
    <div class="note">นับจากวันที่ถ่ายช่วงสุดท้าย ใช้กับคิวที่ "ถ่ายแล้ว" และ "รอแต่งรูป"</div>`}
    <button class="btn primary block" data-act="savenum" data-k="${kind}">บันทึก</button></div>`);
  const r=document.getElementById('cPct');if(r)r.oninput=()=>document.getElementById('cPctV').textContent=r.value+'%';
}
function exportSheet(){
  const rows=[['ชื่อ','ประเภท','สมาชิก','ช่วง','วันที่','เวลา','นาที','สถานที่','ตัวละคร','สถานะงาน','ราคา','ได้รับแล้ว']];
  S.shoots.forEach(b=>b.slots.forEach((x,i)=>rows.push([b.name,b.type==='project'?'โปรเจกต์':'เดี่ยว',b.people.map(p=>p.name).join(' / '),`${i+1}/${b.slots.length}`,x.date,x.time,x.dur,x.place,x.char||b.people.map(p=>p.char).join(' / '),stg({stage:b.stage}).t,i?'':b.price,i?'':b.paid])));
  const csv=rows.map(r=>r.map(v=>{v=String(v??'');return /[",\n]/.test(v)?`"${v.replace(/"/g,'""')}"`:v}).join(',')).join('\n');
  sheet(`<h2 style="font-size:20px;margin-bottom:4px">ส่งออกข้อมูล</h2>
  <p class="muted" style="margin:0 0 14px;font-size:13px">${S.shoots.length} คิว · ${rows.length-1} ช่วงเวลา · หนึ่งแถวต่อหนึ่งช่วง ราคาอยู่ในแถวแรกของแต่ละคิว</p>
  <div class="csvprev"><table>${rows.slice(0,6).map((r,i)=>`<tr>${r.map(v=>i?`<td>${esc(v)}</td>`:`<th>${esc(v)}</th>`).join('')}</tr>`).join('')}</table></div>
  <textarea id="csvOut" class="sr" readonly>${esc(csv)}</textarea>
  <div class="stack" style="margin-top:12px">
    <button class="btn primary block" data-act="dlcsv">ดาวน์โหลดไฟล์ CSV</button>
    <button class="btn block" data-act="copycsv">คัดลอกไปวางใน Google Sheets</button>
  </div>`)}
let installEvt=null;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installEvt=e});
window.addEventListener('appinstalled',()=>{installEvt=null;toast('ติดตั้งแอปแล้ว')});
const isStandalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone;
function installSheet(){
  sheet(`<h2 style="font-size:20px;margin-bottom:12px">ติดตั้งแอปลงหน้าจอหลัก</h2>
  <div class="stack" style="gap:14px">
    ${isStandalone()?'<div class="notice ok" style="margin:0">แอปติดตั้งอยู่แล้วในเครื่องนี้</div>':installEvt?'<button class="btn primary block" data-act="doinstall">ติดตั้งแอป</button>':''}
    <div><b>iPhone / iPad (Safari)</b><ol class="steps-ol"><li>แตะปุ่มแชร์ ⬆︎ ด้านล่างของ Safari</li><li>เลือก "เพิ่มไปยังหน้าจอโฮม"</li><li>แตะ "เพิ่ม"</li></ol></div>
    <div><b>Android (Chrome)</b><ol class="steps-ol"><li>แตะเมนู ⋮ มุมขวาบน</li><li>เลือก "ติดตั้งแอป" หรือ "เพิ่มลงในหน้าจอหลัก"</li></ol></div>
    <div class="note">หลังติดตั้ง แอปจะเปิดเต็มจอเหมือนแอปทั่วไป และเปิดดูคิวได้แม้ไม่มีอินเทอร์เน็ต</div>
  </div>`)}
function clearSheet(){
  sheet(`<h2 style="font-size:20px;margin-bottom:6px">ล้างข้อมูลในเครื่อง?</h2>
  <p class="muted" style="margin:0 0 16px">${S.drive?'คิวทั้งหมดจะถูกลบออกจากอุปกรณ์นี้ ข้อมูลใน Google Drive ยังอยู่ครบ และจะโหลดกลับมาเมื่อซิงก์ครั้งถัดไป':'คิวทั้งหมด '+S.shoots.length+' คิวจะถูกลบถาวร เพราะยังไม่ได้สำรองไว้ใน Drive'}</p>
  <div class="two"><button class="btn" data-act="canceldel">ยกเลิก</button><button class="btn dangerfill" data-act="doclear">ล้างข้อมูล</button></div>`)}

const views={today:vToday,jobs:vJobs,cal:vCal,money:vMoney,settings:vSettings};
function render(){
  document.getElementById('view').innerHTML=views[S.tab]();
  document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('on',b.dataset.tab===S.tab));
  const sd=document.getElementById('setDot');sd.hidden=S.drive;applyTheme();
  const bn=backlogList().length,bb=document.getElementById('blBadge');bb.hidden=!bn;bb.textContent=bn;
  const root=document.getElementById('sessionRoot');
  const prev=root.querySelector('.session'),keep=prev&&prev.dataset.id==S.open?prev.scrollTop:0;
  const s=byId(S.open);
  root.innerHTML=s?vSession(s):'';
  const now=root.querySelector('.session');if(now){now.dataset.id=s.id;now.scrollTop=keep}
  document.body.style.overflow=s?'hidden':'';
  paint();initCarousels();
  try{localStorage.setItem('cos_tab',S.tab)}catch(e){}
  scheduleSave();
}

/* ---------- timers (each queue has its own) ---------- */
function fmt(sec){const neg=sec<0;sec=Math.abs(Math.round(sec));const h=Math.floor(sec/3600),m=Math.floor(sec%3600/60),s=sec%60;return (neg?'+':'')+(h?h+':'+pad(m):pad(m))+':'+pad(s)}
function tLabel(s){const t=s.t;if(t.running)return '● '+fmt(t.remain);if(t.remain!==t.total)return 'พักไว้ '+fmt(t.remain);return '⏱ '+durTxt(s.dur)}
function paint(){
  document.querySelectorAll('[data-timer]').forEach(el=>{const s=byId(el.dataset.timer);if(!s)return;el.textContent=tLabel(s);el.classList.toggle('live',s.t.running);el.classList.toggle('over',s.t.remain<0)});
  const bar=document.getElementById('liveBar'),live=occ().find(s=>s.t.running);
  bar.hidden=!live||S.open!==null;
  if(live&&S.open===null){bar.dataset.id=live.id;bar.innerHTML=`<span class="pulse"></span><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">กำลังถ่าย · ${esc(live.name)}</span><span class="num" style="font-weight:700">${fmt(live.t.remain)}</span><span>›</span>`}
  const s=byId(S.open),c=document.getElementById('clock');if(!s||!c)return;
  const t=s.t;c.textContent=fmt(t.remain);
  const frac=Math.max(0,t.remain)/t.total;
  const arc=document.getElementById('arc');
  arc.setAttribute('stroke-dashoffset',(339.3*(1-frac)).toFixed(1));
  arc.setAttribute('stroke',t.remain<0?'var(--bad)':t.remain<S.cfg.warnMin*60?'var(--warn)':'var(--accent)');
  document.getElementById('timerCard').classList.toggle('over',t.remain<0);
  document.getElementById('clockLbl').textContent=t.remain<0?'เกินเวลา':t.running?'กำลังถ่าย':'จาก '+durTxt(Math.round(t.total/60));
  document.getElementById('goBtn').textContent=t.running?'พัก':(t.remain<t.total?'ต่อ':'เริ่ม');
  const pn=document.getElementById('planNow');
  if(pn){const pi=planInfo(s);pn.textContent=t.remain===t.total&&!t.running?'เริ่มจับเวลาเพื่อดูช่วง':`ตอนนี้: ${s.shots[pi.i].label} · เหลือ ${fmt(pi.left)}`;
    document.querySelectorAll('.plan li').forEach((li,i)=>{li.classList.toggle('now',(t.running||t.remain!==t.total)&&i===pi.i);li.classList.toggle('past',(t.running||t.remain!==t.total)&&i<pi.i)})}
}
let wake=null,actx=null;
function beep(){if(!S.cfg.sound)return;try{actx=actx||new AudioContext();[0,.25,.5].forEach(d=>{const o=actx.createOscillator(),g=actx.createGain();o.frequency.value=880;g.gain.value=.15;o.connect(g).connect(actx.destination);o.start(actx.currentTime+d);o.stop(actx.currentTime+d+.15)})}catch(e){}}
setInterval(()=>{let any=false;const n=performance.now();
  occ().forEach(s=>{const t=s.t;if(!t.running)return;any=true;t.remain-=(n-t.last)/1000;t.last=n;if(t.remain<=0&&!t.beeped){t.beeped=true;beep()}
    if(s.shots.length>1){const pi=planInfo(s).i;if(pi!==s.seg){s.seg=pi;beep();toast(`ถึงช่วง: ${s.shots[pi].label}`)}}});
  if(any)paint()},250);
/* ---------- sheets ---------- */
function sheet(html){const r=document.getElementById('sheetRoot');r.innerHTML=`<div class="scrim" data-act="close"><div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div><button class="sheet-x" data-act="closesheet" aria-label="ปิด">✕</button>${html}</div></div>`;}
function closeSheet(){document.getElementById('sheetRoot').innerHTML=''}
function toast(t,act){document.querySelectorAll('.toast').forEach(x=>x.remove());const e=document.createElement('div');e.className='toast';e.textContent=t;
  if(act){const b=document.createElement('button');b.className='toast-act';b.textContent=act.label;b.dataset.act=act.act;e.append(b)}
  document.body.append(e);setTimeout(()=>e.remove(),act?5000:1800)}
let lastDeleted=null;

function paySheet(s){
  sheet(`<div class="eyebrow">บันทึกการชำระเงิน</div><h2 style="font-size:20px;margin:2px 0 4px">${esc(s.name)}</h2>
  <div class="muted" style="font-size:13px">${esc(short(s))} · ${thDate(parse(s.date),{day:'numeric',month:'short'})} ${s.time}</div>
  ${isProj(s)?`<div class="note" style="margin-top:10px">โปรเจกต์ ${s.people.length} คน · เก็บก้อนเดียวจากหัวโปร <b style="color:var(--ink)">${esc(leaderName(s))}</b></div>`:''}
  <div class="strip" style="margin:14px 0"><div><b>${baht(s.price)}</b><span>ราคาแพ็กเกจ</span></div><div><b style="color:var(--ok)">${baht(s.paid)}</b><span>รับแล้ว</span></div><div><b style="color:var(--bad)">${baht(Math.max(0,s.price-s.paid))}</b><span>คงเหลือ</span></div></div>
  <div class="stack">
    <label class="field">ยอดที่ได้รับทั้งหมด (บาท)<input id="paidIn" type="number" inputmode="numeric" value="${s.paid}"></label>
    <label class="field">ราคาแพ็กเกจ (บาท)<input id="priceIn" type="number" inputmode="numeric" value="${s.price}"></label>
    <button class="btn primary block" data-act="savepay" data-id="${s.id}">บันทึก</button>
  </div>`)}

function detailSheet(s){
  sheet(`<div class="eyebrow">${thDate(parse(s.date),{weekday:'short',day:'numeric',month:'short'})} · ${s.time}–${endTime(s)}</div>
  <h2 style="font-size:20px;margin:2px 0 2px">${esc(s.name)}</h2>
  <div class="muted" style="font-size:13px;margin-bottom:14px">${esc(sub(s))} · ${esc(s.place)}</div>
  ${members(s)?`<div style="margin:-6px 0 14px">${members(s)}</div>`:''}
  ${s.slotCount>1?`<div class="eyebrow" style="margin-bottom:6px">ช่วงเวลา ${s.slotCount} ช่วง</div><div class="slotlist">${s.booking.slots.map((x,i)=>`<div class="${x===s.slot?'cur':''}"><div style="min-width:0;flex:1"><b>ช่วง ${i+1}</b> <span class="num">${thDate(parse(x.date),{weekday:'short',day:'numeric',month:'short'})} ${x.time}</span><br><span class="muted">${esc(x.place)}${x.char&&!isProj(s)?' · '+esc(x.char):''}</span></div>${x.done?'<span class="chip paid">ถ่ายเสร็จ</span>':''}<button class="btn" data-act="open" data-id="${x.id}">เปิด</button></div>`).join('')}</div><div style="height:14px"></div>`:''}
  <div class="eyebrow" style="margin-bottom:6px">สถานะงาน</div>
  <div class="stagelist">${STAGES.map((x,j)=>`<button class="${x.k===s.stage?'on':''}" style="--stc:${x.c}" data-act="setstage" data-id="${s.id}" data-k="${x.k}"><i></i>${x.t}<small>${j+1}/5</small></button>`).join('')}
    <button class="${isCx(s)?'on':''} cxopt" style="--stc:var(--bad)" data-act="setstage" data-id="${s.id}" data-k="cancelled"><i></i>ยกเลิกคิว<small>ไม่นับในยอดงาน</small></button></div>
  <div class="eyebrow" style="margin:16px 0 6px">การชำระเงิน</div>
  <div class="row">${chip(s)}<span class="num">${baht(s.paid)} / ${baht(s.price)}</span><span class="spacer"></span><button class="btn" data-act="pay" data-id="${s.id}">บันทึกเงิน</button></div>
  <button class="btn primary block" style="margin-top:16px" data-act="open" data-id="${s.id}">เปิดหน้าถ่าย (จับเวลา + ref)</button>
  <div class="two" style="margin-top:10px"><button class="btn ghost" data-act="edit" data-id="${s.id}">แก้ไข</button><button class="btn ghost danger" data-act="askdel" data-id="${s.id}">ลบ</button></div>`)}

const memRow=(i,p={})=>`<div class="memrow two"><label class="field">${i===0?'หัวโปร':'สมาชิก '+(i+1)}<input class="mName" placeholder="ชื่อ / แอคเคาท์" value="${esc(p.name||'')}"></label><label class="field">ตัวละคร<input class="mChar" placeholder="ตัวละคร" value="${esc(p.char&&p.char!=='—'?p.char:'')}"></label></div>`;
const slotRow=(i,x={})=>`<fieldset class="slotrow">
  <legend><span>ช่วงที่ <b class="sno">${i+1}</b></span>${i>0?'<button type="button" class="btn ghost danger" data-act="remslot">ลบช่วงนี้</button>':''}</legend>
  <label class="field sCharF">ตัวละครช่วงนี้<input class="sChar" placeholder="เช่น แม่มดดอกไม้" value="${esc(x.char&&x.char!=='—'?x.char:'')}"></label>
  <div class="two"><label class="field">วันที่<input class="sDate" type="date" value="${x.date||TODAY_ISO}"></label><label class="field">เวลา<input class="sTime" type="time" value="${x.time||'10:00'}"></label></div>
  <div class="two"><label class="field">ระยะเวลา (นาที)<input class="sDur" type="number" value="${x.dur||60}" min="15" step="15"></label><label class="field">สถานที่<input class="sPlace" list="placeList" placeholder="เช่น สวนเบญจกิติ" value="${esc(x.place&&x.place!=='—'?x.place:'')}"></label></div>
</fieldset>`;
function addSheet(ed){
  const b=ed?ed.booking:null,type=b?b.type:'solo',val=x=>esc(x&&x!=='—'?x:'');
  const d=S.tab==='cal'?S.selDay:TODAY_ISO;
  const slots=b?b.slots.map((x,i)=>({...x,char:x.char||(i===0&&!isProj(b)?b.people[0].char:'')})):[{date:d}];
  sheet(`<h2 style="font-size:20px;margin-bottom:10px">${b?'แก้ไขคิว':'เพิ่มคิวถ่าย'}</h2>
  ${b?`<div class="muted" style="font-size:13px;margin:-6px 0 12px">${isProj(b)?'โปรเจกต์ (ถ่ายกลุ่ม)':'คิวเดี่ยว'}</div>`
   :`<div class="seg" id="typeSeg"><button class="on" type="button" data-act="ftype" data-k="solo">คิวเดี่ยว</button><button type="button" data-act="ftype" data-k="project">โปรเจกต์ (ถ่ายกลุ่ม)</button></div>`}
  <form id="addForm" class="stack" data-type="${type}" novalidate>
    <div id="soloF" class="stack" ${type==='solo'?'':'hidden'}>
      <div class="two"><label class="field">ชื่อลูกค้า / แอคเคาท์<input id="fName" placeholder="เช่น Pim.cos" value="${val(b&&!isProj(b)?b.name:'')}"></label><label class="field">เรื่อง<input id="fSeries" placeholder="ชื่อเรื่อง" value="${val(b&&!isProj(b)?b.series:'')}"></label></div>
    </div>
    <div id="projF" class="stack" ${type==='project'?'':'hidden'}>
      <label class="field">ชื่อโปรเจกต์<input id="pName" placeholder="เช่น Garden of Ash" value="${val(b&&isProj(b)?b.name:'')}"></label>
      <div id="memList" class="stack">${b&&isProj(b)?b.people.map((p,i)=>memRow(i,p)).join(''):memRow(0)+memRow(1)}</div>
      <button class="btn ghost" type="button" data-act="addmem">+ เพิ่มสมาชิก</button>
      <div class="note">${b?'ลบชื่อออกจากช่องเพื่อเอาสมาชิกออก · สมาชิกใหม่จะได้ช็อตเดี่ยวของตัวเองในทุกช่วง':'จะสร้างช็อต "ถ่ายรวม" และ "เดี่ยว" ของแต่ละคนให้ทุกช่วงเวลา แบ่งเวลาตามระยะเวลาช่วง'} · เงินเก็บก้อนเดียวจากหัวโปร</div>
    </div>
    <div id="slotList" class="stack">${slots.map((x,i)=>slotRow(i,x)).join('')}</div>
    <button class="btn ghost" type="button" data-act="addslot">+ เพิ่มช่วงเวลา</button>
    ${S.cfg.packages.length?`<div class="field">แพ็กเกจ<div class="pkgs">${S.cfg.packages.map((k,i)=>`<button type="button" class="pkg" data-act="pkg" data-i="${i}"><b>${esc(k.name)}</b><span class="num">${k.dur} นาที · ${baht(k.price)}</span></button>`).join('')}</div></div>`:''}
    <datalist id="placeList">${S.cfg.places.map(x=>`<option value="${esc(x)}">`).join('')}</datalist>
    <label class="field">ราคารวมทั้งก้อน (บาท)<input id="fPrice" type="number" value="${b?b.price:1500}" min="0" step="100"></label>
    <button class="btn primary block" type="submit">${b?'บันทึกการแก้ไข':'เพิ่มคิว'}</button>
  </form>`);
  document.getElementById('addForm').onsubmit=e=>{e.preventDefault();const f=e.target,v=id=>document.getElementById(id).value.trim();
    const proj=f.dataset.type==='project',price=+v('fPrice')||0;
    const rows=[...f.querySelectorAll('.slotrow')].map(r=>({date:r.querySelector('.sDate').value||TODAY_ISO,time:r.querySelector('.sTime').value||'10:00',dur:+r.querySelector('.sDur').value||60,place:r.querySelector('.sPlace').value.trim()||'—',char:proj?null:(r.querySelector('.sChar').value.trim()||null)}));
    const people=proj?[...f.querySelectorAll('.memrow')].map(r=>({name:r.querySelector('.mName').value.trim(),char:r.querySelector('.mChar').value.trim()||'—'})).filter(p=>p.name):null;
    if(proj&&(!v('pName')||people.length<2)){toast('ใส่ชื่อโปรเจกต์และสมาชิกอย่างน้อย 2 คน');return}
    if(!proj&&!v('fName')){toast('ใส่ชื่อลูกค้าก่อน');return}
    if(b){
      b.price=price;
      if(proj){
        const oldP=b.people,map=oldP.map(p=>people.findIndex(q=>q.name===p.name));
        b.slots.forEach(sl=>{
          sl.shots=sl.shots.map(x=>{const all=x.who.length===oldP.length&&oldP.length>1;return {...x,who:all?people.map((_,i)=>i):x.who.map(i=>map[i]).filter(i=>i>=0)}}).filter(x=>x.who.length);
          const keep=new Set(sl.shots.map(x=>x.id));sl.refs=sl.refs.filter(r=>keep.has(r.shot));if(sl.sel!=='all'&&!keep.has(sl.sel))sl.sel='all';
          people.forEach((p,i)=>{if(!oldP.some(o=>o.name===p.name))sl.shots.push({id:'sh'+(uid++),label:'เดี่ยว '+p.name,who:[i],min:20})});
        });
        b.people=people;b.name=v('pName');b.series=v('pName');
      }else{b.name=v('fName');b.series=v('fSeries')||'—';b.people=[{name:v('fName'),char:rows[0].char||'—'}]}
      const removed=b.slots.slice(rows.length);removed.forEach(x=>{x.t.running=false;if(S.open===x.id)S.open=null});
      b.slots=rows.map((r,i)=>{const ex=b.slots[i];
        if(!ex)return mkSlot(r,b.people,b.type,false);
        const durCh=ex.dur!==r.dur;Object.assign(ex,{date:r.date,time:r.time,dur:r.dur,place:r.place,char:r.char});
        if(!proj)ex.shots[0].min=r.dur;
        if(durCh&&!ex.t.running&&ex.t.remain===ex.t.total)ex.t=newT(ex);
        return ex});
      closeSheet();render();toast('บันทึกการแก้ไขแล้ว');return;
    }
    const o=proj?{type:'project',name:v('pName'),series:v('pName'),people,price,paid:0,stage:'wait',slots:rows}
      :{name:v('fName'),series:v('fSeries')||'—',price,paid:0,stage:'wait',slots:rows.map(r=>({...r,refs:[]}))};
    S.shoots.push(norm(o));
    S.selDay=rows[0].date;const dd=parse(rows[0].date);S.month=new Date(dd.getFullYear(),dd.getMonth(),1);closeSheet();render();toast(rows.length>1?`เพิ่มคิวแล้ว · ${rows.length} ช่วงเวลา`:'เพิ่มคิวแล้ว')}
}
function delSheet(s){
  sheet(`<h2 style="font-size:20px;margin-bottom:6px">ลบคิว ${esc(s.name)}?</h2>
  <p class="muted" style="margin:0 0 16px">${s.slotCount>1?`ทั้ง ${s.slotCount} ช่วงเวลา`:`${thDate(parse(s.date),{weekday:'short',day:'numeric',month:'short'})} ${s.time} · ${esc(s.place)}`}<br>รูป ref และบันทึกเงินของคิวนี้จะถูกลบไปด้วย</p>
  <div class="two"><button class="btn" data-act="canceldel">ยกเลิก</button><button class="btn dangerfill" data-act="dodel" data-id="${s.id}">ลบคิว</button></div>`)}
function moreMenu(s,btn){
  closeMenu();const r=btn.getBoundingClientRect(),m=document.createElement('div');m.className='menu';m.setAttribute('role','menu');
  m.innerHTML=`<button role="menuitem" data-act="edit" data-id="${s.id}">แก้ไข</button><button role="menuitem" class="danger" data-act="askdel" data-id="${s.id}">ลบ</button>`;
  document.body.append(m);const mh=m.offsetHeight;
  m.style.right=Math.max(8,innerWidth-r.right)+'px';
  m.style.top=(r.bottom+6+mh>innerHeight-80?r.top-6-mh:r.bottom+6)+'px';
  m.querySelector('button').focus();
}
function closeMenu(){document.querySelectorAll('.menu').forEach(x=>x.remove())}
window.addEventListener('scroll',closeMenu,{passive:true});

function setupSheet(){
  sheet(`<h2 style="font-size:20px;margin-bottom:6px">ยังไม่ได้ตั้งค่า Google Drive</h2>
  <p class="muted" style="margin:0 0 12px">ต้องสร้าง OAuth Client ID ใน Google Cloud แล้วใส่ไว้ในไฟล์ <b>js/config.js</b> ก่อน ขั้นตอนอยู่ในไฟล์ README.md ของโปรเจกต์</p>
  <div class="note">ระหว่างนี้แอปใช้งานได้ตามปกติ ข้อมูลเก็บไว้ในเครื่องนี้</div>`)}


/* ---------- events ---------- */
function openSession(id){S.open=id;closeSheet();render()}
function closeSession(){S.open=null;render()}
document.addEventListener('click',e=>{
  const tb=e.target.closest('[data-tab]');if(tb&&tb.closest('#tabs')){S.tab=tb.dataset.tab;render();window.scrollTo(0,0);return}
  const el=e.target.closest('[data-act]');
  if(!el||el.dataset.act!=='more')closeMenu();
  if(!el)return;
  const a=el.dataset.act;
  if(a==='close'){if(e.target===el)closeSheet();return}
  const s=el.dataset.id?byId(el.dataset.id):null;
  const cur=byId(S.open);
  switch(a){
    case 'add':addSheet();break;
    case 'drive':S.tab='settings';render();break;
    case 'signin':if(!Drive.configured()){setupSheet();break}
      toast('กำลังเข้าสู่ระบบ Google…');Drive.signIn().then(r=>{render();toast(r==='pulled'?'เข้าสู่ระบบแล้ว · โหลดข้อมูลจาก Drive':'เข้าสู่ระบบแล้ว · สำรองข้อมูลไว้ใน Drive')}).catch(e=>{render();toast(e.message)});break;
    case 'signout':Drive.signOut();render();toast('ออกจากระบบแล้ว ข้อมูลในเครื่องยังอยู่');break;
    case 's-install':installSheet();break;
    case 's-sync':toast('กำลังซิงก์…');Drive.sync().then(r=>{render();toast(r==='busy'?'กำลังซิงก์อยู่':r==='pulled'?'โหลดข้อมูลล่าสุดจาก Drive แล้ว':'บันทึกขึ้น Drive แล้ว')}).catch(e=>toast(e.message));break;
    case 's-sample':S.shoots.push(...sampleBookings());S.tab='today';render();toast('เพิ่มคิวตัวอย่างแล้ว');break;
    case 'doinstall':if(installEvt){installEvt.prompt();installEvt.userChoice.finally(()=>{installEvt=null;closeSheet()})}break;
    case 'dlcsv':{const blob=new Blob(['\ufeff'+document.getElementById('csvOut').value],{type:'text/csv;charset=utf-8'}),a=document.createElement('a');
      a.href=URL.createObjectURL(blob);a.download=`หมูถ่ายรูป-${TODAY_ISO}.csv`;document.body.append(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1000);toast('ดาวน์โหลดไฟล์แล้ว');break}
    case 's-export':exportSheet();break;
    case 's-clear':clearSheet();break;
    case 'doclear':S.shoots.forEach(b=>b.slots.forEach(x=>x.t.running=false));S.shoots=[];S.open=null;S.updatedAt=Date.now();closeSheet();render();toast('ล้างข้อมูลในเครื่องแล้ว');break;
    case 's-pkg':listSheet('pkg');break;
    case 's-place':listSheet('place');break;
    case 's-timer':numSheet('timer');break;
    case 's-backlog':numSheet('backlog');break;
    case 'cfg':{const k=el.dataset.k,v=el.dataset.v;S.cfg[k]=k==='weekStart'?+v:v;saveCfg();render();break}
    case 'addrow':{const L=document.getElementById('kList');L.insertAdjacentHTML('beforeend',document.getElementById('kTpl').innerHTML);L.lastElementChild.querySelector('input').focus();break}
    case 'rmrow':el.closest('.lrow2').remove();break;
    case 'savelist':{const L=document.getElementById('kList'),rs=[...L.querySelectorAll('.lrow2')];
      if(L.dataset.kind==='pkg')S.cfg.packages=rs.map(r=>({name:r.querySelector('.kName').value.trim(),dur:+r.querySelector('.kDur').value||60,price:+r.querySelector('.kPrice').value||0})).filter(x=>x.name);
      else S.cfg.places=[...new Set(rs.map(r=>r.querySelector('.kName').value.trim()).filter(Boolean))];
      saveCfg();closeSheet();render();toast('บันทึกแล้ว');break}
    case 'savenum':{const g=id=>+document.getElementById(id).value;
      if(el.dataset.k==='timer'){S.cfg.warnMin=Math.max(1,g('cWarn')||5);S.cfg.sound=document.getElementById('cSound').checked;S.cfg.groupPct=g('cPct')}
      else{const w=Math.max(1,g('cWd')||7),bd=Math.max(w+1,g('cBd')||14);S.cfg.warnDays=w;S.cfg.badDays=bd}
      saveCfg();closeSheet();render();toast('บันทึกแล้ว');break}
    case 'copycsv':{const t=document.getElementById('csvOut').value;
      (navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(()=>toast('คัดลอก CSV แล้ว วางใน Google Sheets ได้เลย')).catch(()=>{const a=document.getElementById('csvOut');a.classList.remove('sr');a.style.cssText='width:100%;height:140px;margin-top:10px';a.select();toast('คัดลอกอัตโนมัติไม่ได้ เลือกข้อความไว้ให้แล้ว กดคัดลอกเองได้เลย')});break}
    case 'pkg':{const k=S.cfg.packages[+el.dataset.i],f=document.getElementById('addForm');f.querySelectorAll('.sDur')[0].value=k.dur;document.getElementById('fPrice').value=k.price;
      document.querySelectorAll('.pkg').forEach(x=>x.classList.toggle('on',x===el));break}
    case 'pay':paySheet(s);break;
    case 'setpaid':s.paid=+el.dataset.v;closeSheet();render();toast(statusTxt[status(s)]+' · '+s.name);break;
    case 'savepay':s.price=Math.max(0,+document.getElementById('priceIn').value||0);s.paid=Math.max(0,+document.getElementById('paidIn').value||0);closeSheet();render();toast('บันทึกแล้ว');break;
    case 'open':openSession(s.id);break;
    case 'cnav':el.closest('.carousel')._step?.(+el.dataset.d);break;
    case 'mkfolder':if(S.drive)makeFolder(s);else sheet(`<h2 style="font-size:20px;margin-bottom:6px">เข้าสู่ระบบ Google ก่อน</h2>
      <p class="muted" style="margin:0 0 16px">โฟลเดอร์ Ref จะถูกสร้างใน Google Drive ของคุณ ในโฟลเดอร์ หมูถ่ายรูป/ref/</p>
      <div class="two"><button class="btn" data-act="canceldel">ยกเลิก</button><button class="btn primary" data-act="signin-mk" data-id="${s.id}">เข้าสู่ระบบและสร้าง</button></div>`);break;
    case 'signin-mk':if(!Drive.configured()){setupSheet();break}closeSheet();Drive.signIn().then(()=>makeFolder(s)).catch(e=>toast(e.message));break;
    case 'cpfolder':copyText(s.booking.refFolder.url,'คัดลอกลิงก์โฟลเดอร์แล้ว');break;
    case 'cpmsg':copyText(folderMsg(s),'คัดลอกข้อความแล้ว ส่งให้ลูกค้าได้เลย');break;
    case 'closesheet':closeSheet();break;
    case 'rmref':{const r=s.refs.splice(+el.dataset.i,1)[0];if(s.slot._ci>=s.refs.length)s.slot._ci=0;if(s.ri>=visRefs(s).length)s.ri=0;render();toast(`ลบรูป ref ${r.link?domainOf(r.link):r.label} แล้ว`);break}
    case 'addref':S.refTarget=s.id;document.getElementById('refInput').click();break;
    case 'close-session':closeSession();break;
    case 'detail':detailSheet(s);break;
    case 'restore':s.stage='wait';render();toast(`กู้คืน ${s.name} เป็น "รอคิว" แล้ว`);break;
    case 'more':{const open=document.querySelector('.menu');const same=open&&open.dataset.for==s.id;closeMenu();if(!same){moreMenu(s,el);document.querySelector('.menu').dataset.for=s.id}return}
    case 'edit':addSheet(s);break;
    case 'askdel':delSheet(s);break;
    case 'canceldel':closeSheet();break;
    case 'dodel':{const b=s.booking,i=S.shoots.indexOf(b);b.slots.forEach(x=>{x.t.running=false;if(S.open===x.id)S.open=null});S.shoots.splice(i,1);lastDeleted={s:b,i};closeSheet();render();toast(`ลบคิว ${s.name} แล้ว`,{label:'เลิกทำ',act:'undodel'});break}
    case 'undodel':if(lastDeleted){S.shoots.splice(lastDeleted.i,0,lastDeleted.s);toast(`กู้คิว ${lastDeleted.s.name} คืนแล้ว`);lastDeleted=null;render()}break;
    case 'advance':s.stage=STAGES[stIdx(s)+1].k;render();toast(`${s.name} · ${stg(s).t}`);break;
    case 'setstage':{s.stage=el.dataset.k;const inSheet=el.closest('.sheet');render();if(inSheet)detailSheet(s);toast(`${s.name} · ${stg(s).t}`);break}
    case 'finish':{const left=s.booking.slots.filter(x=>!x.done&&x!==s.slot).length,used=s.t.total-s.t.remain;
      sheet(`<h2 style="font-size:20px;margin-bottom:6px">จบ${s.slotCount>1?`ช่วงที่ ${s.slotNo}`:'คิวนี้'}?</h2>
      <p class="muted" style="margin:0 0 16px">${esc(s.name)} · ถ่ายไป ${fmt(Math.max(0,used))}${s.t.remain>0?` เหลือเวลาอีก ${fmt(s.t.remain)}`:''}<br>${left?`ยังเหลืออีก ${left} ช่วงเวลาของคิวนี้`:'สถานะงานจะเปลี่ยนเป็น "ถ่ายแล้ว"'}</p>
      <div class="two"><button class="btn" data-act="canceldel">ถ่ายต่อ</button><button class="btn primary" data-act="dofinish" data-id="${s.id}">จบ${s.slotCount>1?'ช่วงนี้':'คิว'}</button></div>`);break}
    case 'dofinish':{closeSheet();s.t.running=false;s.done=true;const b=s.booking,left=b.slots.filter(x=>!x.done).length;
      if(!left&&stIdx(s)<2&&!isCx(s))s.stage='shot';else if(s.stage==='wait')s.stage='shooting';
      render();toast(left?`จบช่วง ${s.slotNo}/${s.slotCount} · เหลืออีก ${left} ช่วง`:`${s.name} · ${stg(s).t}`);break}
    case 'day':S.selDay=el.dataset.d;const d=parse(S.selDay);S.month=new Date(d.getFullYear(),d.getMonth(),1);render();break;
    case 'mon':S.month=new Date(S.month.getFullYear(),S.month.getMonth()+ +el.dataset.d,1);render();break;
    case 'ff':S.finFilter=el.dataset.k;render();break;
    case 'tf':S.todayFilter=el.dataset.k;render();break;
    case 'jf':S.jobFilter=el.dataset.k;render();window.scrollTo(0,0);break;
    case 'toggle':{const t=cur.t;t.running=!t.running;t.last=performance.now();
      if(t.running){
        occ().forEach(x=>{if(x!==cur&&x.t.running){x.t.running=false;toast(`พักเวลาของ ${x.name} ไว้ให้`)}});
        if(cur.stage==='wait')cur.stage='shooting';
        try{actx=actx||new AudioContext()}catch(_){}
        if(navigator.wakeLock)navigator.wakeLock.request('screen').then(w=>wake=w).catch(()=>{});
      }else if(wake){wake.release().catch(()=>{});wake=null}
      render();break}
    case 'tadd':{const t=cur.t,m=60*+el.dataset.m;t.remain+=m;t.total=Math.max(60,t.total+m);if(t.remain>0)t.beeped=false;paint();break}
    case 'treset':{const used=cur.t.total-cur.t.remain;
      if(!cur.t.running&&cur.t.remain===cur.t.total&&cur.t.total===cur.dur*60){toast('เวลายังไม่ได้เริ่ม');break}
      sheet(`<h2 style="font-size:20px;margin-bottom:6px">รีเซ็ตเวลา?</h2>
      <p class="muted" style="margin:0 0 16px">เวลาที่ถ่ายไปแล้ว ${fmt(Math.max(0,used))} จะถูกล้าง และนาฬิกากลับไปเริ่มที่ ${durTxt(cur.dur)}</p>
      <div class="two"><button class="btn" data-act="canceldel">ยกเลิก</button><button class="btn dangerfill" data-act="doreset">รีเซ็ตเวลา</button></div>`);break}
    case 'doreset':closeSheet();cur.t=newT(cur);cur.seg=0;render();toast('รีเซ็ตเวลาแล้ว');break;
    case 'rnav':{const n=visRefs(cur).length;cur.ri=(cur.ri+ +el.dataset.d+n)%n;render();break}
    case 'shotsel':cur.sel=el.dataset.k;cur.ri=0;render();break;
    case 'ftype':{const k=el.dataset.k;document.querySelectorAll('#typeSeg button').forEach(b=>b.classList.toggle('on',b.dataset.k===k));document.getElementById('soloF').hidden=k!=='solo';document.getElementById('projF').hidden=k!=='project';document.getElementById('addForm').dataset.type=k;break}
    case 'addslot':{const L=document.getElementById('slotList'),rows=L.querySelectorAll('.slotrow'),last=rows[rows.length-1];
      L.insertAdjacentHTML('beforeend',slotRow(rows.length,{date:last.querySelector('.sDate').value,place:last.querySelector('.sPlace').value,dur:+last.querySelector('.sDur').value}));
      L.lastElementChild.querySelector('.sTime').focus();break}
    case 'remslot':el.closest('.slotrow').remove();document.querySelectorAll('#slotList .sno').forEach((x,i)=>x.textContent=i+1);break;
    case 'addmem':document.getElementById('memList').insertAdjacentHTML('beforeend',memRow(document.querySelectorAll('#memList .memrow').length));break;
    case 'rpick':cur.ri=+el.dataset.i;render();break;
    case 'rdone':{const r=visRefs(cur)[cur.ri];r.done=!r.done;render();break}
  }
});
document.addEventListener('submit',e=>{const f=e.target;if(!f.classList.contains('rp-add'))return;e.preventDefault();
  const s=byId(f.dataset.id),inp=f.querySelector('.rpUrl'),u=inp.value.trim();
  let ok=false;try{ok=/^https?:$/.test(new URL(u).protocol)}catch(_){}
  if(!ok){toast('ลิงก์ต้องขึ้นต้นด้วย https://');inp.focus();return}
  const shot=f.querySelector('.rpShot')?.value||(s.sel&&s.sel!=='all'?s.sel:s.shots[0].id);
  s.refs.push({label:domainOf(u),link:u,done:false,shot});if(S.open===s.id)s.ri=Math.max(0,visRefs(s).length-1);render();toast(`เพิ่มลิงก์รูป ref ให้ ${s.name} แล้ว`);
  const again=document.querySelector(`.rp-add[data-id="${s.id}"] .rpUrl`);if(again)again.focus()});
document.addEventListener('error',e=>{const t=e.target;if(t.tagName==='IMG'&&t.hasAttribute('data-link'))t.classList.add('broken')},true);
document.addEventListener('change',e=>{const id=e.target.dataset?.stageId;if(!id)return;const s=byId(id);s.stage=e.target.value;render();toast(`${s.name} · ย้ายไป "${stg(s).t}"`)});
document.addEventListener('input',e=>{if(e.target.id==='jobQ'){S.q=e.target.value;document.getElementById('jobList').innerHTML=jobsList()}
  if(e.target.id==='todayQ'){S.tq=e.target.value;document.getElementById('todayList').innerHTML=todayList();paint()}});
document.getElementById('refInput').addEventListener('change',e=>{
  const sh=byId(S.refTarget??S.open);S.refTarget=null;if(!sh)return;const files=[...e.target.files];
  const shot=sh.sel==='all'?sh.shots[0].id:sh.sel;
  if(!files.length)return;
  Promise.all(files.map(f=>fileToRefDataURL(f).then(url=>({label:f.name.replace(/\.[^.]+$/,''),url,done:false,shot})).catch(()=>null))).then(list=>{
  list=list.filter(Boolean);if(list.length<files.length)toast('บางไฟล์อ่านไม่ได้ เพิ่มเฉพาะไฟล์ที่เป็นรูป');
  sh.refs.push(...list);files.length=list.length;if(!list.length)return;sh.ri=visRefs(sh).length-files.length;render();toast(S.open===sh.id?`เพิ่มรูป ${files.length} รูป · ${shotOf(sh,shot).label}`:`เพิ่มรูป ref ${files.length} รูปให้ ${sh.name}${sh.shots.length>1?' · '+shotOf(sh,shot).label:''}`)});
  e.target.value='';
});
document.addEventListener('keydown',e=>{
  const sheetOpen=!!document.getElementById('sheetRoot').innerHTML;
  if(e.key==='Escape'&&document.querySelector('.menu')){closeMenu();return}
  if(e.key==='Escape'){if(sheetOpen)closeSheet();else if(S.open!==null)closeSession();return}
  if(S.open!==null&&!sheetOpen){if(e.key==='ArrowRight')document.querySelector('[data-act=rnav][data-d="1"]')?.click();if(e.key==='ArrowLeft')document.querySelector('[data-act=rnav][data-d="-1"]')?.click()}});
