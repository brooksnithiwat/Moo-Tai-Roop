/* Pose-reference illustrations drawn on canvas.
   Used only for the sample data, so the app has something to show before real refs exist. */
/* ---------- generated pose references (canvas) ---------- */
const DEG=Math.PI/180;
function rng(str){let h=1779033703^str.length;for(let i=0;i<str.length;i++){h=Math.imul(h^str.charCodeAt(i),3432918353);h=h<<13|h>>>19}
  return ()=>{h=Math.imul(h^h>>>16,2246822507);h=Math.imul(h^h>>>13,3266489909);return ((h^=h>>>16)>>>0)/4294967296}}
const hs=(a,b,c,al=1)=>`hsla(${((a%360)+360)%360},${b}%,${c}%,${al})`;
const F=o=>({x:300,y:430,s:560,t:0,la:[-10,-4],ra:[10,4],ll:[-5,-2],rl:[5,2],tilt:0,dh:0,...o});

const POSES={
 'ยืนหันข้าง มองกล้อง':{scene:'park',figs:[F({t:4,la:[-6,4],ra:[42,-55],rl:[14,4],tilt:8,cloak:{wind:.3},long:1})]},
 'ผ้าคลุมปลิว':{scene:'park',figs:[F({la:[-75,-95],ra:[70,88],ll:[-8,-4],rl:[8,4],cloak:{wind:1.4},long:1})]},
 'ยกถาดขนมหวาน':{scene:'studio',figs:[F({la:[-55,-95],ra:[55,95],skirt:1,long:1})]},
 'นั่งริมหน้าต่าง':{scene:'wall',figs:[F({x:330,y:505,ll:[-85,-5],rl:[-72,4],la:[-30,-80],ra:[10,-30],skirt:1,long:1,tilt:10})]},
 'นั่งบนบันได':{scene:'stairs',figs:[F({y:505,t:-8,ll:[-85,-5],rl:[-72,4],la:[-38,-88],ra:[-24,-82],cloak:{wind:.2},long:1})]},
 'โคลสอัปมือ':{scene:'studio',figs:[F({y:930,s:1300,la:[-38,-172],ra:[30,-168],long:1})]},
 'ชักดาบ มุมต่ำ':{scene:'event',figs:[F({y:415,s:610,ll:[-28,-8],rl:[30,12],ra:[150,176],la:[-60,-112],prop:{type:'sword',hand:'r',ang:176},cloak:{wind:.6}})]},
 'หลังพิงเสา':{scene:'pillar',figs:[F({x:340,t:-6,la:[32,-72],ra:[-26,74],rl:[24,-38]})]},
 'แอ็กชันกระโดด':{scene:'event',figs:[F({y:350,ll:[-70,12],rl:[52,-30],la:[-145,-165],ra:[120,100],prop:{type:'sword',hand:'r',ang:100},shadowY:715,cloak:{wind:1}})]},
 'ถือไม้กายสิทธิ์':{scene:'studio',figs:[F({ra:[132,162],la:[-15,-5],skirt:1,hat:1,long:1,prop:{type:'wand',hand:'r',ang:165}})]},
 'ไฟย้อนแสง':{scene:'backlit',figs:[F({sil:1,skirt:1,hat:1,long:1,la:[-22,-8],ra:[24,10]})]},
 'นั่งกับกลีบดอก':{scene:'garden',petals:1,figs:[F({y:565,ll:[-75,85],rl:[-62,95],skirt:1,long:1,la:[-18,40],ra:[18,-40]})]},
 'เงาบนผนัง':{scene:'wall',figs:[F({x:250,la:[-95,-60],ra:[28,8],ll:[-10,-4],rl:[12,4],hat:1,skirt:1,long:1})]},
 'ยิ้มมองล่าง':{scene:'park',figs:[F({tilt:-14,la:[-12,28],ra:[12,-28],long:1,skirt:1})]},
 'เกราะเต็มตัว':{scene:'snow',figs:[F({helmet:1,armor:1,ra:[18,4],ll:[-9,-3],rl:[9,3],prop:{type:'sword',hand:'r',ang:6},cloak:{wind:.5}})]},
 'ลอยตัว ไร้น้ำหนัก':{scene:'space',figs:[F({y:400,t:24,la:[-110,-132],ra:[100,78],ll:[-30,-52],rl:[40,10],helmet:1,shadowY:-1})]},
 'ถอดหมวกอวกาศ':{scene:'space',figs:[F({la:[-25,42],ra:[20,5],prop:{type:'helmet',hand:'l'},shadowY:-1,long:1})]},
 'ยืนเรียงหน้ากำแพงดอกไม้':{scene:'flowers',figs:[0,1,2,3].map(i=>F({x:105+i*130,y:470,s:360,dh:i*70,ra:[i%2?40:10,i%2?-52:4],skirt:i%2===0,long:i%2===0,hat:i===0}))},
 'นั่งล้อมโต๊ะน้ำชา':{scene:'studio',table:1,figs:[
   F({x:300,y:470,s:380,la:[-30,-82],ra:[30,82],long:1}),
   F({x:120,y:545,s:400,dh:90,t:8,ll:[80,10],rl:[70,0],la:[22,72],ra:[40,82],skirt:1,hat:1,long:1}),
   F({x:480,y:545,s:400,dh:200,t:-8,ll:[-70,0],rl:[-80,-10],la:[-40,-82],ra:[-22,-72]})]},
 'เดินเข้าหากล้อง':{scene:'park',figs:[[150,400,330,0],[450,400,330,120],[230,472,440,60],[390,472,440,200]].map(([x,y,s,dh],i)=>F({x,y,s,dh,ll:[-14,4],rl:[16,30],la:[16,26],ra:[-16,-6],long:i%2,skirt:i===2,cloak:i===3?{wind:.6}:0}))},
 'หันหลังชนกัน':{scene:'studio',figs:[F({x:250,y:440,s:540,la:[26,-70],ra:[-20,70],long:1,skirt:1}),F({x:350,y:440,s:540,dh:300,la:[26,-70],ra:[-20,70]})]},
 'ชูดาบเถาวัลย์':{scene:'garden',figs:[F({ra:[165,178],la:[-25,-10],ll:[-14,-6],rl:[10,4],prop:{type:'sword',hand:'r',ang:178,vine:1},cloak:{wind:.5}})]},
 'กุหลาบปิดหน้า':{scene:'studio',dark:1,figs:[F({ra:[40,-160],skirt:1,long:1,prop:{type:'rose',hand:'r'}})]},
};

