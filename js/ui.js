/* ============================================================
 * 介面  js/ui.js
 * 狀態、清單填充、模糊比對、觸發判定、結果渲染、自訂遊戲、AI 查詢、匯出／匯入、複製、列印。
 * 設定值（版本、資料日期、API 金鑰）在 js/config.js。
 * ============================================================ */

const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const state={plat:'mobile',mMode:'model',customGames:[]};
const RAM_OPTS=[1,2,3,4,6,8,12,16,24];

/* ---------- 名稱處理 ---------- */
function short(n){
  return String(n).replace(/^NVIDIA GeForce /,'').replace(/^AMD Radeon /,'Radeon ').replace(/^Intel Core /,'Core ').replace(/^Apple /,'').replace(/^Google /,'');
}
function norm(s){
  return String(s).toLowerCase().replace(/驍龍/g,'snapdragon').replace(/天璣/g,'dimensity').replace(/曦力/g,'helio').replace(/蘋果/g,'apple')
    .replace(/[\s\-_–—（）()／/,.．、:：]+/g,'');
}
/* 模糊比對：先完全相同，再看包含（取名稱最短者） */
function findByName(kind,text,opt={}){
  const q=norm(text||''); if(q.length<2) return {item:null,others:0};
  let pool=(kind==='cpu'?CPUS:kind==='gpu'?GPUS:SOCS);
  if(opt.group) pool=pool.filter(x=>x.g===opt.group);
  if(!opt.generic) pool=pool.filter(x=>!x.generic);
  if(opt.ios===true) pool=pool.filter(x=>x.ios); else if(opt.ios===false) pool=pool.filter(x=>!x.ios);
  const exact=pool.find(x=>norm(x.n)===q); if(exact) return {item:exact,others:0};
  const cands=pool.filter(x=>norm(x.n).includes(q));
  if(!cands.length) return {item:null,others:0};
  cands.sort((a,b)=>a.n.length-b.n.length);
  return {item:cands[0],others:cands.length-1};
}
function showMatch(divId,res,label){
  const d=$(divId); if(!d) return;
  if(res===null){d.textContent='';d.className='match';return;}
  if(res.item){d.className='match ok';d.textContent='→ '+res.item.n+'（指數 '+res.item.s+'）'+(res.others?'，另有 '+res.others+' 個相近項目可從清單挑選':'');}
  else{d.className='match bad';d.textContent='找不到對應的'+(label||'硬體')+'，請從清單挑選相近型號';}
}

/* ---------- 遊戲清單 ---------- */
function allGames(){ return GAMES.concat(state.customGames); }
function gamesFor(plat){ return allGames().filter(g=>plat==='pc'?!!g.pc:(!!g.android||!!g.ios)); }
function fillGames(keepId){
  const sel=$('gameSel'), list=gamesFor(state.plat);
  const prev=keepId||sel.value; sel.innerHTML='';
  const ph=document.createElement('option');ph.value='';ph.textContent='請選擇遊戲';ph.disabled=true;ph.selected=true;sel.appendChild(ph);   // 預設不選任何遊戲
  const cats=[...new Set(list.map(g=>g.cat))];
  cats.forEach(c=>{
    const og=document.createElement('optgroup'); og.label=c;
    list.filter(g=>g.cat===c).forEach(g=>{const o=document.createElement('option');o.value=g.id;o.textContent=g.n+(g.en&&g.en!==g.n?'（'+g.en+'）':'');og.appendChild(o);});
    sel.appendChild(og);
  });
  if(prev&&list.some(g=>g.id===prev)) sel.value=prev; else sel.value='';
  sel.classList.toggle('placeholder',!sel.value);
  updateGameInfo();
}
function currentGame(){ const id=$('gameSel').value; return allGames().find(g=>g.id===id)||null; }
function updateGameInfo(){
  const g=currentGame(), d=$('gameInfo'); if(!g){d.textContent='';return;}
  const pcLabel=g.pc?('PC'+(g.pc.viaKind==='emu'?'（模擬器）':g.pc.viaKind==='gpg'?'（Google Play Games）':g.pc.viaKind==='official'?'（官方電腦版）':'')):null;
  const plats=[pcLabel,g.android&&'Android',g.ios&&'iOS'].filter(Boolean).map(p=>'<span class="plat">'+esc(p)+'</span>').join('');
  const v=g.custom?'自訂遊戲':g.verified?'已對照官方頁面':'依公開資料整理，請以官方為準';
  d.innerHTML=plats+' '+esc(v)+(g.upd?'（'+esc(g.upd)+'）':'')+(g.note?'<br>'+esc(g.note):'');
}

