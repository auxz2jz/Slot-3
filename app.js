/* AI Photo Sorter - fully browser-based object recognition */

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

const SUPPORTED_MIME_PREFIX = "image/";

const els = {
  modelStatus: document.querySelector("#modelStatus"),
  reloadModelBtn: document.querySelector("#reloadModelBtn"),
  photoInput: document.querySelector("#photoInput"),
  folderInput: document.querySelector("#folderInput"),
  dropZone: document.querySelector("#dropZone"),
  selectionSummary: document.querySelector("#selectionSummary"),
  clearBtn: document.querySelector("#clearBtn"),
  confidence: document.querySelector("#confidence"),
  confidenceValue: document.querySelector("#confidenceValue"),
  primaryMethod: document.querySelector("#primaryMethod"),
  sortMode: document.querySelector("#sortMode"),
  scanBtn: document.querySelector("#scanBtn"),
  progressPanel: document.querySelector("#progressPanel"),
  progressText: document.querySelector("#progressText"),
  progressCount: document.querySelector("#progressCount"),
  progressBar: document.querySelector("#progressBar"),
  resultsPanel: document.querySelector("#resultsPanel"),
  resultsSummary: document.querySelector("#resultsSummary"),
  resultsBody: document.querySelector("#resultsBody"),
  csvBtn: document.querySelector("#csvBtn"),
  zipBtn: document.querySelector("#zipBtn"),
  resultRowTemplate: document.querySelector("#resultRowTemplate")
};

let model = null;
let selectedFiles = [];
let results = [];
let previewUrls = [];
let isScanning = false;

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function safeName(value) {
  return String(value || "Unknown")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
    .replace(/[. ]+$/g, "")
    .trim() || "Unknown";
}

function broadCategory(label) {
  return BROAD_CATEGORIES[label] || "Other";
}

function folderForResult(result) {
  const mode = els.sortMode.value;
  if (result.primaryObject === "No object detected") return "Uncategorized";
  if (mode === "object") return safeName(result.primaryObject);
  if (mode === "broad") return safeName(result.broadCategory);
  return `${safeName(result.broadCategory)}/${safeName(result.primaryObject)}`;
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

function uniqueFiles(files) {
  const map = new Map();
  for (const file of files) {
    if (!file || !file.type?.startsWith(SUPPORTED_MIME_PREFIX)) continue;
    const key = `${file.webkitRelativePath || file.name}|${file.size}|${file.lastModified}`;
    map.set(key, file);
  }
  return [...map.values()];
}

function addFiles(fileList) {
  const incoming = [...fileList];
  selectedFiles = uniqueFiles([...selectedFiles, ...incoming]);
  updateSelectionSummary();
}

function updateSelectionSummary() {
  const totalBytes = selectedFiles.reduce((sum, file) => sum + file.size, 0);
  els.selectionSummary.textContent = selectedFiles.length
    ? `${selectedFiles.length.toLocaleString()} photo${selectedFiles.length === 1 ? "" : "s"} selected (${formatBytes(totalBytes)}).`
    : "No photos selected.";
  updateScanButton();
}

function updateScanButton() {
  els.scanBtn.disabled = !model || selectedFiles.length === 0 || isScanning;
}

function revokePreviews() {
  for (const url of previewUrls) URL.revokeObjectURL(url);
  previewUrls = [];
}

function clearAll() {
  if (isScanning) return;
  selectedFiles = [];
  results = [];
  els.photoInput.value = "";
  els.folderInput.value = "";
  els.resultsBody.textContent = "";
  els.resultsPanel.classList.add("hidden");
  els.progressPanel.classList.add("hidden");
  revokePreviews();
  updateSelectionSummary();
}

async function loadModel() {
  model = null;
  els.modelStatus.className = "status waiting";
  els.modelStatus.textContent = "Loading object-recognition model…";
  updateScanButton();

  try {
    if (!window.tf || !window.cocoSsd) throw new Error("AI libraries did not load. Check your internet connection and reload the page.");
    await tf.ready();
    model = await cocoSsd.load({ base: "lite_mobilenet_v2" });
    els.modelStatus.className = "status ready";
    els.modelStatus.textContent = `Ready — running with TensorFlow.js (${tf.getBackend()} backend).`;
  } catch (error) {
    console.error(error);
    els.modelStatus.className = "status error";
    els.modelStatus.textContent = `Could not load AI model: ${error.message}`;
  } finally {
    updateScanButton();
  }
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ img, url });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Browser could not decode this image."));
    };
    img.src = url;
  });
}

