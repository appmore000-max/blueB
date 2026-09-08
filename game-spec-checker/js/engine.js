/* ============================================================
 * 判定引擎  js/engine.js  — 純函式，不碰 DOM，可用 node 直接測試
 * 指數說明與等級定義見 README。
 * ============================================================ */
/* ===== 評分引擎（純函式，不碰 DOM） ===== */
const LEVELS = [
  {t:'不可', d:'低於官方最低配備：可能無法啟動，或幾乎無法遊玩'},
  {t:'勉強', d:'只勉強達到最低配備：最低畫質也可能卡頓，不建議'},
  {t:'可玩', d:'介於最低與建議配備之間：中低畫質可以正常玩'},
  {t:'順暢', d:'達到官方建議配備：能以官方預期的畫質與幀率順暢遊玩'},
  {t:'極佳', d:'遠超建議配備（或達官方高規配備）：可以開最高畫質或高幀率'},
];
const IDX = {
  gpu:new Map(GPUS.map(x=>[x.n,x])),
  cpu:new Map(CPUS.map(x=>[x.n,x])),
  soc:new Map(SOCS.map(x=>[x.n,x])),
};
function byName(kind,name){ return IDX[kind].get(name)||null; }

/* 一組「同等」硬體 → 門檻（取最低分） */
function resolveList(kind,names){
  if(!names||!names.length) return null;
  const items=names.map(n=>byName(kind,n)).filter(Boolean);
  if(!items.length) return null;
  return {score:Math.min(...items.map(i=>i.s)),items};
}

/* 核心等級判定：score 落在 min／rec／high 的哪個區間 */
function levelOf(score,min,rec,high){
  if(score==null||min==null) return null;
  if(rec==null||rec<min) rec=min;
  if(score<min) return 0;
  if(high!=null ? score>=high : score>=rec*1.6) return 4;
  if(score>=rec) return 3;
  const t=(score-min)/Math.max(rec-min,1e-9);
  return t<0.25?1:2;
}
const capLv=(lv,cap)=>lv==null?null:Math.min(lv,cap);

/* 預估體驗文字（依主要繪圖零件 ÷ 建議門檻） */
function estimateText(ratio,mobile){
  if(ratio==null) return '';
  if(mobile){
    if(ratio<1)   return '低～中畫質；可能發熱、掉幀';
    if(ratio<1.5) return '中～高畫質，30～60fps 穩定';
    if(ratio<2.5) return '高畫質、60fps';
    return '最高畫質、高幀率（若遊戲支援）';
  }
  if(ratio<1)   return '1080p 低～中畫質，可能需要降低解析度或開啟升頻';
  if(ratio<1.5) return '1080p 中～高畫質，約 60fps';
  if(ratio<2.5) return '1440p 高畫質，或 1080p 高幀率';
  return '4K 或高幀率、最高畫質';
}

