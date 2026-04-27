# Arc Wall Tool — Without Skill (Baseline)

## 1. JSON Schema for Arc Wall

```json
{
  "id": "arc_wall_1",
  "kind": "arc",
  "startX": 0, "startY": 0,
  "endX": 10, "endY": 0,
  "midX": 5, "midY": 3,
  "thickness": 0.5
}
```

---

## 2. Arc Math Helper

```javascript
function circleFromThreePoints(p1, p2, p3) {
  const ax = p1.x, ay = p1.y;
  const bx = p2.x, by = p2.y;
  const cx = p3.x, cy = p3.y;

  const D = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
  if (Math.abs(D) < 1e-10) return null; // collinear

  const ux = ((ax*ax + ay*ay) * (by - cy) +
               (bx*bx + by*by) * (cy - ay) +
               (cx*cx + cy*cy) * (ay - by)) / D;
  const uy = ((ax*ax + ay*ay) * (cx - bx) +
               (bx*bx + by*by) * (ax - cx) +
               (cx*cx + cy*cy) * (bx - ax)) / D;

  return {
    cx: ux, cy: uy,
    r: Math.hypot(ax - ux, ay - uy),
    startAngle: Math.atan2(ay - uy, ax - ux),
    endAngle:   Math.atan2(cy - uy, cx - ux),
  };
}
```

---

## 3. `drawArcWall` Renderer

```javascript
function drawArcWall(ctx, wall, pixelsPerFoot) {
  const arc = circleFromThreePoints(
    { x: wall.startX, y: wall.startY },
    { x: wall.midX,   y: wall.midY   },
    { x: wall.endX,   y: wall.endY   }
  );
  if (!arc) return;

  const half  = (wall.thickness / 2) * pixelsPerFoot;
  const cx    = arc.cx * pixelsPerFoot;
  const cy    = arc.cy * pixelsPerFoot;
  const rOuter = arc.r * pixelsPerFoot + half;
  const rInner = arc.r * pixelsPerFoot - half;

  ctx.beginPath();
  ctx.arc(cx, cy, rOuter, arc.startAngle, arc.endAngle);
  ctx.arc(cx, cy, rInner, arc.endAngle, arc.startAngle, true);
  ctx.closePath();
  ctx.fillStyle = '#333333';
  ctx.fill();
}
```

---

## 4. ArcWallTool Class

```javascript
class ArcWallTool {
  constructor(dispatch) {
    this.dispatch = dispatch;
    this.clicks = [];
    this.mouse = null;
  }

  onPointerDown(worldPt) {
    this.clicks.push({ ...worldPt });
    if (this.clicks.length === 3) {
      this._commit();
    }
  }

  onPointerMove(worldPt) {
    this.mouse = worldPt;
  }

  onPointerUp() {}

  onCancel() {
    this.clicks = [];
    this.mouse = null;
  }

  drawOverlay(ctx, pixelsPerFoot) {
    if (this.clicks.length === 0) return;

    ctx.save();
    ctx.strokeStyle = 'blue';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]);

    const toC = p => ({ x: p.x * pixelsPerFoot, y: p.y * pixelsPerFoot });

    if (this.clicks.length >= 1 && this.mouse) {
      const s = toC(this.clicks[0]);
      const m = toC(this.mouse);
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(m.x, m.y);
      ctx.stroke();
    }

    if (this.clicks.length === 2 && this.mouse) {
      const arc = circleFromThreePoints(this.clicks[0], this.mouse, this.clicks[1]);
      if (arc) {
        ctx.beginPath();
        ctx.arc(arc.cx * pixelsPerFoot, arc.cy * pixelsPerFoot,
                arc.r * pixelsPerFoot, arc.startAngle, arc.endAngle);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  _commit() {
    const [start, end, mid] = this.clicks;
    this.dispatch({
      type: 'ADD_WALL',
      wall: {
        id: `arc_${Date.now()}`,
        kind: 'arc',
        startX: start.x, startY: start.y,
        endX: end.x,     endY: end.y,
        midX: mid.x,     midY: mid.y,
        thickness: 0.5,
      },
    });
    this.clicks = [];
    this.mouse = null;
  }
}
```
