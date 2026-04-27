# Roof Shingles Material Debug — With 3D Preview Agent Skill

Following the 3D Preview Agent skill: `getMaterial()` cache pattern, `MeshStandardMaterial` PBR, `traverse()`, memory management.

---

## 1. Debug Checklist (In Order)

**Step 1 — Verify the material cache has the entry**
```typescript
console.log('Cache has RoofShingles:', materialCache.has('RoofShingles'));
console.log('Material:', materialCache.get('RoofShingles'));
```
If `false`: `getMaterial('RoofShingles', {...})` was never called, or was called with a different key (case mismatch).

**Step 2 — Verify `renderer.info` memory after building geometry**
Per the skill's diagnostic tools:
```typescript
console.log('Geometries:', renderer.info.memory.geometries);
console.log('Textures:',   renderer.info.memory.textures);
console.log('Draw calls:', renderer.info.render.calls);
```
If geometry count looks right but material is gray → material assignment, not geometry.

**Step 3 — Check `castShadow` / `receiveShadow` flags**
Gray-but-lit mesh with the wrong color is a material assignment issue, not a shadow issue. But check anyway:
```typescript
roofGroup.traverse(c => {
  if ((c as THREE.Mesh).isMesh) {
    console.log(c.name, 'mat:', (c as THREE.Mesh).material);
    console.log('  castShadow:', c.castShadow);
  }
});
```

**Step 4 — Check for geometry groups overriding material**
If `mesh.geometry.groups.length > 0`, Three.js indexes into `mesh.material[]`. A single material on a grouped geometry leaves some faces gray.

**Step 5 — Verify the rebuild path disposes the old material**
Per the skill's memory management rule: if `RoofShingles` is re-created on every rebuild without evicting the cache, old material objects accumulate in VRAM. Check that the cache is consulted, not bypassed.

---

## 2. Corrected Material Using `getMaterial()` Cache

Per the skill's exact cache pattern:

```typescript
// materialCache.ts
const materialCache = new Map<string, THREE.Material>();

export function getMaterial(name: string, options: THREE.MeshStandardMaterialParameters): THREE.Material {
  if (materialCache.has(name)) return materialCache.get(name)!;
  const mat = new THREE.MeshStandardMaterial(options);
  mat.name = name;
  materialCache.set(name, mat);
  return mat;
}
```

```typescript
// roofBuilder.ts — corrected usage
const shinglesMat = getMaterial('RoofShingles', {
  color:     0x2F2F2F,   // dark slate
  roughness: 0.9,
  metalness: 0.0,
});
```

**Common bug:** calling `new THREE.MeshStandardMaterial(...)` directly instead of `getMaterial()`. Every rebuild creates a new material object that leaks GPU memory and may not be the same reference as what the mesh already holds.

---

## 3. Traversing `RoofGroup` and Applying Material

```typescript
// roofBuilder.ts
export function applyShinglesMaterial(roofGroup: THREE.Group): void {
  const shinglesMat = getMaterial('RoofShingles', {
    color: 0x2F2F2F,
    roughness: 0.9,
    metalness: 0.0,
  });

  roofGroup.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;

    // Dispose old material before replacing (memory management per skill)
    if (mesh.material && mesh.material !== shinglesMat) {
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(m => m.dispose());
      } else {
        (mesh.material as THREE.Material).dispose();
      }
    }

    // Handle geometry groups — must supply array if groups exist
    if (mesh.geometry.groups.length > 0) {
      mesh.material = mesh.geometry.groups.map(() => shinglesMat);
    } else {
      mesh.material = shinglesMat;
    }

    mesh.castShadow    = true;   // only directional light casts shadows per skill
    mesh.receiveShadow = true;
  });
}
```

---

## 4. Wiring into the Roof Build Sequence

```typescript
const roofGroup = buildRoofGeometry(params);      // builds geometry
roofGroup.name = 'RoofGroup';                     // descriptive name per skill
applyShinglesMaterial(roofGroup);                  // apply material AFTER geometry
scene.getObjectByName('BuildingGroup')!.add(roofGroup);
```

Per the skill: **never mutate the JSON data model from the rendering layer.** Material assignment is a render-layer concern only.
