const STORAGE_KEYS = {
  boxes: "aiBoxSorter.boxes.v3",
  learned: "aiBoxSorter.learned.v3"
};
const DB_NAME = "aiBoxSorterInventory";
const DB_VERSION = 1;
const STORE_NAME = "items";

const BROAD_CATEGORIES = {
  person: "People",
  bicycle: "Vehicles", car: "Vehicles", motorcycle: "Vehicles", airplane: "Vehicles", bus: "Vehicles", train: "Vehicles", truck: "Vehicles", boat: "Vehicles",
  "traffic light": "Outdoor", "fire hydrant": "Outdoor", "stop sign": "Outdoor", "parking meter": "Outdoor", bench: "Outdoor",
  bird: "Animals", cat: "Animals", dog: "Animals", horse: "Animals", sheep: "Animals", cow: "Animals", elephant: "Animals", bear: "Animals", zebra: "Animals", giraffe: "Animals",
  backpack: "Accessories", umbrella: "Accessories", handbag: "Accessories", tie: "Accessories", suitcase: "Accessories",
  frisbee: "Sports", skis: "Sports", snowboard: "Sports", "sports ball": "Sports", kite: "Sports", "baseball bat": "Sports", "baseball glove": "Sports", skateboard: "Sports", surfboard: "Sports", "tennis racket": "Sports",
  bottle: "Kitchen", "wine glass": "Kitchen", cup: "Kitchen", fork: "Kitchen", knife: "Kitchen", spoon: "Kitchen", bowl: "Kitchen",
  banana: "Food", apple: "Food", sandwich: "Food", orange: "Food", broccoli: "Food", carrot: "Food", "hot dog": "Food", pizza: "Food", donut: "Food", cake: "Food",
  chair: "Household", couch: "Household", "potted plant": "Household", bed: "Household", "dining table": "Household", toilet: "Household",
  tv: "Electronics", laptop: "Electronics", mouse: "Electronics", remote: "Electronics", keyboard: "Electronics", "cell phone": "Electronics",
  microwave: "Appliances", oven: "Appliances", toaster: "Appliances", sink: "Appliances", refrigerator: "Appliances",
  book: "Office", clock: "Household", vase: "Household", scissors: "Tools", "teddy bear": "Toys", "hair drier": "Appliances", toothbrush: "Personal Care"
};

const els = Object.fromEntries([...document.querySelectorAll("[id]")].map(el => [el.id, el]));
let detectionModel = null;
let classificationModel = null;
let db = null;
let boxes = [];
let learnedRoutes = {};
let inventory = [];
let current = null;
let qrObjectUrls = [];

function uid(prefix = "id") {
  if (crypto?.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
function normalize(value) { return String(value || "").trim().toLowerCase().replace(/\s+/g, " "); }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c])); }
function formatDate(ts) { return new Date(ts).toLocaleString(); }
function csvEscape(value) { const t = String(value ?? ""); return /[",\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; }
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1500);
}
function saveLocal() {
  localStorage.setItem(STORAGE_KEYS.boxes, JSON.stringify(boxes));
  localStorage.setItem(STORAGE_KEYS.learned, JSON.stringify(learnedRoutes));
}
function defaultQr(boxId) { return `AIBOX:${boxId}`; }
function loadLocal() {
  try { boxes = JSON.parse(localStorage.getItem(STORAGE_KEYS.boxes)) || []; } catch { boxes = []; }
  try { learnedRoutes = JSON.parse(localStorage.getItem(STORAGE_KEYS.learned)) || {}; } catch { learnedRoutes = {}; }
  if (!boxes.length) setBoxCount(3, false);
  els.boxCount.value = boxes.length;
}

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const database = req.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("boxId", "boxId", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
function dbPut(record) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite"); tx.objectStore(STORE_NAME).put(record);
    tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
  });
}
function dbDelete(id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite"); tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
  });
}
function dbGetAll() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly"); const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result || []); req.onerror = () => reject(req.error);
  });
}

