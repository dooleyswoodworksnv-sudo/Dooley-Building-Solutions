# `draw_crawl_space_foundation` — Without Skill

## Overview

The method generates a perimeter crawl-space stem wall in SketchUp Ruby API style, inside `DooleyBuildingSolutions::HouseShellBuilder`. It iterates over consecutive pairs of `perimeter_pts`, computes vent openings using `subtract_intervals`, draws each solid sub-segment via `draw_box`, caches materials via `get_material`, applies BIM attribution via `apply_bim_data`, and wraps all geometry in a SketchUp operation for undo atomicity.

---

## Full Ruby Code

```ruby
module DooleyBuildingSolutions
  module HouseShellBuilder

    STEM_WALL_THICKNESS = 8.0  # inches

    def self.draw_crawl_space_foundation(entities, perimeter_pts, stem_height_in, vent_cfg)
      raise ArgumentError, "perimeter_pts must have at least 3 points" \
        unless perimeter_pts.is_a?(Array) && perimeter_pts.length >= 3
      raise ArgumentError, "stem_height_in must be a positive number" \
        unless stem_height_in.is_a?(Numeric) && stem_height_in > 0
      %i[width_in height_in spacing_in].each do |key|
        raise ArgumentError, "vent_cfg missing :#{key}" \
          unless vent_cfg.key?(key) && vent_cfg[key].is_a?(Numeric) && vent_cfg[key] > 0
      end

      vent_w  = vent_cfg[:width_in].to_f
      vent_h  = [vent_cfg[:height_in].to_f, stem_height_in].min
      vent_sp = vent_cfg[:spacing_in].to_f

      stem_material = get_material.call("ConcreteBlock_Gray", [160, 160, 160])
      vent_material = get_material.call("Air_Vent_Metal",     [120, 130, 140])

      model = Sketchup.active_model
      model.start_operation("Draw Crawl Space Foundation", true)

      begin
        closed_pts = perimeter_pts + [perimeter_pts.first]

        closed_pts.each_cons(2).with_index do |(pt_a, pt_b), seg_idx|
          ax, ay = pt_a[0].to_f, pt_a[1].to_f
          bx, by = pt_b[0].to_f, pt_b[1].to_f
          dx = bx - ax
          dy = by - ay
          seg_length = Math.sqrt(dx * dx + dy * dy)
          next if seg_length < 0.01

          ux = dx / seg_length
          uy = dy / seg_length

          vent_intervals = []
          centre = vent_sp / 2.0
          while centre <= seg_length
            cs = centre - vent_w / 2.0
            ce = centre + vent_w / 2.0
            vent_intervals << [cs, ce] if cs >= 0 && ce <= seg_length
            centre += vent_sp
          end

          solid_intervals = subtract_intervals.call([[0.0, seg_length]], vent_intervals)

          solid_intervals.each_with_index do |(s_start, s_end), int_idx|
            sub_len = s_end - s_start
            next if sub_len < 0.01
            ox = ax + ux * s_start
            oy = ay + uy * s_start
            seg_group = entities.add_group
            seg_group.name = "StemWall_Seg#{seg_idx}_Sub#{int_idx}"
            draw_box.call(seg_group.entities, 0, 0, 0, sub_len,
                          STEM_WALL_THICKNESS, stem_height_in, seg_group.name, stem_material)
            angle = Math.atan2(uy, ux)
            seg_group.transformation = Geom::Transformation.rotation(
              Geom::Point3d.new(ox, oy, 0), Geom::Vector3d.new(0, 0, 1), angle)
            apply_bim_data.call(seg_group, "CrawlSpaceStemWall")
          end

          vent_intervals.each_with_index do |(v_start, _v_end), vent_idx|
            vent_oz = stem_height_in - vent_h
            ox = ax + ux * v_start
            oy = ay + uy * v_start
            vent_group = entities.add_group
            vent_group.name = "CrawlVent_Seg#{seg_idx}_Vent#{vent_idx}"
            draw_box.call(vent_group.entities, 0, 0, vent_oz, vent_w,
                          STEM_WALL_THICKNESS, vent_h, vent_group.name, vent_material)
            angle = Math.atan2(uy, ux)
            vent_group.transformation = Geom::Transformation.rotation(
              Geom::Point3d.new(ox, oy, vent_oz), Geom::Vector3d.new(0, 0, 1), angle)
            apply_bim_data.call(vent_group, "CrawlSpaceVent")
          end
        end

        model.commit_operation
      rescue => e
        model.abort_operation
        raise RuntimeError, "draw_crawl_space_foundation failed: #{e.message}"
      end
      nil
    end

  end
end
```

## Usage Example

```ruby
pts = [[0,0],[480,0],[480,336],[0,336]]
vent_cfg = { width_in: 16.0, height_in: 8.0, spacing_in: 72.0 }
DooleyBuildingSolutions::HouseShellBuilder
  .draw_crawl_space_foundation(Sketchup.active_model.active_entities, pts, 24.0, vent_cfg)
```

## Edge Cases

| Situation | Behaviour |
|---|---|
| Degenerate edge (< 0.01 in) | Skipped |
| Vent extends past segment end | Omitted |
| `vent_h > stem_height_in` | Clamped |
| Geometry error mid-draw | `abort_operation` rolls back |
| Missing vent_cfg keys | `ArgumentError` before operation |
