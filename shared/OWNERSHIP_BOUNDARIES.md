# Inventory Box — Cross-Platform Ownership Boundaries

This file records repository ownership conservatively without moving or rewriting working implementations.

## Product model

**ONE PRODUCT / TWO SEPARATE PLATFORM IMPLEMENTATIONS**

- Android Inventory Box
- Windows Inventory Box

## Shared area

Owned jointly as platform-neutral coordination information:

- `shared/PROJECT_VISION.md`
- `shared/FEATURE_CATALOG.md`
- `shared/SHARED_REQUIREMENTS.md`
- `shared/SHARED_DECISIONS.md`
- `shared/DATA_FORMATS_AND_INTERFACES.md`
- this ownership file

Shared files must not contain Android source/build/diagnostics/checkpoint details or Windows source/build/diagnostics/checkpoint details.

## Android-owned area

`android/`

Android-owned information includes:

- Android project memory/status/roadmap;
- Android source/build details;
- Android diagnostics/tests;
- Android checkpoints/candidates;
- Android verified baseline records;
- Android release/source artifacts.

The Android chat/workflow owns this area.

## Windows-owned area

`windows/`

The PC/Codex agent owns future Windows source, project/build files, project memory, roadmap/status, checkpoints, diagnostics/tests, candidate versions, verified baseline, and release artifacts.

The Android worker must not modify Windows implementation files unless explicitly authorized.

## Existing root files — legacy web prototype

The repository existed before the current native Android/Windows split. The following root files belong to the older **AI Box Inventory web prototype** and are not authoritative current Android source or shared cross-platform requirements:

- `README.md`
- `ANDROID_ARCHITECTURE.md`
- `index.html`
- `app.js`
- `enhanced-ai.js`
- `styles.css`
- `crop-mobile-fix.css`
- `.gitignore`

These files are preserved in place. Do not move, rename, delete, or rewrite them merely to make the repository cleaner.

## Potential ownership conflicts

1. Root `README.md` describes the old web implementation, so it must not be mistaken for the current cross-platform project status.
2. Root `ANDROID_ARCHITECTURE.md` is an old migration plan and must not be treated as current Android implementation memory.
3. The root web source is neither current Android source nor future Windows source.
4. Shared runtime inventory data must **not** be stored in this source/coordination repository. Runtime synchronization uses a separate user-selected private GitHub data repository.

## Authoritative startup path

For cross-platform work, read:

1. `auxz2jz/master-instruction-library/INSTRUCTION_INDEX.md`
2. `CROSS_PLATFORM_COLLABORATION_STANDARD.md`
3. `shared/`
4. the current worker's platform-owned area

Do not use the legacy root web files as the current platform baseline.
