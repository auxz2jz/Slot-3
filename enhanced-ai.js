/*
 * Enhanced open-vocabulary recognition shim for AI Box Inventory.
 * It exposes a MobileNet-compatible load()/classify() API so the existing
 * workflow can use CLIP zero-shot classification without a large rewrite.
 */
(() => {
  const MODEL_ID = "Xenova/clip-vit-base-patch32";
  const TRANSFORMERS_URL = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1";
  const DB_NAME = "aiBoxSorterInventory";
  const STORE_NAME = "items";
  const MAX_LABELS = 190;

  const STATIC_LABELS = [
    // Hand and power tools
    "screwdriver", "Phillips screwdriver", "flathead screwdriver", "hammer", "rubber mallet",
    "adjustable wrench", "combination wrench", "socket wrench", "ratchet", "socket", "pliers",
    "needle nose pliers", "locking pliers", "wire cutters", "utility knife", "box cutter", "handsaw",
    "hacksaw", "level", "tape measure", "power drill", "drill bit", "saw blade", "chisel", "clamp",
    "vise", "pry bar", "crowbar", "staple gun", "heat gun", "soldering iron", "caulking gun",

    // Hardware / mechanical parts
    "screw", "wood screw", "machine screw", "bolt", "carriage bolt", "hex nut", "washer", "lock washer",
    "nail", "wall anchor", "door hinge", "metal bracket", "hook", "chain", "spring", "ball bearing",
    "pulley", "gear", "caster wheel", "zip tie", "hose clamp", "pipe coupling", "threaded rod",
    "metal pipe fitting", "PVC fitting", "valve", "faucet fitting",

    // Electrical
    "electrical wire", "extension cord", "power cord", "electrical outlet", "wall switch", "circuit breaker",
    "fuse", "electrical relay", "wire connector", "wire nut", "terminal block", "crimp connector",
    "electrical tape", "multimeter", "test lead", "power strip", "surge protector", "light bulb",
    "lamp socket", "electrical box", "conduit fitting", "battery", "battery holder",

    // Electronics / computer / camera
    "cell phone", "tablet computer", "laptop computer", "computer mouse", "computer keyboard", "computer monitor",
    "television", "remote control", "digital camera", "security camera", "Wi-Fi router", "network switch",
    "ethernet cable", "USB cable", "USB charger", "phone charger", "power adapter", "AC adapter",
    "battery charger", "speaker", "headphones", "earbuds", "microphone", "USB flash drive", "memory card",
    "hard drive", "solid state drive", "single board computer", "circuit board", "computer fan", "webcam",

    // Automotive
    "car battery", "battery cable", "spark plug", "oil filter", "air filter", "automotive fuse",
    "automotive relay", "jumper cable", "tire pressure gauge", "lug nut", "car wheel", "car tire",
    "car jack", "jack stand", "ratchet strap", "tow strap", "funnel", "radiator hose", "windshield wiper",

    // Kitchen / food storage
    "fork", "spoon", "kitchen knife", "plate", "bowl", "cup", "coffee mug", "drinking glass", "cooking pot",
    "frying pan", "saucepan", "spatula", "whisk", "kitchen tongs", "can opener", "bottle opener",
    "measuring cup", "measuring spoon", "cutting board", "food storage container", "water bottle",

    // Household / cleaning
    "chair", "table", "lamp", "clock", "picture frame", "storage bin", "basket", "bucket", "rope", "padlock",
    "key", "flashlight", "electric fan", "space heater", "vacuum cleaner", "trash bag", "clothes hanger",
    "blanket", "pillow", "broom", "mop", "scrub brush", "sponge", "spray bottle", "cleaning cloth", "dustpan",

    // Office
    "book", "notebook", "paper", "pen", "pencil", "marker", "highlighter", "stapler", "scissors",
    "tape dispenser", "calculator", "binder", "file folder", "envelope", "label maker", "printer cartridge",

    // Outdoor / garden
    "garden hose", "hose nozzle", "sprinkler", "shovel", "garden rake", "garden hoe", "pruning shears",
    "garden gloves", "plant pot", "watering can", "tent stake", "camping lantern", "cooler", "tarp",

    // Clothing / personal / sports / toys
    "shirt", "pants", "jacket", "coat", "hat", "work gloves", "socks", "shoes", "boots", "belt", "backpack",
    "toothbrush", "razor", "hair brush", "comb", "soap bottle", "shampoo bottle", "towel",
    "baseball", "basketball", "football", "soccer ball", "tennis racket", "baseball glove", "helmet", "dumbbell",
    "toy car", "action figure", "doll", "stuffed animal", "board game", "playing cards", "puzzle"
  ];

  let pipePromise = null;

  function normalize(v) {
    return String(v || "").trim().toLowerCase().replace(/\s+/g, " ");
  }

  function status(text) {
    const el = document.getElementById("modelStatus");
    if (el && text) el.textContent = text;
  }

  function sourceToInput(source) {
    if (source instanceof HTMLImageElement) return source.src;
    if (source instanceof HTMLCanvasElement) return source.toDataURL("image/jpeg", 0.9);
    return source;
  }

  function readInventoryNames() {
    return new Promise(resolve => {
      if (!("indexedDB" in window)) return resolve([]);
      try {
        const req = indexedDB.open(DB_NAME);
        req.onerror = () => resolve([]);
        req.onsuccess = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.close();
            return resolve([]);
          }
          const tx = db.transaction(STORE_NAME, "readonly");
          const getReq = tx.objectStore(STORE_NAME).getAll();
          getReq.onerror = () => { db.close(); resolve([]); };
          getReq.onsuccess = () => {
            const rows = getReq.result || [];
            db.close();
            resolve(rows.map(row => row.itemName).filter(Boolean));
          };
        };
      } catch {
        resolve([]);
      }
    });
  }

  function readBoxVocabulary() {
    const out = [];
    try {
      const raw = localStorage.getItem("aiBoxSorter.boxes.v3");
      const boxes = raw ? JSON.parse(raw) : [];
      for (const box of boxes) {
        if (box.name && !/^box\s+\d+$/i.test(box.name.trim())) out.push(box.name);
        String(box.description || "")
          .split(/[,;|/\n]+/)
          .map(x => x.trim())
          .filter(x => x.length >= 2 && x.length <= 48)
          .forEach(x => out.push(x));
      }
    } catch {}
    try {
      const learned = JSON.parse(localStorage.getItem("aiBoxSorter.learned.v3") || "{}");
      out.push(...Object.keys(learned));
    } catch {}
    return out;
  }

  async function getLabels() {
    const learnedNames = await readInventoryNames();
    const ordered = [...learnedNames.slice(-80).reverse(), ...readBoxVocabulary(), ...STATIC_LABELS];
    const seen = new Set();
    const result = [];
    for (const label of ordered) {
      const clean = String(label || "").trim();
      const key = normalize(clean);
      if (!clean || clean.length > 48 || key.length < 2 || seen.has(key)) continue;
      seen.add(key);
      result.push(clean);
      if (result.length >= MAX_LABELS) break;
    }
    return result;
  }

  function calibratedProbability(results, index) {
    const current = results[index]?.score || 0;
    if (index > 0) return Math.min(0.57, Math.max(0.05, current * 1.8));
    const second = results[1]?.score || 0;
    const margin = current - second;
    const reliable = current >= 0.18 || (current >= 0.075 && margin >= 0.012);
    if (!reliable) return Math.min(0.57, Math.max(0.15, current * 2.4));
    return Math.min(0.96, 0.60 + Math.min(0.36, current * 1.4 + margin * 2));
  }

  async function getPipeline() {
    if (!pipePromise) {
      pipePromise = (async () => {
        status("Loading enhanced open-vocabulary AI… first use may take longer.");
        const { pipeline, env } = await import(TRANSFORMERS_URL);
        env.allowLocalModels = false;
        env.useBrowserCache = true;
        return pipeline("zero-shot-image-classification", MODEL_ID, {
          dtype: "q8",
          progress_callback: info => {
            if (info && typeof info.progress === "number" && info.progress > 0) {
              status(`Loading enhanced AI… ${Math.round(info.progress)}%`);
            }
          }
        });
      })().catch(err => {
        pipePromise = null;
        throw err;
      });
    }
    return pipePromise;
  }

  window.mobilenet = {
    async load() {
      const classifier = await getPipeline();
      return {
        async classify(source, topK = 5) {
          const labels = await getLabels();
          if (!labels.length) return [];
          const output = await classifier(sourceToInput(source), labels, {
            hypothesis_template: "a clear photo of a {}"
          });
          return output.slice(0, Math.max(5, topK)).map((row, index) => ({
            className: row.label,
            probability: calibratedProbability(output, index),
            rawProbability: row.score
          }));
        }
      };
    }
  };
})();