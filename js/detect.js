/* ============================================================
 * 裝置偵測  js/detect.js
 * 瀏覽器能拿到的東西有限：WebGL 顯示卡名稱、核心數、粗略記憶體（最多 8GB）、
 * Android 型號代碼（Chrome）、系統版本；拿不到 CPU 型號、硬碟容量、iPhone 型號。
 * PC 完整資訊改用 PowerShell 一行指令抓齊，貼回網頁解析。
 * ============================================================ */

/* ---- 文字裡找硬體名稱：取資料庫中「名稱被包含在文字裡」且最長的那個 ---- */
function cleanHwText(s){return String(s||'').replace(/\((R|TM|C)\)/gi,'').replace(/[®™]/g,'').replace(/\(0x[0-9a-f]+\)/gi,'');}
function matchInText(kind,text,opt={}){
  const t=norm(cleanHwText(text)); if(t.length<3) return null;
  let pool=(kind==='cpu'?CPUS:kind==='gpu'?GPUS:SOCS).filter(x=>!x.generic);
  if(opt.ios===true) pool=pool.filter(x=>x.ios); else if(opt.ios===false) pool=pool.filter(x=>!x.ios);
  let best=null;
  for(const x of pool){const n=norm(x.n);if(n.length>=4&&t.includes(n)&&(!best||n.length>norm(best.n).length))best=x;}
  return best;
}

/* ---- WebGL 顯示卡字串 ---- */
function webglRenderer(){
  try{
    const c=document.createElement('canvas');const gl=c.getContext('webgl2')||c.getContext('webgl')||c.getContext('experimental-webgl');if(!gl)return '';
    const ext=gl.getExtension('WEBGL_debug_renderer_info');
    return String(ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)||'');
  }catch(e){return '';}
}
/* "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 (0x00002504) Direct3D11 vs_5_0 ps_5_0, D3D11)" → "NVIDIA GeForce RTX 3060" */
function tidyRenderer(r){
  let s=r;const m=/^ANGLE \((.*)\)$/.exec(s);
  if(m){const parts=m[1].split(', ');s=parts.length>=2?parts[1]:parts[0];}
  return cleanHwText(s).replace(/Direct3D\S*|vs_\d_\d|ps_\d_\d|\/PCIe\/SSE2|OpenGL Engine|D3D11|D3D9/gi,'').replace(/\s+/g,' ').trim();
}

