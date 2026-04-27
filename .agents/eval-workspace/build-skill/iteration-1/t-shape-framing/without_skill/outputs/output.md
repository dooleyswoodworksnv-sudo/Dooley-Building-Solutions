# T-Shape Wall Framing Layout — Without Skill (Baseline)

## Dimensions in Inches

- Top bar: 480" wide × 240" deep
- Stem: 240" wide × 288" deep, centered on top bar (starts at X=120")
- Wall depth: 5.5" (2×6)
- Wall height: 108" (9 ft)
- Origin: front-left corner of top bar

---

## Wall Table (8 walls)

| ID | Description | start_x | start_y | length | is_x_dir | ext_dir | is_int |
|----|-------------|---------|---------|--------|----------|---------|--------|
| 1  | Top bar front | 0 | 0 | 480 | true | -1 | false |
| 2  | Top bar right | 474.5 | 0 | 240 | false | +1 | false |
| 3  | Top bar rear left | 0 | 234.5 | 120 | true | +1 | false |
| 4  | Top bar rear right | 360 | 234.5 | 120 | true | +1 | false |
| 5  | Top bar left | 0 | 5.5 | 229 | false | -1 | false |
| 6  | Stem left | 120 | 234.5 | 288 | false | -1 | false |
| 7  | Stem right | 354.5 | 234.5 | 288 | false | +1 | false |
| 8  | Stem bottom | 120 | 517.5 | 240 | true | +1 | false |

**Sheathing/drywall extensions (sh_s, sh_e, dw_s, dw_e):** Set to 5.5 at shared corners to overlap the perpendicular wall's sheathing. Set to 0 at T-junctions (butt join).

---

## Dormer Truss Cuts

Dormer centered at X=240", assume 72" wide → X=204" to X=276".

Trusses at 24" OC spanning the top bar (240" deep):
- Trusses at X = 216, 240, 264 fall inside the dormer zone.
- These three trusses have their front top chord removed and front webs skipped.
- Bottom chord remains.

---

## Notes

- The T-junction between the stem walls (6, 7) and the rear top-bar walls (3, 4) needs careful coordinate alignment so wall bodies don't overlap.
- Corner at stem/top-bar junction: stem wall Y starts at 234.5 (top bar depth + 5.5" corner overlap).