function drawFig(g,o,hh){
  const s=o.s,U=(a,l)=>[Math.sin(a*DEG)*l*s,Math.cos(a*DEG)*l*s],add=(p,q)=>[p[0]+q[0],p[1]+q[1]];
  const hip=[o.x,o.y],tu=[Math.sin(o.t*DEG),-Math.cos(o.t*DEG)],pp=[Math.cos(o.t*DEG),Math.sin(o.t*DEG)];
  const neck=add(hip,[tu[0]*.3*s,tu[1]*.3*s]);
  const sh=k=>add(neck,[pp[0]*k*.075*s,pp[1]*k*.075*s]),hp=k=>add(hip,[pp[0]*k*.055*s,pp[1]*k*.055*s]);
  const limb=(st,a,l1,l2)=>{const m=add(st,U(a[0],l1));return [st,m,add(m,U(a[1],l2))]};
  const A={l:limb(sh(-1),o.la,.16,.15),r:limb(sh(1),o.ra,.16,.15)},Lg={l:limb(hp(-1),o.ll,.24,.24),r:limb(hp(1),o.rl,.24,.24)};
  const head=add(neck,[tu[0]*.1*s+(o.tilt||0)*.003*s,tu[1]*.1*s+Math.abs(o.tilt||0)*.0012*s]);
  const mono=o.mono||(o.sil?'#140f1a':null),C=c=>mono||c;
  const main=C(hs(hh,48,46)),dark=C(hs(hh,42,28)),acc=C(hs(hh+45,62,70)),skin=C('#E8C3A4'),hair=C(hs(hh+160,55,62)),boot=C(hs(hh,25,18));
  const line=(pts,w,col)=>{g.beginPath();g.moveTo(...pts[0]);pts.slice(1).forEach(p=>g.lineTo(...p));g.lineWidth=w*s;g.strokeStyle=col;g.lineCap=g.lineJoin='round';g.stroke()};
  const circ=(p,r,col)=>{g.beginPath();g.arc(p[0],p[1],r*s,0,7);g.fillStyle=col;g.fill()};
  g.save();
  if(o.sil){g.shadowColor='rgba(255,236,200,.95)';g.shadowBlur=28}
  // long hair behind
  if(o.long&&!o.helmet){g.beginPath();g.moveTo(head[0]-.07*s,head[1]-.02*s);g.quadraticCurveTo(head[0]-.1*s,neck[1]+.12*s,head[0]-.05*s,neck[1]+.16*s);g.lineTo(head[0]+.05*s,neck[1]+.16*s);g.quadraticCurveTo(head[0]+.1*s,neck[1]+.12*s,head[0]+.07*s,head[1]-.02*s);g.closePath();g.fillStyle=hair;g.fill()}
  // cloak
  if(o.cloak){const w=o.cloak.wind||0,a=sh(-1),b=sh(1);
    g.beginPath();g.moveTo(...a);g.quadraticCurveTo(hip[0]-.2*s+w*.08*s,hip[1],hip[0]-.12*s+w*.28*s,hip[1]+.42*s);
    g.quadraticCurveTo(hip[0]+w*.3*s,hip[1]+.3*s,hip[0]+.16*s+w*.38*s,hip[1]+.36*s-w*.1*s);
    g.quadraticCurveTo(hip[0]+.2*s+w*.3*s,hip[1]-.05*s,...b);g.closePath();g.fillStyle=dark;g.fill()}
  // far limbs
  line(Lg.l,.075,mono?mono:hs(hh,30,30));line(Lg.l.slice(1),.072,boot);
  line(A.l,.06,mono?mono:hs(hh,40,34));circ(A.l[2],.028,skin);
  // near leg
  line(Lg.r,.078,mono?mono:hs(hh,30,36));line(Lg.r.slice(1),.074,boot);
  // skirt
  if(o.skirt){g.beginPath();g.moveTo(...add(hp(-1),[-.02*s,-.02*s]));g.lineTo(...add(hp(1),[.02*s,-.02*s]));g.lineTo(hip[0]+.17*s,hip[1]+.22*s);g.lineTo(hip[0]-.17*s,hip[1]+.22*s);g.closePath();g.fillStyle=main;g.fill();
    line([[hip[0]-.17*s,hip[1]+.215*s],[hip[0]+.17*s,hip[1]+.215*s]],.014,acc)}
  // torso
  g.beginPath();g.moveTo(...sh(-1));g.lineTo(...sh(1));g.lineTo(...hp(1));g.lineTo(...hp(-1));g.closePath();g.fillStyle=main;g.fill();g.lineWidth=.07*s;g.strokeStyle=main;g.lineJoin='round';g.stroke();
  line([add(hp(-1),[0,-.03*s]),add(hp(1),[0,-.03*s])],.022,acc);
  line([add(neck,[0,.02*s]),add(neck,[tu[0]*-.12*s,-tu[1]*.12*s])],.01,mono?mono:hs(hh+45,62,70,.6));
  if(o.armor){circ(sh(-1),.05,C('#c9d1dc'));circ(sh(1),.05,C('#dfe5ec'));line([sh(-1),sh(1)],.03,C('#aeb8c6'))}
  // neck + head
  line([neck,add(neck,[tu[0]*.04*s,tu[1]*.04*s])],.035,skin);
  if(o.helmet){circ(head,.082,C('#e9edf2'));g.beginPath();g.ellipse(head[0]+.01*s,head[1]+.005*s,.058*s,.045*s,0,0,7);g.fillStyle=C('#1f2b45');g.fill();
    if(!mono){g.beginPath();g.ellipse(head[0]-.01*s,head[1]-.015*s,.02*s,.01*s,-.5,0,7);g.fillStyle='rgba(255,255,255,.6)';g.fill()}}
  else{circ(add(head,[0,-.01*s]),.07,hair);circ(add(head,[0,.012*s]),.055,skin);
    g.beginPath();g.arc(head[0],head[1]-.004*s,.064*s,Math.PI*1.05,Math.PI*1.95);g.lineWidth=.03*s;g.strokeStyle=hair;g.stroke()}
  if(o.hat){g.beginPath();g.ellipse(head[0],head[1]-.05*s,.11*s,.022*s,0,0,7);g.fillStyle=dark;g.fill();
    g.beginPath();g.moveTo(head[0]-.06*s,head[1]-.055*s);g.lineTo(head[0]+.05*s,head[1]-.24*s);g.lineTo(head[0]+.065*s,head[1]-.055*s);g.closePath();g.fill()}
  // near arm
  line(A.r,.062,main);circ(A.r[2],.029,skin);
  // props
  const pr=o.prop;if(pr){const hd=pr.hand==='l'?A.l[2]:A.r[2];
    if(pr.type==='sword'){const tip=add(hd,U(pr.ang,.6)),back=add(hd,U(pr.ang+180,.09));line([hd,tip],.02,C('#dce3ec'));line([hd,tip],.006,C('#ffffff'));line([hd,back],.024,boot);
      const gp=U(pr.ang+90,.05);line([add(hd,gp),add(hd,[-gp[0],-gp[1]])],.022,C('#d4a94a'));
      if(pr.vine)for(let i=1;i<6;i++){const p=add(hd,U(pr.ang,.1*i));circ(add(p,U(pr.ang+90,(i%2?1:-1)*.02)),.018,C(hs(110,50,40)))}}
    if(pr.type==='wand'){const tip=add(hd,U(pr.ang,.28));line([hd,tip],.014,C('#6b4a2b'));
      if(!mono){const gr=g.createRadialGradient(tip[0],tip[1],0,tip[0],tip[1],.12*s);gr.addColorStop(0,'rgba(255,245,200,.95)');gr.addColorStop(1,'rgba(255,245,200,0)');g.fillStyle=gr;g.fillRect(tip[0]-.12*s,tip[1]-.12*s,.24*s,.24*s)}
      g.beginPath();for(let i=0;i<10;i++){const r=(i%2?.018:.045)*s,a=i*36*DEG;g.lineTo(tip[0]+Math.sin(a)*r,tip[1]-Math.cos(a)*r)}g.closePath();g.fillStyle=C('#ffd75e');g.fill()}
    if(pr.type==='rose'){line([hd,add(hd,[.02*s,.12*s])],.008,C('#2f6b3a'));circ(add(hd,[-.01*s,-.01*s]),.035,C('#b3122e'));circ(add(hd,[-.015*s,-.018*s]),.018,C('#e0405a'))}
    if(pr.type==='helmet'){const p=add(hd,[-.02*s,.03*s]);circ(p,.075,C('#e9edf2'));g.beginPath();g.ellipse(p[0]+.01*s,p[1],.05*s,.04*s,0,0,7);g.fillStyle=C('#1f2b45');g.fill()}}
  g.restore();
  return Math.max(Lg.l[2][1],Lg.r[2][1]);
}

