# Roof Shingles Material Debug — Without Skill

**Issue:** Roof shingles material not appearing; roof faces render as default gray
**Target Material:** `RoofShingles`, `MeshStandardMaterial`, color `#2F2F2F`, roughness `0.9`, metalness `0.0`

---

## 1. Debug Checklist (In Order)

**Step 1 — Confirm the material object is constructed correctly**
Verify a `MeshStandardMaterial` named `RoofShingles` is actually instantiated. Common mistake: defined inside a function that never gets called, or gated behind a false conditional.

**Step 2 — Confirm the material is stored in the cache under the correct key**
Check that the key is exactly `'RoofShingles'` (case-sensitive). A mismatch like `'roofShingles'` or `'Roof_Shingles'` means the lookup always returns `undefined`.

**Step 3 — Confirm the cache lookup returns the material (not undefined)**
Log `materialCache.get('RoofShingles')` at the point of mesh assignment. If `undefined`, the mesh silently keeps the default gray material. Common cause: cache populated asynchronously after texture load, but mesh assigned before cache is ready.

**Step 4 — Confirm the material is assigned to every mesh in RoofGroup**
A flat `children` loop misses grandchildren (nested sub-groups for dormers, ridges, hips). Use `traverse()` instead.

**Step 5 — Confirm `needsUpdate` is set when a material is replaced at runtime**
After swapping a material on a previously-rendered mesh, set `material.needsUpdate = true`, otherwise Three.js reuses the previously compiled shader.

**Step 6 — Confirm lights are present for PBR rendering**
`MeshStandardMaterial` requires at least one light. Black result = no lights. Gray result (default material appearance) = material not assigned at all — points back to Steps 2–4.

**Step 7 — Confirm geometry groups are not overriding material indices**
If `mesh.geometry.groups` has entries, Three.js indexes into `mesh.material[]` per group. Assigning a single material object while groups exist means some faces get `undefined` and render gray. Supply a material array instead.

**Step 8 — Inspect at runtime**
`console.log(roofMesh.material)` at a breakpoint. Confirm `isMeshStandardMaterial === true`, color hex `0x2f2f2f`, roughness `0.9`, metalness `0.0`.

---

## 2. Corrected Material Creation and Assignment Using a Cache Pattern

```js
// materialCache.js
import * as THREE from 'three';

const materialCache = new Map();

export function getRoofShinglesMaterial() {
  const KEY = 'RoofShingles';
  if (materialCache.has(KEY)) return materialCache.get(KEY);

  const mat = new THREE.MeshStandardMaterial({
    name: KEY,
    color: 0x2F2F2F,
    roughness: 0.9,
    metalness: 0.0,
  });

  materialCache.set(KEY, mat);
  return mat;
}

export function disposeMaterialCache() {
  for (const mat of materialCache.values()) mat.dispose();
  materialCache.clear();
}
```

---

## 3. Traversing RoofGroup and Applying the Material

```js
// roofBuilder.js
import * as THREE from 'three';
import { getRoofShinglesMaterial } from './materialCache.js';

export function applyRoofMaterial(roofGroup) {
  const shinglesMat = getRoofShinglesMaterial();

  roofGroup.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;

    // Handle multi-material geometry groups
    if (node.geometry.groups && node.geometry.groups.length > 0) {
      node.material = node.geometry.groups.map(() => shinglesMat);
    } else {
      node.material = shinglesMat;
    }

    node.material.needsUpdate = true;
    node.castShadow = true;
    node.receiveShadow = true;
  });
}

// Usage:
const roofGroup = buildRoof(buildingParams);
applyRoofMaterial(roofGroup);
scene.add(roofGroup);
```

`traverse()` reaches all descendants at any nesting depth, unlike `children.forEach()` which only hits direct children. Mapping every geometry group to the same `shinglesMat` reference ensures all face types share one material and one GPU draw call.
