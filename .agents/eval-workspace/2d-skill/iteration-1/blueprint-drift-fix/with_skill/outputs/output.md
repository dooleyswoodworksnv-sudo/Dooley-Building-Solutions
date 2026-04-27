# Blueprint Drift Fix — With 2D Preview Agent Skill

---

## Root Cause

The blueprint image is being drawn in **screen (pixel) space** — outside the `ctx.setTransform()` world-coordinate context used for walls. When the user zooms, `panOffset` and `scale` change, so all world-space elements scale correctly — but if `ctx.drawImage` is called either before `ctx.setTransform()` or after a `ctx.resetTransform()`, the blueprint is pinned to canvas pixel coordinates and appears to drift.

This is exactly the pitfall described in the 2D Preview Agent skill: **"Blueprint image must be drawn inside the same `setTransform` context as walls, not in screen space."**

---

## Corrected `zoomAtPoint`

Per the skill's pivot-zoom math (cursor world point must stay fixed):

```typescript
// state: { scale: number, panOffset: { x: number, y: number } }

function zoomAtPoint(
  cursorCanvas: { x: number; y: number },
  scaleFactor: number,
  state: ViewportState
): ViewportState {
  const newScale = state.scale * scaleFactor;

  // Convert cursor from canvas pixels to world coords BEFORE zoom
  const worldX = (cursorCanvas.x - state.panOffset.x) / state.scale;
  const worldY = (cursorCanvas.y - state.panOffset.y) / state.scale;

  // After zoom, the same world point must map to the same canvas pixel
  return {
    scale: newScale,
    panOffset: {
      x: cursorCanvas.x - worldX * newScale,
      y: cursorCanvas.y - worldY * newScale,
    },
  };
}
```

This is the form the skill specifies. The previous buggy version likely computed the delta in screen space and applied it directly to `panOffset` without accounting for the scale ratio, which shifts the blueprint relative to walls.

---

## Corrected Blueprint Rendering

The blueprint must be drawn **after** `ctx.setTransform()` is applied and **inside** `ctx.save()/ctx.restore()`. This is the correct layer-1 render per the skill's strict back-to-front layer order:

```typescript
function renderCanvas(
  ctx: CanvasRenderingContext2D,
  state: AppState,
  viewport: ViewportState
): void {
  const { scale, panOffset } = viewport;
  const { blueprint } = state;

  // Apply world-space transform FIRST — all subsequent draws are in world coords
  ctx.setTransform(scale, 0, 0, scale, panOffset.x, panOffset.y);

  // Layer 1: Blueprint (world space — moves with everything else)
  if (blueprint.imageUrl && blueprint.visible) {
    ctx.save();
    ctx.globalAlpha = blueprint.opacity ?? 0.4;   // skill default: 0.4
    ctx.drawImage(
      blueprintImage,                          // HTMLImageElement
      blueprint.offsetX,                       // world-space offset in feet
      blueprint.offsetY,
      blueprintImage.naturalWidth  / blueprint.scale,
      blueprintImage.naturalHeight / blueprint.scale
    );
    ctx.globalAlpha = 1.0;                     // always reset
    ctx.restore();
  }

  // Layer 2: Grid
  drawGrid(ctx, viewport);

  // Layers 3–13: walls, openings, annotations, etc.
  // ...
}
```

**Why the buggy version drifted:** If `ctx.drawImage` was called with raw pixel coordinates (e.g. `blueprint.offsetX * scale + panOffset.x`) instead of world coordinates, the image position was correct at zoom=1 but accumulated floating-point error at other zoom levels — or if `resetTransform()` was called first, the blueprint moved in screen space while walls moved in world space.

---

## Before/After Summary

| | Before (buggy) | After (fixed) |
|---|---|---|
| Transform when drawing blueprint | None / resetTransform | Same `setTransform` as walls |
| Blueprint coordinate space | Screen pixels | World feet |
| Zoom behavior | Blueprint drifts | Blueprint locked to world |
| `globalAlpha` reset | Missing | Always reset to 1.0 |
| `ctx.save/restore` | Missing | Present |
