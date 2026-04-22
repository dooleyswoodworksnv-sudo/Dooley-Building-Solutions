require 'sketchup.rb'
require 'json'

module DooleyBuildingSolutions
  
  def self.show_dialog
    options = {
      :dialog_title => "Dooley Building Solutions",
      :preferences_key => "com.dooley.buildingsolutions",
      :scrollable => true,
      :resizable => true,
      :width => 1200,
      :height => 800,
      :left => 100,
      :top => 100,
      :style => UI::HtmlDialog::STYLE_DIALOG
    }
    @dialog = UI::HtmlDialog.new(options)
    
    # Point to the web application
    @dialog.set_url("https://ais-dev-l3vt4r6igkf4kuv7asoyq2-25535055091.us-east1.run.app")
    
    # Callback to execute generated Ruby code
    @dialog.add_action_callback("execute_ruby") { |action_context, code|
      begin
        # Use TOPLEVEL_BINDING to ensure code runs in a clean global scope
        # but can still access Sketchup constants.
        eval(code, TOPLEVEL_BINDING)
      rescue => e
        puts "Error executing Ruby code from dialog: #{e.message}"
        puts e.backtrace.join("\n")
        UI.messagebox("Error executing script: #{e.message}\n\n#{e.backtrace.first}")
      end
    }

    # Callback to get current SketchUp version or other info if needed
    @dialog.add_action_callback("get_info") { |action_context|
      info = {
        version: Sketchup.version,
        units: model_units_name
      }
      @dialog.execute_script("window.receiveSketchupInfo(#{info.to_json})")
    }
    
    @dialog.show
  end

  def self.model_units_name
    case Sketchup.active_model.options['UnitsOptions']['LengthUnit']
    when 0 then "Inches"
    when 1 then "Feet"
    when 2 then "Millimeters"
    when 3 then "Centimeters"
    when 4 then "Meters"
    else "Unknown"
    end
  end

  # Menu Item
  unless file_loaded?(__FILE__)
    menu = UI.menu('Extensions')
    sub_menu = menu.add_submenu('Dooley Solutions')
    sub_menu.add_item('Launch Tool') {
      self.show_dialog
    }
    file_loaded(__FILE__)
  end

  # --- GENERATION LOGIC (Extracted from sketchupGenerator.ts) ---
  # This section provides the core geometry functions that the web app calls.
  # Note: The web app currently generates a full script, but we could also 
  # call these methods directly if we refactor the communication.
  
  # Helper to subtract intervals
  def self.subtract_intervals(intervals, cut_s, cut_e)
    res = []
    intervals.each do |s, e|
      if cut_e <= s || cut_s >= e
        res << [s, e]
      else
        res << [s, cut_s] if cut_s > s
        res << [cut_e, e] if cut_e < e
      end
    end
    res
  end

  # Helper to get or create a material
  def self.get_material(name, color_code)
    model = Sketchup.active_model
    mat = model.materials[name]
    mat ||= model.materials.add(name)
    mat.color = color_code
    mat
  end

  # Helper to draw a box
  def self.draw_box(ents, x, y, z, w, d, h, name, material=nil)
    return if w <= 0.01 || d <= 0.01 || h <= 0.01
    model = Sketchup.active_model
    g = ents.add_group
    g.name = name
    g.layer = model.layers.add(name)
    g.material = material if material
    pts = [[x,y,z], [x+w,y,z], [x+w,y+d,z], [x,y+d,z]]
    face = g.entities.add_face(pts)
    if face
      face.reverse! if face.normal.z < 0
      face.pushpull(h)
    end
    g
  end

end
