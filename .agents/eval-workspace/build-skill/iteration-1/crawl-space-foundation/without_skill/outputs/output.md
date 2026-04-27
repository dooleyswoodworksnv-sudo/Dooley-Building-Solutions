# Crawl-Space Foundation — Without Skill (Baseline)

## 1. New JSON Parameters

```json
{
  "foundationType": "crawl-space",
  "crawlSpaceHeight": 36,
  "wallThickness": 8,
  "ventWidth": 16,
  "ventHeight": 8,
  "ventSpacing": 72,
  "ventBottomOffset": 4,
  "footingWidth": 16,
  "footingDepth": 8
}
```

---

## 2. Geometry Generation Rules

1. **Footings**: Same as stem-wall. Place spread footings under each perimeter wall segment at `Z = -(crawlSpaceHeight + footingDepth)`.

2. **Stem walls with vents**: For each wall segment:
   - Place solid stem wall sections between vents
   - Place solid wall sections above and below each vent opening
   - Vent bottoms are at `ventBottomOffset` (4") above the wall base
   - Leave vent openings as gaps in the geometry

3. **Foundation height**: `crawlSpaceHeight` contributes to the Z offset for the floor system above.

---

## 3. Pseudocode

```ruby
def draw_crawl_space_foundation(segments, cfg, entities)
  vent_w   = cfg[:vent_width]
  vent_h   = cfg[:vent_height]
  vent_sp  = cfg[:vent_spacing]
  vent_bot = cfg[:vent_bottom_offset]  # 4"
  crawl_h  = cfg[:crawl_space_height]
  wall_t   = cfg[:wall_thickness]

  segments.each_with_index do |seg, i|
    length = seg[:length]
    x, y   = seg[:x], seg[:y]

    # Compute vent positions along segment
    vent_positions = []
    pos = vent_sp / 2.0
    while pos < length
      vent_positions << pos
      pos += vent_sp
    end

    # Solid intervals (subtract vent openings)
    solid = subtract_intervals.call([[0, length]], vent_positions.map { |p|
      [p - vent_w/2.0, p + vent_w/2.0]
    })

    # Draw solid wall pieces
    solid.each do |s, e|
      draw_box.call(entities, x + s, y, -crawl_h, e - s, wall_t, crawl_h,
                    "Crawl Wall #{i}", get_material.call("Concrete", "#888888"))
    end

    # Draw vent surround (above + below each vent)
    vent_positions.each do |vp|
      vx = x + vp - vent_w / 2.0
      # Below vent
      draw_box.call(entities, vx, y, -crawl_h, vent_w, wall_t, vent_bot,
                    "Vent Below #{i}", get_material.call("Concrete", "#888888"))
      # Above vent
      above_h = crawl_h - vent_bot - vent_h
      draw_box.call(entities, vx, y, -crawl_h + vent_bot + vent_h, vent_w, wall_t, above_h,
                    "Vent Above #{i}", get_material.call("Concrete", "#888888"))
    end

    apply_bim_data.call(entities, "CrawlSpace")
  end
end
```

---

## 4. BIM Attribution

- IFC Class: `IfcFooting`
- Material: Concrete
- Volume: sum of all stem wall boxes in cubic inches / 46656 = cubic yards