function drawScene(g,k,h,p,W,H,R){
  const lin=(y0,y1,stops)=>{const gr=g.createLinearGradient(0,y0,0,y1);stops.forEach((c,i)=>gr.addColorStop(i/(stops.length-1),c));return gr};
  const glow=(x,y,r,c)=>{const gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,c);gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(x-r,y-r,r*2,r*2)};
  const rect=(c,x,y,w,hh)=>{g.fillStyle=c;g.fillRect(x,y,w,hh)};
  if(k==='park'||k==='garden'){rect(lin(0,620,['#8fc1e6','#cfe3ee','#f6e6d0']),0,0,W,620);glow(470,170,260,'rgba(255,240,205,.8)');
    for(let i=0;i<14;i++){g.beginPath();g.arc(R()*W,500+R()*90,50+R()*70,0,7);g.fillStyle=hs(105+R()*30,30,30+R()*12,.9);g.fill()}
    rect(lin(590,H,['#86a96f','#5b7c48']),0,590,W,H-590);
    if(k==='garden')for(let i=0;i<60;i++){g.beginPath();g.arc(R()*W,560+R()*230,4+R()*7,0,7);g.fillStyle=hs([330,350,45,0][i%4],70,72);g.fill()}}
  if(k==='snow'){rect(lin(0,600,['#b9cadc','#e6eef5']),0,0,W,600);for(let i=0;i<8;i++){g.beginPath();g.moveTo(R()*W,600);g.lineTo(R()*W,330+R()*120);g.lineTo(R()*W+80,600);g.fillStyle='rgba(120,140,165,.35)';g.fill()}rect(lin(590,H,['#f4f8fb','#d5e1ea']),0,590,W,H-590)}
  if(k==='studio'){const d=p.dark;rect(lin(0,H,d?[hs(h,25,22),hs(h,30,10)]:[hs(h,22,86),hs(h,20,66)]),0,0,W,H);glow(110,110,340,d?'rgba(255,220,230,.35)':'rgba(255,255,255,.75)');rect(lin(650,H,['rgba(0,0,0,0)','rgba(0,0,0,.18)']),0,650,W,H-650)}
  if(k==='stairs'){rect(lin(0,560,['#e2d6c4','#bfae96']),0,0,W,560);for(let i=0;i<7;i++){rect(i%2?'#b9a78f':'#cbbba5',0,560+i*36,W,36);rect('rgba(0,0,0,.12)',0,560+i*36,W,4)}}
  if(k==='pillar'){rect(lin(0,H,['#ebe2d4','#c6b59e']),0,0,W,H);const gr=g.createLinearGradient(110,0,240,0);['#a99782','#e8dfd2','#b9a892'].forEach((c,i)=>gr.addColorStop(i/2,c));rect(gr,110,0,130,H);rect('#d8cdbd',95,0,160,40);rect('rgba(0,0,0,.15)',0,690,W,H-690)}
  if(k==='wall'){rect(lin(0,690,[hs(h,18,84),hs(h,16,74)]),0,0,W,690);rect(lin(690,H,[hs(h,15,58),hs(h,15,46)]),0,690,W,H-690);glow(60,200,420,'rgba(255,248,230,.55)')}
  if(k==='flowers'){rect('#2d4532',0,0,W,620);for(let i=0;i<340;i++){const x=R()*W,y=R()*610,r=6+R()*14;g.beginPath();g.arc(x,y,r,0,7);g.fillStyle=R()<.35?hs(120+R()*20,30,30):hs([335,350,20,48,0][i%5],60+R()*20,70+R()*18);g.fill()}rect(lin(610,H,['#d9c8b4','#b39e86']),0,610,W,H-610)}
  if(k==='backlit'){rect(hs(h,40,14),0,0,W,H);glow(300,330,560,'rgba(255,246,225,1)');rect(lin(680,H,['rgba(10,8,16,.4)','rgba(10,8,16,.85)']),0,680,W,H-680)}
  if(k==='space'){rect(lin(0,H,['#070b24','#1e1448']),0,0,W,H);for(let i=0;i<220;i++){g.fillStyle=`rgba(255,255,255,${.3+R()*.7})`;g.fillRect(R()*W,R()*H,R()*2+.5,R()*2+.5)}
    g.beginPath();g.arc(470,170,92,0,7);g.fillStyle=lin(80,260,[hs(h+30,55,62),hs(h,50,32)]);g.fill();g.beginPath();g.ellipse(470,170,150,26,-.3,0,7);g.lineWidth=6;g.strokeStyle='rgba(255,230,200,.5)';g.stroke()}
  if(k==='event'){rect(lin(0,620,['#2c2840','#5d5478']),0,0,W,620);for(let i=0;i<9;i++)glow(R()*W,40+R()*60,40,'rgba(255,250,220,.7)');
    g.save();g.filter='blur(6px)';for(let i=0;i<7;i++){g.fillStyle=hs(R()*360,55,55,.75);g.fillRect(R()*W-40,360+R()*120,90+R()*80,130+R()*80)}g.restore();
    rect(lin(600,H,['#938ea6','#5c586f']),0,600,W,H-600)}
}

