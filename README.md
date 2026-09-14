# AI Photo Sorter — Web Version

A browser-based version of the AI Photo Sorter. It uses TensorFlow.js and the COCO-SSD object-detection model to recognize common objects directly in the user's browser.

## What it does

- Select individual photos, a whole folder, or drag-and-drop images.
- Recognize multiple objects in each image.
- Show confidence scores for every detected object.
- Choose the primary object by:
  - largest detected object, or
  - highest-confidence detection.
- Group photos into broad categories such as People, Vehicles, Animals, Electronics, Household, Appliances, Sports, and Kitchen & Food.
- Export a CSV catalog.
- Build a categorized ZIP with one of three folder layouts:
  - `Broad category/Object/photo.jpg`
  - `Object/photo.jpg`
  - `Broad category/photo.jpg`
- Leave the original files untouched.

## Privacy

Image recognition runs in the browser with TensorFlow.js. The selected photos are not intentionally uploaded to an application server. The TensorFlow.js libraries and pretrained model are loaded from their hosted sources, so an internet connection is required when the model is loaded.

## Run it

This is a static website. No Python or Node server is required for normal use.

### Option 1: GitHub Pages

If GitHub Pages is enabled for the repository, publish from the repository root on the `main` branch. Then open the Pages URL.

### Option 2: Local web server

From this folder, run any simple static server, for example:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000` in a browser.

Opening `index.html` directly may also work in some browsers, but serving it over HTTP is more reliable.

## Browser limitation

A web page cannot silently move or rename the user's original files. This version creates a new categorized ZIP instead. That is intentionally safer because the source photos remain unchanged.

## AI model limitation

The COCO-SSD model recognizes 80 common object classes. It is a good general-purpose starter, but it does not identify exact car makes/models, individual people, receipts, obscure tools, or arbitrary custom inventory categories. Those would require a more advanced vision model or custom training.

## Main files

- `index.html` — web interface and external AI library loading
- `styles.css` — responsive styling
- `app.js` — object recognition, categorization, CSV export, and ZIP generation
