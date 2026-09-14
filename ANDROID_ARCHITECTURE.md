# Native Android Migration Plan

The intended future version is a fully native Kotlin Android application, not a wrapper around this website.

## Recommended Android stack

- Kotlin
- Jetpack Compose for UI
- CameraX for capture and live preview
- Room for boxes, inventory items, learned routing rules, and search
- App-private file storage for original/labeled item photos
- ML Kit Barcode Scanning or ZXing for QR codes
- TensorFlow Lite / MediaPipe or another Android-native inference layer for on-device recognition
- Coroutines + Flow for asynchronous AI and database work
- WorkManager for backup/export jobs

## Core domain models

Keep these concepts stable during migration:

### Box
- id
- number
- name
- description
- qrValue

### InventoryItem
- id
- correctedName
- category
- boxId
- note
- createdAt
- labeledPhotoPath
- originalAiLabel
- recognitionCandidates
- recognitionSource

### RecognitionResult
- primaryLabel
- confidence
- category
- candidates
- boundingBoxes
- selectedRegion

### LearnedRoute
- normalizedItemName
- boxId

## Recognition engine interface

The Android app should hide the AI implementation behind an interface similar to:

```kotlin
interface RecognitionEngine {
    suspend fun recognize(
        image: ImageSource,
        region: Rect? = null
    ): RecognitionResult
}
```

That makes it possible to replace the first Android model later without rewriting camera, inventory, box routing, or search.

## Image workflow

1. CameraX captures image.
2. User can optionally crop/draw a rectangle around the target item.
3. RecognitionEngine analyzes the full image or selected region.
4. User corrects label/category if necessary.
5. Routing service recommends a Box.
6. User confirms.
7. Image annotation service creates a labeled copy with item/category/box.
8. Room stores metadata; app-private storage stores image file.
9. Search returns InventoryItem plus photo and box.

## Bulk workflow

Use a persistent queue rather than holding all Bitmap objects in memory.

Each queued item should have states such as:

- CAPTURED
- WAITING_FOR_AI
- ANALYZING
- NEEDS_REVIEW
- CONFIRMED
- SAVED
- ERROR

That will be more reliable than trying to process dozens of full-resolution photos at once.

## QR workflow

Each Box owns a QR value.

Native Android can:

- Generate printable/exportable QR labels.
- Scan QR codes live through CameraX + ML Kit.
- Open a box's inventory immediately after scanning.
- Confirm destination by scanning the physical box before saving an item if desired.

## Data portability from the web version

Before migration, add a full export format containing:

- boxes.json
- learned_routes.json
- inventory.json
- labeled photos

The Kotlin app can import that ZIP so existing web-version inventory is not lost.

## Recognition quality

The current browser build uses COCO-SSD and MobileNet. A native Android version should not be locked to those models.

Possible directions include:

- a stronger TensorFlow Lite object detector,
- MediaPipe Tasks,
- a custom fine-tuned model for the user's real storage items,
- or an optional cloud multimodal model for harder recognition while retaining on-device fallback.

The crop/selection rectangle should remain part of the design because it is useful regardless of which recognition model is used.
