# Arc Wall Tool — With 2D Preview Agent Skill

Following the 2D Preview Agent skill guidelines exactly.

---

## 1. JSON Data Model — Curved Wall Segment

Per the skill: all real-world dimensions in decimal feet; canvas converts at the render boundary.

```json
{
  "id": "wall_arc_001",
  "type": "arc",
  "wallType": "exterior",
  "story": "story_0",
  "start":  { "x": 0.0,  "y": 0.0 },
  "end":    { "x": 10.0, "y": 0.0 },
  "mid":    { "x": 5.0,  "y": 3.0 },
  "thickness": 0.5,
  "center": { "x": 5.0, "y": -11.33 },
  "radius": 11.83,
  "startAngle": 1.5708,
  "endAngle":   1.3089,
  "anticlockwise": false
}
```

`center`, `radius`, `startAngle`, `endAngle` are computed at commit time from `start`, `end`, `mid` and cached so `drawArcWall` never has to recompute them.

---

## 2. Arc Geometry Helper

```typescript
// utils/arcGeometry.ts

export interface ArcParams {
  center: { x: number; y: number };
  radius: number;
  startAngle: number;
  endAngle: number;
  anticlockwise: boolean;
}

/** Compute circle through three points (all in world-space decimal feet). */
export function threePointArc(
  start: { x: number; y: number },
  mid:   { x: number; y: number },
  end:   { x: number; y: number }
): ArcParams {
  const ax = start.x, ay = start.y;
  const bx = mid.x,   by = mid.y;
  const cx = end.x,   cy = end.y;

  const D = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
  if (Math.abs(D) < 1e-9) throw new Error('Points are collinear — use straight wall');

  const ux = ((ax * ax + ay * ay) * (by - cy) +
               (bx * bx + by * by) * (cy - ay) +
               (cx * cx + cy * cy) * (ay - by)) / D;
  const uy = ((ax * ax + ay * ay) * (cx - bx) +
               (bx * bx + by * by) * (ax - cx) +
               (cx * cx + cy * cy) * (bx - ax)) / D;

  const center = { x: ux, y: uy };
  const radius  = Math.hypot(ax - ux, ay - uy);
  const startAngle = Math.atan2(ay - uy, ax - ux);
  const endAngle   = Math.atan2(cy - uy, cx - ux);

  // Determine winding from the midpoint
  const midAngle = Math.atan2(by - uy, bx - ux);
  const anticlockwise = !isAngleBetween(startAngle, midAngle, endAngle);

  return { center, radius, startAngle, endAngle, anticlockwise };
}

function isAngleBetween(start: number, mid: number, end: number): boolean {
  const norm = (a: number) => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const s = norm(start), m = norm(mid), e = norm(end);
  return s <= e ? (s <= m && m <= e) : (s <= m || m <= e);
}
```

---

## 3. Wall Rendering — `drawArcWall`

Following skill layer order, color palette, Hi-DPI, and ctx.save/restore standards:

```typescript
// canvas/drawArcWall.ts
import type { ArcWall } from '../types/walls';

export function drawArcWall(
  ctx: CanvasRenderingContext2D,
  wall: ArcWall,
  pxPerFt: number
): void {
  const { center, radius, startAngle, endAngle, anticlockwise, thickness, wallType } = wall;
  const halfPx = (thickness / 2) * pxPerFt;
  const rOuter = Math.round((radius + thickness / 2) * pxPerFt);
  const rInner = Math.round((radius - thickness / 2) * pxPerFt);
  const cx = Math.round(center.x * pxPerFt);
  const cy = Math.round(center.y * pxPerFt);

  ctx.save();
  ctx.beginPath();
  // Outer arc (forward)
  ctx.arc(cx, cy, rOuter, startAngle, endAngle, anticlockwise);
  // Inner arc (reverse — closes the wall band)
  ctx.arc(cx, cy, rInner, endAngle, startAngle, !anticlockwise);
  ctx.closePath();

  ctx.fillStyle = wallType === 'exterior' ? '#2C2C2C' : '#555555';
  ctx.fill();
  ctx.restore();
}
```

---

## 4. `ArcWallTool` — BaseTool Subclass

Following the tool system architecture from the skill (BaseTool, three-phase interaction, drawOverlay, snap integration):