function setBoxCount(count, persist = true) {
  count = Math.max(1, Math.min(100, Number(count) || 1));
  const next = [];
  for (let i = 0; i < count; i++) {
    const existing = boxes[i];
    if (existing) next.push(existing);
    else {
      const id = uid("box");
      next.push({ id, number: i + 1, name: `Box ${i + 1}`, description: "", qr: defaultQr(id) });
    }
  }
  boxes = next.map((b, i) => ({ ...b, number: i + 1, name: b.name || `Box ${i + 1}`, qr: b.qr || defaultQr(b.id) }));
  if (persist) saveLocal();
  renderBoxes(); renderBoxSelectors(); renderInventory();
}
function boxById(id) { return boxes.find(b => b.id === id); }
function boxLabel(box) { return box ? `Box ${box.number}${box.name && box.name !== `Box ${box.number}` ? ` – ${box.name}` : ""}` : "Unknown box"; }
function itemCountForBox(id) { return inventory.filter(x => x.boxId === id).length; }

function renderQr(container, text, size = 110) {
  container.innerHTML = "";
  if (!window.QRCode) { container.textContent = text; return; }
  new QRCode(container, { text, width: size, height: size, correctLevel: QRCode.CorrectLevel.M });
}
function renderBoxes() {
  els.boxGrid.innerHTML = "";
  for (const box of boxes) {
    const card = document.createElement("article"); card.className = "box-card";
    card.innerHTML = `
      <div class="box-card-header"><span class="box-number">Box ${box.number}</span><span class="item-count">${itemCountForBox(box.id)} item${itemCountForBox(box.id) === 1 ? "" : "s"}</span></div>
      <label>Name<input class="box-name" value="${escapeHtml(box.name)}" /></label>
      <label>What belongs here?<input class="box-description" value="${escapeHtml(box.description)}" placeholder="e.g. screwdrivers, drills, hand tools" /></label>
      <label>QR value<input class="box-qr" value="${escapeHtml(box.qr)}" /></label>
      <div class="qr-mini"></div>
      <div class="box-actions"><button class="button secondary view-box" type="button">View Inventory</button><button class="button secondary regen-qr" type="button">New QR</button></div>`;
    const name = card.querySelector(".box-name"); const desc = card.querySelector(".box-description"); const qr = card.querySelector(".box-qr"); const qrMini = card.querySelector(".qr-mini");
    renderQr(qrMini, box.qr);
    const commit = () => { box.name = name.value.trim() || `Box ${box.number}`; box.description = desc.value.trim(); box.qr = qr.value.trim() || defaultQr(box.id); saveLocal(); renderBoxSelectors(); renderQr(qrMini, box.qr); };
    name.addEventListener("change", commit); desc.addEventListener("change", commit); qr.addEventListener("change", commit);
    card.querySelector(".regen-qr").addEventListener("click", () => { box.qr = defaultQr(`${box.id}-${Math.random().toString(36).slice(2,8)}`); qr.value = box.qr; saveLocal(); renderQr(qrMini, box.qr); });
    card.querySelector(".view-box").addEventListener("click", () => openBoxInventory(box.id));
    els.boxGrid.appendChild(card);
  }
}
function renderBoxSelectors() {
  const currentDest = els.destinationBox.value;
  els.destinationBox.innerHTML = boxes.map(b => `<option value="${b.id}">${escapeHtml(boxLabel(b))}</option>`).join("");
  if (boxes.some(b => b.id === currentDest)) els.destinationBox.value = currentDest;
  const filter = els.boxFilter.value;
  els.boxFilter.innerHTML = `<option value="">All boxes</option>` + boxes.map(b => `<option value="${b.id}">${escapeHtml(boxLabel(b))}</option>`).join("");
  if (boxes.some(b => b.id === filter)) els.boxFilter.value = filter;
}

function routeItem(label, category, aiLabels = []) {
  const key = normalize(label);
  if (learnedRoutes[key] && boxById(learnedRoutes[key])) return { boxId: learnedRoutes[key], reason: `Learned from your previous choice for “${label}”.`, strength: "learned" };
  const terms = [...new Set([label, category, ...aiLabels].flatMap(x => normalize(x).split(/[^a-z0-9]+/)).filter(x => x.length >= 3))];
  let best = null;
  for (const box of boxes) {
    const hay = normalize(`${box.name} ${box.description}`);
    let score = 0;
    for (const term of terms) if (hay.includes(term)) score += term === normalize(category) ? 3 : 2;
    if (!best || score > best.score) best = { boxId: box.id, score };
  }
  if (best?.score > 0) return { boxId: best.boxId, reason: `Matched the item/category to this box's name or description.`, strength: "match" };
  let hash = 0; for (const ch of key || normalize(category) || "unknown") hash = ((hash << 5) - hash + ch.charCodeAt(0)) | 0;
  const index = Math.abs(hash) % boxes.length;
  return { boxId: boxes[index].id, reason: `No learned rule matched yet, so this is a consistent starter box. Choose another box once and I’ll remember it.`, strength: "fallback" };
}

