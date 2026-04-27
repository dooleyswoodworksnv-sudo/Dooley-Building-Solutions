# Walkthrough Camera Preset — With 3D Preview Agent Skill

Following the 3D Preview Agent skill: FOV 50, near 0.1, far 5000, OrbitControls with damping, GSAP easeInOutCubic transitions, scene units in inches.

---

## 1. Preset Table Entry

Per the skill's preset view table format:

| Preset      | Position              | LookAt          | Description                   |
|-------------|-----------------------|-----------------|-------------------------------|
| Walkthrough | `(72, 66, 5)`         | `(72, 66, 240)` | Eye-height just inside front door, looking inward |

- X=72 inches (6 ft from left wall — near typical door location)
- Y=66 inches (5.5 ft eye height above floor at Z=0)
- Z=5 inches (just inside the front face of the building)
- LookAt Z=240 inches (20 ft inward along building depth)

---

## 2. Preset Configuration Object

```typescript
// camera/presets.ts
import * as THREE from 'three';

export interface CameraPreset {
  name: string;
  position: THREE.Vector3;
  lookAt: THREE.Vector3;
  description: string;
}

export const CAMERA_PRESETS: CameraPreset[] = [
  { name: 'Front',       position: new THREE.Vector3(0, 120, 720),  lookAt: new THREE.Vector3(0, 120, 0),   description: 'Front elevation' },
  { name: 'Back',        position: new THREE.Vector3(0, 120, -720), lookAt: new THREE.Vector3(0, 120, 0),   description: 'Rear elevation' },
  { name: 'Left',        position: new THREE.Vector3(-720, 120, 0), lookAt: new THREE.Vector3(0, 120, 0),   description: 'Left elevation' },
  { name: 'Right',       position: new THREE.Vector3(720, 120, 0),  lookAt: new THREE.Vector3(0, 120, 0),   description: 'Right elevation' },
  { name: 'Top',         position: new THREE.Vector3(0, 960, 0),    lookAt: new THREE.Vector3(0, 0, 0),     description: 'Plan view' },
  { name: 'Isometric',   position: new THREE.Vector3(480, 360, 480), lookAt: new THREE.Vector3(0, 60, 0),   description: 'Default 3/4 overview' },
  // ↓ NEW
  { name: 'Walkthrough', position: new THREE.Vector3(72, 66, 5),    lookAt: new THREE.Vector3(72, 66, 240), description: 'First-person interior walkthrough' },
];
```

---

## 3. GSAP-Animated Transition

Per the skill's `animateCamera` pattern using `easeInOutCubic`:

```typescript
// camera/animateCamera.ts
import * as THREE from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import gsap from 'gsap';

export function animateCameraToPreset(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  preset: CameraPreset,
  duration = 1.2
): void {
  const startPos = camera.position.clone();
  const startTarget = controls.target.clone();

  gsap.to(startPos, {
    x: preset.position.x,
    y: preset.position.y,
    z: preset.position.z,
    duration,
    ease: 'power2.inOut',        // easeInOutCubic equivalent in GSAP
    onUpdate() {
      camera.position.copy(startPos);
      camera.lookAt(controls.target);
      controls.update();
    },
  });

  gsap.to(startTarget, {
    x: preset.lookAt.x,
    y: preset.lookAt.y,
    z: preset.lookAt.z,
    duration,
    ease: 'power2.inOut',
    onUpdate() {
      controls.target.copy(startTarget);
      controls.update();
    },
  });
}
```

---

## 4. Wiring into the UI

```typescript
// components/CameraControls.tsx (snippet)
import { CAMERA_PRESETS, animateCameraToPreset } from '../camera';

function activatePreset(name: string) {
  const preset = CAMERA_PRESETS.find(p => p.name === name);
  if (!preset) return;
  animateCameraToPreset(cameraRef.current, controlsRef.current, preset);
}

// Button:
// <button onClick={() => activatePreset('Walkthrough')}>Walkthrough</button>
```

---

## 5. Camera Config Compliance

Per the skill's default camera config (unchanged — Walkthrough uses the same camera):

```typescript
camera.fov  = 50;          // architectural realism
camera.near = 0.1;         // close enough for interior walkthroughs
camera.far  = 5000;        // covers large sites
camera.updateProjectionMatrix();
```

OrbitControls damping remains active during Walkthrough mode. `maxPolarAngle` should be relaxed slightly to allow looking up at ceilings:

```typescript
controls.maxPolarAngle = Math.PI * 0.85;  // allow slight upward tilt indoors
```
