module HouseShellBuilder
  module Geometry
    # Advanced geometry methods can be added here
    # to support the main generation logic.
    
    def self.create_group(entities, name)
      group = entities.add_group
      group.name = name
      group
    end
  end
end