/* ---------- 手機面板 ---------- */
function fillBrands(){
  const b=$('mBrand'); b.innerHTML='';
  [...new Set(PHONES.map(p=>p.b))].forEach(x=>{const o=document.createElement('option');o.value=x;o.textContent=x;b.appendChild(o);});
  fillModels();
}
function fillModels(){
  const m=$('mModel'); m.innerHTML='';
  PHONES.filter(p=>p.b===$('mBrand').value).forEach(p=>{const o=document.createElement('option');o.value=p.n;o.textContent=p.n;m.appendChild(o);});
  fillModelRam();
}
function currentPhone(){ return PHONES.find(p=>p.b===$('mBrand').value&&p.n===$('mModel').value)||null; }
function fillModelRam(){
  const p=currentPhone(), r=$('mRamModel'); r.innerHTML='';
  (p?p.ram:[]).forEach(x=>{const o=document.createElement('option');o.value=x;o.textContent=x+' GB';r.appendChild(o);});
  const soc=p?byName('soc',p.soc):null;
  $('mSocShow').textContent=soc?soc.n+'（指數 '+soc.s+'）':'—';
}
function fillSocList(){
  const dl=$('socList'); dl.innerHTML='';
  SOCS.filter(s=>!s.generic).forEach(s=>{const o=document.createElement('option');o.value=s.n;dl.appendChild(o);});
  const r=$('mRamSoc'); r.innerHTML='';
  RAM_OPTS.forEach(x=>{const o=document.createElement('option');o.value=x;o.textContent=x+' GB';if(x===8)o.selected=true;r.appendChild(o);});
}
function setMobileMode(mode){
  state.mMode=mode;
  $('mModeModel').setAttribute('aria-pressed',mode==='model');
  $('mModeSoc').setAttribute('aria-pressed',mode==='soc');
  $('mByModel').classList.toggle('hide',mode!=='model');
  $('mBySoc').classList.toggle('hide',mode!=='soc');
  run();
}
function mobileUser(){
  let soc=null,ram=null,label='';
  if(state.mMode==='model'){
    const p=currentPhone(); if(!p) return null;
    soc=byName('soc',p.soc); ram=parseInt($('mRamModel').value,10); label=p.n+'（'+ram+' GB）';
  }else{
    const res=findByName('soc',$('mSoc').value); showMatch('mSocMatch',$('mSoc').value.trim()?res:null,'處理器');
    if(!res.item) return null;
    soc=res.item; ram=parseInt($('mRamSoc').value,10); label=soc.n+'（'+ram+' GB）';
  }
  const dv=$('mDisk').value;
  return {soc,ram,osVer:parseOsVer($('mOs').value),disk:dv===''?null:parseFloat(dv),label};
}

/* ---------- PC 面板 ---------- */
function fillPcLists(){
  const cf=$('cpuFilter'),gf=$('gpuFilter');
  const mk=(sel,groups)=>{sel.innerHTML='';[['','全部']].concat(groups.map(g=>[g,g])).forEach(([v,t])=>{const o=document.createElement('option');o.value=v;o.textContent=t;sel.appendChild(o);});};
  mk(cf,[...new Set(CPUS.filter(c=>!c.generic).map(c=>c.g))]);
  mk(gf,[...new Set(GPUS.filter(c=>!c.generic).map(c=>c.g))]);
  refillDatalist('cpu'); refillDatalist('gpu');
}
function refillDatalist(kind){
  const dl=$(kind+'List'), grp=$(kind+'Filter').value, pool=(kind==='cpu'?CPUS:GPUS).filter(x=>!x.generic&&(!grp||x.g===grp));
  dl.innerHTML=''; pool.forEach(x=>{const o=document.createElement('option');o.value=x.n;dl.appendChild(o);});
}
function pcUser(){
  const cRes=findByName('cpu',$('cpu').value,{group:$('cpuFilter').value||null});
  const gRes=findByName('gpu',$('gpu').value,{group:$('gpuFilter').value||null});
  showMatch('cpuMatch',$('cpu').value.trim()?cRes:null,'處理器');
  showMatch('gpuMatch',$('gpu').value.trim()?gRes:null,'顯示卡');
  const dv=$('disk').value;
  const cpu=cRes.item,gpu=gRes.item;
  const label=[cpu&&short(cpu.n),gpu&&short(gpu.n)].filter(Boolean).join(' ＋ ')||'（尚未選擇硬體）';
  return {cpu,gpu,ram:parseInt($('ram').value,10),os:$('os').value,drive:$('drive').value,disk:dv===''?null:parseFloat(dv),label:label+'，'+$('ram').value+' GB RAM'};
}