async function loadModels() {
  detectionModel = null; classificationModel = null;
  els.modelStatus.className = "status waiting"; els.modelStatus.textContent = "Loading object detection and classification models…";
  try {
    if (!window.tf || !window.cocoSsd || !window.mobilenet) throw new Error("AI libraries did not load. Check your internet connection.");
    await tf.ready();
    [detectionModel, classificationModel] = await Promise.all([
      cocoSsd.load({ base: "lite_mobilenet_v2" }),
      mobilenet.load({ version: 2, alpha: 0.5 })
    ]);
    els.modelStatus.className = "status ready"; els.modelStatus.textContent = `Ready — AI running in this browser (${tf.getBackend()}).`;
  } catch (err) {
    console.error(err); els.modelStatus.className = "status error"; els.modelStatus.textContent = `AI failed to load: ${err.message}`;
  }
}
function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file); const img = new Image();
    img.onload = () => resolve({ img, url }); img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Could not read that image.")); }; img.src = url;
  });
}
function broadCategory(label) { return BROAD_CATEGORIES[normalize(label)] || "Other"; }
function choosePrimary(predictions) {
  if (!predictions.length) return null;
  return predictions.reduce((best, p) => (p.bbox[2] * p.bbox[3]) > (best.bbox[2] * best.bbox[3]) ? p : best);
}
function conciseClassName(text) {
  return String(text || "").split(",")[0].trim().replace(/_/g, " ");
}

async function analyzeFile(file) {
  if (!detectionModel || !classificationModel) { alert("The AI is not ready yet."); return; }
  els.analysisPanel.classList.remove("hidden"); els.savedPanel.classList.add("hidden");
  els.detectionSummary.textContent = "Analyzing photo…"; els.saveItemBtn.disabled = true;
  if (current?.url) URL.revokeObjectURL(current.url);
  const loaded = await loadImage(file);
  try {
    const [detections, classes] = await Promise.all([
      detectionModel.detect(loaded.img, 20, 0.35),
      classificationModel.classify(loaded.img, 5)
    ]);
    const primary = choosePrimary(detections);
    const fallbackClass = classes[0] ? conciseClassName(classes[0].className) : "Unknown item";
    const label = primary?.class || fallbackClass;
    const category = primary ? broadCategory(primary.class) : inferCategoryFromText(label);
    const labels = [...detections.map(d => d.class), ...classes.map(c => conciseClassName(c.className))];
    const route = routeItem(label, category, labels);
    current = { file, img: loaded.img, url: loaded.url, detections, classes, primary, labels, initialLabel: label, route };
    els.itemName.value = label; els.itemCategory.value = category; els.destinationBox.value = route.boxId; els.itemNote.value = "";
    updateRouteMessage(route);
    drawPreview(label, detections);
    const detectionText = detections.length ? detections.map(d => `${d.class} ${Math.round(d.score * 100)}%`).join(" • ") : `Broader classifier: ${classes.slice(0,3).map(c => `${conciseClassName(c.className)} ${Math.round(c.probability*100)}%`).join(" • ")}`;
    els.detectionSummary.textContent = detectionText;
    els.saveItemBtn.disabled = false;
  } catch (err) {
    console.error(err); els.detectionSummary.textContent = `Could not analyze photo: ${err.message}`;
  }
}
function inferCategoryFromText(label) {
  const text = normalize(label);
  const groups = [
    ["tool", ["screwdriver","hammer","wrench","pliers","drill","saw","tool","cutter"]],
    ["Electronics", ["computer","phone","camera","radio","electronic","monitor","keyboard","speaker","charger"]],
    ["Kitchen", ["spoon","fork","knife","plate","bowl","cup","pot","pan","kettle","kitchen"]],
    ["Automotive", ["tire","wheel","car","automotive","motor","engine"]],
    ["Clothing", ["shirt","shoe","boot","coat","pants","hat","clothing"]]
  ];
  for (const [cat, words] of groups) if (words.some(w => text.includes(w))) return cat === "tool" ? "Tools" : cat;
  return "Other";
}
function updateRouteMessage(route) {
  const box = boxById(route.boxId);
  els.routingReason.innerHTML = `<strong>Put it in ${escapeHtml(boxLabel(box))}</strong><br><span class="small">${escapeHtml(route.reason)}</span>`;
}
function drawPreview(label, detections) {
  if (!current?.img) return;
  const img = current.img; const maxW = 1200; const scale = Math.min(1, maxW / img.naturalWidth); const w = Math.round(img.naturalWidth * scale); const h = Math.round(img.naturalHeight * scale);
  const c = els.previewCanvas; c.width = w; c.height = h; const ctx = c.getContext("2d"); ctx.drawImage(img, 0, 0, w, h);
  ctx.lineWidth = Math.max(3, w / 300); ctx.font = `bold ${Math.max(18, Math.round(w/35))}px system-ui`;
  for (const d of detections) {
    const [x,y,bw,bh] = d.bbox.map(v => v * scale); ctx.strokeStyle = "#4da3ff"; ctx.strokeRect(x,y,bw,bh);
    const text = `${d.class} ${Math.round(d.score*100)}%`; const tw = ctx.measureText(text).width + 16; const th = Math.max(28, w/28); ctx.fillStyle = "rgba(12,35,65,.9)"; ctx.fillRect(x, Math.max(0,y-th), tw, th); ctx.fillStyle = "white"; ctx.fillText(text, x+8, Math.max(21,y-6));
  }
  if (!detections.length) {
    ctx.fillStyle = "rgba(12,35,65,.88)"; const text = label || "Object"; const tw = ctx.measureText(text).width + 20; ctx.fillRect(10,10,tw,40); ctx.fillStyle = "white"; ctx.fillText(text,20,39);
  }
}
function rerouteFromEdits() {
  if (!current) return;
  const route = routeItem(els.itemName.value, els.itemCategory.value, current.labels);
  current.route = route; els.destinationBox.value = route.boxId; updateRouteMessage(route); drawPreview(els.itemName.value, current.detections);
}

