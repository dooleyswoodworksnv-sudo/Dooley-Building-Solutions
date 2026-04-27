# Walkthrough Camera Preset — Without Skill (Baseline)

## Camera Position and LookAt

Eye height is approximately 5.5 ft = 66 inches. The scene is in inches.

- **Position:** `(0, 66, 10)` — centered left/right, eye height, just inside front wall
- **LookAt:** `(0, 66, 200)` — looking straight into the building

---

## Preset Object

```javascript
const walkthroughPreset = {
  name: 'Walkthrough',
  position: { x: 0, y: 66, z: 10 },
  lookAt:   { x: 0, y: 66, z: 200 },
};
```

---

## Adding to Preset Table

```javascript
const PRESETS = [
  { name: 'Front',     position: [0, 120, 720],    lookAt: [0, 120, 0] },
  { name: 'Top',       position: [0, 960, 0],      lookAt: [0,   0, 0] },
  { name: 'Isometric', position: [480, 360, 480],  lookAt: [0,  60, 0] },
  { name: 'Walkthrough', position: [0, 66, 10],    lookAt: [0,  66, 200] }, // new
];
```

---

## GSAP Transition

```javascript
function goToPreset(camera, controls, preset) {
  gsap.to(camera.position, {
    x: preset.position[0],
    y: preset.position[1],
    z: preset.position[2],
    duration: 1.0,
    ease: 'power2.inOut',
    onUpdate: () => {
      camera.lookAt(preset.lookAt[0], preset.lookAt[1], preset.lookAt[2]);
      controls.update();
    },
  });

  gsap.to(controls.target, {
    x: preset.lookAt[0],
    y: preset.lookAt[1],
    z: preset.lookAt[2],
    duration: 1.0,
    ease: 'power2.inOut',
    onUpdate: () => controls.update(),
  });
}
```

---

## Notes

- FOV can be reduced to 70–90° for a more natural first-person feel indoors
- `maxPolarAngle` on OrbitControls should be relaxed to allow looking up
- Camera near clipping plane should be small (0.1) to avoid clipping interior walls
