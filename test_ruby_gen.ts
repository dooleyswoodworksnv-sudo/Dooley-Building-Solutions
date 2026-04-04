import { generateSketchUpCode } from './src/utils/sketchupGenerator.ts';
import * as fs from 'fs';

const mockState: any = {
  wallHeightFt: 8,
  wallHeightInches: 0,
  wallThicknessIn: 5.5,
  shape: 'rectangular',
  widthFt: 20,
  widthInches: 0,
  lengthFt: 30,
  lengthInches: 0,
  roofPitch: 6,
  roofOverhangIn: 12,
  trussSpacing: 24,
  bumpouts: [],
  doors: [],
  windows: [],
  interiorWalls: [],
  roofParts: [],
  trussRuns: [{
    id: '1',
    x_in: 0,
    y_in: 0,
    length_in: 360,
    span_in: 240,
    rotation: 0,
    pitch: 6,
    spacing_in: 24,
    type: 'common'
  }],
  uWalls: {},
  hWalls: {},
  tWalls: {},
  exteriorWalls: [],
  blocksToUse: []
};

const code = generateSketchUpCode(mockState as any);
fs.writeFileSync('generated_ruby.rb', code);