async function createAnnotatedBlob(itemName, category, box) {
  const img = current.img; const maxW = 1400; const s = Math.min(1, maxW / img.naturalWidth); const w = Math.round(img.naturalWidth*s); const imageH = Math.round(img.naturalHeight*s); const footerH = Math.max(110, Math.round(w*.09));
  const canvas = document.createElement("canvas"); canvas.width = w; canvas.height = imageH + footerH; const ctx = canvas.getContext("2d"); ctx.drawImage(img,0,0,w,imageH);
  ctx.lineWidth = Math.max(3,w/300); ctx.font = `bold ${Math.max(18,Math.round(w/38))}px system-ui`;
  for (const d of current.detections) {
    const [x,y,bw,bh] = d.bbox.map(v=>v*s); ctx.strokeStyle="#4da3ff"; ctx.strokeRect(x,y,bw,bh);
  }
  ctx.fillStyle="#0c1728"; ctx.fillRect(0,imageH,w,footerH); ctx.fillStyle="white"; ctx.font=`bold ${Math.max(24,Math.round(w/28))}px system-ui`; ctx.fillText(itemName,18,imageH+Math.round(footerH*.38)); ctx.font=`${Math.max(17,Math.round(w/42))}px system-ui`; ctx.fillStyle="#c7d8ee"; ctx.fillText(`${category}  •  ${boxLabel(box)}`,18,imageH+Math.round(footerH*.72));
  return new Promise(resolve => canvas.toBlob(resolve,"image/jpeg",.86));
}
async function saveCurrentItem() {
  if (!current || !db) return;
  const itemName = els.itemName.value.trim(); const category = els.itemCategory.value.trim() || "Other"; const boxId = els.destinationBox.value; const box = boxById(boxId);
  if (!itemName || !box) { alert("Enter an item name and choose a box."); return; }
  els.saveItemBtn.disabled = true; els.saveItemBtn.textContent = "Saving…";
  try {
    const blob = await createAnnotatedBlob(itemName, category, box);
    const record = {
      id: uid("item"), itemName, category, boxId, boxNumber: box.number, boxName: box.name, note: els.itemNote.value.trim(),
      recognizedLabels: current.labels, originalAiLabel: current.initialLabel, createdAt: Date.now(), photoBlob: blob
    };
    await dbPut(record); inventory.unshift(record);
    const learnedKey = normalize(itemName); learnedRoutes[learnedKey] = boxId;
    if (current.initialLabel) learnedRoutes[normalize(current.initialLabel)] = boxId;
    saveLocal(); renderBoxes(); renderBoxSelectors(); renderInventory();
    els.savedTitle.textContent = `${itemName} saved`;
    els.savedText.textContent = `${itemName} is recorded in ${boxLabel(box)}. The labeled photo is now searchable in your inventory.`;
    els.savedPanel.classList.remove("hidden"); els.savedPanel.scrollIntoView({behavior:"smooth",block:"center"});
  } catch (err) { console.error(err); alert(`Could not save item: ${err.message}`); }
  finally { els.saveItemBtn.disabled = false; els.saveItemBtn.textContent = "Save Item to Inventory"; }
}
function clearCurrent() {
  if (current?.url) URL.revokeObjectURL(current.url); current = null; els.cameraInput.value=""; els.photoInput.value=""; els.analysisPanel.classList.add("hidden"); els.savedPanel.classList.add("hidden"); window.scrollTo({top:0,behavior:"smooth"});
}

