const fs = require('fs');
const content = fs.readFileSync('C:/Users/doole/OneDrive/Desktop/Dooleys building solutions/building solutuins 3/src/components/Preview3D.tsx', 'utf8');

let newContent = content.replace(
  'const walls = useMemo(() => {',
  'const { wallList, framingList } = useMemo(() => {'
).replace(
  'const wallList: { x: number, y: number, z: number, w: number, h: number, d: number, color?: string }[] = [];',
  'const wallList: { x: number, y: number, z: number, w: number, h: number, d: number, color?: string }[] = [];\n    const framingList: { x: number, y: number, z: number, w: number, h: number, d: number, color?: string }[] = [];'
);

let extWallMatch = newContent.match(/extWalls\.forEach\(w => \{\s*\/\/ Add core wall/);
if(extWallMatch) {
  let replacement = extWalls.forEach(w => {
        if (solidWallsOnly) {
          wallList.push({ x: w.x, y: currentY, z: w.y, w: w.w, h: currentWallHeight, d: w.h, color: "#e4e4e7" });
        } else {
          const sSpacing = studSpacing || 16;
          const sThick = studThickness || 1.5;
          const plateH = 1.5;
          const bottomPlateTotal = (bottomPlates || 1) * plateH;
          const topPlateTotal = (topPlates || 2) * plateH;
          const studH = currentWallHeight - bottomPlateTotal - topPlateTotal;
          const headerH = headerType === 'lvl' ? 9.25 : (headerType === 'double' ? 5.5 : 5.5);
          const len = w.isHorizontal ? w.w : w.d;
          const depth = w.isHorizontal ? w.d : w.w;
          
          const myOpenings = [];
          doors.filter(d => (d.floorIndex || 0) === floorIndex && d.wall === w.id).forEach(d => {
            const opStart = (d.xFt * 12) + (d.xInches || 0) - (d.widthIn / 2);
            myOpenings.push({ start: opStart, end: opStart + d.widthIn, type: 'door', width: d.widthIn, height: d.heightIn });
          });
          windows.filter(win => (win.floorIndex || 0) === floorIndex && win.wall === w.id).forEach(win => {
            const opStart = (win.xFt * 12) + (win.xInches || 0) - (win.widthIn / 2);
            myOpenings.push({ start: opStart, end: opStart + win.widthIn, type: 'window', width: win.widthIn, height: win.heightIn, sill: win.sillHeightIn });
          });

          for (let p = 0; p < (bottomPlates || 1); p++) {
             framingList.push({ x: w.x, y: currentY + (p * plateH), z: w.y, w: w.w, h: plateH, d: w.h, color: "#d1d5db" });
          }
          for (let p = 0; p < (topPlates || 2); p++) {
             framingList.push({ x: w.x, y: currentY + currentWallHeight - plateH - (p * plateH), z: w.y, w: w.w, h: plateH, d: w.h, color: "#d1d5db" });
          }

          const numStuds = Math.ceil(len / sSpacing) + 1;
          for (let i = 0; i < numStuds; i++) {
             let curPos = Math.min(i * sSpacing, len - sThick);
             let inOpening = false;
             for (const op of myOpenings) {
                if (curPos + sThick > op.start && curPos < op.end) { inOpening = true; break; }
             }
             if (!inOpening) {
               framingList.push({
                 x: w.isHorizontal ? w.x + curPos : w.x,
                 y: currentY + bottomPlateTotal,
                 z: w.isHorizontal ? w.y : w.y + curPos,
                 w: w.isHorizontal ? sThick : depth,
                 h: studH,
                 d: w.isHorizontal ? depth : sThick,
                 color: "#d1d5db"
               });
             }
          }
          
          for (const op of myOpenings) {
             const opY = currentY + bottomPlateTotal + (op.type === 'door' ? op.height : (op.sill + op.height));
             framingList.push({
               x: w.isHorizontal ? w.x + op.start : w.x,
               y: opY, z: w.isHorizontal ? w.y : w.y + op.start,
               w: w.isHorizontal ? op.width : depth, h: headerH, d: w.isHorizontal ? depth : op.width, color: "#9ca3af"
             });
             framingList.push({
               x: w.isHorizontal ? w.x + op.start - sThick : w.x, y: currentY + bottomPlateTotal, z: w.isHorizontal ? w.y : w.y + op.start - sThick,
               w: w.isHorizontal ? sThick : depth, h: opY - currentY - bottomPlateTotal, d: w.isHorizontal ? depth : sThick, color: "#d1d5db"
             });
             framingList.push({
               x: w.isHorizontal ? w.x + op.start + op.width : w.x, y: currentY + bottomPlateTotal, z: w.isHorizontal ? w.y : w.y + op.start + op.width,
               w: w.isHorizontal ? sThick : depth, h: opY - currentY - bottomPlateTotal, d: w.isHorizontal ? depth : sThick, color: "#d1d5db"
             });
          }
        };
  newContent = newContent.replace('extWalls.forEach(w => {\n        // Add core wall\n        wallList.push({ x: w.x, y: currentY, z: w.y, w: w.w, h: currentWallHeight, d: w.h, color: "#e4e4e7" });', replacement);
}

let origPushRegex = /wallList\.push\(\{[\s\S]*?x: finalX, y: currentY, z: finalZ,[\s\S]*?color: "#d4d4d8"\s*\}\);/;
let intWallMatch = newContent.match(origPushRegex);

if(intWallMatch) {
  let origPush = intWallMatch[0];
  let newPush = if (solidWallsOnly) {
            wallList.push({ x: finalX, y: currentY, z: finalZ, w: width, h: currentWallHeight, d: depth, color: "#d4d4d8" });
          } else {
            const len = w.orientation === 'horizontal' ? (w.lengthFt * 12 + w.lengthInches) : (w.lengthFt * 12 + w.lengthInches);
            const sSpacing = studSpacing || 16;
            const sThick = studThickness || 1.5;
            const plateH = 1.5;
            const bottomPlateTotal = (bottomPlates || 1) * plateH;
            const topPlateTotal = (topPlates || 2) * plateH;
            const studH = currentWallHeight - bottomPlateTotal - topPlateTotal;
            const headerH = headerType === 'lvl' ? 9.25 : (headerType === 'double' ? 5.5 : 5.5);
            
            const myOpenings = [];
            doors.filter(d => (d.floorIndex || 0) === floorIndex && d.wall === w.id).forEach(d => {
              const opStart = (d.xFt * 12) + (d.xInches || 0) - (d.widthIn / 2);
              myOpenings.push({ start: opStart, end: opStart + d.widthIn, type: 'door', width: d.widthIn, height: d.heightIn });
            });
            windows.filter(win => (win.floorIndex || 0) === floorIndex && win.wall === w.id).forEach(win => {
              const opStart = (win.xFt * 12) + (win.xInches || 0) - (win.widthIn / 2);
              myOpenings.push({ start: opStart, end: opStart + win.widthIn, type: 'window', width: win.widthIn, height: win.heightIn, sill: win.sillHeightIn });
            });

            for (let p = 0; p < (bottomPlates || 1); p++) {
               framingList.push({ x: finalX, y: currentY + (p * plateH), z: finalZ, w: width, h: plateH, d: depth, color: "#d1d5db" });
            }
            for (let p = 0; p < (topPlates || 2); p++) {
               framingList.push({ x: finalX, y: currentY + currentWallHeight - plateH - (p * plateH), z: finalZ, w: width, h: plateH, d: depth, color: "#d1d5db" });
            }

            const numStuds = Math.ceil(len / sSpacing) + 1;
            for (let i = 0; i < numStuds; i++) {
               let curPos = Math.min(i * sSpacing, len - sThick);
               let inOpening = false;
               for (const op of myOpenings) {
                  if (curPos + sThick > op.start && curPos < op.end) { inOpening = true; break; }
               }
               if (!inOpening) {
                 framingList.push({
                   x: isHorizontal ? finalX + curPos : finalX,
                   y: currentY + bottomPlateTotal,
                   z: isHorizontal ? finalZ : finalZ + curPos,
                   w: isHorizontal ? sThick : depth,
                   h: studH,
                   d: isHorizontal ? depth : sThick,
                   color: "#ccc"
                 });
               }
            }
          };
  newContent = newContent.replace(origPush, newPush);
}

newContent = newContent.replace(
  'return wallList;',
  'return { wallList, framingList };'
);

newContent = newContent.replace(
  ']}, [shape, widthIn, lengthIn, thicknessIn, lRightDepthIn, lBackWidthIn, uWallsIn, exteriorWalls, interiorWalls, bumpouts, wallHeightIn, totalBaseHeight, addSheathing, sheathingThickness, addInsulation, insulationThickness, addDrywall, drywallThickness, additionalStories, upperFloorWallHeightIn, upperFloorJoistSize, addSubfloor, subfloorThickness]);',
  ']}, [shape, widthIn, lengthIn, thicknessIn, lRightDepthIn, lBackWidthIn, uWallsIn, exteriorWalls, interiorWalls, bumpouts, wallHeightIn, totalBaseHeight, addSheathing, sheathingThickness, addInsulation, insulationThickness, addDrywall, drywallThickness, additionalStories, upperFloorWallHeightIn, upperFloorJoistSize, addSubfloor, subfloorThickness, solidWallsOnly, studSpacing, studThickness, bottomPlates, topPlates, headerType, headerHeight, doors, windows]);'
);

newContent = newContent.replace(
  'const allBoxes = [...walls, ...foundation];',
  'const allBoxes = [...walls.wallList, ...foundation];'
);
newContent = newContent.replace(
  '{walls.map((w, i) => {',
  '{walls.wallList.map((w, i) => {'
);

newContent = newContent.replace(
  '{/* Roofs */}',
  {/* Framing System */}
        {walls.framingList.map((p, i) => (
          <mesh key={'fr'+i} position={[p.x + p.w / 2, p.y + p.h / 2, p.z + p.d / 2]} castShadow receiveShadow>
            <boxGeometry args={[p.w, p.h, p.d]} />
            <meshStandardMaterial color={p.color || "#d1d5db"} roughness={0.8} />
          </mesh>
        ))}

        {/* Roofs */}
);

fs.writeFileSync('C:/Users/doole/OneDrive/Desktop/Dooleys building solutions/building solutuins 3/src/components/Preview3D.tsx', newContent);
console.log('done');
