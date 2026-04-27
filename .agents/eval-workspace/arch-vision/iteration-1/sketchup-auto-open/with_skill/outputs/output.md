# Live Preview / SketchUp Auto-Launch — With Standalone Architecture Skill

---

## Response

**I won't implement this as described — it violates the Standalone Architecture Vision for Dooley Building Solutions.**

The core design principle is:

> **The web app is the core engine. SketchUp is an optional export bridge — not a core dependency.**

A "Live Preview" button that auto-launches SketchUp and drives it in real-time would make SketchUp a *required runtime dependency* of the web app. That breaks the architectural contract in several ways:

1. **Users without SketchUp installed can no longer preview their design** — the button would silently fail or error.
2. **Browser security prevents launching native applications.** There is no web API that can open SketchUp on the user's machine without a native helper (a browser extension, a local server, or a custom protocol handler). This adds complex infrastructure that isn't worth the dependency.
3. **The JSON data model is the Single Source of Truth.** Real-time sync to SketchUp means the model's truth could drift — e.g. if SketchUp's undo is used, the JSON and the SketchUp model diverge.

---

## Compliant Alternative: File-Watch Export Button

Here is what I recommend instead — it preserves the standalone principle while giving the user a fast SketchUp update loop:

### How it works

1. The user clicks **"Export to SketchUp"** in the web app.
2. The web app generates the Ruby script from the JSON data model and downloads `dooley_builder_export.rb` to a known folder (e.g. `~/Documents/DooleyExports/`).
3. A lightweight **SketchUp extension** (installed once) watches that folder for new `.rb` files and auto-runs them when they appear.
4. Result: near-real-time SketchUp updates triggered by the user, not by the browser controlling SketchUp.

### Web App Button (TypeScript)

```typescript
function handleExportToSketchUp(): void {
  // JSON is the Single Source of Truth — read it, generate Ruby, download
  const rubyScript = generateRubyScript(projectState.json);
  const blob = new Blob([rubyScript], { type: 'text/plain' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'dooley_builder_export.rb';
  a.click();
  URL.revokeObjectURL(url);
}
```

### SketchUp Extension Watcher (Ruby — installed separately)

```ruby
module DooleyBuildingSolutions
  module FileWatcher
    WATCH_DIR = File.join(Dir.home, 'Documents', 'DooleyExports')
    INTERVAL  = 2  # seconds

    def self.start
      @timer = UI.start_timer(INTERVAL, true) { check_for_exports }
    end

    def self.check_for_exports
      files = Dir.glob(File.join(WATCH_DIR, '*.rb')).sort_by { |f| File.mtime(f) }
      return if files.empty?
      latest = files.last
      load latest
      File.delete(latest)
    rescue => e
      puts "DooleyWatcher error: #{e.message}"
    end
  end
end

DooleyBuildingSolutions::FileWatcher.start
```

---

## Summary

| Approach | Compliant? | Notes |
|---|---|---|
| Auto-launch SketchUp from browser | ✗ | Breaks standalone principle, not technically feasible without native helper |
| File-watch export + SketchUp extension | ✓ | SketchUp is optional, user controls timing, JSON stays as truth |
| Manual "Export .rb" button only | ✓ | Simplest — no extension needed |

The JSON data model remains the Single Source of Truth. The Ruby script is a downstream read-only consumer. Schema changes always originate in the web app.
