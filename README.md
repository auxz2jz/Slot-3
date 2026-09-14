# AI Box Inventory — Web Version

A browser-based physical storage assistant. Photograph one item or a batch of items, let AI identify them, correct the results if needed, choose or accept recommended physical boxes, and save labeled photos into a searchable inventory.

## Enhanced recognition

The current web version uses two complementary recognition systems:

- **COCO-SSD** for common-object detection and bounding boxes.
- **CLIP zero-shot image classification through Transformers.js** for a much broader, open-vocabulary recognition layer.

The old MobileNet fallback has been removed. COCO-SSD is still useful for its bounding boxes, but its label set is limited. The zero-shot classifier can compare a photo against storage-oriented labels such as tools, hardware, electrical parts, electronics, automotive parts, kitchen items, household items, office supplies, garden items, clothing, and more.

The candidate vocabulary is built from:

- a curated storage/inventory vocabulary,
- item names the user previously corrected and saved,
- learned routing names, and
- box names and descriptions.

That means corrections such as `impact driver`, `relay`, `bearing`, or another custom item name become labels the AI can consider on later photos instead of being forgotten.

If the AI is not confident enough, the workflow leaves the item as **Unknown item** rather than silently forcing a weak guess. Alternate AI candidates remain available for quick correction.

The first enhanced-AI load can take longer because the model is downloaded to the browser. Transformers.js uses browser caching so later loads can reuse downloaded model data when the browser permits it.

## Draw a box around the item

If the background contains several objects or the AI focuses on the wrong object, use **Draw Box Around Item**. Drag around the target object and the recognition models analyze only that selected region. Bulk results also have a per-photo crop-refinement option.

## Single-item mode

1. Tap **Take Photo** or choose an image.
2. A photo may be captured before the AI finishes loading. The app keeps it pending and analyzes it automatically when the models are ready.
3. Review the object name, alternate candidates, category, and recommended box.
4. Optionally draw a box around the target and re-analyze.
5. Correct the object name/category/box if needed.
6. Save. A new labeled photo is created and stored with the inventory record.
7. Choose **Take Next Item** to launch the camera again or **Ready for Next** to clear the workflow without opening the camera.
8. **Reset Photo** discards the current unsaved photo without reloading the AI.

## Bulk mode

Bulk mode supports:

- **Add Camera Photo** repeatedly, one shot at a time.
- **Choose Multiple** to select many existing photos.

Then:

1. Tap **Analyze All Photos**.
2. Photos are processed sequentially.
3. Review every result.
4. Correct each name/category/box.
5. Use **Refine crop** when needed.
6. Tap **Save All to Inventory**.

The app refuses to save a batch item whose name is still **Unknown item**.

## Box routing / learning

Routing priority:

1. A learned mapping from a previous confirmed item name.
2. Keyword matching against box names and descriptions.
3. A stable fallback box when no learned or matched rule exists.

## QR labels

Each box can have:

- a generated unique QR value,
- a custom/existing QR value,
- a printable QR label,
- QR-based inventory lookup on browsers supporting the `BarcodeDetector` API, and
- manual QR value lookup as a fallback.

## Inventory storage

- Box definitions and learned routes: `localStorage`
- Inventory records and labeled photo blobs: IndexedDB

Clearing site/browser data can erase the local inventory. A full backup/restore package should be added before relying on this as the only copy of a large permanent inventory.

## Future native Android version

This project is intended to migrate later into a true native Kotlin Android application rather than a WebView wrapper. See `ANDROID_ARCHITECTURE.md` for the planned CameraX, Room, Compose, QR, image-storage, and replaceable-recognition architecture.