/* ---------- 執行與渲染 ---------- */
let lastText='';
function setMini(lv){
  const m=$('mini'); if(!m) return;
  if(lv==null){m.classList.add('hide');return;}
  m.classList.remove('hide'); $('miniLv').textContent=LEVELS[lv].t; $('miniLv').style.color='var(--l'+lv+')';
}
function run(){
  setMini(null); saveLastDebounced();
  const g=currentGame(), out=$('result');
  if(!g){out.innerHTML='<div class="result-empty">請先在左邊「1」選擇遊戲，再填你的裝置，這裡就會出現判定：整體結論、每個零件相對於官方最低與建議配備的位置，以及畫質／幀率的預估。</div>';return;}
  let user,res;
  if(state.plat==='pc'){
    user=pcUser();
    if(!user.cpu&&!user.gpu){out.innerHTML='<div class="result-empty">請輸入處理器或顯示卡（輸入幾個字就會出現清單，例如「4060」或「i5-12400」）。</div>';return;}
    res=evaluatePC(g,user);
  }else{
    user=mobileUser();
    if(!user){out.innerHTML='<div class="result-empty">'+(state.mMode==='soc'?'請輸入處理器型號，例如 Snapdragon 8 Gen 3、Dimensity 9300、A17 Pro。':'請選擇手機型號。')+'</div>';return;}
    res=evaluateMobile(g,user);
  }
  if(res.unsupported){out.innerHTML='<div class="result-empty">'+esc(res.unsupported)+'。</div>';return;}
  render(g,user,res);
}
/* 每次判定或欄位變動後記住目前填的硬體 */
const saveLastDebounced=debounce(saveLast,400);
function barHtml(row){
  const have=row.have?row.have.s:null;
  const min=row.min?row.min.score:null, rec=row.rec?row.rec.score:null, high=row.high?row.high.score:null;
  if(have==null||min==null) return '';
  const top=Math.max(have,high||(rec||min)*1.6,min*1.2)*1.06;
  const pos=v=>Math.round(Math.sqrt(v/top)*1000)/10;
  const mk=(v,l,cls)=>v==null?'':`<div class="mk ${cls}" data-l="${l}" style="left:${pos(v)}%"></div>`;
  let marks;
  if(rec==null||rec<=min) marks=mk(min,rec==null?'最低':'最低／建議','rec');
  else if(pos(rec)-pos(min)<9) marks=mk(min,'','')+mk(rec,'最低／建議','rec');
  else marks=mk(min,'最低','')+mk(rec,'建議','rec');
  if(high&&high>(rec||min)) marks+=mk(high,'高規','rec');
  return `<div class="bar" style="--lc:var(--l${row.lv})"><div class="fill" style="width:${pos(have)}%"></div>${marks}</div>`;
}
function tierText(t,unit){
  if(!t) return '—';
  if(t.items&&t.items.length) return t.items.map(i=>short(i.n)).join(' / ')+'（'+t.score+'）';
  return t.score+(unit?' '+unit:'');
}
function render(g,user,res){
  const lv=res.overall, L=LEVELS[lv];
  const bottleneck=res.rows.filter(r=>r.lv===lv&&r.have).map(r=>r.k);
  let html=`<div class="verdict"><div class="stamp l${lv} fresh${L.t.length>2?' n3':''}" aria-label="判定：${L.t}">${L.t}</div><div>
    <h3><span class="game">${esc(g.n)}</span> <span style="color:var(--ink-3)">×</span> ${esc(user.label)}</h3>
    ${state.plat==='pc'&&g.pc&&g.pc.via?`<p class="sum" style="font-size:13px;margin-bottom:4px">PC 遊玩方式：${esc(g.pc.via)}</p>`:''}
    <p class="sum">${esc(L.d)}${lv<3&&bottleneck.length?`（瓶頸：${esc(bottleneck.join('、'))}）`:''}</p>
    ${res.est?`<p class="est">預估體驗：<b>${esc(res.est)}</b></p>`:''}</div></div>`;
  html+='<div class="comp">';
  for(const r of res.rows){
    if(r.kind==='os'||r.kind==='drive'||r.kind==='disk'){
      const st=r.lv===0?['l0','不符']:r.state==='warn'?['warn',r.kind==='disk'?'不足':'注意']:(r.kind==='disk'&&r.text==='未填')||(r.kind==='os'&&r.text==='未填')?['info','未填']:['ok',r.kind==='disk'?'足夠':'符合'];
      html+=`<div class="crow"><div class="k">${r.k}</div><div class="v"><div class="name">${esc(r.text)}</div><div class="req">需求：${esc(r.req)}</div></div><div class="lv ${st[0]}">${st[1]}</div></div>`;
      continue;
    }
    if(!r.have){
      html+=`<div class="crow"><div class="k">${r.k}</div><div class="v"><div class="name" style="color:var(--ink-3)">未選擇</div><div class="req">最低：${esc(tierText(r.min,r.unit))}・建議：${esc(tierText(r.rec,r.unit))}</div></div><div class="lv info">—</div></div>`;
      continue;
    }
    const idx=r.kind==='ram'?'':`<span class="idx">指數 ${r.have.s}</span>`;
    html+=`<div class="crow"><div class="k">${r.k}</div><div class="v"><div class="name">${esc(r.have.n)} ${idx}</div>${barHtml(r)}<div class="req">最低：${esc(tierText(r.min,r.unit))}・建議：${esc(tierText(r.rec,r.unit))}${r.high?'・高規：'+esc(tierText(r.high,r.unit)):''}</div></div><div class="lv l${r.lv}">${LEVELS[r.lv].t}</div></div>`;
  }
  html+='</div>';
  if(res.notes.length){
    html+='<ul class="notes">'+res.notes.map(n=>typeof n==='string'?`<li>${esc(n)}</li>`:`<li class="${n.risk?'risk':''}">${esc(n.t)}</li>`).join('')+'</ul>';
  }
  html+=reqTable(g);
  html+='<div class="actions"><button type="button" class="btn small" id="copyBtn">複製結果文字</button><button type="button" class="btn small" id="printBtn">列印／存成 PDF</button></div>';
  html+=`<div class="rfoot"><span>檢驗日期 ${new Date().toISOString().slice(0,10)}</span><span>自動判定 v${APP_VERSION}</span><span>需求資料整理至 ${esc(DATA_DATE)}</span><span>指數為估計值，僅供參考</span></div>`;
  $('result').innerHTML=html;
  setMini(lv);
  lastText=plainText(g,user,res);
  $('copyBtn').addEventListener('click',copyResult);
  $('printBtn').addEventListener('click',()=>window.print());
}
function reqTable(g){
  const plat=state.plat==='pc'?'pc':(state.mMode==='model'?(currentPhone()&&currentPhone().os==='ios'?'ios':'android'):(findByName('soc',$('mSoc').value).item?.ios?'ios':'android'));
  const q=g[plat]; if(!q) return '';
  const hasHigh=!!q.high;
  const est=t=>t&&t.est?'（估）':'';
  const names=(t,k)=>t&&t[k]?(Array.isArray(t[k])?t[k]:[t[k]]).map(short).join(' / ')+est(t):'—';
  const rows=[];
  if(plat==='pc'){
    rows.push(['系統',q.os==='win10'?'Windows 10／11 64 位元':'Windows 7 以上','—']);
    rows.push(['處理器',names(q.min,'cpu'),names(q.rec,'cpu'),names(q.high,'cpu')]);
    rows.push(['顯示卡',names(q.min,'gpu'),names(q.rec,'gpu'),names(q.high,'gpu')]);
    rows.push(['記憶體',q.min.ram+' GB',q.rec?q.rec.ram+' GB'+est(q.rec):'—',q.high?q.high.ram+' GB':'—']);
    rows.push(['空間',q.disk!=null?q.disk+' GB'+(q.ssd==='req'?'（必須 SSD）':q.ssd==='rec'?'（建議 SSD）':''):'—',q.diskRec?q.diskRec+' GB':'—']);
  }else{
    const key=plat==='ios'?'chip':'soc', pn=plat==='ios'?'iOS':'Android';
    rows.push(['系統',q.min.os!=null?pn+' '+q.min.os+' 以上':'—',q.rec&&q.rec.os!=null?pn+' '+q.rec.os+' 以上':'—']);
    rows.push([plat==='ios'?'晶片':'處理器',names(q.min,key),names(q.rec,key)]);
    rows.push(['記憶體',q.min.ram!=null?q.min.ram+' GB':'—',q.rec&&q.rec.ram!=null?q.rec.ram+' GB'+est(q.rec):'—']);
    rows.push(['空間',q.disk!=null?q.disk+' GB':'—',q.diskRec?q.diskRec+' GB':'—']);
  }
  const platLabel=plat==='pc'?('PC'+(q.via?'・'+q.via:'')):plat==='ios'?'iOS':'Android';
  let h=`<table class="reqtab"><caption>${esc(g.n)} ${q.via&&q.viaKind!=='official'?'需求':'官方需求'}（${esc(platLabel)}）${g.upd?'・'+esc(g.upd):''}</caption><thead><tr><th></th><th>最低</th><th>建議</th>${hasHigh?'<th>高規</th>':''}</tr></thead><tbody>`;
  rows.forEach(r=>{h+=`<tr><th>${r[0]}</th><td>${esc(r[1])}</td><td>${esc(r[2]||'—')}</td>${hasHigh?`<td>${esc(r[3]||'—')}</td>`:''}</tr>`;});
  h+='</tbody></table>';
  if(g.src||g.srcName) h+=`<div class="src">資料來源：${g.src?`<a href="${esc(g.src)}" target="_blank" rel="noopener">${esc(g.srcName||g.src)}</a>`:esc(g.srcName)}${g.custom?'':'。硬體指數為估計值，實際效能依散熱、驅動與遊戲版本而異。'}</div>`;
  return h;
}
function plainText(g,user,res){
  const L=LEVELS[res.overall];
  const lines=[`【這台能不能玩？】${g.n} × ${user.label}`+(state.plat==='pc'&&g.pc&&g.pc.via?`（PC：${g.pc.via}）`:''),`結論：${L.t} — ${L.d}`];
  if(res.est) lines.push(`預估體驗：${res.est}`);
  for(const r of res.rows){
    if(r.kind==='os'||r.kind==='drive'||r.kind==='disk') lines.push(`・${r.k}：${r.text}（需求：${r.req}）`);
    else if(r.have) lines.push(`・${r.k}：${r.have.n}${r.kind==='ram'?'':'（指數 '+r.have.s+'）'} → ${LEVELS[r.lv].t}（最低 ${tierText(r.min,r.unit)}／建議 ${tierText(r.rec,r.unit)}）`);
  }
  res.notes.forEach(n=>lines.push('※ '+(typeof n==='string'?n:n.t)));
  if(g.srcName||g.src) lines.push(`需求資料：${g.srcName||''}${g.upd?'（'+g.upd+'）':''} ${g.src||''}`.trim());
  return lines.join('\n');
}
async function copyResult(){
  const b=$('copyBtn'); if(!b) return;
  try{
    if(navigator.clipboard&&window.isSecureContext) await navigator.clipboard.writeText(lastText);
    else{const ta=document.createElement('textarea');ta.value=lastText;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();}
    b.textContent='已複製'; setTimeout(()=>{b.textContent='複製結果文字';},1500);
  }catch(e){b.textContent='複製失敗，請手動選取'; setTimeout(()=>{b.textContent='複製結果文字';},2000);}
}