async function scanPhotos() {
  if (!model || !selectedFiles.length || isScanning) return;

  isScanning = true;
  results = [];
  els.resultsBody.textContent = "";
  els.resultsPanel.classList.add("hidden");
  els.progressPanel.classList.remove("hidden");
  els.progressBar.max = selectedFiles.length;
  els.progressBar.value = 0;
  els.progressText.textContent = "Starting scan…";
  els.progressCount.textContent = `0 / ${selectedFiles.length}`;
  updateScanButton();
  revokePreviews();

  const minScore = Number(els.confidence.value);

  try {
    for (let i = 0; i < selectedFiles.length; i += 1) {
      const file = selectedFiles[i];
      els.progressText.textContent = `Scanning ${file.name}`;
      els.progressCount.textContent = `${i + 1} / ${selectedFiles.length}`;

      let previewUrl = null;
      try {
        const loaded = await loadImageFromFile(file);
        previewUrl = loaded.url;
        previewUrls.push(previewUrl);

        const predictions = await model.detect(loaded.img, 20, minScore);
        const primary = choosePrimary(predictions);
        const primaryObject = primary ? primary.class : "No object detected";

        results.push({
          file,
          previewUrl,
          sourcePath: file.webkitRelativePath || file.name,
          primaryObject,
          broadCategory: primary ? broadCategory(primary.class) : "Uncategorized",
          predictions: [...predictions].sort((a, b) => b.score - a.score),
          error: null
        });
      } catch (error) {
        console.error(file.name, error);
        results.push({
          file,
          previewUrl,
          sourcePath: file.webkitRelativePath || file.name,
          primaryObject: "Error",
          broadCategory: "Error",
          predictions: [],
          error: error.message
        });
      }

      els.progressBar.value = i + 1;
      await new Promise(resolve => requestAnimationFrame(resolve));
    }

    renderResults();
    els.progressText.textContent = "Scan complete.";
    els.resultsPanel.classList.remove("hidden");
    els.resultsPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  } finally {
    isScanning = false;
    updateScanButton();
  }
}

function renderResults() {
  els.resultsBody.textContent = "";
  const detected = results.filter(item => item.primaryObject !== "No object detected" && !item.error).length;
  const uncategorized = results.filter(item => item.primaryObject === "No object detected").length;
  const errors = results.filter(item => item.error).length;

  els.resultsSummary.textContent = `${results.length} processed • ${detected} categorized • ${uncategorized} uncategorized${errors ? ` • ${errors} error${errors === 1 ? "" : "s"}` : ""}`;

  for (const result of results) {
    const row = els.resultRowTemplate.content.firstElementChild.cloneNode(true);
    const img = row.querySelector(".thumb");
    img.src = result.previewUrl || "";
    img.alt = `Preview of ${result.file.name}`;
    row.querySelector(".filename").textContent = result.sourcePath;
    row.querySelector(".filemeta").textContent = formatBytes(result.file.size);
    row.querySelector(".primary-object").textContent = result.primaryObject;
    row.querySelector(".broad-category").textContent = result.broadCategory;

    const detectedList = row.querySelector(".detected-list");
    if (result.error) {
      detectedList.textContent = `Error: ${result.error}`;
    } else if (!result.predictions.length) {
      detectedList.textContent = "Nothing above the confidence threshold.";
    } else {
      detectedList.textContent = result.predictions
        .map(pred => `${pred.class} (${Math.round(pred.score * 100)}%)`)
        .join(" • ");
    }

    els.resultsBody.appendChild(row);
  }
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function downloadCsv() {
  if (!results.length) return;
  const lines = [[
    "source_file",
    "primary_object",
    "broad_category",
    "all_detected_objects",
    "error"
  ]];

  for (const result of results) {
    lines.push([
      result.sourcePath,
      result.primaryObject,
      result.broadCategory,
      result.predictions.map(p => `${p.class} (${Math.round(p.score * 100)}%)`).join("; "),
      result.error || ""
    ]);
  }

  const csv = lines.map(row => row.map(csvEscape).join(",")).join("\r\n");
  downloadBlob(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }), "AI_Photo_Catalog.csv");
}