/* ---- 手機 GPU → 晶片推測（同一顆 GPU 可能對應多顆晶片，只是推測） ---- */
const GPU_SOC_GUESS=[
  [/Adreno[^0-9]*840/i,'Snapdragon 8 Elite Gen 5'],[/Adreno[^0-9]*830/i,'Snapdragon 8 Elite'],[/Adreno[^0-9]*825/i,'Snapdragon 8s Gen 4'],
  [/Adreno[^0-9]*750/i,'Snapdragon 8 Gen 3'],[/Adreno[^0-9]*740/i,'Snapdragon 8 Gen 2'],[/Adreno[^0-9]*735/i,'Snapdragon 8s Gen 3'],
  [/Adreno[^0-9]*732/i,'Snapdragon 7+ Gen 3'],[/Adreno[^0-9]*730/i,'Snapdragon 8 Gen 1'],[/Adreno[^0-9]*725/i,'Snapdragon 7+ Gen 2'],
  [/Adreno[^0-9]*720/i,'Snapdragon 7 Gen 3'],[/Adreno[^0-9]*710/i,'Snapdragon 7s Gen 2'],[/Adreno[^0-9]*810/i,'Snapdragon 7s Gen 3'],
  [/Adreno[^0-9]*660/i,'Snapdragon 888'],[/Adreno[^0-9]*650/i,'Snapdragon 865'],[/Adreno[^0-9]*642/i,'Snapdragon 778G'],
  [/Adreno[^0-9]*640/i,'Snapdragon 855'],[/Adreno[^0-9]*630/i,'Snapdragon 845'],[/Adreno[^0-9]*619/i,'Snapdragon 695'],
  [/Adreno[^0-9]*618/i,'Snapdragon 730G'],[/Adreno[^0-9]*613/i,'Snapdragon 4 Gen 2'],[/Adreno[^0-9]*612/i,'Snapdragon 675'],
  [/Adreno[^0-9]*610/i,'Snapdragon 680'],[/Adreno[^0-9]*540/i,'Snapdragon 835'],[/Adreno[^0-9]*530/i,'Snapdragon 820'],
  [/Adreno[^0-9]*512/i,'Snapdragon 660'],[/Adreno[^0-9]*509/i,'Snapdragon 636'],[/Adreno[^0-9]*506/i,'Snapdragon 625'],
  [/G1-Ultra/i,'Dimensity 9500'],[/G925/i,'Dimensity 9400'],[/G720/i,'Dimensity 9300'],[/G715/i,'Dimensity 9200'],[/G710/i,'Dimensity 9000'],
  [/G615/i,'Dimensity 8300'],[/G610/i,'Dimensity 8100'],[/G78/i,'Exynos 2100'],[/G77/i,'Dimensity 1200'],[/G76/i,'Kirin 980'],
  [/G57/i,'Dimensity 700'],[/G52/i,'Helio G85'],[/G51/i,'Helio P60'],[/G72/i,'Helio P70'],
  [/Xclipse[^0-9]*950/i,'Exynos 2500'],[/Xclipse[^0-9]*940/i,'Exynos 2400'],[/Xclipse[^0-9]*920/i,'Exynos 2200'],
  [/PowerVR/i,'Unisoc T616'],
];
/* ---- Samsung 型號代碼（台灣常見）→ 型號名稱 ---- */
const SAMSUNG_CODES={
  S931:'Galaxy S25 / S25+',S936:'Galaxy S25 / S25+',S938:'Galaxy S25 Ultra',S937:'Galaxy S25 Edge',S731:'Galaxy S25 FE',
  S921:'Galaxy S24 / S24+',S926:'Galaxy S24 / S24+',S928:'Galaxy S24 Ultra',S721:'Galaxy S24 FE',
  S911:'Galaxy S23 / S23+',S916:'Galaxy S23 / S23+',S918:'Galaxy S23 Ultra',S711:'Galaxy S23 FE',
  S901:'Galaxy S22 / S22+ / S22 Ultra',S906:'Galaxy S22 / S22+ / S22 Ultra',S908:'Galaxy S22 / S22+ / S22 Ultra',
  G991:'Galaxy S21 / S21+ / S21 Ultra',G996:'Galaxy S21 / S21+ / S21 Ultra',G998:'Galaxy S21 / S21+ / S21 Ultra',G990:'Galaxy S21 FE',
  G980:'Galaxy S20 / S20+ / S20 Ultra',G981:'Galaxy S20 / S20+ / S20 Ultra',G985:'Galaxy S20 / S20+ / S20 Ultra',G986:'Galaxy S20 / S20+ / S20 Ultra',G988:'Galaxy S20 / S20+ / S20 Ultra',G780:'Galaxy S20 FE',G781:'Galaxy S20 FE',
  G973:'Galaxy S10 / S10+',G975:'Galaxy S10 / S10+',
  F966:'Galaxy Z Fold7',F766:'Galaxy Z Flip7',F761:'Galaxy Z Flip7 FE',F956:'Galaxy Z Fold6 / Flip6',F741:'Galaxy Z Fold6 / Flip6',F946:'Galaxy Z Fold5 / Flip5',F731:'Galaxy Z Fold5 / Flip5',F936:'Galaxy Z Fold4 / Flip4',F721:'Galaxy Z Fold4 / Flip4',
  A566:'Galaxy A56',A366:'Galaxy A36',A266:'Galaxy A26',A176:'Galaxy A17 5G',A166:'Galaxy A16 5G',A075:'Galaxy A07',
  A556:'Galaxy A55',A356:'Galaxy A35',A256:'Galaxy A25',A156:'Galaxy A15 5G',A065:'Galaxy A06',
  A546:'Galaxy A54',A346:'Galaxy A34',A146:'Galaxy A14 5G',A536:'Galaxy A53',A336:'Galaxy A33',A528:'Galaxy A52s',M556:'Galaxy M55',M156:'Galaxy M15 5G',
  X830:'Galaxy Tab S11 / S11 Ultra',X836:'Galaxy Tab S11 / S11 Ultra',X930:'Galaxy Tab S11 / S11 Ultra',X936:'Galaxy Tab S11 / S11 Ultra',
  X820:'Galaxy Tab S10+ / S10 Ultra',X826:'Galaxy Tab S10+ / S10 Ultra',X920:'Galaxy Tab S10+ / S10 Ultra',X926:'Galaxy Tab S10+ / S10 Ultra',X520:'Galaxy Tab S10 FE',X526:'Galaxy Tab S10 FE',
  X710:'Galaxy Tab S9 / S9+ / S9 Ultra',X716:'Galaxy Tab S9 / S9+ / S9 Ultra',X810:'Galaxy Tab S9 / S9+ / S9 Ultra',X816:'Galaxy Tab S9 / S9+ / S9 Ultra',X910:'Galaxy Tab S9 / S9+ / S9 Ultra',X916:'Galaxy Tab S9 / S9+ / S9 Ultra',
  X510:'Galaxy Tab S9 FE',X516:'Galaxy Tab S9 FE',X210:'Galaxy Tab A9+',X216:'Galaxy Tab A9+',
};
/* ---- iPhone：Apple 不給型號，只能用螢幕尺寸列出候選（CSS 像素 寬x高@DPR） ---- */
const IPHONE_SCREENS={
  '440x956@3':['iPhone 17 Pro / 17 Pro Max','iPhone 16 Pro / 16 Pro Max'],'402x874@3':['iPhone 17','iPhone 17 Pro / 17 Pro Max','iPhone 16 Pro / 16 Pro Max'],
  '420x912@3':['iPhone Air'],'430x932@3':['iPhone 16 / 16 Plus','iPhone 15 Pro / 15 Pro Max','iPhone 15 / 15 Plus','iPhone 14 Pro / 14 Pro Max'],
  '393x852@3':['iPhone 16 / 16 Plus','iPhone 16e','iPhone 15 / 15 Plus','iPhone 15 Pro / 15 Pro Max','iPhone 14 Pro / 14 Pro Max'],
  '428x926@3':['iPhone 14 / 14 Plus','iPhone 13 Pro / 13 Pro Max','iPhone 12 Pro / 12 Pro Max'],
  '390x844@3':['iPhone 14 / 14 Plus','iPhone 13 / 13 mini','iPhone 13 Pro / 13 Pro Max','iPhone 12 / 12 mini','iPhone 12 Pro / 12 Pro Max'],
  '375x812@3':['iPhone 13 / 13 mini','iPhone 12 / 12 mini','iPhone 11 Pro / 11 Pro Max','iPhone XS / XS Max','iPhone X'],
  '414x896@2':['iPhone 11','iPhone XR'],'414x896@3':['iPhone 11 Pro / 11 Pro Max','iPhone XS / XS Max'],
  '375x667@2':['iPhone SE（第 3 代）','iPhone SE（第 2 代）','iPhone 8','iPhone 7 / 7 Plus','iPhone 6s / 6s Plus'],
  '414x736@3':['iPhone 8 Plus','iPhone 7 / 7 Plus','iPhone 6s / 6s Plus'],
};

