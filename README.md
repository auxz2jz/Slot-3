# AI Box Sorting Assistant

A mobile-friendly browser app that helps sort real-world objects into physical storage boxes.

## How it works

1. Choose how many physical boxes you have — 2, 3, 17, or up to 50.
2. Give each box a name and optionally describe what belongs in it.
3. Tap **Take Photo** on a phone to open the rear camera, or choose an existing image.
4. The app runs two browser AI models:
   - COCO-SSD for object detection and bounding boxes.
   - MobileNet for broader single-object image classification when COCO-SSD does not recognize the item.
5. The recognized object is labeled and assigned a broad category.
6. The app recommends a physical box based on:
   - previously learned choices,
   - the recognized object label,
   - the broad category,
   - the box names and descriptions.
7. If the suggested box is wrong or the app is unsure, tap the correct box. The object-to-box choice is saved in browser local storage so future photos of that recognized object go to the same box.

## Example

You create three boxes:

- Box 1 — Electronics: `phones, chargers, cables, remotes, computer accessories`
- Box 2 — Tools: `screwdrivers, wrenches, hand tools, drill items`
- Box 3 — Kitchen: `cups, bottles, utensils, kitchen items`

Take a photo of an object. The app might show:

- **AI identified:** cell phone
- **Category:** Electronics
- **Put it in:** Box 1 — Electronics

If it identifies something correctly but cannot determine your personal box, tap the desired box once to teach it.

## Privacy

Recognition runs in the browser. Photos are not intentionally uploaded to an application server. The TensorFlow.js libraries and pretrained models are loaded from hosted sources, so internet access is normally needed when the models are first loaded.

Box definitions, learned object-to-box choices, and recent sorting history are stored in `localStorage` on that browser/device.

## Limitations

No general-purpose vision model recognizes every possible object perfectly. For best results, photograph one main object at a time, fill much of the frame with it, and use good lighting.

COCO-SSD supplies true bounding boxes for the object types it knows. When the broader MobileNet classifier recognizes an item COCO-SSD does not know, the app labels the overall photo rather than claiming a precise object bounding box.

The current learned routing is tied to the recognized label. A future version could add cloud sync, custom trained categories, barcode/QR identification, inventory counts, and per-item records.

## Run it

This is a static website. It can be hosted using GitHub Pages from the repository root on the `main` branch. No Python or Node server is required for normal use.

## Main files

- `index.html` — mobile camera UI and AI library loading
- `styles.css` — responsive phone/desktop layout
- `app.js` — object recognition, box configuration, recommendation logic, learning, and history