/* ---------- 自訂遊戲 ---------- */
function fillCustomLists(){
  const put=(id,arr)=>{const dl=$(id);dl.innerHTML='';arr.forEach(x=>{const o=document.createElement('option');o.value=x.n;dl.appendChild(o);});};
  put('cpuListAll',CPUS); put('gpuListAll',GPUS);
  put('socListAnd',SOCS.filter(s=>!s.ios)); put('socListIos',SOCS.filter(s=>s.ios));
  const M=[['cMinCpu','cpu',{generic:true}],['cRecCpu','cpu',{generic:true}],['cMinGpu','gpu',{generic:true}],['cRecGpu','gpu',{generic:true}],
           ['cMinSoc','soc',{generic:true,ios:false}],['cRecSoc','soc',{generic:true,ios:false}],['cMinChip','soc',{ios:true}],['cRecChip','soc',{ios:true}]];
  M.forEach(([id,kind,opt])=>{$(id).addEventListener('input',()=>showMatch(id+'M',$(id).value.trim()?findByName(kind,$(id).value,opt):null));});
  ['cHasPC','cHasAnd','cHasIos'].forEach(id=>$(id).addEventListener('change',syncCustomBoxes)); syncCustomBoxes();
}
function syncCustomBoxes(){
  $('cPCBox').classList.toggle('hide',!$('cHasPC').checked);
  $('cAndBox').classList.toggle('hide',!$('cHasAnd').checked);
  $('cIosBox').classList.toggle('hide',!$('cHasIos').checked);
}
/* 沒填建議硬體時，以最低 × 1.6 找一個最接近的真實硬體當估算 */
function nearestHardware(kind,score,ios){
  let pool=(kind==='cpu'?CPUS:kind==='gpu'?GPUS:SOCS).filter(x=>!x.generic);
  if(kind==='soc') pool=pool.filter(x=>!!x.ios===!!ios);
  return pool.reduce((best,x)=>Math.abs(x.s-score)<Math.abs(best.s-score)?x:best,pool[0]);
}
function setStatus(id,msg,cls){const d=$(id);d.textContent=msg;d.className='status'+(cls?' '+cls:'');}
function buildCustomGame(){
  const name=$('cName').value.trim(); if(!name) throw new Error('請填遊戲名稱');
  const num=id=>{const v=parseFloat($(id).value);return isNaN(v)?null:v;};
  const need=(id,kind,opt,label)=>{const v=$(id).value.trim();if(!v)throw new Error('請填'+label);const r=findByName(kind,v,opt);if(!r.item)throw new Error(label+'「'+v+'」找不到對應硬體，請從清單挑選相近型號');return r.item;};
  const opt_=(id,kind,opt,label)=>{const v=$(id).value.trim();if(!v)return null;const r=findByName(kind,v,opt);if(!r.item)throw new Error(label+'「'+v+'」找不到對應硬體，請從清單挑選相近型號');return r.item;};
  const g={id:'custom-'+Date.now().toString(36),n:name,en:$('cEn').value.trim()||undefined,cat:'自訂',custom:true,verified:false,upd:new Date().toISOString().slice(0,10),src:$('cSrc').value.trim()||undefined,srcName:'自訂資料'};
  if(!$('cHasPC').checked&&!$('cHasAnd').checked&&!$('cHasIos').checked) throw new Error('至少勾選一個平台');
  if($('cHasPC').checked){
    const mc=need('cMinCpu','cpu',{generic:true},'最低 CPU'), mg=need('cMinGpu','gpu',{generic:true},'最低 GPU');
    let rc=opt_('cRecCpu','cpu',{generic:true},'建議 CPU'), rg=opt_('cRecGpu','gpu',{generic:true},'建議 GPU');
    const est=!rc||!rg; rc=rc||nearestHardware('cpu',mc.s*1.6); rg=rg||nearestHardware('gpu',mg.s*1.6);
    const minRam=num('cMinRam')||8, recRam=num('cRecRam')||minRam;
    g.pc={os:'win10',min:{cpu:[mc.n],gpu:[mg.n],ram:minRam},rec:{cpu:[rc.n],gpu:[rg.n],ram:Math.max(recRam,minRam),est:est||undefined},disk:num('cDisk')||undefined,ssd:$('cSsd').value||undefined};
  }
  if($('cHasAnd').checked){
    const ms=need('cMinSoc','soc',{generic:true,ios:false},'Android 最低處理器');
    let rs=opt_('cRecSoc','soc',{generic:true,ios:false},'Android 建議處理器'); const est=!rs; rs=rs||nearestHardware('soc',ms.s*1.6,false);
    const minRam=num('cAMinRam')||2, recRam=num('cARecRam')||minRam;
    g.android={min:{soc:[ms.n],ram:minRam},rec:{soc:[rs.n],ram:Math.max(recRam,minRam),est:est||undefined}};
  }
  if($('cHasIos').checked){
    const mc=need('cMinChip','soc',{ios:true},'iOS 最低晶片');
    let rc=opt_('cRecChip','soc',{ios:true},'iOS 建議晶片'); const est=!rc; rc=rc||nearestHardware('soc',mc.s*1.6,true);
    const minRam=num('cIMinRam')||2, recRam=num('cIRecRam')||minRam;
    g.ios={min:{chip:mc.n,ram:minRam},rec:{chip:rc.n,ram:Math.max(recRam,minRam),est:est||undefined}};
  }
  return g;
}
function addCustomGame(g){ state.customGames.push(g); showGame(g); }
function showGame(g){
  const wantPlat=g.pc&&(state.plat==='pc'||!(g.android||g.ios))?'pc':(g.android||g.ios)?'mobile':'pc';
  if(wantPlat!==state.plat) setPlat(wantPlat,g.id); else {fillGames(g.id); run();}
}
/* 匯入時檢查硬體名稱是否存在於資料庫 */
function validateImported(g){
  const chk=(kind,names)=>(names||[]).filter(n=>!byName(kind,n));
  const bad=[];
  if(g.pc){['min','rec','high'].forEach(t=>{if(g.pc[t]){bad.push(...chk('cpu',g.pc[t].cpu),...chk('gpu',g.pc[t].gpu));}});}
  if(g.android){['min','rec'].forEach(t=>{if(g.android[t])bad.push(...chk('soc',g.android[t].soc));});}
  if(g.ios){['min','rec'].forEach(t=>{if(g.ios[t]&&g.ios[t].chip&&!byName('soc',g.ios[t].chip))bad.push(g.ios[t].chip);});}
  return bad;
}
function exportCustom(){
  if(!state.customGames.length){setStatus('cStatus','目前沒有自訂遊戲可匯出。','err');return;}
  const json=JSON.stringify(state.customGames,null,1);
  try{
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([json],{type:'application/json'}));a.download='custom-games.json';document.body.appendChild(a);a.click();a.remove();
    setStatus('cStatus','已下載 custom-games.json（'+state.customGames.length+' 款）。下次開啟頁面可用「匯入 JSON」貼回。','ok');
  }catch(e){
    $('cImportWrap').classList.remove('hide');$('cImport').value=json;setStatus('cStatus','瀏覽器不允許下載，已把 JSON 放到下方文字框，請自行複製保存。','ok');
  }
}
function importCustom(){
  let arr;
  try{arr=JSON.parse($('cImport').value);}catch(e){setStatus('cStatus','JSON 格式錯誤：'+e.message,'err');return;}
  if(!Array.isArray(arr)) arr=[arr];
  let ok=0,skipped=[];
  arr.forEach((g,i)=>{
    if(!g||!g.n||!(g.pc||g.android||g.ios)){skipped.push('第 '+(i+1)+' 筆缺少名稱或平台資料');return;}
    const bad=validateImported(g); if(bad.length){skipped.push(g.n+'：硬體名稱不存在（'+bad.join('、')+'）');return;}
    g.id=g.id||'custom-'+Date.now().toString(36)+'-'+i; g.cat='自訂'; g.custom=true; g.verified=false; g.srcName=g.srcName||'自訂資料';
    if(!state.customGames.some(x=>x.id===g.id)){state.customGames.push(g);ok++;}
  });
  if(ok) showGame(state.customGames[state.customGames.length-1]); else fillGames();
  setStatus('cStatus',`已匯入 ${ok} 款`+(skipped.length?'；略過：'+skipped.join('；'):''),skipped.length?'err':'ok');
}