/* ---------- PC ---------- */
/* user = {cpu:{n,s}, gpu:{n,s,v}, ram:16, os:'win11'|'win10'|'old', drive:'ssd'|'hdd', disk:200|null} */
function evaluatePC(game,user){
  const p=game.pc; if(!p) return {unsupported:'此遊戲沒有 PC 版需求資料'};
  const rows=[],notes=[];
  const tiers={min:p.min,rec:p.rec||null,high:p.high||null};
  const th=k=>({
    min:resolveList(k,tiers.min[k]), rec:tiers.rec?resolveList(k,tiers.rec[k]):null, high:tiers.high?resolveList(k,tiers.high[k]):null
  });
  const tc=th('cpu'),tg=th('gpu');
  const lvCpu=user.cpu?levelOf(user.cpu.s,tc.min&&tc.min.score,tc.rec&&tc.rec.score,tc.high&&tc.high.score):null;
  const lvGpu=user.gpu?levelOf(user.gpu.s,tg.min&&tg.min.score,tg.rec&&tg.rec.score,tg.high&&tg.high.score):null;
  rows.push({k:'處理器',kind:'cpu',have:user.cpu,lv:lvCpu,min:tc.min,rec:tc.rec,high:tc.high});
  rows.push({k:'顯示卡',kind:'gpu',have:user.gpu,lv:lvGpu,min:tg.min,rec:tg.rec,high:tg.high});
  const ramMin=tiers.min.ram,ramRec=tiers.rec?tiers.rec.ram:null,ramHigh=tiers.high?tiers.high.ram:null;
  let lvRam=levelOf(user.ram,ramMin,ramRec,ramHigh); if(ramHigh==null) lvRam=capLv(lvRam,3);   // 沒有高規層時，記憶體再多也只算「順暢」
  rows.push({k:'記憶體',kind:'ram',have:{n:user.ram+' GB',s:user.ram},lv:lvRam,min:ramMin!=null?{score:ramMin}:null,rec:ramRec!=null?{score:ramRec}:null,high:ramHigh!=null?{score:ramHigh}:null,unit:'GB'});
  const parts=[lvCpu,lvGpu].filter(v=>v!=null);
  let overall=parts.length?Math.min(...parts):null;
  // 記憶體只會拉低結論：低於建議量時取較低者；已達建議量就不擋「極佳」（除非高規層另有記憶體門檻）
  if(lvRam!=null){ if(overall==null) overall=lvRam; else if(lvRam<3&&lvRam<overall) overall=lvRam; else if(overall===4&&ramHigh!=null&&user.ram<ramHigh) overall=3; }
  if(user.cpu==null||user.gpu==null) notes.push('尚未選擇'+(user.cpu?'':'處理器')+(user.cpu||user.gpu?'':'與')+(user.gpu?'':'顯示卡')+'，結論以已填零件計算。');

  // 作業系統
  let osLv=null;
  if(p.os==='win10'&&user.os==='old'){osLv=0;notes.push({risk:true,t:'此遊戲需要 Windows 10／11 64 位元，舊版 Windows 無法執行。'});}
  rows.push({k:'系統',kind:'os',text:user.os==='win11'?'Windows 11':user.os==='win10'?'Windows 10':'Windows 8.1 或更舊',req:p.os==='win10'?'Windows 10／11':'Windows 7 以上',lv:osLv,info:osLv==null});
  if(osLv===0) overall=0;

  // 硬碟種類
  let drvState='info',drvText=user.drive==='ssd'?'SSD':'HDD';
  if(user.drive==='hdd'&&p.ssd==='req'){overall=capLv(overall,2);drvState='warn';notes.push({risk:false,t:'官方要求安裝在 SSD；使用 HDD 會有嚴重讀取卡頓，結論最高只給「可玩」。'});}
  else if(user.drive==='hdd'&&p.ssd==='rec'){drvState='warn';notes.push('官方建議安裝在 SSD，HDD 讀取會較慢。');}
  rows.push({k:'硬碟',kind:'drive',text:drvText,req:p.ssd==='req'?'必須 SSD':p.ssd==='rec'?'建議 SSD':'不要求',state:drvState});

  // 可用空間
  if(p.disk!=null){
    let st='info';
    if(user.disk!=null&&user.disk<p.disk){st='warn';notes.push(`可用空間 ${user.disk} GB 少於需要的 ${p.disk} GB，安裝前請先清出空間（不影響結論）。`);}
    rows.push({k:'空間',kind:'disk',text:user.disk!=null?user.disk+' GB 可用':'未填',req:`需 ${p.disk} GB`+(p.diskRec?`（建議 ${p.diskRec} GB）`:''),state:st});
  }
  if(p.note) notes.push(p.note);
  if(tiers.rec&&tiers.rec.est) notes.push('官方未列建議配備，建議欄為估算值。');
  if(user.gpu&&user.gpu.generic===undefined&&tg.rec&&user.gpu.v!=null&&user.gpu.v<4&&lvGpu>=2) notes.push('顯示記憶體較少（'+user.gpu.v+'GB），高畫質材質可能不足。');
  const ratio=(user.gpu&&tg.rec)?user.gpu.s/tg.rec.score:null;
  const est=(overall!=null&&overall>=1)?estimateText(ratio,p.viaKind==='emu'||p.viaKind==='gpg'):'';   // 模擬器／Google Play Games 用手遊的體驗描述
  return {overall,rows,notes,est,tiers};
}

