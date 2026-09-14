# AI Box Inventory — Web Version

A browser-based physical storage assistant. Photograph one item or a batch of items, let AI identify them, correct the results if needed, choose or accept recommended physical boxes, and save labeled photos into a searchable inventory.

## Recognition workflow improvements

The app now avoids treating every weak MobileNet guess as truth.

- COCO-SSD object detections must meet a confidence threshold.
- MobileNet is used only as a fallback and its top classification must meet a higher confidence threshold.
- If neither model is confident enough, the item is shown as **Unknown item** and the user must name it rather than the app inventing a confident answer.
- Alternate AI candidates are shown as tappable suggestions.
- If the background is confusing, use **Draw Box Around Item** and drag around the object. Both AI models then run again using only that selected region.

This is especially important because the browser models are general-purpose models, not a universal product/tool recognition system.

## Single-item mode

1. Tap **Take Photo** or choose an image.
2. A photo may be captured before the AI finishes loading. The app keeps it pending and automatically analyzes it when the models are ready.
3. Review the detected object, alternate candidates, category, and recommended box.
4. Optionally draw a box around the object and re-analyze only that area.
5. Correct the object name/category/box if needed.
6. Save. A new labeled photo is created and stored with the inventory record.
7. Choose **Take Next Item** to immediately launch the camera again, or **Ready for Next** to clear the current workflow without opening the camera.
8. **Reset Photo** discards the current unsaved photo without resetting the AI models.

## Bulk mode

Bulk mode supports two ways to build a queue:

- **Add Camera Photo** repeatedly, one shot at a time.
- **Choose Multiple** to select many existing photos.

Then:

1. Tap **Analyze All Photos**.
2. Photos are processed sequentially to reduce memory pressure.
3. Review every result.
4. Correct each name/category/box.
5. Use **Refine crop** on any photo where the AI focused on the wrong object.
6. Tap **Save All to Inventory**.

The app refuses to save a batch item whose name is still **Unknown item**, so uncertain AI guesses cannot silently pollute the inventory.

## Box routing / learning

Routing priority:

1. A learned mapping from a previous confirmed item name.
2. Keyword matching against box names and descriptions.
3. A stable fallback box when no learned/matched rule exists.

If the user corrects an AI object name, the app learns the corrected item name's destination. It no longer blindly learns a wrong original AI label after a correction.

## QR labels

Each box can have:

- A generated unique QR value.
- A custom/existing QR value.
- A printable QR label.
- QR-based inventory lookup on browsers supporting the `BarcodeDetector` API.
- Manual QR value lookup as a fallback.

## Inventory storage

- Box definitions and learned routes: `localStorage`
- Inventory records and labeled photo blobs: IndexedDB

Clearing site/browser data can erase the local inventory. A full backup/restore package should be added before using this as the only copy of a large permanent inventory.

## AI models

The current web build uses:

- TensorFlow.js
- COCO-SSD for common-object detection and bounding boxes
- MobileNet v2 for broader ImageNet classification fallback

These browser models are useful but limited. They are not equivalent to a modern multimodal vision-language model and may still struggle with specialized tools, parts, or visually ambiguous objects.

## Future native Android version

This repository is intentionally keeping the data concepts separate enough to migrate later to a real Kotlin Android application. See `ANDROID_ARCHITECTURE.md`.

The future Android application should be a native application, not a WebView wrapper.