/* ---- 讀取瀏覽器資訊 ---- */
async function readDevice(){
  const ua=navigator.userAgent||'';
  const d={ua,renderer:webglRenderer(),cores:navigator.hardwareConcurrency||null,mem:navigator.deviceMemory||null,
    isAndroid:/Android/i.test(ua),isIOS:/iPhone|iPad|iPod/i.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1),
    isMac:/Macintosh/i.test(ua)&&!(navigator.maxTouchPoints>1),isWin:/Windows/i.test(ua),model:'',platformVersion:'',osVer:null,
    screen:{w:Math.min(screen.width,screen.height),h:Math.max(screen.width,screen.height),dpr:Math.round((window.devicePixelRatio||1)*100)/100},quotaGB:null};
  d.isIPad=/iPad/i.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  let m;
  if((m=/Android (\d+(?:\.\d+)?)/.exec(ua)))d.osVer=parseFloat(m[1]);
  if((m=/OS (\d+)[_.](\d+)/.exec(ua))&&d.isIOS)d.osVer=parseFloat(m[1]+'.'+m[2]);
  if(navigator.userAgentData&&navigator.userAgentData.getHighEntropyValues){
    try{const h=await navigator.userAgentData.getHighEntropyValues(['model','platformVersion','architecture']);d.model=h.model||'';d.platformVersion=h.platformVersion||'';}catch(e){}
  }
  if(!d.model&&d.isAndroid){const mm=/Android [^;]+; ([^;)]+)\)/.exec(ua);if(mm)d.model=mm[1].replace(/ Build.*/,'').trim();}
  try{if(navigator.storage&&navigator.storage.estimate){const e=await navigator.storage.estimate();if(e.quota)d.quotaGB=Math.round(e.quota/1e9);}}catch(e){}
  return d;
}