/* ---------- 手機 ---------- */
/* user = {soc:{n,s,ios,risk}, ram:8, osVer:14|null, disk:64|null} */
function evaluateMobile(game,user){
  if(!user.soc) return {unsupported:'請先選擇手機型號或處理器'};
  const isIos=!!user.soc.ios;
  const m=isIos?game.ios:game.android;
  const platName=isIos?'iOS':'Android';
  if(!m) return {unsupported:`此遊戲沒有 ${platName} 版（或沒有 ${platName} 需求資料）`};
  const rows=[],notes=[];
  let tMin,tRec;
  if(isIos){
    tMin=m.min.chip?resolveList('soc',[m.min.chip]):null;
    tRec=m.rec&&m.rec.chip?resolveList('soc',[m.rec.chip]):null;
  }else{
    tMin=resolveList('soc',m.min.soc);
    tRec=m.rec?resolveList('soc',m.rec.soc):null;
  }
  let lvSoc=levelOf(user.soc.s,tMin&&tMin.score,tRec&&tRec.score);
  rows.push({k:isIos?'晶片':'處理器',kind:'soc',have:user.soc,lv:lvSoc,min:tMin,rec:tRec});
  const ramMin=m.min.ram,ramRec=m.rec?m.rec.ram:null;
  let lvRam=ramMin!=null?capLv(levelOf(user.ram,ramMin,ramRec),3):null;
  rows.push({k:'記憶體',kind:'ram',have:{n:user.ram+' GB',s:user.ram},lv:lvRam,min:ramMin!=null?{score:ramMin}:null,rec:ramRec!=null?{score:ramRec}:null,unit:'GB'});
  let overall=lvSoc;
  if(lvRam!=null){ if(overall==null) overall=lvRam; else if(lvRam<3&&lvRam<overall) overall=lvRam; }

  // 系統版本
  let osLv=null,osText=user.osVer!=null?`${platName} ${user.osVer}`:'未填';
  if(m.min.os!=null){
    if(user.osVer!=null&&user.osVer<m.min.os){osLv=0;overall=0;notes.push({risk:true,t:`此遊戲需要 ${platName} ${m.min.os} 以上，你的系統版本太舊。`});}
    else if(user.osVer!=null&&m.rec&&m.rec.os!=null&&user.osVer<m.rec.os){notes.push(`官方建議 ${platName} ${m.rec.os} 以上，可考慮更新系統。`);}
    rows.push({k:'系統',kind:'os',text:osText,req:`${platName} ${m.min.os} 以上`+(m.rec&&m.rec.os?`（建議 ${m.rec.os}）`:''),lv:osLv,info:osLv==null});
  }
  // 高風險 GPU（原神）
  if(!isIos&&user.soc.risk&&game.id==='genshin'){overall=capLv(overall,1);notes.push({risk:true,t:'這顆晶片的 GPU 架構在原神官方警告名單內（可能黑畫面、閃退），即使分數達標也只給「勉強」。'});}
  // 空間
  if(m.disk!=null){
    let st='info';
    if(user.disk!=null&&user.disk<m.disk){st='warn';notes.push(`可用空間 ${user.disk} GB 少於需要的 ${m.disk} GB，請先清出空間（不影響結論）。`);}
    rows.push({k:'空間',kind:'disk',text:user.disk!=null?user.disk+' GB 可用':'未填',req:`需 ${m.disk} GB`+(m.diskRec?`（建議 ${m.diskRec} GB）`:''),state:st});
  }
  if(m.note) notes.push(m.note);
  if(m.min.est) notes.push('官方未公布明確的最低硬體，最低欄為估算值。');
  if(m.rec&&m.rec.est) notes.push('官方未列建議配備，建議欄為估算值。');
  if(user.ram!=null&&lvSoc!=null&&lvSoc>=2&&user.ram<=4&&(ramRec||0)>=6) notes.push('記憶體偏小，多開或長時間遊玩可能被系統清掉背景。');
  const ratio=tRec?user.soc.s/tRec.score:null;
  const est=(overall!=null&&overall>=1)?estimateText(ratio,true):'';
  return {overall,rows,notes,est,plat:platName};
}

/* 版本字串 → 主版號數字（"Android 14"、"iOS 17.5"、"14" 皆可） */
function parseOsVer(str){
  if(!str) return null;
  const m=String(str).match(/(\d+)(?:\.(\d+))?/);
  if(!m) return null;
  return parseInt(m[1],10)+(m[2]?parseInt(m[2].slice(0,1),10)/10:0);
}

if(typeof module!=='undefined') module.exports={LEVELS,byName,resolveList,levelOf,evaluatePC,evaluateMobile,estimateText,parseOsVer};