function matchesItem(item, query) {
  if (!query) return true;
  const hay = normalize([item.itemName,item.category,item.note,item.boxName,...(item.recognizedLabels||[])].join(" "));
  return query.split(/\s+/).every(term => hay.includes(term));
}
function renderInventory() {
  if (!els.inventoryGrid) return;
  qrObjectUrls.forEach(URL.revokeObjectURL); qrObjectUrls = [];
  const q = normalize(els.searchInput.value.replace(/^where (is|are) (my )?/i, "").replace(/[?]/g,"")); const filter = els.boxFilter.value;
  const rows = inventory.filter(item => (!filter || item.boxId === filter) && matchesItem(item,q)).sort((a,b)=>b.createdAt-a.createdAt);
  els.inventoryGrid.innerHTML = ""; els.emptyInventory.classList.toggle("hidden", rows.length > 0); els.inventorySummary.textContent = `${rows.length} shown • ${inventory.length} total item${inventory.length === 1 ? "" : "s"}`;
  for (const item of rows) {
    const card = document.createElement("article"); card.className="inventory-card"; const photoUrl = item.photoBlob ? URL.createObjectURL(item.photoBlob) : ""; if (photoUrl) qrObjectUrls.push(photoUrl); const box = boxById(item.boxId);
    card.innerHTML = `${photoUrl ? `<img class="inventory-photo" src="${photoUrl}" alt="Labeled photo of ${escapeHtml(item.itemName)}" />` : ""}<div class="inventory-body"><h3>${escapeHtml(item.itemName)}</h3><div class="inventory-meta"><span class="pill">${escapeHtml(item.category)}</span><span class="pill box-pill">${escapeHtml(boxLabel(box) || `Box ${item.boxNumber}`)}</span></div>${item.note ? `<p class="inventory-note">${escapeHtml(item.note)}</p>` : ""}<p class="muted small">Saved ${escapeHtml(formatDate(item.createdAt))}</p><div class="inventory-actions-card"><button class="button secondary move-item" type="button">Move</button><button class="button danger delete-item" type="button">Delete</button></div></div>`;
    card.querySelector(".delete-item").addEventListener("click", async () => { if (!confirm(`Delete ${item.itemName} from the inventory?`)) return; await dbDelete(item.id); inventory = inventory.filter(x=>x.id!==item.id); renderBoxes(); renderInventory(); });
    card.querySelector(".move-item").addEventListener("click", async () => moveItem(item));
    els.inventoryGrid.appendChild(card);
  }
}
async function moveItem(item) {
  const choices = boxes.map(b=>`${b.number}: ${b.name}`).join("\n"); const answer = prompt(`Move ${item.itemName} to which box number?\n\n${choices}`, String(boxById(item.boxId)?.number || "")); if (answer === null) return; const box = boxes.find(b=>b.number===Number(answer)); if (!box) { alert("That box number was not found."); return; }
  item.boxId=box.id; item.boxNumber=box.number; item.boxName=box.name; learnedRoutes[normalize(item.itemName)] = box.id; saveLocal(); await dbPut(item); renderBoxes(); renderInventory();
}
function openBoxInventory(boxId) {
  switchTab("inventory"); els.boxFilter.value=boxId; els.searchInput.value=""; renderInventory();
}
function exportInventoryCsv() {
  const header=["item_name","category","box_number","box_name","note","original_ai_label","recognized_labels","saved_at"];
  const rows=[header,...inventory.map(i=>[i.itemName,i.category,i.boxNumber,i.boxName,i.note,i.originalAiLabel,(i.recognizedLabels||[]).join("; "),new Date(i.createdAt).toISOString()])];
  const csv=rows.map(r=>r.map(csvEscape).join(",")).join("\r\n"); downloadBlob(new Blob(["\ufeff",csv],{type:"text/csv;charset=utf-8"}),"AI_Box_Inventory.csv");
}

