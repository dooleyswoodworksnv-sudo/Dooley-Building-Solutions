# Blueprint Drift Fix — Without Skill (Baseline)

## Root Cause

The most common cause is that the blueprint image is drawn in **canvas/screen pixel coordinates** while the building walls are drawn in **world coordinates** transformed by the viewport. When the user zooms, only the world-space elements scale correctly; the blueprint, drawn separately without the transform, appears to move.

---

## Corrected `zoomAtPoint`

```javascript
function zoomAtPoint(mouseX, mouseY, scaleFactor, viewport) {
  const { scale, panX, panY } = viewport;
  const newScale = scale * scaleFactor;

  // Find what world point is under the cursor
  const worldX = (mouseX - panX) / scale;
  const worldY = (mouseY - panY) / scale;

  // Keep that world point under the cursor after zoom
  return {
    scale: newScale,
    panX: mouseX - worldX * newScale,
    panY: mouseY - worldY * newScale,
  };
}
```

---

## Corrected Blueprint Rendering

```javascript
function render(ctx, viewport, blueprint, blueprintImg) {
  const { scale, panX, panY } = viewport;

  // Apply the transform — everything after this is in world space
  ctx.setTransform(scale, 0, 0, scale, panX, panY);

  // Draw blueprint INSIDE the transform so it moves with the world
  if (blueprint && blueprintImg) {
    ctx.save();
    ctx.globalAlpha = blueprint.opacity || 0.4;
    ctx.drawImage(
      blueprintImg,
      blueprint.x,       // world-space position
      blueprint.y,
      blueprint.width,
      blueprint.height
    );
    ctx.globalAlpha = 1.0;
    ctx.restore();
  }

  // Draw walls, etc. (also in world space)
  drawWalls(ctx, walls, scale);
}
```

## Explanation

The drift happens because `drawImage` was called either:
1. Before `setTransform` — so the image is always at fixed screen pixels, or
2. After `resetTransform` — same result.

Moving the `drawImage` call inside the same transform context as the walls means both use the same coordinate system and zoom together identically.
