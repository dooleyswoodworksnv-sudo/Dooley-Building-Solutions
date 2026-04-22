require 'sketchup.rb'
require 'extensions.rb'

module HouseShellBuilder
  unless file_loaded?(__FILE__)
    ex = SketchupExtension.new('House Shell Builder', 'HouseShellBuilder/main')
    ex.description = 'A professional house shell generator with framing and foundation options.'
    ex.version     = '1.0.0'
    ex.copyright   = 'Blueprint Drafter © 2026'
    ex.creator     = 'Blueprint Drafter'
    Sketchup.register_extension(ex, true)
    file_loaded(__FILE__)
  end
end
