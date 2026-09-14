const STORAGE_KEYS = {
  boxes: "aiBoxSorter.boxes.v3",
  learned: "aiBoxSorter.learned.v3"
};
const DB_NAME = "aiBoxSorterInventory";
const DB_VERSION = 1;
const STORE_NAME = "items";
const CLASSIFIER_ACCEPT = 0.58;
const DETECTOR_ACCEPT = 0.40;

const BROAD_CATEGORIES = {
  person:"People",
  bicycle:"Vehicles",car:"Vehicles",motorcycle:"Vehicles",airplane:"Vehicles",bus:"Vehicles",train:"Vehicles",truck:"Vehicles",boat:"Vehicles",
  "traffic light":"Outdoor","fire hydrant":"Outdoor","stop sign":"Outdoor","parking meter":"Outdoor",bench:"Outdoor",
  bird:"Animals",cat:"Animals",dog:"Animals",horse:"Animals",sheep:"Animals",cow:"Animals",elephant:"Animals",bear:"Animals",zebra:"Animals",giraffe:"Animals",
  backpack:"Accessories",umbrella:"Accessories",handbag:"Accessories",tie:"Accessories",suitcase:"Accessories",
  frisbee:"Sports",skis:"Sports",snowboard:"Sports","sports ball":"Sports",kite:"Sports","baseball bat":"Sports","baseball glove":"Sports",skateboard:"Sports",surfboard:"Sports","tennis racket":"Sports",
  bottle:"Kitchen","wine glass":"Kitchen",cup:"Kitchen",fork:"Kitchen",knife:"Kitchen",spoon:"Kitchen",bowl:"Kitchen",
  banana:"Food",apple:"Food",sandwich:"Food",orange:"Food",broccoli:"Food",carrot:"Food","hot dog":"Food",pizza:"Food",donut:"Food",cake:"Food",
  chair:"Household",couch:"Household","potted plant":"Household",bed:"Household","dining table":"Household",toilet:"Household",
  tv:"Electronics",laptop:"Electronics",mouse:"Electronics",remote:"Electronics",keyboard:"Electronics","cell phone":"Electronics",
  microwave:"Appliances",oven:"Appliances",toaster:"Appliances",sink:"Appliances",refrigerator:"Appliances",
  book:"Office",clock:"Household",vase:"Household",scissors:"Tools","teddy bear":"Toys","hair drier":"Appliances",toothbrush:"Personal Care"
};

const els = Object.fromEntries([...document.querySelectorAll("[id]")].map(el => [el.id, el]));

let db = null;
let boxes = [];
let learnedRoutes = {};
let inventory = [];

let detectionModel = null;
let classificationModel = null;
let modelState = "idle";
let modelPromise = null;

let current = null;
let pendingSingleFile = null;
let singleBusy = false;

let bulkQueue = [];
let bulkItems = [];
let bulkProcessing = false;

let cropTarget = null;
let cropSelection = null;
let cropDragging = false;
let cropStart = null;
let cropImage = null;
let cropScaleX = 1;
let cropScaleY = 1;

let inventoryObjectUrls = [];

