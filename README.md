# AI Box Sorting Assistant — Web Version

A browser-based physical storage assistant. Photograph an object, let AI identify it, correct the result if needed, choose or accept a recommended physical box, and save a labeled photo into a searchable inventory.

## Main workflow

1. Set the number of physical boxes (1–100).
2. Give each box a name and optional description of what belongs there.
3. Optionally generate/print a unique QR label for every box, or replace the generated QR value with an existing QR value.
4. On a phone, tap **Take Photo** and photograph one object.
5. The browser runs two AI models:
   - COCO-SSD for object detection and bounding boxes.
   - MobileNet for broader image classification when the detector does not recognize the object.
6. Review and correct the item name/category if needed.
7. Accept or change the recommended destination box.
8. Save the item. The app creates a new labeled/annotated photo and stores it with the inventory record in IndexedDB.
9. Search later by item name, category, note, AI labels, or box name. Search results show the stored labeled photo and physical box.

## Box routing / learning

The app routes items in this order:

1. A learned mapping from a previous user choice.
2. Keyword matches against each box's name and description.
3. A stable fallback box so the same unlearned object name gets the same initial destination.

When the user changes the destination box and saves, that choice becomes a learned rule for future matching items on that browser/device.

## QR labels

Each box has a stored QR value. The app can:

- Generate a default unique QR value for each box.
- Accept a custom/existing QR value.
- Print QR labels for all boxes.
- On browsers that support the `BarcodeDetector` API, photograph a box QR code to open that box's inventory.
- Fall back to manual QR value entry if the browser cannot decode QR photos.

## Inventory storage

Box definitions and learned routing rules use `localStorage`. Item records and labeled photo blobs use IndexedDB.

This means the inventory is stored in the current browser profile, not on a remote application server. Clearing site/browser data can erase it. The app includes CSV export for the text inventory catalog; a full photo backup/export can be added as a future feature.

## Privacy and model loading

The selected item photos are processed in the browser. TensorFlow.js, COCO-SSD, MobileNet, and QRCode.js are loaded from CDNs, so internet access is needed when those libraries/models are first loaded.

## Static hosting

No Python or Node backend is required for normal use. It can be hosted with GitHub Pages from the repository root on the `main` branch.
