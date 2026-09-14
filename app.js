/* AI Box Sorting Assistant */

const BROAD_CATEGORIES = {
  person: "People",
  bicycle: "Vehicles", car: "Vehicles", motorcycle: "Vehicles", airplane: "Vehicles",
  bus: "Vehicles", train: "Vehicles", truck: "Vehicles", boat: "Vehicles",
  "traffic light": "Outdoor", "fire hydrant": "Outdoor", "stop sign": "Outdoor",
  "parking meter": "Outdoor", bench: "Outdoor",
  bird: "Animals", cat: "Animals", dog: "Animals", horse: "Animals", sheep: "Animals",
  cow: "Animals", elephant: "Animals", bear: "Animals", zebra: "Animals", giraffe: "Animals",
  backpack: "Accessories", umbrella: "Accessories", handbag: "Accessories", tie: "Accessories",
  suitcase: "Accessories",
  frisbee: "Sports", skis: "Sports", snowboard: "Sports", "sports ball": "Sports",
  kite: "Sports", "baseball bat": "Sports", "baseball glove": "Sports", skateboard: "Sports",
  surfboard: "Sports", "tennis racket": "Sports",
  bottle: "Kitchen & Food", "wine glass": "Kitchen & Food", cup: "Kitchen & Food",
  fork: "Kitchen & Food", knife: "Kitchen & Food", spoon: "Kitchen & Food", bowl: "Kitchen & Food",
  banana: "Kitchen & Food", apple: "Kitchen & Food", sandwich: "Kitchen & Food",
  orange: "Kitchen & Food", broccoli: "Kitchen & Food", carrot: "Kitchen & Food",
  "hot dog": "Kitchen & Food", pizza: "Kitchen & Food", donut: "Kitchen & Food", cake: "Kitchen & Food",
  chair: "Household", couch: "Household", "potted plant": "Household", bed: "Household",
  "dining table": "Household", toilet: "Household",
  tv: "Electronics", laptop: "Electronics", mouse: "Electronics", remote: "Electronics",
  keyboard: "Electronics", "cell phone": "Electronics",
  microwave: "Appliances", oven: "Appliances", toaster: "Appliances", sink: "Appliances",
  refrigerator: "Appliances",
  book: "Other", clock: "Other", vase: "Other", scissors: "Other", "teddy bear": "Other",
  "hair drier": "Other", toothbrush: "Other"
};

const ALIASES = {
  "cell phone": ["phone", "smartphone", "mobile", "electronics"],
  tv: ["television", "screen", "electronics"],
  laptop: ["computer", "pc", "electronics"],
  mouse: ["computer", "electronics", "accessory"],
  keyboard: ["computer", "electronics"],
  remote: ["remote control", "electronics"],
  bottle: ["container", "drink", "kitchen"],
  cup: ["mug", "drink", "kitchen"],
  book: ["books", "paper", "reading"],
  scissors: ["tool", "tools", "craft"],
  backpack: ["bag", "bags"],
  handbag: ["bag", "bags", "purse"],
  suitcase: ["luggage", "travel"],
  car: ["vehicle", "vehicles", "automotive"],
  truck: ["vehicle", "vehicles", "automotive"],
  bicycle: ["bike", "vehicle", "sports"],
  motorcycle: ["motorbike", "vehicle", "automotive"],
  dog: ["pet", "animal"],
  cat: ["pet", "animal"],
  bird: ["pet", "animal"]
};

const STORAGE = {
  boxes: "aiBoxSorter.boxes.v2",
  learned: "aiBoxSorter.learned.v2",
  history: "aiBoxSorter.history.v2"
};