/* ---------- AI 查詢 ---------- */
async function aiLookup(){
  const name=$('aiName').value.trim(); if(!name){setStatus('aiStatus','請先輸入遊戲名稱。','err');return;}
  const btn=$('aiBtn'); btn.disabled=true; setStatus('aiStatus','查詢中（會上網搜尋官方需求，約 10～30 秒）…');
  const prompt=`你是遊戲配備資料員。請用網路搜尋找出遊戲「${name}」官方公布的系統需求，只輸出一個 JSON 物件，不要 Markdown 圍欄、不要任何說明文字。格式：
{"name":"遊戲中文名","en":"英文名","source":"官方需求頁網址",
 "pc":{"minCpu":"","recCpu":"","minGpu":"","recGpu":"","minRam":8,"recRam":16,"disk":50,"ssd":"req|rec|none"},
 "android":{"minSoc":"","recSoc":"","minRam":4,"recRam":8,"minOs":10},
 "ios":{"minChip":"","recChip":"","minRam":4,"recRam":6,"minOs":15}}
規則：沒有該平台就把該平台設為 null；沒有建議配備就把 rec 欄位留空字串；硬體請寫成單一具體型號（例如 "Intel Core i5-8400"、"AMD Ryzen 5 3600"、"NVIDIA GeForce GTX 1060 6GB"、"Snapdragon 855"、"Dimensity 9000"、"Apple A13 Bionic"）；官方列多個同等硬體時選最常見的 NVIDIA／Intel／Qualcomm 那一個；iPhone 機型請換成對應的 Apple 晶片；數字欄位只填數字。`;
  try{
    const headers={'Content-Type':'application/json'};
    if(AI_CONFIG.apiKey){headers['x-api-key']=AI_CONFIG.apiKey;headers['anthropic-version']='2023-06-01';headers['anthropic-dangerous-direct-browser-access']='true';}
    const resp=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers,body:JSON.stringify({model:AI_CONFIG.model,max_tokens:1000,messages:[{role:'user',content:prompt}],tools:[{type:'web_search_20250305',name:'web_search'}]})});
    const data=await resp.json();
    if(!resp.ok||data.error) throw new Error((data.error&&data.error.message)||('HTTP '+resp.status));
    const text=(data.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('\n');
    const s=text.indexOf('{'),e=text.lastIndexOf('}'); if(s<0||e<0) throw new Error('AI 沒有回傳可解析的 JSON');
    const j=JSON.parse(text.slice(s,e+1).replace(/```json|```/g,''));
    fillCustomForm(j);
    setStatus('aiStatus','已填入下方表單。請逐一確認硬體對應（綠色為找到、紅色為找不到），必要時手動修正，再按「加入遊戲清單並檢測」。','ok');
  }catch(err){
    setStatus('aiStatus','查詢失敗：'+err.message+'。若是部署後的網站，請在程式最上方的 AI_CONFIG 填入 API 金鑰；或直接手動填寫下方表單。','err');
  }finally{btn.disabled=false;}
}
function fillCustomForm(j){
  const set=(id,v)=>{if(v!=null&&v!=='')$(id).value=v;};
  const hw=(id,kind,v,opt)=>{if(!v){$(id).value='';showMatch(id+'M',null);return;}const r=findByName(kind,v,opt);$(id).value=r.item?r.item.n:v;showMatch(id+'M',r);};
  set('cName',j.name||$('aiName').value); set('cEn',j.en); set('cSrc',j.source);
  $('cHasPC').checked=!!j.pc; $('cHasAnd').checked=!!j.android; $('cHasIos').checked=!!j.ios; syncCustomBoxes();
  if(j.pc){hw('cMinCpu','cpu',j.pc.minCpu,{generic:true});hw('cRecCpu','cpu',j.pc.recCpu,{generic:true});hw('cMinGpu','gpu',j.pc.minGpu,{generic:true});hw('cRecGpu','gpu',j.pc.recGpu,{generic:true});
    set('cMinRam',j.pc.minRam);set('cRecRam',j.pc.recRam);set('cDisk',j.pc.disk);$('cSsd').value=(j.pc.ssd==='req'||j.pc.ssd==='rec')?j.pc.ssd:'';}
  if(j.android){hw('cMinSoc','soc',j.android.minSoc,{generic:true,ios:false});hw('cRecSoc','soc',j.android.recSoc,{generic:true,ios:false});set('cAMinRam',j.android.minRam);set('cARecRam',j.android.recRam);}
  if(j.ios){hw('cMinChip','soc',j.ios.minChip,{ios:true});hw('cRecChip','soc',j.ios.recChip,{ios:true});set('cIMinRam',j.ios.minRam);set('cIRecRam',j.ios.recRam);}
  $('customBox').open=true; syncClearables();
}

