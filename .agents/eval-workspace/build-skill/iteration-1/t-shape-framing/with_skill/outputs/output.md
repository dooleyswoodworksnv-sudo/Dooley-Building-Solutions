# T-Shape Wall Framing Layout — With Structural Build Agent Skill

Following the Structural Build Agent skill: all coordinates in inches, T-shape uses 8 wall IDs, 2×6 walls (5.5" depth), corner overlap extensions, ext_dir convention.

---

## Building Dimensions

| Component | Feet | Inches |
|---|---|---|
| Top bar width | 40 ft | 480 in |
| Top bar depth | 20 ft | 240 in |
| Stem width | 20 ft | 240 in |
| Stem depth | 24 ft | 288 in |
| Wall depth (2×6) | — | 5.5 in |
| Wall height | 9 ft | 108 in |

Stem is centered on the top bar, so stem starts at X = (480 - 240) / 2 = 120 in from the left.

**Origin (0,0):** front-left corner of the top bar.

---

## 8-Wall Layout

Per the skill's T-Shape wall count (8 walls, IDs 1–8), with the Director signature fields:

| Wall | start_x | start_y | length | depth | is_x_dir | ext_dir | sh_s | sh_e | dw_s | dw_e | is_int |
|------|---------|---------|--------|-------|----------|---------|------|------|------|------|--------|
| 1  | 0       | 0       | 480    | 5.5  | true  | -1 | 0   | 0   | 0   | 0   | false |
| 2  | 474.5   | 0       | 240    | 5.5  | false | +1 | 0   | 0   | 0   | 0   | false |
| 3  | 0       | 234.5   | 120    | 5.5  | true  | +1 | 0   | 0   | 0   | 0   | false |
| 4  | 360     | 234.5   | 120    | 5.5  | true  | +1 | 0   | 0   | 0   | 0   | false |
| 5  | 0       | 5.5     | 229    | 5.5  | false | -1 | 0   | 0   | 0   | 0   | false |
| 6  | 120     | 234.5   | 288    | 5.5  | false | -1 | 0   | 0   | 0   | 0   | false |
| 7  | 354.5   | 234.5   | 288    | 5.5  | false | +1 | 0   | 0   | 0   | 0   | false |
| 8  | 120     | 517.5   | 240    | 5.5  | true  | +1 | 0   | 0   | 0   | 0   | false |

**Corner overlap logic (per skill):**
- Walls 1 and 3/4 are horizontal; vertical walls (2, 5, 6, 7) are inset by 5.5" at ends where they share a corner with a horizontal wall, so sheathing/drywall extensions keep the corner clean.
- `sh_s` / `sh_e` are set where sheathing needs to extend beyond the stud bay to cover the corner; at T-junctions these are typically 0 (butt join).

---

## Wall Descriptions

| Wall | Description | ext_dir meaning |
|---|---|---|
| 1 | Front face of top bar (runs left→right along X) | -1 = exterior faces front (negative Y) |
| 2 | Right end of top bar (runs front→back along Y) | +1 = exterior faces right (positive X) |
| 3 | Rear of top bar, left segment (left of stem opening) | +1 = exterior faces rear |
| 4 | Rear of top bar, right segment (right of stem opening) | +1 = exterior faces rear |
| 5 | Left end of top bar (runs front→rear) | -1 = exterior faces left (negative X) |
| 6 | Left wall of stem (runs rear of top bar → bottom) | -1 = exterior faces left |
| 7 | Right wall of stem (runs rear of top bar → bottom) | +1 = exterior faces right |
| 8 | Bottom of stem (runs left→right) | +1 = exterior faces bottom |

---

## Dormer Truss Cut Specification

Dormer is at the center of the top bar's front face.
- Top bar front face = Wall 1, running along X from 0 to 480 in.
- Center of top bar front = X = 240 in.

Assuming a typical 6 ft (72 in) wide dormer:
- Dormer occupies X = 204 in to 276 in.
- Truss run: trusses span the top bar depth (20 ft = 240 in), spaced 24" OC.
- Truss X positions: 0, 24, 48, ..., 480 in.

**Trusses affected (dormer range 204–276):**
- Truss at X = 216 in (index 9)
- Truss at X = 240 in (index 10)
- Truss at X = 264 in (index 11)

Per the skill: these trusses have their **front-face top chord cut** (the chord on the side of Z=0, facing the front of the building). Web members on the cut side are also skipped. Bottom chord remains intact. Each is named `"Truss (Cut for Dormer)"`.

---

## JSON Snippet (wall_id 1)

```typescript
draw_wall_framing.call(
  1,        // wall_id
  0,        // start_x (in)
  0,        // start_y (in)
  480,      // length (in) — 40 ft top bar width
  5.5,      // depth (in) — 2×6
  true,     // is_x_dir — runs along X
  -1,       // ext_dir — exterior faces front (-Y direction)
  0, 0,     // sh_s, sh_e — no sheathing corner extension needed
  0, 0,     // dw_s, dw_e
  false,    // is_int — exterior wall
  true,     // add_corners
  target_ents,
  108,      // w_height (in) — 9 ft
  0,        // z_off — ground floor
  0         // floor_idx
)
```