function uniqueZipPath(folder, filename, used) {
  const safeFile = safeName(filename);
  const dot = safeFile.lastIndexOf(".");
  const stem = dot > 0 ? safeFile.slice(0, dot) : safeFile;
  const ext = dot > 0 ? safeFile.slice(dot) : "";
  let candidate = `${folder}/${safeFile}`;
  let n = 2;
  while (used.has(candidate.toLowerCase())) {
    candidate = `${folder}/${stem}_${n}${ext}`;
    n += 1;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}

async function downloadZip() {
  if (!results.length) return;
  if (!window.JSZip) {
    alert("ZIP library did not load. Reload the page and try again.");
    return;
  }

  els.zipBtn.disabled = true;
  const originalText = els.zipBtn.textContent;
  els.zipBtn.textContent = "Building ZIP…";

  try {
    const zip = new JSZip();
    const used = new Set();

    for (const result of results) {
      const folder = result.error ? "Errors" : folderForResult(result);
      const zipPath = uniqueZipPath(folder, result.file.name, used);
      zip.file(zipPath, result.file);
    }

    const blob = await zip.generateAsync(
      { type: "blob", compression: "DEFLATE", compressionOptions: { level: 4 } },
      metadata => { els.zipBtn.textContent = `Building ZIP… ${Math.round(metadata.percent)}%`; }
    );
    downloadBlob(blob, "AI_Sorted_Photos.zip");
  } catch (error) {
    console.error(error);
    alert(`Could not build ZIP: ${error.message}`);
  } finally {
    els.zipBtn.disabled = false;
    els.zipBtn.textContent = originalText;
  }
}

els.photoInput.addEventListener("change", event => addFiles(event.target.files));
els.folderInput.addEventListener("change", event => addFiles(event.target.files));
els.clearBtn.addEventListener("click", clearAll);
els.scanBtn.addEventListener("click", scanPhotos);
els.csvBtn.addEventListener("click", downloadCsv);
els.zipBtn.addEventListener("click", downloadZip);
els.reloadModelBtn.addEventListener("click", loadModel);

els.confidence.addEventListener("input", () => {
  els.confidenceValue.textContent = `${Math.round(Number(els.confidence.value) * 100)}%`;
});

for (const eventName of ["dragenter", "dragover"]) {
  els.dropZone.addEventListener(eventName, event => {
    event.preventDefault();
    els.dropZone.classList.add("dragover");
  });
}
for (const eventName of ["dragleave", "drop"]) {
  els.dropZone.addEventListener(eventName, event => {
    event.preventDefault();
    els.dropZone.classList.remove("dragover");
  });
}
els.dropZone.addEventListener("drop", event => addFiles(event.dataTransfer.files));
els.dropZone.addEventListener("click", () => els.photoInput.click());
els.dropZone.addEventListener("keydown", event => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    els.photoInput.click();
  }
});

window.addEventListener("beforeunload", revokePreviews);

loadModel();