const els = {
  modelStatus: document.querySelector("#modelStatus"),
  reloadModelBtn: document.querySelector("#reloadModelBtn"),
  boxCount: document.querySelector("#boxCount"),
  applyBoxCountBtn: document.querySelector("#applyBoxCountBtn"),
  boxEditor: document.querySelector("#boxEditor"),
  cameraInput: document.querySelector("#cameraInput"),
  photoInput: document.querySelector("#photoInput"),
  confidence: document.querySelector("#confidence"),
  confidenceValue: document.querySelector("#confidenceValue"),
  primaryMethod: document.querySelector("#primaryMethod"),
  scanPanel: document.querySelector("#scanPanel"),
  scanStatus: document.querySelector("#scanStatus"),
  photoCanvas: document.querySelector("#photoCanvas"),
  answerPanel: document.querySelector("#answerPanel"),
  objectName: document.querySelector("#objectName"),
  objectCategory: document.querySelector("#objectCategory"),
  allDetections: document.querySelector("#allDetections"),
  recommendation: document.querySelector("#recommendation"),
  recommendedBox: document.querySelector("#recommendedBox"),
  recommendationReason: document.querySelector("#recommendationReason"),
  boxChoiceHelp: document.querySelector("#boxChoiceHelp"),
  boxChoices: document.querySelector("#boxChoices"),
  clearMemoryBtn: document.querySelector("#clearMemoryBtn"),
  clearHistoryBtn: document.querySelector("#clearHistoryBtn"),
  historyEmpty: document.querySelector("#historyEmpty"),
  historyList: document.querySelector("#historyList")
};

let model = null;
let boxes = loadJson(STORAGE.boxes, null) || makeDefaultBoxes(3);
let learned = loadJson(STORAGE.learned, {});
let history = loadJson(STORAGE.history, []);
let current = null;
let currentImageUrl = null;

function loadJson(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (error) { console.warn(error); }
}

