---
name: Standalone Architecture Vision
description: Guidelines for ensuring the application remains a standalone web native construction tool, treating SketchUp as an optional bridge rather than a core dependency.
---

# Standalone Architecture Vision

When working on Dooley Building Solutions, always adhere to the following architectural guidelines:

## 1. The Web App is the Core Engine
- Treat the React and Three.js application as a **100% standalone construction tool**.
- All mathematical heavy lifting (parameter processing, the True-Cut timber matrix logic, joinery calculations, layout operations, and individual roof face material mapping) must happen locally in the browser. 
- **Do not rely on SketchUp** to run boolean intersections or calculate component boundaries. The web app should calculate and store the exact dimensions, rotations, and vertices of all structural elements.

## 2. SketchUp is an Optional Bridge
- Do not design UI workflows or logic loops that *require* SketchUp to be open or installed.
- The SketchUp Ruby script integration serves purely as an **"Export Module" or "Live Sync Bridge."**
- The JSON data schema representing the user's design is the **Single Source of Truth.**
- When building new features, update the JSON data model first, render the result in the 3D and 2D React previews second. Updating the Ruby script to parse the new JSON data is a downstream integration step.

## 3. Emphasize "Agnostic" Export and Takeoffs
- The web app natively tracks the lengths, pitches, and dimensions of every 3D object. Use this data internally to support "Bill of Materials" (BOM) generation, framing cut-lists, and lumber takeoffs directly in the web UI.
- Keep the `BufferGeometry` and component configurations clean so they can eventually be exported to universal formats like `.GLTF`, `.OBJ`, or `.DXF` directly from the browser, making the tool agnostic to the user's preferred CAD software.
