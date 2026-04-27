# Live Preview / SketchUp Auto-Launch — Without Skill (Baseline)

## Implementation Plan

To implement a "Live Preview" button that auto-launches SketchUp and syncs in real-time, we need two parts: a local helper server and the web app button.

---

## Approach: Local Native Helper + WebSocket

Since browsers cannot directly launch native applications, we need a small native helper (Electron app or local server) that the user installs once.

### 1. Local Helper Server (Node.js)

```javascript
// dooley-sketchup-bridge.js — runs as a local process
const WebSocket = require('ws');
const { exec }  = require('child_process');
const fs        = require('fs');
const path      = require('path');

const wss = new WebSocket.Server({ port: 8765 });

wss.on('connection', (ws) => {
  ws.on('message', (data) => {
    const { rubyScript } = JSON.parse(data);
    const tempFile = path.join(__dirname, 'latest_model.rb');
    fs.writeFileSync(tempFile, rubyScript);

    // Launch SketchUp with the script
    exec(`"C:\\Program Files\\SketchUp\\SketchUp 2024\\SketchUp.exe" "${tempFile}"`,
      (err) => { if (err) console.error('SketchUp launch error:', err); });
  });
});

console.log('Dooley SketchUp bridge running on ws://localhost:8765');
```

### 2. Web App Button

```typescript
// LivePreviewButton.tsx
import React, { useRef } from 'react';

export function LivePreviewButton({ projectState }: { projectState: any }) {
  const wsRef = useRef<WebSocket | null>(null);

  function connect() {
    wsRef.current = new WebSocket('ws://localhost:8765');
    wsRef.current.onerror = () => alert('Could not connect to SketchUp bridge. Is it running?');
  }

  function handleLivePreview() {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) connect();
    const rubyScript = generateRubyScript(projectState.json);
    wsRef.current?.send(JSON.stringify({ rubyScript }));
  }

  return <button onClick={handleLivePreview}>Live Preview in SketchUp</button>;
}
```

### 3. SketchUp Auto-Reload Extension

Install a SketchUp extension that watches for file changes:

```ruby
module DooleyLivePreview
  WATCH_FILE = File.join(ENV['USERPROFILE'] || Dir.home, 'latest_model.rb')

  UI.start_timer(1.5, true) do
    next unless File.exist?(WATCH_FILE)
    load WATCH_FILE
    File.delete(WATCH_FILE)
  rescue => e
    puts "Live preview error: #{e.message}"
  end
end
```

---

## Setup Instructions

1. Install Node.js and run `node dooley-sketchup-bridge.js`
2. Install the SketchUp extension
3. Click "Live Preview" in the web app — SketchUp will open and update automatically

The bridge stays running in the background. Each time the user clicks "Live Preview", the latest model is sent to SketchUp.