/* ---------- 清除全部：遊戲回到「請選擇遊戲」、兩個裝置面板全部回到初始值、清掉記住的硬體 ---------- */
function resetAll(){
  try{localStorage.removeItem(LS_KEY);}catch(e){}
  $('gameSel').value='';$('gameSel').classList.add('placeholder');updateGameInfo();
  ['cpu','gpu','disk'].forEach(id=>$(id).value='');$('ram').value='16';$('os').value='win10';$('drive').value='ssd';
  $('cpuFilter').value='';$('gpuFilter').value='';refillDatalist('cpu');refillDatalist('gpu');['cpuMatch','gpuMatch','mSocMatch'].forEach(id=>{$(id).textContent='';$(id).className='match';});
  const ps=$('psPaste');if(ps)ps.value='';['psWrap','helperGuide'].forEach(id=>{const e=$(id);if(e)e.classList.add('hide');});
  state.mMode='model';$('mModeModel').setAttribute('aria-pressed','true');$('mModeSoc').setAttribute('aria-pressed','false');$('mByModel').classList.remove('hide');$('mBySoc').classList.add('hide');
  $('mBrand').selectedIndex=0;fillModels();$('mSoc').value='';$('mRamSoc').value='8';$('mOs').value='';$('mDisk').value='';
  ['detectStatusPC','detectStatus'].forEach(id=>{const e=$(id);if(e){e.innerHTML=e.dataset.def||'';e.className='status';}});
  syncClearables();run();
  const st=state.plat==='pc'?$('detectStatusPC'):$('detectStatus');if(st){st.textContent='已清除所有欄位與記住的硬體。';st.className='status ok';}
}

