module HouseShellBuilder
  module Helpers
    def self.log(message)
      puts "[HouseShellBuilder] #{Time.now.strftime('%H:%M:%S')} - #{message}"
    end
    
    def self.error(message)
      UI.messagebox("HouseShellBuilder Error: #{message}")
    end
  end
end
