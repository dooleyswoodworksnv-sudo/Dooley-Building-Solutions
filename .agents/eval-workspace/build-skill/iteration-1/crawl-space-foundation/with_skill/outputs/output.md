# Crawl-Space Foundation — With Structural Build Agent Skill

Following the Structural Build Agent skill: draw_box helper, subtract_intervals, apply_bim_data, foundation height calculation, JSON data model.

---

## 1. New JSON Parameters

```typescript
// Additions to the foundation config block
foundationType: 'crawl-space',          // new type
crawlSpaceHeightIn: number,             // stem wall height (typ. 24"–48")
crawlSpaceWallThicknessIn: number,      // typ. 8" (CMU or poured)
ventWidthIn: number,                    // each vent opening width (typ. 16")
ventHeightIn: number,                   // each vent opening height (typ. 8")
ventSpacingIn: number,                  // center-to-center spacing (typ. 72" = 6 ft OC)
ventBottomOffsetIn: number,             // height of vent bottom above wall base (per spec: 4")
footingWidthIn: number,                 // footing under stem wall (typ. 16")
footingThicknessIn: number,             // footing thickness (typ. 8")
```

---

## 2. Geometry Generation Rules

Following the existing `stem-wall` pattern from the skill:

### Foundation Height Calculation

```ruby
if foundation_type == 'crawl-space'
  foundation_height = crawl_space_height_in
end
```

This value is added to `z_off` for all walls above — the first floor sits on top of the crawl space.

### Step-by-Step Geometry

1. **Footings** (same as stem-wall): For each perimeter segment, create a footing strip at:
   ```
   Z = -(crawl_space_height_in + footing_thickness_in)
   Width = footing_width_in (centered under stem wall)
   Height = footing_thickness_in
   ```

2. **Stem wall segments with vents**: For each perimeter segment of length `L`:
   - Compute vent intervals: centers at `spacing/2, 3*spacing/2, ...` along the segment.
   - Each vent occupies `[center - vent_w/2, center + vent_w/2]` horizontally and `[vent_bottom_offset, vent_bottom_offset + vent_h]` vertically.
   - Use `subtract_intervals` to get solid wall intervals horizontally.
   - Draw solid wall sub-segments above and below each vent using `draw_box`.

3. **BIM attribution**: `apply_bim_data(group, 'Footing')` — IFC Class `IfcFooting`, Material `Concrete`.

---

## 3. Ruby-Style Pseudocode — `draw_crawl_space_foundation`

```ruby
draw_crawl_space_foundation = -> (
  perimeter_segs,     # Array of { start_x, start_y, length, is_x_dir }
  crawl_h,            # crawlSpaceHeightIn
  wall_t,             # crawlSpaceWallThicknessIn
  footing_w,          # footingWidthIn
  footing_t,          # footingThicknessIn
  vent_w,             # ventWidthIn
  vent_h,             # ventHeightIn
  vent_sp,            # ventSpacingIn
  vent_bot,           # ventBottomOffsetIn (4")
  target_ents
) {

  perimeter_segs.each_with_index do |seg, i|
    seg_len  = seg[:length]
    sx, sy   = seg[:start_x], seg[:start_y]
    is_x     = seg[:is_x_dir]

    # 1. Footing
    footing_z = -(crawl_h + footing_t)
    foot_off  = (footing_w - wall_t) / 2.0
    draw_box.call(target_ents,
      is_x ? sx - foot_off : sx - foot_off,
      is_x ? sy - foot_off : sy - foot_off,
      footing_z,
      is_x ? seg_len + footing_w : footing_w,
      is_x ? footing_w           : seg_len + footing_w,
      footing_t,
      "Footing Segment #{i}",
      get_material.call("Concrete", "#A9A9A9")
    )

    # 2. Compute vent horizontal intervals
    vent_intervals = []
    centre = vent_sp / 2.0
    while centre <= seg_len
      cs = centre - vent_w / 2.0
      ce = centre + vent_w / 2.0
      vent_intervals << [cs, ce] if cs >= 0 && ce <= seg_len
      centre += vent_sp
    end

    solid_h_intervals = subtract_intervals.call([[0.0, seg_len]], vent_intervals)

    # 3. Solid wall sub-segments (full height — vent hole punched separately)
    solid_h_intervals.each_with_index do |(h_s, h_e), j|
      sub_len = h_e - h_s
      ox = is_x ? sx + h_s : sx
      oy = is_x ? sy        : sy + h_s
      seg_grp = draw_box.call(target_ents, ox, oy, -crawl_h,
        is_x ? sub_len : wall_t,
        is_x ? wall_t  : sub_len,
        crawl_h,
        "Crawl Space Stem Wall #{i}-#{j}",
        get_material.call("Concrete", "#A9A9A9")
      )
      apply_bim_data.call(seg_grp, "Footing")
    end

    # 4. Below-vent and above-vent solid pieces at vent positions
    vent_intervals.each_with_index do |(v_s, v_e), k|
      v_len = v_e - v_s
      ox = is_x ? sx + v_s : sx
      oy = is_x ? sy        : sy + v_s

      # Below-vent slab (from 0 to vent_bot)
      if vent_bot > 0.01
        draw_box.call(target_ents, ox, oy, -crawl_h,
          is_x ? v_len : wall_t,
          is_x ? wall_t : v_len,
          vent_bot,
          "Below Vent #{i}-#{k}",
          get_material.call("Concrete", "#A9A9A9")
        )
      end

      # Above-vent solid (from vent_bot + vent_h to crawl_h)
      above_h = crawl_h - vent_bot - vent_h
      if above_h > 0.01
        draw_box.call(target_ents, ox, oy, -crawl_h + vent_bot + vent_h,
          is_x ? v_len : wall_t,
          is_x ? wall_t : v_len,
          above_h,
          "Above Vent #{i}-#{k}",
          get_material.call("Concrete", "#A9A9A9")
        )
      end
    end
  end
}
```

---

## 4. BIM Data Attribution

Per the skill's `apply_bim_data` pattern:

| Field | Value |
|---|---|
| IFC Class | `IfcFooting` |
| Material Type | `Concrete` |
| Volume Summary | Total concrete volume / 46656 (cubic yards) |

Volume includes all stem wall sub-segments + footing strips. Vent openings are voids and not counted.

---

## 5. Section Filtering

Add `'crawl-space'` to the foundation generation gate alongside `'slab'`, `'slab-on-grade'`, `'stem-wall'`:

```ruby
if ['slab','slab-on-grade','stem-wall','crawl-space'].include?(foundation_type)
  # ... generate foundation
end
```