```typescript
// tools/ArcWallTool.ts
import { BaseTool } from './BaseTool';
import { threePointArc } from '../utils/arcGeometry';
import type { WorldPoint } from '../types/canvas';
import type { ArcWall } from '../types/walls';

type Phase = 'idle' | 'hasStart' | 'hasEnd';

export class ArcWallTool extends BaseTool {
  readonly name = 'tool-arc-wall';
  readonly cursor = 'crosshair';

  private phase: Phase = 'idle';
  private startPt: WorldPoint | null = null;
  private endPt:   WorldPoint | null = null;
  private ghostMid: WorldPoint | null = null;

  onPointerDown(worldPoint: WorldPoint, _event: PointerEvent): void {
    if (this.phase === 'idle') {
      this.startPt = worldPoint;
      this.phase = 'hasStart';
    } else if (this.phase === 'hasStart') {
      this.endPt = worldPoint;
      this.phase = 'hasEnd';
    } else if (this.phase === 'hasEnd') {
      this.commitArc(worldPoint);
    }
  }

  onPointerMove(worldPoint: WorldPoint, _event: PointerEvent): void {
    this.ghostMid = worldPoint;
  }

  onPointerUp(_worldPoint: WorldPoint, _event: PointerEvent): void { /* no-op */ }

  onCancel(): void {
    this.reset();
  }

  drawOverlay(ctx: CanvasRenderingContext2D, pxPerFt: number): void {
    if (!this.startPt) return;

    ctx.save();
    ctx.strokeStyle = '#0078FF';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);

    const toCanvas = (p: WorldPoint) => ({
      x: Math.round(p.x * pxPerFt),
      y: Math.round(p.y * pxPerFt),
    });
    const sp = toCanvas(this.startPt);

    if (this.phase === 'hasStart' && this.ghostMid) {
      // Phase 1: rubber-band straight line to cursor
      const gm = toCanvas(this.ghostMid);
      ctx.beginPath();
      ctx.moveTo(sp.x, sp.y);
      ctx.lineTo(gm.x, gm.y);
      ctx.stroke();

      // Snap indicator
      this.drawSnapDot(ctx, sp.x, sp.y);
    }

    if (this.phase === 'hasEnd' && this.endPt && this.ghostMid) {
      // Phase 2: live arc preview through ghost midpoint
      try {
        const arc = threePointArc(this.startPt, this.ghostMid, this.endPt);
        const cx = Math.round(arc.center.x * pxPerFt);
        const cy = Math.round(arc.center.y * pxPerFt);
        const r  = Math.round(arc.radius  * pxPerFt);
        ctx.beginPath();
        ctx.arc(cx, cy, r, arc.startAngle, arc.endAngle, arc.anticlockwise);
        ctx.stroke();

        // Length label on arc
        const arcLen = arc.radius * Math.abs(arc.endAngle - arc.startAngle);
        this.drawLengthLabel(ctx, this.ghostMid, arcLen, pxPerFt);
      } catch {
        // Points collinear — show dashed straight line instead
        const ep = toCanvas(this.endPt);
        ctx.beginPath();
        ctx.moveTo(sp.x, sp.y);
        ctx.lineTo(ep.x, ep.y);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  private commitArc(midPt: WorldPoint): void {
    if (!this.startPt || !this.endPt) return;
    try {
      const arcParams = threePointArc(this.startPt, midPt, this.endPt);
      const wall: ArcWall = {
        id: `wall_arc_${Date.now()}`,
        type: 'arc',
        wallType: 'exterior',
        story: this.activeStoryId,
        start: { ...this.startPt },
        end:   { ...this.endPt },
        mid:   { ...midPt },
        thickness: this.wallThickness,
        ...arcParams,
      };
      this.dispatch({ type: 'ADD_ARC_WALL', payload: wall });
    } catch {
      // collinear — silently skip
    } finally {
      this.reset();
    }
  }

  private reset(): void {
    this.phase    = 'idle';
    this.startPt  = null;
    this.endPt    = null;
    this.ghostMid = null;
  }

  private drawSnapDot(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.save();
    ctx.fillStyle = '#FF6600';
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawLengthLabel(
    ctx: CanvasRenderingContext2D,
    pt: WorldPoint,
    lenFt: number,
    pxPerFt: number
  ): void {
    const x = Math.round(pt.x * pxPerFt);
    const y = Math.round(pt.y * pxPerFt) - 12;
    const feet  = Math.floor(lenFt);
    const inches = Math.round((lenFt - feet) * 12);
    const label = `${feet}' ${inches}"`;

    ctx.font = '12px bold Inter, sans-serif';
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3;
    ctx.setLineDash([]);
    ctx.strokeText(label, x, y);
    ctx.fillStyle = '#333333';
    ctx.fillText(label, x, y);
  }
}
```

---

## 5. Keyboard Shortcut Registration

Per the skill's keyboard shortcut table (extend with a new key):

```typescript
// toolManager.ts (addition)
case 'A': return toolManager.activate('tool-arc-wall');
```

---

## 6. Layer Order Compliance

`drawArcWall` must be called in the same pass as straight walls (layer 5 exterior / layer 6 interior), after blueprint and grid, before openings — matching the skill's strict back-to-front order.