/* ---- 手機：偵測並填表 ---- */
async function detectMobile(){
  const st=$('detectStatus');st.className='status';st.textContent='偵測中…';
  const d=await readDevice();const found=[],miss=[];
  if(d.isWin||d.isMac){st.className='status err';st.textContent='這是電腦瀏覽器（'+(d.isWin?'Windows':'Mac')+'），請切到「電腦（PC）」分頁偵測；要檢測手機請用手機開這個網頁。';return;}
  let phone=null,soc=null;
  if(d.isAndroid){
    const sm=/SM-([A-Z]\d{3})/i.exec(d.model);
    if(sm&&SAMSUNG_CODES[sm[1].toUpperCase()])phone=PHONES.find(p=>p.n===SAMSUNG_CODES[sm[1].toUpperCase()]);
    if(!phone&&d.model){   // 型號名稱比對：先找完全相同的變體，再找「型號字串包含的最長變體」
      const mn=norm(d.model);let best=null,bestLen=0;
      PHONES.filter(p=>p.os==='android').forEach(p=>{p.n.split(' / ').forEach(v=>{const vn=norm(v);if(vn.length<4)return;
        if(vn===mn){best=p;bestLen=999;}else if(bestLen<999&&mn.includes(vn)&&vn.length>bestLen){best=p;bestLen=vn.length;}});});
      phone=best;
    }
    if(!phone){const g=GPU_SOC_GUESS.find(([re])=>re.test(d.renderer));if(g)soc=byName('soc',g[1]);}
  }else if(d.isIOS&&!d.isIPad){
    const key=d.screen.w+'x'+d.screen.h+'@'+Math.round(d.screen.dpr);let cands=IPHONE_SCREENS[key]||[];
    if(!cands.length){const pre=d.screen.w+'x',suf='@'+Math.round(d.screen.dpr);Object.keys(IPHONE_SCREENS).filter(k=>k.startsWith(pre)&&k.endsWith(suf)).forEach(k=>{cands=cands.concat(IPHONE_SCREENS[k].filter(c=>!cands.includes(c)));});}
    if(cands.length){phone=PHONES.find(p=>p.n===cands[0]);found.push('螢幕尺寸 '+key+' 對應的候選機型：'+cands.join('、')+'（Apple 不提供型號，已先選第一個，請自行確認）');}
  }else if(d.isIPad){miss.push('iPad 的型號瀏覽器拿不到，請自行從型號清單挑選');}
  if(phone){
    setMobileMode('model');$('mBrand').value=phone.b;fillModels();$('mModel').value=phone.n;fillModelRam();
    found.unshift('型號：'+phone.n+(d.model?'（'+d.model+'）':''));
  }else if(soc){
    setMobileMode('soc');$('mSoc').value=soc.n;syncClearables();found.push('晶片（依 GPU「'+tidyRenderer(d.renderer)+'」推測）：'+soc.n+'，請確認');
  }else{
    miss.push('型號與晶片：'+(d.model?'「'+d.model+'」不在對照表，請自行從清單挑選':'瀏覽器沒有提供，請到「設定 → 關於手機」查看後自行挑選'));
  }
  if(d.mem){
    const opts=[...(state.mMode==='model'?$('mRamModel'):$('mRamSoc')).options].map(o=>+o.value);
    if(d.mem<8&&opts.includes(d.mem)){(state.mMode==='model'?$('mRamModel'):$('mRamSoc')).value=d.mem;found.push('記憶體約 '+d.mem+' GB（瀏覽器回報的粗略值）');}
    else found.push('記憶體：瀏覽器只回報「至少 '+d.mem+' GB」，實際請看設定');
  }else miss.push('記憶體（此瀏覽器不提供）');
  if(d.osVer){$('mOs').value=(d.isIOS?'iOS ':'Android ')+d.osVer;found.push('系統版本 '+(d.isIOS?'iOS ':'Android ')+d.osVer);}
  miss.push('儲存空間總量與剩餘：瀏覽器拿不到'+(d.quotaGB?'（網站可用配額約 '+d.quotaGB+' GB，僅供參考）':'')+'，請看「設定 → 儲存空間」後填在可用空間欄');
  st.className='status'+(phone||soc?' ok':'');st.textContent='已填入：'+found.join('；')+'。'+(miss.length?' 未能偵測：'+miss.join('；')+'。':'');
  run();
}