/* ---------- 平台切換與事件 ---------- */
function setPlat(p,keepGameId){
  state.plat=p;
  $('tabMobile').setAttribute('aria-pressed',p==='mobile'); $('tabPC').setAttribute('aria-pressed',p==='pc');
  $('panelMobile').classList.toggle('hide',p!=='mobile'); $('panelPC').classList.toggle('hide',p!=='pc');
  fillGames(keepGameId); run();
}
function debounce(fn,ms){let t;return()=>{clearTimeout(t);t=setTimeout(fn,ms);};}
/* ---------- 記住上次填的硬體（存在訪客自己的瀏覽器 localStorage，不會上傳） ---------- */
const LS_KEY='gsc:last';
function saveLast(){
  try{
    const o={t:Date.now(),
      pc:{cpu:$('cpu').value,gpu:$('gpu').value,ram:$('ram').value,os:$('os').value,drive:$('drive').value,disk:$('disk').value},
      mobile:{mode:state.mMode,brand:$('mBrand').value,model:$('mModel').value,ramModel:$('mRamModel').value,soc:$('mSoc').value,ramSoc:$('mRamSoc').value,os:$('mOs').value,disk:$('mDisk').value}};
    localStorage.setItem(LS_KEY,JSON.stringify(o));
  }catch(e){}
}
function restoreLast(){
  let o=null;try{o=JSON.parse(localStorage.getItem(LS_KEY)||'null');}catch(e){}
  if(!o||!o.t) return null;
  const p=o.pc||{},m=o.mobile||{};
  ['cpu','gpu','ram','os','drive','disk'].forEach(k=>{if(p[k]!=null&&p[k]!=='')$(k).value=p[k];});
  if(m.brand&&PHONES.some(x=>x.b===m.brand)){$('mBrand').value=m.brand;fillModels();if(m.model&&PHONES.some(x=>x.n===m.model)){$('mModel').value=m.model;fillModelRam();if(m.ramModel)$('mRamModel').value=m.ramModel;}}
  if(m.soc)$('mSoc').value=m.soc; if(m.ramSoc)$('mRamSoc').value=m.ramSoc; if(m.os)$('mOs').value=m.os; if(m.disk)$('mDisk').value=m.disk;
  if(m.mode==='soc'){state.mMode='soc';$('mModeModel').setAttribute('aria-pressed','false');$('mModeSoc').setAttribute('aria-pressed','true');$('mByModel').classList.add('hide');$('mBySoc').classList.remove('hide');}
  syncClearables();
  const when=new Date(o.t),txt='已自動填入上次的硬體（'+(when.getMonth()+1)+'/'+when.getDate()+' '+String(when.getHours()).padStart(2,'0')+':'+String(when.getMinutes()).padStart(2,'0')+'）。硬體有更動請重新偵測，或 <button type="button" class="link" data-clear>清除紀錄</button>。';
  const hasPC=!!(p.cpu||p.gpu),hasM=!!(m.model||m.soc);
  if(hasPC&&$('detectStatusPC')){$('detectStatusPC').innerHTML=txt;$('detectStatusPC').className='status';}
  if(hasM&&$('detectStatus')){$('detectStatus').innerHTML=txt;$('detectStatus').className='status';}
  document.querySelectorAll('[data-clear]').forEach(b=>b.addEventListener('click',()=>{try{localStorage.removeItem(LS_KEY);}catch(e){}location.reload();}));
  return o.t;
}
/* 有清單的輸入框加上「×」清除鈕；點下去清空並重新判定，游標留在欄位裡方便重選 */
function setupClearables(){
  document.querySelectorAll('input[list]').forEach(inp=>{
    const wrap=document.createElement('span');wrap.className='clearable';inp.parentNode.insertBefore(wrap,inp);wrap.appendChild(inp);
    const b=document.createElement('button');b.type='button';b.className='clr';b.title='清除';b.setAttribute('aria-label','清除輸入');b.textContent='×';wrap.appendChild(b);
    const sync=()=>wrap.classList.toggle('has',!!inp.value);
    inp.addEventListener('input',sync);inp.addEventListener('change',sync);
    inp.addEventListener('focus',()=>{if(inp.value)inp.select();});   // 點進去先全選，直接打字就能換
    b.addEventListener('click',()=>{inp.value='';sync();inp.dispatchEvent(new Event('input',{bubbles:true}));inp.dispatchEvent(new Event('change',{bubbles:true}));inp.focus();});
    sync();
  });
}
function syncClearables(){document.querySelectorAll('.clearable').forEach(w=>{const i=w.querySelector('input');w.classList.toggle('has',!!(i&&i.value));});}
function init(){
  $('dataDate').textContent=DATA_DATE; $('formNo').textContent='GSC-'+DATA_DATE.replace(/-/g,'');
  document.querySelectorAll('.dataDate2').forEach(e=>e.textContent=DATA_DATE);
  if(REPO_URL){['repoLink','repoLink2'].forEach(id=>{const a=$(id);if(a){a.href=REPO_URL;a.classList.remove('hide');}});}
  ['detectStatusPC','detectStatus'].forEach(id=>{const e=$(id);if(e)e.dataset.def=e.innerHTML;});   // 記住預設提示文字，清除全部時還原
  fillBrands(); fillSocList(); fillPcLists(); fillCustomLists(); fillGames(); setupClearables(); restoreLast();
  document.querySelectorAll('.resetAll').forEach(b=>b.addEventListener('click',resetAll));
  $('tabMobile').addEventListener('click',()=>setPlat('mobile')); $('tabPC').addEventListener('click',()=>setPlat('pc'));
  $('gameSel').addEventListener('change',()=>{$('gameSel').classList.toggle('placeholder',!$('gameSel').value);updateGameInfo();run();});
  $('mModeModel').addEventListener('click',()=>setMobileMode('model')); $('mModeSoc').addEventListener('click',()=>setMobileMode('soc')); $('toSocMode').addEventListener('click',()=>setMobileMode('soc'));
  $('mBrand').addEventListener('change',()=>{fillModels();run();}); $('mModel').addEventListener('change',()=>{fillModelRam();run();});
  ['mRamModel','mRamSoc','ram','os','drive','cpuFilter','gpuFilter'].forEach(id=>$(id).addEventListener('change',()=>{if(id==='cpuFilter')refillDatalist('cpu');if(id==='gpuFilter')refillDatalist('gpu');run();}));
  const d=debounce(run,180);
  ['mSoc','mOs','mDisk','cpu','gpu','disk'].forEach(id=>{$(id).addEventListener('input',d);$(id).addEventListener('change',run);});
  $('cAdd').addEventListener('click',()=>{try{addCustomGame(buildCustomGame());setStatus('cStatus','已加入清單並完成檢測（結果在上方）。','ok');}catch(e){setStatus('cStatus',e.message,'err');}});
  $('cExport').addEventListener('click',exportCustom);
  $('cImportBtn').addEventListener('click',()=>{$('cImportWrap').classList.toggle('hide');}); $('cImportGo').addEventListener('click',importCustom);
  $('aiBtn').addEventListener('click',aiLookup); $('aiName').addEventListener('keydown',e=>{if(e.key==='Enter')aiLookup();});
  $('mini').addEventListener('click',()=>document.querySelector('.col-result').scrollIntoView({behavior:'smooth',block:'start'}));
  if('IntersectionObserver' in window) new IntersectionObserver(es=>es.forEach(e=>$('mini').classList.toggle('off',e.isIntersecting)),{threshold:0.12}).observe(document.querySelector('.col-result'));
  if(typeof initDetect==='function') initDetect();
  run();
}
document.addEventListener('DOMContentLoaded',init);