function buildPrintLabels() {
  els.qrPrintArea.innerHTML="";
  for (const box of boxes) {
    const label=document.createElement("div"); label.className="qr-print-label"; const qr=document.createElement("div"); const text=document.createElement("div"); text.innerHTML=`<h2>${escapeHtml(boxLabel(box))}</h2><p>${escapeHtml(box.description || "AI Box Sorting Assistant")}</p><p><small>${escapeHtml(box.qr)}</small></p>`; label.append(qr,text); els.qrPrintArea.appendChild(label); renderQr(qr,box.qr,220);
  }
}
function lookupQr(value) {
  const exact=String(value||"").trim(); const box=boxes.find(b=>b.qr===exact);
  if (!box) { els.qrLookupStatus.textContent="No box matches that QR value."; return; }
  els.qrLookupStatus.textContent=`Opened ${boxLabel(box)}.`; openBoxInventory(box.id);
}
async function scanQrFile(file) {
  if (!file) return;
  if (!("BarcodeDetector" in window)) { els.qrLookupStatus.textContent="This browser cannot decode QR photos automatically. Type/paste the QR value instead."; return; }
  try {
    const detector=new BarcodeDetector({formats:["qr_code"]}); const bitmap=await createImageBitmap(file); const codes=await detector.detect(bitmap); bitmap.close?.();
    if (!codes.length) { els.qrLookupStatus.textContent="No QR code was found in that photo."; return; }
    const raw=codes[0].rawValue; els.qrLookupInput.value=raw; lookupQr(raw);
  } catch(err) { console.error(err); els.qrLookupStatus.textContent=`Could not scan QR: ${err.message}`; }
}

function switchTab(name) {
  document.querySelectorAll(".tab").forEach(t=>t.classList.toggle("active",t.dataset.tab===name));
  document.querySelectorAll(".tab-page").forEach(p=>p.classList.toggle("active",p.id===`tab-${name}`));
  if (name==="inventory") renderInventory();
}

async function init() {
  loadLocal();
  try { db=await openDb(); inventory=(await dbGetAll()).sort((a,b)=>b.createdAt-a.createdAt); }
  catch(err) { console.error(err); alert("Inventory storage could not open in this browser."); inventory=[]; }
  renderBoxes(); renderBoxSelectors(); renderInventory(); loadModels();
}

document.querySelectorAll(".tab").forEach(tab=>tab.addEventListener("click",()=>switchTab(tab.dataset.tab)));
els.reloadModelBtn.addEventListener("click",loadModels);
els.cameraInput.addEventListener("change",e=>e.target.files[0]&&analyzeFile(e.target.files[0]));
els.photoInput.addEventListener("change",e=>e.target.files[0]&&analyzeFile(e.target.files[0]));
els.itemName.addEventListener("change",rerouteFromEdits); els.itemCategory.addEventListener("change",rerouteFromEdits);
els.destinationBox.addEventListener("change",()=>{ if(!current)return; current.route={boxId:els.destinationBox.value,reason:"You selected this destination. Saving will teach the app this choice.",strength:"manual"}; updateRouteMessage(current.route); });
els.saveItemBtn.addEventListener("click",saveCurrentItem); els.sortAnotherBtn.addEventListener("click",clearCurrent);
els.applyBoxCountBtn.addEventListener("click",()=>{ setBoxCount(els.boxCount.value); els.boxCount.value=boxes.length; });
els.printQrBtn.addEventListener("click",()=>{ buildPrintLabels(); window.print(); });
els.qrLookupBtn.addEventListener("click",()=>lookupQr(els.qrLookupInput.value)); els.qrLookupInput.addEventListener("keydown",e=>{ if(e.key==="Enter") lookupQr(els.qrLookupInput.value); });
els.scanQrInput.addEventListener("change",e=>scanQrFile(e.target.files[0]));
els.searchInput.addEventListener("input",renderInventory); els.boxFilter.addEventListener("change",renderInventory); els.clearSearchBtn.addEventListener("click",()=>{ els.searchInput.value=""; els.boxFilter.value=""; renderInventory(); }); els.exportCsvBtn.addEventListener("click",exportInventoryCsv);
window.addEventListener("beforeunload",()=>{ if(current?.url)URL.revokeObjectURL(current.url); qrObjectUrls.forEach(URL.revokeObjectURL); });

init();
