require 'sketchup.rb'
require 'extensions.rb'

module DooleyBuildingSolutions
  unless file_loaded?(__FILE__)
    ex = SketchupExtension.new('Dooley Building Solutions', 'dooley_extension/main')
    ex.description = 'Professional building solutions for framing and foundations.'
    ex.version     = '1.0.0'
    ex.copyright   = 'Dooley Building Solutions © 2026'
    ex.creator     = 'Dooley'
    Sketchup.register_extension(ex, true)
    file_loaded(__FILE__)
  end
end