function uid() {
  return (crypto && crypto.randomUUID) ? crypto.randomUUID() : `box-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function makeDefaultBoxes(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: uid(),
    name: `Box ${i + 1}`,
    description: ""
  }));
}

function broadCategory(label) {
  return BROAD_CATEGORIES[label] || "Other";
}

function cleanText(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function tokenize(value) {
  return cleanText(value).split(/\s+/).filter(Boolean);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[char]));
}

function formatBox(box, index = boxes.findIndex(b => b.id === box.id)) {
  const name = box.name.trim() || `Box ${index + 1}`;
  return `Box ${index + 1} – ${name}`;
}

function normalizeBoxes() {
  boxes = boxes.filter(box => box && box.id).map((box, i) => ({
    id: box.id || uid(),
    name: String(box.name || `Box ${i + 1}`),
    description: String(box.description || "")
  }));
  if (!boxes.length) boxes = makeDefaultBoxes(1);
  els.boxCount.value = boxes.length;
  saveJson(STORAGE.boxes, boxes);
}

function setBoxCount() {
  const count = Math.max(1, Math.min(50, Number.parseInt(els.boxCount.value, 10) || 1));
  if (count > boxes.length) {
    for (let i = boxes.length; i < count; i += 1) {
      boxes.push({ id: uid(), name: `Box ${i + 1}`, description: "" });
    }
  } else if (count < boxes.length) {
    const removedIds = new Set(boxes.slice(count).map(box => box.id));
    boxes = boxes.slice(0, count);
    for (const [label, boxId] of Object.entries(learned)) {
      if (removedIds.has(boxId)) delete learned[label];
    }
    saveJson(STORAGE.learned, learned);
  }
  els.boxCount.value = count;
  saveJson(STORAGE.boxes, boxes);
  renderBoxEditor();
  if (current) recomputeRecommendation();
}

function renderBoxEditor() {
  els.boxEditor.textContent = "";
  boxes.forEach((box, index) => {
    const card = document.createElement("div");
    card.className = "box-edit-card";
    card.innerHTML = `
      <div class="box-number">${index + 1}</div>
      <label>
        <span>Box name</span>
        <input class="box-name" type="text" maxlength="60" value="${escapeHtml(box.name)}" placeholder="Example: Electronics" />
      </label>
      <label>
        <span>What belongs here?</span>
        <input class="box-description" type="text" maxlength="240" value="${escapeHtml(box.description)}" placeholder="phones, chargers, cables, remotes…" />
      </label>
    `;
    const nameInput = card.querySelector(".box-name");
    const descInput = card.querySelector(".box-description");
    const save = () => {
      box.name = nameInput.value;
      box.description = descInput.value;
      saveJson(STORAGE.boxes, boxes);
      if (current) recomputeRecommendation();
    };
    nameInput.addEventListener("input", save);
    descInput.addEventListener("input", save);
    els.boxEditor.appendChild(card);
  });
  renderBoxChoices();
}

async function loadModel() {
  model = null;
  els.modelStatus.className = "status waiting";
  els.modelStatus.textContent = "Loading object-recognition model…";
  try {
    if (!window.tf || !window.cocoSsd) throw new Error("AI libraries did not load. Check your internet connection.");
    await tf.ready();
    model = await cocoSsd.load({ base: "lite_mobilenet_v2" });
    els.modelStatus.className = "status ready";
    els.modelStatus.textContent = `Ready — TensorFlow.js using ${tf.getBackend()}.`;
  } catch (error) {
    console.error(error);
    els.modelStatus.className = "status error";
    els.modelStatus.textContent = `Could not load AI: ${error.message}`;
  }
}

function loadImageFile(file) {
  return new Promise((resolve, reject) => {
    if (currentImageUrl) URL.revokeObjectURL(currentImageUrl);
    currentImageUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("The browser could not open this photo."));
    img.src = currentImageUrl;
  });
}

function choosePrimary(predictions) {
  if (!predictions.length) return null;
  if (els.primaryMethod.value === "confidence") {
    return predictions.reduce((best, item) => item.score > best.score ? item : best);
  }
  return predictions.reduce((best, item) => {
    const area = item.bbox[2] * item.bbox[3];
    const bestArea = best.bbox[2] * best.bbox[3];
    return area > bestArea ? item : best;
  });
}

function drawDetections(img, predictions, primary) {
  const canvas = els.photoCanvas;
  const maxWidth = 1000;
  const scale = Math.min(1, maxWidth / img.naturalWidth);
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));

  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  ctx.lineWidth = Math.max(2, Math.round(4 * scale));
  ctx.font = `${Math.max(14, Math.round(22 * scale))}px system-ui, sans-serif`;
  ctx.textBaseline = "top";

  predictions.forEach(pred => {
    const [x, y, w, h] = pred.bbox.map(value => value * scale);
    const isPrimary = pred === primary;
    ctx.strokeStyle = isPrimary ? "#58d68d" : "#65a9ff";
    ctx.fillStyle = isPrimary ? "#58d68d" : "#65a9ff";
    ctx.strokeRect(x, y, w, h);

    const text = `${pred.class} ${Math.round(pred.score * 100)}%`;
    const padding = 5;
    const metrics = ctx.measureText(text);
    const labelHeight = Math.max(20, Math.round(28 * scale));
    const labelY = Math.max(0, y - labelHeight);
    ctx.fillRect(x, labelY, metrics.width + padding * 2, labelHeight);
    ctx.fillStyle = "#08111f";
    ctx.fillText(text, x + padding, labelY + 3);
  });
}

function scoreBox(box, label, category) {
  const haystack = cleanText(`${box.name} ${box.description}`);
  if (!haystack) return 0;

  const labelText = cleanText(label);
  const categoryText = cleanText(category);
  let score = 0;

  if (labelText && haystack.includes(labelText)) score += 14;
  if (categoryText && categoryText !== "other" && haystack.includes(categoryText)) score += 7;

  const labelTokens = new Set(tokenize(labelText));
  const categoryTokens = new Set(tokenize(categoryText));
  const aliasTokens = new Set((ALIASES[label] || []).flatMap(tokenize));
  const boxTokens = new Set(tokenize(haystack));

  for (const token of labelTokens) if (boxTokens.has(token)) score += 5;
  for (const token of aliasTokens) if (boxTokens.has(token)) score += 3;
  for (const token of categoryTokens) if (boxTokens.has(token)) score += 2;

  return score;
}

function recommendBox(label, category) {
  const rememberedId = learned[cleanText(label)];
  const remembered = boxes.find(box => box.id === rememberedId);
  if (remembered) {
    return { box: remembered, source: "learned", score: 999, reason: `You previously taught me that “${label}” belongs here.` };
  }

  const ranked = boxes
    .map(box => ({ box, score: scoreBox(box, label, category) }))
    .sort((a, b) => b.score - a.score);

  if (!ranked.length || ranked[0].score <= 0) {
    return { box: null, source: "unknown", score: 0, reason: "I recognize the object, but your box names/descriptions do not tell me where you want it. Tap the correct box once to teach me." };
  }

  const top = ranked[0];
  const tied = ranked.length > 1 && ranked[1].score === top.score;
  if (tied) {
    return { box: null, source: "ambiguous", score: top.score, reason: "More than one box looks equally suitable. Tap the correct box and I’ll remember it." };
  }

  return { box: top.box, source: "description", score: top.score, reason: `This box best matches “${label}” and its ${category} category.` };
}

async function analyzeFile(file) {
  if (!model) {
    alert("The AI model is still loading. Try again when the AI status says Ready.");
    return;
  }
  if (!file || !file.type.startsWith("image/")) return;

  els.scanPanel.classList.remove("hidden");
  els.answerPanel.classList.add("hidden");
  els.scanStatus.textContent = "Analyzing photo…";

  try {
    const img = await loadImageFile(file);
    const predictions = await model.detect(img, 20, Number(els.confidence.value));
    predictions.sort((a, b) => b.score - a.score);
    const primary = choosePrimary(predictions);
    drawDetections(img, predictions, primary);

    if (!primary) {
      current = null;
      els.scanStatus.textContent = "No supported object was detected above the confidence threshold.";
      els.objectName.textContent = "No object detected";
      els.objectCategory.textContent = "Uncategorized";
      els.allDetections.textContent = "Try getting closer, improving the lighting, or lowering the confidence setting.";
      els.recommendedBox.textContent = "No box recommendation";
      els.recommendationReason.textContent = "The AI needs to recognize an object before it can route it.";
      els.recommendation.classList.add("needs-help");
      renderBoxChoices();
      els.answerPanel.classList.remove("hidden");
      return;
    }

    current = {
      fileName: file.name,
      label: primary.class,
      category: broadCategory(primary.class),
      confidence: primary.score,
      predictions,
      recommendation: null
    };

    current.recommendation = recommendBox(current.label, current.category);
    els.scanStatus.textContent = "Analysis complete.";
    renderCurrentAnswer();
    recordAutomaticSuggestion();
    els.answerPanel.classList.remove("hidden");
    els.answerPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    console.error(error);
    els.scanStatus.textContent = `Could not analyze the photo: ${error.message}`;
  } finally {
    els.cameraInput.value = "";
    els.photoInput.value = "";
  }
}

function renderCurrentAnswer() {
  if (!current) return;
  els.objectName.textContent = `${current.label} (${Math.round(current.confidence * 100)}%)`;
  els.objectCategory.textContent = current.category;
  els.allDetections.textContent = current.predictions.length
    ? `Also detected: ${current.predictions.map(p => `${p.class} ${Math.round(p.score * 100)}%`).join(" • ")}`
    : "";

  const rec = current.recommendation;
  if (rec.box) {
    els.recommendedBox.textContent = formatBox(rec.box);
    els.recommendationReason.textContent = rec.reason;
    els.recommendation.classList.remove("needs-help");
  } else {
    els.recommendedBox.textContent = "Choose a box below";
    els.recommendationReason.textContent = rec.reason;
    els.recommendation.classList.add("needs-help");
  }
  renderBoxChoices();
}

function renderBoxChoices() {
  els.boxChoices.textContent = "";
  const recommendedId = current?.recommendation?.box?.id || null;

  boxes.forEach((box, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "box-choice";
    if (box.id === recommendedId) button.classList.add("recommended");
    button.innerHTML = `
      <span class="choice-number">${index + 1}</span>
      <span class="choice-copy">
        <strong>${escapeHtml(box.name.trim() || `Box ${index + 1}`)}</strong>
        <small>${escapeHtml(box.description.trim() || "No description yet")}</small>
      </span>
      ${box.id === recommendedId ? '<span class="recommended-tag">AI PICK</span>' : ""}
    `;
    button.disabled = !current;
    button.addEventListener("click", () => teachBox(box));
    els.boxChoices.appendChild(button);
  });
}

function teachBox(box) {
  if (!current) return;
  learned[cleanText(current.label)] = box.id;
  saveJson(STORAGE.learned, learned);
  current.recommendation = {
    box,
    source: "learned",
    score: 999,
    reason: `Saved. From now on, recognized “${current.label}” objects will go to this box on this device.`
  };
  renderCurrentAnswer();
  addHistory(current, box, "confirmed");
}

function recordAutomaticSuggestion() {
  if (!current?.recommendation?.box) return;
  addHistory(current, current.recommendation.box, current.recommendation.source);
}

function addHistory(item, box, source) {
  const last = history[0];
  const record = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    time: new Date().toISOString(),
    label: item.label,
    category: item.category,
    confidence: item.confidence,
    boxId: box.id,
    boxName: box.name,
    source
  };

  if (last && last.label === record.label && last.boxId === record.boxId && (Date.now() - Date.parse(last.time)) < 5000) {
    history[0] = record;
  } else {
    history.unshift(record);
  }
  history = history.slice(0, 30);
  saveJson(STORAGE.history, history);
  renderHistory();
}

function renderHistory() {
  els.historyList.textContent = "";
  els.historyEmpty.classList.toggle("hidden", history.length > 0);

  history.forEach(item => {
    const row = document.createElement("div");
    row.className = "history-item";
    const boxIndex = boxes.findIndex(box => box.id === item.boxId);
    const boxText = boxIndex >= 0 ? formatBox(boxes[boxIndex], boxIndex) : item.boxName || "Box removed";
    const time = new Date(item.time);
    row.innerHTML = `
      <div>
        <strong>${escapeHtml(item.label)}</strong>
        <span class="history-category">${escapeHtml(item.category)}</span>
      </div>
      <div class="history-destination">${escapeHtml(boxText)}</div>
      <time>${escapeHtml(time.toLocaleString())}</time>
    `;
    els.historyList.appendChild(row);
  });
}

function recomputeRecommendation() {
  if (!current) return;
  current.recommendation = recommendBox(current.label, current.category);
  renderCurrentAnswer();
}

els.applyBoxCountBtn.addEventListener("click", setBoxCount);
els.boxCount.addEventListener("keydown", event => {
  if (event.key === "Enter") setBoxCount();
});
els.reloadModelBtn.addEventListener("click", loadModel);
els.cameraInput.addEventListener("change", event => analyzeFile(event.target.files[0]));
els.photoInput.addEventListener("change", event => analyzeFile(event.target.files[0]));
els.confidence.addEventListener("input", () => {
  els.confidenceValue.textContent = `${Math.round(Number(els.confidence.value) * 100)}%`;
});
els.primaryMethod.addEventListener("change", () => {
  if (!current?.predictions?.length) return;
  const primary = choosePrimary(current.predictions);
  current.label = primary.class;
  current.category = broadCategory(primary.class);
  current.confidence = primary.score;
  current.recommendation = recommendBox(current.label, current.category);
  renderCurrentAnswer();
});
els.clearMemoryBtn.addEventListener("click", () => {
  if (!confirm("Clear all learned object-to-box choices on this device?")) return;
  learned = {};
  saveJson(STORAGE.learned, learned);
  recomputeRecommendation();
});
els.clearHistoryBtn.addEventListener("click", () => {
  history = [];
  saveJson(STORAGE.history, history);
  renderHistory();
});

window.addEventListener("beforeunload", () => {
  if (currentImageUrl) URL.revokeObjectURL(currentImageUrl);
});

normalizeBoxes();
renderBoxEditor();
renderHistory();
loadModel();