/* ---- PC：瀏覽器偵測（只有顯示卡、核心數、粗略記憶體、Windows 版本） ---- */
async function detectPC(){
  const st=$('detectStatusPC');st.className='status';st.textContent='偵測中…';
  const d=await readDevice();const found=[],miss=[];
  if(d.isAndroid||d.isIOS){st.className='status err';st.textContent='這是手機瀏覽器，請切到「手機／平板」分頁偵測。';return;}
  if(d.isMac){st.className='status err';st.textContent='Mac 不在 PC 判定範圍（多數遊戲需求以 Windows 為準）；Apple M 系列晶片可到「手機／平板」分頁用「直接選處理器」輸入作參考。';return;}
  const r=tidyRenderer(d.renderer);const gpu=r?matchInText('gpu',r):null;
  if(gpu){$('gpu').value=gpu.n;found.push('顯示卡：'+gpu.n);}
  else miss.push('顯示卡'+(r?'（瀏覽器回報「'+r+'」，資料庫沒有對應，請手動選）':'（瀏覽器未提供）'));
  miss.push('CPU 型號（瀏覽器只提供核心數：'+(d.cores||'?')+' 執行緒）');
  if(d.mem){const sel=$('ram');if(d.mem<8&&[...sel.options].some(o=>+o.value===d.mem)){sel.value=d.mem;found.push('記憶體約 '+d.mem+' GB');}else miss.push('記憶體（瀏覽器只回報「至少 '+d.mem+' GB」）');}
  else miss.push('記憶體');
  if(d.platformVersion){const major=parseInt(d.platformVersion,10);if(!isNaN(major)){$('os').value=major>=13?'win11':major>=1?'win10':'old';found.push('系統：'+(major>=13?'Windows 11':major>=1?'Windows 10':'Windows 8.1 或更舊'));}}
  miss.push('SSD／HDD 與硬碟容量'+(d.quotaGB?'（網站可用配額約 '+d.quotaGB+' GB，僅供參考）':''));
  syncClearables();
  st.className='status'+(gpu?' ok':'');st.textContent=(found.length?'已填入：'+found.join('；')+'。':'')+' 瀏覽器拿不到：'+miss.join('；')+'。想一次抓齊，請用下面的 PowerShell 指令。';
  run();
}