function uid(prefix="id"){
  if(globalThis.crypto && typeof crypto.randomUUID === "function") return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
function normalize(v){ return String(v || "").trim().toLowerCase().replace(/\s+/g," "); }
function escapeHtml(v){ return String(v ?? "").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c])); }
function formatDate(ts){ return new Date(ts).toLocaleString(); }
function csvEscape(v){ const t=String(v ?? ""); return /[",\n\r]/.test(t) ? `"${t.replace(/"/g,'""')}"` : t; }
function boxById(id){ return boxes.find(b=>b.id===id); }
function boxLabel(box){ return box ? `Box ${box.number}${box.name && box.name !== `Box ${box.number}` ? ` – ${box.name}` : ""}` : "Unknown box"; }
function defaultQr(id){ return `AIBOX:${id}`; }
function itemCountForBox(id){ return inventory.filter(x=>x.boxId===id).length; }

function saveLocal(){
  localStorage.setItem(STORAGE_KEYS.boxes,JSON.stringify(boxes));
  localStorage.setItem(STORAGE_KEYS.learned,JSON.stringify(learnedRoutes));
}
function loadLocal(){
  try { boxes=JSON.parse(localStorage.getItem(STORAGE_KEYS.boxes)) || []; } catch { boxes=[]; }
  try { learnedRoutes=JSON.parse(localStorage.getItem(STORAGE_KEYS.learned)) || {}; } catch { learnedRoutes={}; }
  if(!boxes.length){
    boxes = Array.from({length:3},(_,i)=>{
      const id=uid("box");
      return {id,number:i+1,name:`Box ${i+1}`,description:"",qr:defaultQr(id)};
    });
    saveLocal();
  }
  boxes = boxes.map((b,i)=>({...b,number:i+1,name:b.name || `Box ${i+1}`,description:b.description || "",qr:b.qr || defaultQr(b.id)}));
  els.boxCount.value=boxes.length;
}

function openDb(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,DB_VERSION);
    req.onupgradeneeded=()=>{
      const database=req.result;
      if(!database.objectStoreNames.contains(STORE_NAME)){
        const store=database.createObjectStore(STORE_NAME,{keyPath:"id"});
        store.createIndex("boxId","boxId",{unique:false});
        store.createIndex("createdAt","createdAt",{unique:false});
      }
    };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}
function dbPut(record){
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE_NAME,"readwrite");
    tx.objectStore(STORE_NAME).put(record);
    tx.oncomplete=()=>resolve();
    tx.onerror=()=>reject(tx.error);
  });
}
function dbDelete(id){
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE_NAME,"readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete=()=>resolve();
    tx.onerror=()=>reject(tx.error);
  });
}
function dbGetAll(){
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE_NAME,"readonly");
    const req=tx.objectStore(STORE_NAME).getAll();
    req.onsuccess=()=>resolve(req.result || []);
    req.onerror=()=>reject(req.error);
  });
}

async function ensureModels(force=false){
  if(modelState==="ready" && detectionModel && classificationModel && !force) return true;
  if(modelState==="loading" && modelPromise && !force) return modelPromise;

  modelState="loading";
  els.modelStatus.className="status waiting";
  els.modelStatus.textContent="Loading object detection and classification models…";
  modelPromise=(async()=>{
    try{
      if(!window.tf || !window.cocoSsd || !window.mobilenet) throw new Error("AI libraries did not load. Check the internet connection and reload.");
      await tf.ready();
      const [detector,classifier]=await Promise.all([
        cocoSsd.load({base:"lite_mobilenet_v2"}),
        mobilenet.load({version:2,alpha:0.5})
      ]);
      detectionModel=detector;
      classificationModel=classifier;
      modelState="ready";
      els.modelStatus.className="status ready";
      els.modelStatus.textContent=`Ready — AI is loaded (${tf.getBackend()} backend).`;
      if(pendingSingleFile) setTimeout(runPendingSingle,0);
      updateBulkButtons();
      return true;
    }catch(err){
      console.error(err);
      modelState="error";
      detectionModel=null;
      classificationModel=null;
      els.modelStatus.className="status error";
      els.modelStatus.textContent=`AI failed to load: ${err.message}`;
      updateBulkButtons();
      throw err;
    }
  })();
  return modelPromise;
}

function conciseClassName(text){
  return String(text || "").split(",")[0].trim().replace(/_/g," ");
}
function inferCategoryFromText(label){
  const t=normalize(label);
  const groups=[
    ["Tools",["screwdriver","hammer","wrench","pliers","drill","saw","tool","cutter","vise","file"]],
    ["Electronics",["computer","phone","camera","radio","electronic","monitor","keyboard","speaker","charger","router"]],
    ["Electrical",["wire","outlet","switch","breaker","electrical","connector","relay"]],
    ["Kitchen",["spoon","fork","knife","plate","bowl","cup","pot","pan","kettle","kitchen"]],
    ["Automotive",["tire","wheel","car","automotive","motor","engine","spark plug"]],
    ["Clothing",["shirt","shoe","boot","coat","pants","hat","clothing"]],
    ["Hardware",["bolt","nut","screw","fastener","bracket","hinge","nail"]],
    ["Office",["book","paper","pen","pencil","stapler","office"]],
    ["Cleaning",["broom","mop","cleaner","brush","vacuum"]]
  ];
  for(const [category,words] of groups) if(words.some(w=>t.includes(w))) return category;
  return BROAD_CATEGORIES[t] || "Other";
}
function broadCategory(label){ return BROAD_CATEGORIES[normalize(label)] || inferCategoryFromText(label); }

function choosePrimary(detections){
  const accepted=detections.filter(d=>d.score>=DETECTOR_ACCEPT);
  if(!accepted.length) return null;
  return accepted.reduce((best,p)=>(p.bbox[2]*p.bbox[3])>(best.bbox[2]*best.bbox[3])?p:best);
}
function buildCandidates(detections,classes){
  const map=new Map();
  detections.forEach(d=>{
    const key=normalize(d.class);
    const existing=map.get(key);
    if(!existing || d.score>existing.score) map.set(key,{label:d.class,score:d.score,source:"detector"});
  });
  classes.forEach(c=>{
    const label=conciseClassName(c.className);
    const key=normalize(label);
    const existing=map.get(key);
    if(!existing || c.probability>existing.score) map.set(key,{label,score:c.probability,source:"classifier"});
  });
  return [...map.values()].sort((a,b)=>b.score-a.score).slice(0,8);
}
function routeItem(label,category,aiLabels=[]){
  const key=normalize(label);
  if(key && learnedRoutes[key] && boxById(learnedRoutes[key])){
    return {boxId:learnedRoutes[key],reason:`Learned from your previous choice for “${label}”.`,strength:"learned"};
  }
  const source=[label,category,...aiLabels].map(normalize).join(" ");
  const terms=[...new Set(source.split(/[^a-z0-9]+/).filter(x=>x.length>=3))];
  let best=null;
  for(const box of boxes){
    const hay=normalize(`${box.name} ${box.description}`);
    let score=0;
    for(const term of terms){
      if(hay.includes(term)) score += term===normalize(category) ? 4 : 2;
    }
    if(!best || score>best.score) best={boxId:box.id,score};
  }
  if(best && best.score>0) return {boxId:best.boxId,reason:"Matched the item/category to this box's name or description.",strength:"match"};

  let hash=0;
  const basis=key || normalize(category) || "unknown";
  for(const ch of basis) hash=((hash<<5)-hash+ch.charCodeAt(0))|0;
  const index=Math.abs(hash)%Math.max(1,boxes.length);
  return {boxId:boxes[index]?.id,reason:"No learned rule matched yet. This is a consistent starter suggestion; change it once and the app will remember your choice.",strength:"fallback"};
}

function imageFromUrl(url){
  return new Promise((resolve,reject)=>{
    const img=new Image();
    img.onload=()=>resolve(img);
    img.onerror=()=>reject(new Error("Could not decode this photo."));
    img.src=url;
  });
}
function makeRegionCanvas(img,roi){
  if(!roi) return img;
  const canvas=document.createElement("canvas");
  const sx=Math.max(0,Math.round(roi.x));
  const sy=Math.max(0,Math.round(roi.y));
  const sw=Math.max(2,Math.min(img.naturalWidth-sx,Math.round(roi.w)));
  const sh=Math.max(2,Math.min(img.naturalHeight-sy,Math.round(roi.h)));
  canvas.width=Math.min(sw,1200);
  canvas.height=Math.round(sh*(canvas.width/sw));
  canvas.getContext("2d").drawImage(img,sx,sy,sw,sh,0,0,canvas.width,canvas.height);
  canvas.dataset.scaleX=String(sw/canvas.width);
  canvas.dataset.scaleY=String(sh/canvas.height);
  canvas.dataset.offsetX=String(sx);
  canvas.dataset.offsetY=String(sy);
  return canvas;
}
async function recognize(img,roi=null){
  await ensureModels();
  const source=makeRegionCanvas(img,roi);
  const [rawDetections,classes]=await Promise.all([
    detectionModel.detect(source,20,0.25),
    classificationModel.classify(source,5)
  ]);

  let detections=rawDetections;
  if(roi && source instanceof HTMLCanvasElement){
    const scaleX=Number(source.dataset.scaleX);
    const scaleY=Number(source.dataset.scaleY);
    const offsetX=Number(source.dataset.offsetX);
    const offsetY=Number(source.dataset.offsetY);
    detections=rawDetections.map(d=>({
      ...d,
      bbox:[
        d.bbox[0]*scaleX+offsetX,
        d.bbox[1]*scaleY+offsetY,
        d.bbox[2]*scaleX,
        d.bbox[3]*scaleY
      ]
    }));
  }

  const primary=choosePrimary(detections);
  const topClass=classes[0] ? {label:conciseClassName(classes[0].className),score:classes[0].probability} : null;
  let label="Unknown item";
  let confidence=0;
  let recognitionSource="uncertain";

  if(primary){
    label=primary.class;
    confidence=primary.score;
    recognitionSource="object detector";
  }else if(topClass && topClass.score>=CLASSIFIER_ACCEPT){
    label=topClass.label;
    confidence=topClass.score;
    recognitionSource="image classifier";
  }

  const category=label==="Unknown item" ? "Other" : broadCategory(label);
  const candidates=buildCandidates(detections,classes);
  const labels=candidates.map(c=>c.label);
  const route=routeItem(label,category,labels);
  return {detections,classes,primary,label,category,confidence,recognitionSource,candidates,labels,route,roi};
}

function renderMainPreview(item){
  const canvas=els.previewCanvas;
  const img=item.img;
  const maxW=1000;
  const scale=Math.min(1,maxW/img.naturalWidth);
  canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));
  canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
  const ctx=canvas.getContext("2d");
  ctx.drawImage(img,0,0,canvas.width,canvas.height);
  const sx=canvas.width/img.naturalWidth, sy=canvas.height/img.naturalHeight;

  if(item.roi){
    ctx.strokeStyle="#ffd45e";ctx.lineWidth=4;
    ctx.strokeRect(item.roi.x*sx,item.roi.y*sy,item.roi.w*sx,item.roi.h*sy);
  }
  const p=item.primary;
  if(p){
    const [x,y,w,h]=p.bbox;
    ctx.strokeStyle="#5fa8ff";ctx.lineWidth=4;
    ctx.strokeRect(x*sx,y*sy,w*sx,h*sy);
    ctx.font="bold 18px system-ui";
    const text=`${p.class} ${Math.round(p.score*100)}%`;
    const tw=ctx.measureText(text).width+12;
    ctx.fillStyle="rgba(15,23,42,.88)";
    ctx.fillRect(x*sx,Math.max(0,y*sy-28),tw,28);
    ctx.fillStyle="#fff";ctx.fillText(text,x*sx+6,Math.max(20,y*sy-7));
  }
}
function updateSingleUi(item){
  renderMainPreview(item);
  els.itemName.value=item.label;
  els.itemCategory.value=item.category;
  els.destinationBox.value=item.route.boxId || "";
  els.routingReason.textContent=item.route.reason;
  const confidence=item.confidence ? `${Math.round(item.confidence*100)}%` : "low confidence";
  const cropText=item.roi ? " • analyzed your selected area" : "";
  els.detectionSummary.textContent = item.label==="Unknown item"
    ? `AI was not confident enough to name this object. Please type the correct name${cropText}.`
    : `AI chose “${item.label}” using the ${item.recognitionSource} (${confidence})${cropText}.`;
  els.candidateChips.innerHTML="";
  item.candidates.slice(0,6).forEach(c=>{
    const b=document.createElement("button");
    b.type="button";b.className="candidate-chip";
    b.textContent=`${c.label} ${Math.round(c.score*100)}%`;
    b.addEventListener("click",()=>{
      els.itemName.value=c.label;
      els.itemCategory.value=broadCategory(c.label);
      const route=routeItem(c.label,els.itemCategory.value,item.labels);
      els.destinationBox.value=route.boxId || "";
      els.routingReason.textContent=route.reason;
    });
    els.candidateChips.appendChild(b);
  });
  els.saveItemBtn.disabled=false;
}

async function handleSingleFile(file){
  if(!file) return;
  pendingSingleFile=file;
  els.analysisPanel.classList.remove("hidden");
  els.savedPanel.classList.add("hidden");
  els.saveItemBtn.disabled=true;
  els.detectionSummary.textContent="Photo received. Preparing AI…";
  els.candidateChips.innerHTML="";
  els.pendingStatus.textContent=modelState==="ready" ? "" : "A photo is waiting. It will be analyzed automatically as soon as the AI finishes loading.";
  await runPendingSingle();
}
async function runPendingSingle(){
  if(!pendingSingleFile || singleBusy) return;
  singleBusy=true;
  const file=pendingSingleFile;
  try{
    await ensureModels();
    if(file!==pendingSingleFile) return;
    els.pendingStatus.textContent="";
    els.detectionSummary.textContent="Analyzing photo…";
    if(current?.url) URL.revokeObjectURL(current.url);
    const url=URL.createObjectURL(file);
    const img=await imageFromUrl(url);
    const result=await recognize(img,null);
    current={file,url,img,...result,initialLabel:result.label};
    pendingSingleFile=null;
    updateSingleUi(current);
  }catch(err){
    console.error(err);
    els.detectionSummary.textContent=`Photo is still saved here, but AI analysis failed: ${err.message}. Tap Reload AI and it will try again.`;
  }finally{
    singleBusy=false;
  }
}
function resetSingle(openCamera=false){
  pendingSingleFile=null;
  if(current?.url) URL.revokeObjectURL(current.url);
  current=null;
  els.cameraInput.value="";
  els.photoInput.value="";
  els.analysisPanel.classList.add("hidden");
  els.savedPanel.classList.add("hidden");
  els.pendingStatus.textContent="";
  els.itemName.value="";
  els.itemCategory.value="";
  els.itemNote.value="";
  els.candidateChips.innerHTML="";
  if(openCamera) setTimeout(()=>els.cameraInput.click(),0);
}

function updateRouteFromEdits(){
  if(!current) return;
  const name=els.itemName.value.trim();
  const category=els.itemCategory.value.trim() || "Other";
  if(!name) return;
  const route=routeItem(name,category,current.labels);
  els.destinationBox.value=route.boxId || "";
  els.routingReason.textContent=route.reason;
}

async function createAnnotatedBlob(item,itemName,category,box){
  const img=item.img;
  const maxW=1600;
  const scale=Math.min(1,maxW/img.naturalWidth);
  const width=Math.max(1,Math.round(img.naturalWidth*scale));
  const photoH=Math.max(1,Math.round(img.naturalHeight*scale));
  const footerH=Math.max(90,Math.round(width*0.075));
  const canvas=document.createElement("canvas");
  canvas.width=width;canvas.height=photoH+footerH;
  const ctx=canvas.getContext("2d");
  ctx.drawImage(img,0,0,width,photoH);
  const sx=width/img.naturalWidth,sy=photoH/img.naturalHeight;
  if(item.primary){
    const [x,y,w,h]=item.primary.bbox;
    ctx.strokeStyle="#37a2ff";ctx.lineWidth=Math.max(4,width/300);
    ctx.strokeRect(x*sx,y*sy,w*sx,h*sy);
  }else if(item.roi){
    ctx.strokeStyle="#ffd45e";ctx.lineWidth=Math.max(4,width/300);
    ctx.strokeRect(item.roi.x*sx,item.roi.y*sy,item.roi.w*sx,item.roi.h*sy);
  }
  ctx.fillStyle="#0f172a";ctx.fillRect(0,photoH,width,footerH);
  const mainSize=Math.max(22,Math.round(width/35));
  const subSize=Math.max(16,Math.round(width/48));
  ctx.fillStyle="#fff";ctx.font=`800 ${mainSize}px system-ui`;
  ctx.fillText(itemName,18,photoH+mainSize+10);
  ctx.fillStyle="#bdd4f3";ctx.font=`700 ${subSize}px system-ui`;
  ctx.fillText(`${category} • ${boxLabel(box)}`,18,photoH+mainSize+subSize+22);
  return new Promise(resolve=>canvas.toBlob(resolve,"image/jpeg",0.88));
}

async function saveInventoryRecord(item,itemName,category,boxId,note=""){
  const box=boxById(boxId);
  if(!box) throw new Error("Choose a destination box.");
  if(!itemName || normalize(itemName)==="unknown item") throw new Error("Please enter the correct object name before saving.");
  const blob=await createAnnotatedBlob(item,itemName,category || "Other",box);
  const record={
    id:uid("item"),itemName,category:category || "Other",boxId,
    boxNumber:box.number,boxName:box.name,note,
    recognizedLabels:item.labels || [],originalAiLabel:item.initialLabel || item.label || "",
    recognitionSource:item.recognitionSource || "",createdAt:Date.now(),photoBlob:blob
  };
  await dbPut(record);
  inventory.unshift(record);
  const corrected=normalize(itemName);
  learnedRoutes[corrected]=boxId;
  const initial=normalize(item.initialLabel || item.label);
  if(initial && initial!=="unknown item" && initial===corrected) learnedRoutes[initial]=boxId;
  saveLocal();
  return record;
}
async function saveSingle(){
  if(!current) return;
  const itemName=els.itemName.value.trim();
  const category=els.itemCategory.value.trim() || "Other";
  const boxId=els.destinationBox.value;
  els.saveItemBtn.disabled=true;els.saveItemBtn.textContent="Saving…";
  try{
    const record=await saveInventoryRecord(current,itemName,category,boxId,els.itemNote.value.trim());
    renderBoxes();renderBoxSelectors();renderInventory();
    els.analysisPanel.classList.add("hidden");
    els.savedPanel.classList.remove("hidden");
    els.savedTitle.textContent=`Saved ${record.itemName}`;
    els.savedText.textContent=`Stored in ${boxLabel(boxById(record.boxId))}. The labeled photo is now searchable in inventory.`;
  }catch(err){
    alert(err.message);
    els.saveItemBtn.disabled=false;
  }finally{
    els.saveItemBtn.textContent="Save Item to Inventory";
  }
}

/* ---------- Bulk mode ---------- */
function addBulkFiles(files){
  for(const file of [...files]){
    if(!file?.type?.startsWith("image/")) continue;
    const duplicate=bulkQueue.some(q=>q.file.name===file.name && q.file.size===file.size && q.file.lastModified===file.lastModified);
    if(duplicate) continue;
    bulkQueue.push({id:uid("q"),file,url:URL.createObjectURL(file)});
  }
  renderBulkQueue();
}
function clearBulk(){
  if(bulkProcessing) return;
  [...bulkQueue,...bulkItems].forEach(x=>x.url && URL.revokeObjectURL(x.url));
  bulkQueue=[];bulkItems=[];
  els.bulkResults.innerHTML="";
  els.bulkResultsPanel.classList.add("hidden");
  els.bulkProgress.textContent="";
  renderBulkQueue();
}
function renderBulkQueue(){
  els.bulkQueue.innerHTML="";
  bulkQueue.forEach(q=>{
    const card=document.createElement("div");card.className="bulk-queue-card";
    card.innerHTML=`<img src="${q.url}" alt=""><div><strong>${escapeHtml(q.file.name)}</strong><div class="muted small">${q.file.type || "image"}</div></div><button class="button danger ghost" type="button">×</button>`;
    card.querySelector("button").addEventListener("click",()=>{
      URL.revokeObjectURL(q.url);
      bulkQueue=bulkQueue.filter(x=>x.id!==q.id);
      renderBulkQueue();
    });
    els.bulkQueue.appendChild(card);
  });
  els.bulkQueueSummary.textContent=bulkQueue.length ? `${bulkQueue.length} photo${bulkQueue.length===1?"":"s"} queued.` : "No photos queued.";
  updateBulkButtons();
}
function updateBulkButtons(){
  els.startBulkBtn.disabled=bulkProcessing || bulkQueue.length===0;
  els.saveBulkBtn.disabled=bulkProcessing || bulkItems.length===0;
}
async function analyzeBulk(){
  if(!bulkQueue.length || bulkProcessing) return;
  bulkProcessing=true;updateBulkButtons();
  els.bulkResultsPanel.classList.remove("hidden");
  els.bulkResults.innerHTML="";
  bulkItems=[];
  try{
    els.bulkProgress.textContent="Waiting for AI…";
    await ensureModels();
    for(let i=0;i<bulkQueue.length;i++){
      const q=bulkQueue[i];
      els.bulkProgress.textContent=`Analyzing ${i+1} of ${bulkQueue.length}: ${q.file.name}`;
      try{
        const img=await imageFromUrl(q.url);
        const result=await recognize(img,null);
        bulkItems.push({id:q.id,file:q.file,url:q.url,img,...result,initialLabel:result.label,saved:false});
      }catch(err){
        console.error(err);
        bulkItems.push({id:q.id,file:q.file,url:q.url,img:null,label:"Unknown item",category:"Other",candidates:[],labels:[],route:routeItem("Unknown item","Other",[]),error:err.message,saved:false});
      }
      renderBulkResults();
      await new Promise(r=>setTimeout(r,0));
    }
    els.bulkProgress.textContent=`Finished ${bulkItems.length} photo${bulkItems.length===1?"":"s"}. Review them below, then save all.`;
  }catch(err){
    els.bulkProgress.textContent=`AI could not process the batch: ${err.message}`;
  }finally{
    bulkProcessing=false;updateBulkButtons();
  }
}
function renderBulkResults(){
  els.bulkResults.innerHTML="";
  bulkItems.forEach((item,index)=>{
    const card=document.createElement("article");card.className="bulk-result-card";
    const optionHtml=boxes.map(b=>`<option value="${b.id}" ${b.id===item.route?.boxId?"selected":""}>${escapeHtml(boxLabel(b))}</option>`).join("");
    const candidateText=(item.candidates||[]).slice(0,4).map(c=>`${c.label} ${Math.round(c.score*100)}%`).join(" • ");
    card.innerHTML=`
      <img src="${item.url}" alt="Photo ${index+1}">
      <div class="bulk-result-body">
        <div class="bulk-result-meta">${escapeHtml(item.file.name)}${item.error?` • Error: ${escapeHtml(item.error)}`:""}</div>
        <label>Object name<input class="bulk-name" value="${escapeHtml(item.label)}"></label>
        <label>Category<input class="bulk-category" value="${escapeHtml(item.category)}" list="categoryList"></label>
        <label>Destination<select class="bulk-box">${optionHtml}</select></label>
        <div class="bulk-result-meta">${escapeHtml(candidateText || "AI uncertain — correct the name manually.")}</div>
        <div class="camera-actions">
          <button class="button secondary refine-bulk" type="button" ${item.img?"":"disabled"}>▣ Refine crop</button>
          <button class="button danger ghost remove-bulk" type="button">Remove</button>
        </div>
      </div>`;
    const name=card.querySelector(".bulk-name"),cat=card.querySelector(".bulk-category"),box=card.querySelector(".bulk-box");
    name.addEventListener("input",()=>{item.label=name.value;});
    cat.addEventListener("input",()=>{item.category=cat.value;});
    box.addEventListener("change",()=>{item.route={...(item.route||{}),boxId:box.value,reason:"You selected this box.",strength:"manual"};});
    card.querySelector(".refine-bulk").addEventListener("click",()=>openCropEditor({kind:"bulk",index}));
    card.querySelector(".remove-bulk").addEventListener("click",()=>{
      const removed=bulkItems.splice(index,1)[0];
      bulkQueue=bulkQueue.filter(q=>q.id!==removed.id);
      if(removed?.url) URL.revokeObjectURL(removed.url);
      renderBulkQueue();renderBulkResults();updateBulkButtons();
    });
    els.bulkResults.appendChild(card);
  });
}
async function saveBulk(){
  if(!bulkItems.length || bulkProcessing) return;
  const cards=[...els.bulkResults.querySelectorAll(".bulk-result-card")];
  const pending=[];
  for(let i=0;i<bulkItems.length;i++){
    const card=cards[i],item=bulkItems[i];
    const name=card.querySelector(".bulk-name").value.trim();
    const category=card.querySelector(".bulk-category").value.trim() || "Other";
    const boxId=card.querySelector(".bulk-box").value;
    if(!name || normalize(name)==="unknown item"){
      card.scrollIntoView({behavior:"smooth",block:"center"});
      alert(`Please correct the object name for photo ${i+1} before saving the batch.`);
      return;
    }
    pending.push({item,name,category,boxId});
  }
  els.saveBulkBtn.disabled=true;els.saveBulkBtn.textContent="Saving batch…";
  try{
    for(let i=0;i<pending.length;i++){
      els.bulkProgress.textContent=`Saving ${i+1} of ${pending.length}…`;
      const p=pending[i];
      await saveInventoryRecord(p.item,p.name,p.category,p.boxId,"");
      p.item.saved=true;
    }
    renderBoxes();renderBoxSelectors();renderInventory();
    els.bulkProgress.textContent=`Saved ${pending.length} item${pending.length===1?"":"s"} to inventory. Ready for another batch.`;
    bulkQueue=[];
    bulkItems=[];
    els.bulkResults.innerHTML="";
    els.bulkResultsPanel.classList.add("hidden");
    renderBulkQueue();
  }catch(err){
    alert(`Could not save batch: ${err.message}`);
  }finally{
    els.saveBulkBtn.textContent="Save All to Inventory";
    updateBulkButtons();
  }
}

/* ---------- Crop/refine editor ---------- */
function openCropEditor(target){
  const item=target.kind==="single" ? current : bulkItems[target.index];
  if(!item?.img) return;
  cropTarget=target;cropSelection=null;cropDragging=false;cropImage=item.img;
  const maxW=900;
  const scale=Math.min(1,maxW/cropImage.naturalWidth);
  els.cropCanvas.width=Math.max(1,Math.round(cropImage.naturalWidth*scale));
  els.cropCanvas.height=Math.max(1,Math.round(cropImage.naturalHeight*scale));
  cropScaleX=cropImage.naturalWidth/els.cropCanvas.width;
  cropScaleY=cropImage.naturalHeight/els.cropCanvas.height;
  redrawCropCanvas();
  els.applyCropBtn.disabled=true;
  els.cropOverlay.classList.remove("hidden");
}
function closeCropEditor(){
  els.cropOverlay.classList.add("hidden");
  cropTarget=null;cropSelection=null;cropImage=null;
}
function redrawCropCanvas(){
  if(!cropImage) return;
  const c=els.cropCanvas,ctx=c.getContext("2d");
  ctx.clearRect(0,0,c.width,c.height);ctx.drawImage(cropImage,0,0,c.width,c.height);
  if(cropSelection){
    ctx.fillStyle="rgba(95,168,255,.15)";ctx.fillRect(cropSelection.x,cropSelection.y,cropSelection.w,cropSelection.h);
    ctx.strokeStyle="#ffd45e";ctx.lineWidth=3;ctx.strokeRect(cropSelection.x,cropSelection.y,cropSelection.w,cropSelection.h);
  }
}
function canvasPoint(event){
  const r=els.cropCanvas.getBoundingClientRect();
  return {
    x:(event.clientX-r.left)*(els.cropCanvas.width/r.width),
    y:(event.clientY-r.top)*(els.cropCanvas.height/r.height)
  };
}
function startCrop(event){
  event.preventDefault();
  cropDragging=true;cropStart=canvasPoint(event);cropSelection={x:cropStart.x,y:cropStart.y,w:0,h:0};
  els.cropCanvas.setPointerCapture?.(event.pointerId);
}
function moveCrop(event){
  if(!cropDragging) return;
  event.preventDefault();
  const p=canvasPoint(event);
  cropSelection={
    x:Math.min(cropStart.x,p.x),y:Math.min(cropStart.y,p.y),
    w:Math.abs(p.x-cropStart.x),h:Math.abs(p.y-cropStart.y)
  };
  els.applyCropBtn.disabled=cropSelection.w<10 || cropSelection.h<10;
  redrawCropCanvas();
}
function endCrop(event){
  if(!cropDragging) return;
  cropDragging=false;
  els.cropCanvas.releasePointerCapture?.(event.pointerId);
}
async function applyCrop(){
  if(!cropSelection || !cropTarget) return;
  const roi={
    x:cropSelection.x*cropScaleX,y:cropSelection.y*cropScaleY,
    w:cropSelection.w*cropScaleX,h:cropSelection.h*cropScaleY
  };
  els.applyCropBtn.disabled=true;els.applyCropBtn.textContent="Analyzing selection…";
  try{
    if(cropTarget.kind==="single" && current){
      const result=await recognize(current.img,roi);
      current={...current,...result,roi,initialLabel:current.initialLabel || result.label};
      updateSingleUi(current);
    }else if(cropTarget.kind==="bulk"){
      const index=cropTarget.index,item=bulkItems[index];
      if(item){
        const result=await recognize(item.img,roi);
        bulkItems[index]={...item,...result,roi,initialLabel:item.initialLabel || result.label};
        renderBulkResults();
      }
    }
    closeCropEditor();
  }catch(err){
    alert(`Could not analyze the selected area: ${err.message}`);
  }finally{
    els.applyCropBtn.textContent="Re-analyze Selection";
    els.applyCropBtn.disabled=false;
  }
}

/* ---------- Boxes & QR ---------- */
function setBoxCount(count){
  count=Math.max(1,Math.min(100,Number(count)||1));
  if(count<boxes.length){
    const removedIds=new Set(boxes.slice(count).map(b=>b.id));
    if(inventory.some(item=>removedIds.has(item.boxId))){
      alert("One or more boxes you are trying to remove still contain inventory. Move those items first.");
      els.boxCount.value=boxes.length;
      return;
    }
  }
  const next=[];
  for(let i=0;i<count;i++){
    if(boxes[i]) next.push(boxes[i]);
    else{
      const id=uid("box");
      next.push({id,number:i+1,name:`Box ${i+1}`,description:"",qr:defaultQr(id)});
    }
  }
  boxes=next.map((b,i)=>({...b,number:i+1,name:b.name || `Box ${i+1}`,qr:b.qr || defaultQr(b.id)}));
  saveLocal();renderBoxes();renderBoxSelectors();renderInventory();
}
function renderQr(container,text,size=110){
  container.innerHTML="";
  if(!window.QRCode){ container.textContent=text; return; }
  new QRCode(container,{text,width:size,height:size,correctLevel:QRCode.CorrectLevel.M});
}
function renderBoxes(){
  els.boxGrid.innerHTML="";
  boxes.forEach(box=>{
    const card=document.createElement("article");card.className="box-card";
    card.innerHTML=`
      <div class="box-card-header"><span class="box-number">Box ${box.number}</span><span class="item-count">${itemCountForBox(box.id)} item${itemCountForBox(box.id)===1?"":"s"}</span></div>
      <label>Name<input class="box-name" value="${escapeHtml(box.name)}"></label>
      <label>What belongs here?<input class="box-desc" value="${escapeHtml(box.description)}" placeholder="e.g. screwdrivers, drills, hand tools"></label>
      <label>QR value<input class="box-qr" value="${escapeHtml(box.qr)}"></label>
      <div class="qr-mini"></div>
      <div class="box-actions"><button class="button secondary view-box" type="button">View Inventory</button><button class="button secondary regen" type="button">New QR</button></div>`;
    const name=card.querySelector(".box-name"),desc=card.querySelector(".box-desc"),qr=card.querySelector(".box-qr"),qrMini=card.querySelector(".qr-mini");
    renderQr(qrMini,box.qr);
    const commit=()=>{
      box.name=name.value.trim() || `Box ${box.number}`;
      box.description=desc.value.trim();
      box.qr=qr.value.trim() || defaultQr(box.id);
      saveLocal();renderBoxSelectors();renderQr(qrMini,box.qr);
    };
    [name,desc,qr].forEach(x=>x.addEventListener("change",commit));
    card.querySelector(".regen").addEventListener("click",()=>{
      box.qr=defaultQr(`${box.id}-${Math.random().toString(36).slice(2,8)}`);
      qr.value=box.qr;saveLocal();renderQr(qrMini,box.qr);
    });
    card.querySelector(".view-box").addEventListener("click",()=>openBoxInventory(box.id));
    els.boxGrid.appendChild(card);
  });
}
function renderBoxSelectors(){
  const d=els.destinationBox.value,f=els.boxFilter.value;
  els.destinationBox.innerHTML=boxes.map(b=>`<option value="${b.id}">${escapeHtml(boxLabel(b))}</option>`).join("");
  if(boxes.some(b=>b.id===d)) els.destinationBox.value=d;
  els.boxFilter.innerHTML=`<option value="">All boxes</option>`+boxes.map(b=>`<option value="${b.id}">${escapeHtml(boxLabel(b))}</option>`).join("");
  if(boxes.some(b=>b.id===f)) els.boxFilter.value=f;
}
function printQrLabels(){
  els.qrPrintArea.innerHTML="";
  boxes.forEach(box=>{
    const card=document.createElement("section");card.className="print-label";
    card.innerHTML=`<h2>${escapeHtml(boxLabel(box))}</h2><p>${escapeHtml(box.description || "")}</p><div class="qr-target"></div><p>${escapeHtml(box.qr)}</p>`;
    els.qrPrintArea.appendChild(card);
    renderQr(card.querySelector(".qr-target"),box.qr,180);
  });
  setTimeout(()=>window.print(),150);
}
function lookupQr(value){
  const v=String(value||"").trim();
  const box=boxes.find(b=>b.qr===v);
  if(!box){els.qrLookupStatus.textContent="No box matches that QR value.";return;}
  els.qrLookupStatus.textContent=`Opened ${boxLabel(box)}.`;
  openBoxInventory(box.id);
}
async function scanQrFile(file){
  if(!file) return;
  if(!("BarcodeDetector" in window)){
    els.qrLookupStatus.textContent="This browser cannot decode QR photos automatically. Type or paste the QR value instead.";
    return;
  }
  try{
    const detector=new BarcodeDetector({formats:["qr_code"]});
    const bitmap=await createImageBitmap(file);
    const codes=await detector.detect(bitmap);
    bitmap.close?.();
    if(!codes.length){els.qrLookupStatus.textContent="No QR code was found in that photo.";return;}
    els.qrLookupInput.value=codes[0].rawValue;lookupQr(codes[0].rawValue);
  }catch(err){els.qrLookupStatus.textContent=`Could not scan QR: ${err.message}`;}
}

/* ---------- Inventory ---------- */
function matchesItem(item,q){
  if(!q) return true;
  const box=boxById(item.boxId);
  const hay=normalize([item.itemName,item.category,item.note,item.originalAiLabel,...(item.recognizedLabels||[]),box?.name,box?.description].join(" "));
  return q.split(/\s+/).filter(Boolean).every(term=>hay.includes(term));
}
function renderInventory(){
  inventoryObjectUrls.forEach(URL.revokeObjectURL);inventoryObjectUrls=[];
  const q=normalize(els.searchInput.value.replace(/^where (is|are) (my )?/i,"").replace(/[?]/g,""));
  const filter=els.boxFilter.value;
  const rows=inventory.filter(item=>(!filter || item.boxId===filter) && matchesItem(item,q)).sort((a,b)=>b.createdAt-a.createdAt);
  els.inventoryGrid.innerHTML="";
  els.emptyInventory.classList.toggle("hidden",rows.length>0);
  els.inventorySummary.textContent=`${rows.length} shown • ${inventory.length} total item${inventory.length===1?"":"s"}`;
  rows.forEach(item=>{
    const card=document.createElement("article");card.className="inventory-card";
    const photoUrl=item.photoBlob?URL.createObjectURL(item.photoBlob):"";
    if(photoUrl) inventoryObjectUrls.push(photoUrl);
    const box=boxById(item.boxId);
    card.innerHTML=`${photoUrl?`<img class="inventory-photo" src="${photoUrl}" alt="Labeled photo of ${escapeHtml(item.itemName)}">`:""}
      <div class="inventory-body"><h3>${escapeHtml(item.itemName)}</h3>
      <div class="inventory-meta"><span class="pill">${escapeHtml(item.category)}</span><span class="pill box-pill">${escapeHtml(boxLabel(box) || `Box ${item.boxNumber}`)}</span></div>
      ${item.note?`<p class="inventory-note">${escapeHtml(item.note)}</p>`:""}
      <p class="muted small">Saved ${escapeHtml(formatDate(item.createdAt))}</p>
      <div class="inventory-actions-card"><button class="button secondary move-item" type="button">Move</button><button class="button danger delete-item" type="button">Delete</button></div></div>`;
    card.querySelector(".delete-item").addEventListener("click",async()=>{
      if(!confirm(`Delete ${item.itemName} from inventory?`)) return;
      await dbDelete(item.id);inventory=inventory.filter(x=>x.id!==item.id);renderBoxes();renderInventory();
    });
    card.querySelector(".move-item").addEventListener("click",()=>moveItem(item));
    els.inventoryGrid.appendChild(card);
  });
}
async function moveItem(item){
  const list=boxes.map(b=>`${b.number}: ${b.name}`).join("\n");
  const answer=prompt(`Move “${item.itemName}” to which box number?\n\n${list}`,String(boxById(item.boxId)?.number || ""));
  if(answer===null) return;
  const box=boxes.find(b=>b.number===Number(answer));
  if(!box){alert("That box number does not exist.");return;}
  item.boxId=box.id;item.boxNumber=box.number;item.boxName=box.name;
  await dbPut(item);renderBoxes();renderInventory();
}
function openBoxInventory(boxId){
  activateTab("inventory");
  els.boxFilter.value=boxId;
  els.searchInput.value="";
  renderInventory();
}
function exportCsv(){
  const rows=[["item_name","category","box_number","box_name","note","saved_at","original_ai_label"]];
  inventory.slice().sort((a,b)=>a.createdAt-b.createdAt).forEach(i=>{
    const b=boxById(i.boxId);
    rows.push([i.itemName,i.category,b?.number ?? i.boxNumber,b?.name ?? i.boxName,i.note||"",new Date(i.createdAt).toISOString(),i.originalAiLabel||""]);
  });
  const csv=rows.map(r=>r.map(csvEscape).join(",")).join("\r\n");
  const blob=new Blob(["\ufeff",csv],{type:"text/csv;charset=utf-8"});
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download="AI_Box_Inventory.csv";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

/* ---------- Navigation and events ---------- */
function activateTab(name){
  document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active",b.dataset.tab===name));
  document.querySelectorAll(".tab-page").forEach(p=>p.classList.toggle("active",p.id===`tab-${name}`));
}
function setMode(mode){
  const single=mode==="single";
  els.singleMode.classList.toggle("hidden",!single);
  els.bulkMode.classList.toggle("hidden",single);
  els.singleModeBtn.classList.toggle("active",single);
  els.bulkModeBtn.classList.toggle("active",!single);
}

document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>activateTab(b.dataset.tab)));
els.singleModeBtn.addEventListener("click",()=>setMode("single"));
els.bulkModeBtn.addEventListener("click",()=>setMode("bulk"));

els.cameraInput.addEventListener("change",e=>{
  const file=e.target.files?.[0]; e.target.value="";
  if(file) handleSingleFile(file);
});
els.photoInput.addEventListener("change",e=>{
  const file=e.target.files?.[0]; e.target.value="";
  if(file) handleSingleFile(file);
});
els.resetSingleBtn.addEventListener("click",()=>resetSingle(false));
els.takeNextBtn.addEventListener("click",()=>resetSingle(true));
els.readyNextBtn.addEventListener("click",()=>resetSingle(false));
els.cropSingleBtn.addEventListener("click",()=>openCropEditor({kind:"single"}));
els.saveItemBtn.addEventListener("click",saveSingle);
els.itemName.addEventListener("change",updateRouteFromEdits);
els.itemCategory.addEventListener("change",updateRouteFromEdits);

els.bulkCameraInput.addEventListener("change",e=>{addBulkFiles(e.target.files);e.target.value="";});
els.bulkPhotoInput.addEventListener("change",e=>{addBulkFiles(e.target.files);e.target.value="";});
els.clearBulkBtn.addEventListener("click",clearBulk);
els.startBulkBtn.addEventListener("click",analyzeBulk);
els.saveBulkBtn.addEventListener("click",saveBulk);

els.closeCropBtn.addEventListener("click",closeCropEditor);
els.clearCropBtn.addEventListener("click",()=>{cropSelection=null;els.applyCropBtn.disabled=true;redrawCropCanvas();});
els.applyCropBtn.addEventListener("click",applyCrop);
els.cropCanvas.addEventListener("pointerdown",startCrop);
els.cropCanvas.addEventListener("pointermove",moveCrop);
els.cropCanvas.addEventListener("pointerup",endCrop);
els.cropCanvas.addEventListener("pointercancel",endCrop);

els.reloadModelBtn.addEventListener("click",async()=>{
  try{await ensureModels(true);if(pendingSingleFile) runPendingSingle();}catch{}
});
els.applyBoxCountBtn.addEventListener("click",()=>setBoxCount(els.boxCount.value));
els.printQrBtn.addEventListener("click",printQrLabels);
els.qrLookupBtn.addEventListener("click",()=>lookupQr(els.qrLookupInput.value));
els.qrLookupInput.addEventListener("keydown",e=>{if(e.key==="Enter") lookupQr(e.currentTarget.value);});
els.scanQrInput.addEventListener("change",e=>{const f=e.target.files?.[0];e.target.value="";if(f) scanQrFile(f);});
els.searchInput.addEventListener("input",renderInventory);
els.boxFilter.addEventListener("change",renderInventory);
els.clearSearchBtn.addEventListener("click",()=>{els.searchInput.value="";els.boxFilter.value="";renderInventory();});
els.exportCsvBtn.addEventListener("click",exportCsv);

window.addEventListener("beforeunload",()=>{
  if(current?.url) URL.revokeObjectURL(current.url);
  [...bulkQueue,...bulkItems].forEach(x=>x.url && URL.revokeObjectURL(x.url));
  inventoryObjectUrls.forEach(URL.revokeObjectURL);
});

async function init(){
  loadLocal();
  try{
    db=await openDb();
    inventory=await dbGetAll();
  }catch(err){
    console.error(err);
    alert("Inventory storage could not open in this browser. Photos may not save until browser storage is available.");
  }
  renderBoxes();renderBoxSelectors();renderInventory();renderBulkQueue();
  ensureModels().catch(()=>{});
}
init();