function genRef(r){
  if(r._img)return r._img;
  const W=600,H=800,c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');
  const p=POSES[r.label]||{scene:'park',figs:[F({long:1})]},h=r.h??200,R=rng(r.label);
  try{
    drawScene(g,p.scene,h,p,W,H,R);
    p.figs.forEach(o0=>{const o={...o0},hh=h+o.dh;
      if(p.scene==='wall')drawFig(g,{...o,x:o.x+150,y:o.y-30,mono:'rgba(30,22,40,.28)'},hh);
      if(o.shadowY!==-1){const fy=o.shadowY||o.y+.47*o.s;const gr=g.createRadialGradient(o.x,fy,0,o.x,fy,.22*o.s);gr.addColorStop(0,'rgba(0,0,0,.32)');gr.addColorStop(1,'rgba(0,0,0,0)');g.save();g.translate(o.x,fy);g.scale(1,.18);g.translate(-o.x,-fy);g.fillStyle=gr;g.fillRect(o.x-.22*o.s,fy-.22*o.s,.44*o.s,.44*o.s);g.restore()}
      drawFig(g,o,hh)});
    if(p.table){g.beginPath();g.ellipse(300,615,175,42,0,0,7);g.fillStyle='#f6f1ea';g.fill();g.fillStyle='#e8dfd3';g.fillRect(125,615,350,150);g.beginPath();g.ellipse(300,765,175,20,0,0,Math.PI);g.fill();
      g.beginPath();g.arc(300,590,26,0,7);g.fillStyle=hs(h+180,40,60);g.fill();[[220,606],[380,606]].forEach(([x,y])=>{g.fillStyle='#fff';g.fillRect(x-12,y-14,24,16)})}
    if(p.petals)for(let i=0;i<40;i++){g.save();g.translate(R()*W,R()*H*.8);g.rotate(R()*6);g.beginPath();g.ellipse(0,0,7,4,0,0,7);g.fillStyle=hs(345,70,82,.85);g.fill();g.restore()}
    if(p.scene==='snow')for(let i=0;i<120;i++){g.beginPath();g.arc(R()*W,R()*H,1+R()*2.5,0,7);g.fillStyle='rgba(255,255,255,.85)';g.fill()}
    const v=g.createRadialGradient(W/2,H/2,H*.3,W/2,H/2,H*.75);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,.32)');g.fillStyle=v;g.fillRect(0,0,W,H);
    for(let i=0;i<4000;i++){g.fillStyle=R()<.5?'rgba(255,255,255,.05)':'rgba(0,0,0,.05)';g.fillRect(R()*W,R()*H,1.4,1.4)}
    r._img=c.toDataURL('image/jpeg',.84);
  }catch(e){r._img=''}
  return r._img;
}