/* ---- PC：PowerShell 一行指令（輸出一行 GSC|CPU=…|GPU=…|RAM=…|DISK=…|FREE=…|OS=…，並自動複製到剪貼簿） ---- */
const PS_COMMAND=`$c=(Get-CimInstance Win32_Processor | Select-Object -First 1).Name; $g=((Get-CimInstance Win32_VideoController).Name) -join ' ; '; $r=[math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory/1GB); $d=(Get-PhysicalDisk | ForEach-Object { "$($_.MediaType) $([math]::Round($_.Size/1GB))GB" }) -join ' ; '; $f=(Get-PSDrive -PSProvider FileSystem | Where-Object Used | ForEach-Object { "$($_.Name): free $([math]::Round($_.Free/1GB))GB" }) -join ' ; '; $o=(Get-CimInstance Win32_OperatingSystem).Caption; $out="GSC|CPU=$c|GPU=$g|RAM=$r|DISK=$d|FREE=$f|OS=$o"; $out | Set-Clipboard; $out`;

function parsePS(text){
  const out={};const t=String(text||'');
  const line=(t.match(/GSC\|[^\r\n]+/)||[null])[0];
  if(line){line.split('|').slice(1).forEach(seg=>{const i=seg.indexOf('=');if(i>0)out[seg.slice(0,i).trim().toUpperCase()]=seg.slice(i+1).trim();});}
  return {fields:out,raw:t};
}
function applyPS(){
  const st=$('detectStatusPC');const {fields:f,raw}=parsePS($('psPaste').value);
  const found=[],miss=[];
  const cpu=matchInText('cpu',f.CPU||raw);
  if(cpu){$('cpu').value=cpu.n;found.push('CPU：'+cpu.n);}else miss.push('CPU'+(f.CPU?'（「'+f.CPU+'」不在資料庫，請手動選相近型號）':''));
  const gpuNames=(f.GPU?f.GPU.split(';'):[raw]);let gpu=null;
  gpuNames.forEach(n=>{const g=matchInText('gpu',n);if(g&&(!gpu||g.s>gpu.s))gpu=g;});
  if(gpu){$('gpu').value=gpu.n;found.push('顯示卡：'+gpu.n+(gpuNames.length>1?'（有多顆，取效能最高者）':''));}else miss.push('顯示卡'+(f.GPU?'（「'+f.GPU+'」不在資料庫，請手動選）':''));
  const ram=parseFloat(f.RAM);
  if(ram){const opts=[...$('ram').options].map(o=>+o.value);const pick=opts.reduce((b,v)=>Math.abs(v-ram)<Math.abs(b-ram)?v:b,opts[0]);$('ram').value=pick;found.push('記憶體 '+ram+' GB');}
  if(f.DISK){const disks=f.DISK.split(';').map(s=>s.trim()).filter(Boolean);const hasSSD=disks.some(x=>/SSD/i.test(x)),hasHDD=disks.some(x=>/HDD/i.test(x));
    $('drive').value=hasSSD?'ssd':'hdd';found.push('硬碟：'+disks.join('、')+(hasSSD&&hasHDD?'（同時有 SSD 與 HDD，已假設遊戲裝在 SSD）':''));}
  if(f.FREE){const m=/C:\s*free\s*(\d+)GB/i.exec(f.FREE)||/free\s*(\d+)GB/i.exec(f.FREE);if(m){$('disk').value=m[1];found.push('剩餘空間：'+f.FREE.replace(/free/gi,'剩餘'));}}
  if(f.OS){$('os').value=/Windows 11/i.test(f.OS)?'win11':/Windows 10/i.test(f.OS)?'win10':'old';found.push('系統：'+f.OS.replace(/^Microsoft /,''));}
  syncClearables();
  if(!found.length){st.className='status err';st.textContent='看不出硬體資訊。請確認貼上的是指令輸出的那一行（以 GSC| 開頭），或至少包含 CPU／顯示卡的型號文字。';return;}
  st.className='status ok';st.textContent='已填入：'+found.join('；')+'。'+(miss.length?' 未對應：'+miss.join('；')+'。':'');
  run();
}
async function copyPS(){
  const b=$('psCopyBtn');
  try{
    if(navigator.clipboard&&window.isSecureContext)await navigator.clipboard.writeText(PS_COMMAND);
    else{const ta=document.createElement('textarea');ta.value=PS_COMMAND;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();}
    b.textContent='已複製指令';setTimeout(()=>{b.textContent='複製 PowerShell 指令';},1800);
  }catch(e){$('psPaste').value=PS_COMMAND;$('psWrap').classList.remove('hide');b.textContent='請手動複製下方指令';}
}
/* ---- PC：本機小助手（helper/gsc-helper.bat 在訪客電腦上開的 127.0.0.1 服務） ---- */
const HELPER_PORTS=[27321,27322,27323];
async function helperFetch(host,port){
  const ctl=new AbortController();const t=setTimeout(()=>ctl.abort(),2500);
  try{const r=await fetch(`http://${host}:${port}/specs`,{signal:ctl.signal,mode:'cors',cache:'no-store'});clearTimeout(t);if(!r.ok)return null;const j=await r.json();return j&&j.ok?j:null;}
  catch(e){clearTimeout(t);return null;}
}
async function connectHelper(preferPort){
  const st=$('detectStatusPC');st.className='status';st.textContent='正在連線本機小助手…（Chrome 若跳出「允許存取本機網路」請按允許）';
  $('helperGuide').classList.add('hide');
  const ports=preferPort?[preferPort].concat(HELPER_PORTS.filter(p=>p!==preferPort)):HELPER_PORTS;
  for(const host of ['localhost','127.0.0.1']){for(const p of ports){const j=await helperFetch(host,p);if(j){applyHelper(j);return true;}}}
  st.className='status err';st.textContent='沒有偵測到本機小助手。請先執行小助手（見下方步驟），再按一次「一鍵檢測」；不想執行的話，也可以用「複製 PowerShell 指令」的方式。';
  $('helperGuide').classList.remove('hide');
  return false;
}
function applyHelper(j){
  const st=$('detectStatusPC');const found=[],miss=[];
  const cpu=j.cpu&&j.cpu.name?matchInText('cpu',j.cpu.name):null;
  if(cpu){$('cpu').value=cpu.n;found.push('CPU：'+cpu.n);}else miss.push('CPU'+(j.cpu&&j.cpu.name?'（「'+j.cpu.name+'」不在資料庫，請手動選相近型號）':''));
  let gpu=null;(j.gpus||[]).forEach(g=>{const m=matchInText('gpu',g.name||'');if(m&&(!gpu||m.s>gpu.s))gpu=m;});
  if(gpu){$('gpu').value=gpu.n;found.push('顯示卡：'+gpu.n);}else miss.push('顯示卡'+(j.gpus&&j.gpus.length?'（「'+j.gpus.map(g=>g.name).join('、')+'」不在資料庫，請手動選）':''));
  if(j.ramGB){const opts=[...$('ram').options].map(o=>+o.value);const pick=opts.reduce((b,v)=>Math.abs(v-j.ramGB)<Math.abs(b-j.ramGB)?v:b,opts[0]);$('ram').value=pick;found.push('記憶體 '+j.ramGB+' GB');}
  if(j.disks&&j.disks.length){const isSSD=d=>/SSD|NVMe/i.test(d.type||'')||/NVMe/i.test(d.bus||'');const hasSSD=j.disks.some(isSSD),hasHDD=j.disks.some(d=>/HDD/i.test(d.type||''));
    $('drive').value=hasSSD?'ssd':'hdd';found.push('硬碟：'+j.disks.map(d=>(isSSD(d)?'SSD':(/HDD/i.test(d.type||'')?'HDD':(d.type||'?')))+' '+d.sizeGB+'GB').join('、')+(hasSSD&&hasHDD?'（同時有 SSD 與 HDD，已假設遊戲裝在 SSD）':''));}
  if(j.volumes&&j.volumes.length){const sys=j.volumes.find(v=>v.letter===(j.systemDrive||'C'))||j.volumes[0];$('disk').value=sys.freeGB;found.push('剩餘空間：'+j.volumes.map(v=>v.letter+': '+v.freeGB+' / '+v.totalGB+' GB').join('、'));}
  if(j.os&&j.os.name){$('os').value=/Windows 11/i.test(j.os.name)?'win11':/Windows 10/i.test(j.os.name)?'win10':'old';found.push('系統：'+j.os.name.replace(/^Microsoft /,''));}
  const scr=(j.gpus||[]).find(g=>g.width&&g.height);if(scr)found.push('螢幕 '+scr.width+'×'+scr.height+(scr.hz?' @ '+scr.hz+'Hz':''));
  syncClearables();
  st.className='status ok';st.textContent='小助手已填入：'+found.join('；')+'。'+(miss.length?' 未對應：'+miss.join('；')+'。':'')+' 小助手視窗可以關掉了。';
  run();
}
/* 下載時把目前網址寫進 .bat，讓小助手執行完能自動開回這個網頁 */
async function downloadHelper(e){
  const a=e.currentTarget;if(!/^https?:/.test(location.protocol))return;   // file:// 就走一般連結
  e.preventDefault();
  try{
    const r=await fetch(a.getAttribute('href'),{cache:'no-store'});if(!r.ok)throw 0;
    let txt=await r.text();const site=location.origin+location.pathname;
    txt=txt.replace(/^\$SiteUrl\s*=\s*""/m,'$SiteUrl = "'+site+'"');
    const url=URL.createObjectURL(new Blob([txt],{type:'application/octet-stream'}));const b=document.createElement('a');b.href=url;b.download='gsc-helper.bat';document.body.appendChild(b);b.click();b.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
  }catch(err){window.location.href=a.getAttribute('href');}
}
/* 開啟本頁的裝置是手機／平板還是電腦（決定顯示哪一組偵測工具與預設分頁） */
function deviceKind(){
  const ua=navigator.userAgent||'';
  const mobile=/Android|iPhone|iPad|iPod|Mobile/i.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  return mobile?'mobile':'desktop';
}
function initDetect(){
  const kind=deviceKind();document.body.classList.add(kind==='mobile'?'is-mobile':'is-desktop');
  if(kind==='desktop'&&/^https?:/.test(location.protocol)){$('pageUrl').textContent=location.origin+location.pathname;$('pageUrlWrap').classList.remove('hide');
    $('copyUrlBtn').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(location.origin+location.pathname);$('copyUrlBtn').textContent='已複製';}catch(e){$('copyUrlBtn').textContent='請手動複製';}});}
  $('helperBtn').addEventListener('click',()=>connectHelper().catch(e=>{$('detectStatusPC').className='status err';$('detectStatusPC').textContent='連線失敗：'+e.message;}));
  $('helperDl').addEventListener('click',downloadHelper);
  const hp=parseInt(new URLSearchParams(location.search).get('helper'),10);
  if(hp){setTimeout(()=>{setPlat('pc');connectHelper(hp);},0);}
  else if(kind==='desktop'){setTimeout(()=>setPlat('pc'),0);}   // 電腦開啟預設看「電腦」分頁，手機開啟預設看「手機／平板」
  $('detectBtn').addEventListener('click',()=>detectMobile().catch(e=>{$('detectStatus').className='status err';$('detectStatus').textContent='偵測失敗：'+e.message;}));
  $('detectBtnPC').addEventListener('click',()=>detectPC().catch(e=>{$('detectStatusPC').className='status err';$('detectStatusPC').textContent='偵測失敗：'+e.message;}));
  $('psCopyBtn').addEventListener('click',copyPS);
  $('psPasteBtn').addEventListener('click',()=>{$('psWrap').classList.toggle('hide');if(!$('psWrap').classList.contains('hide'))$('psPaste').focus();});
  $('psGo').addEventListener('click',applyPS);
  $('psPaste').addEventListener('paste',()=>setTimeout(applyPS,50));
}
