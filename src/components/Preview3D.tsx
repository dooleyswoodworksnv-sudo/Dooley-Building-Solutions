import { GableRoof, HipRoof, ShedRoof, RoofFace } from './Roofs';
import React, { useMemo, Suspense, useState, useEffect } from 'react';
import { Canvas, ThreeEvent, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Center, Environment, ContactShadows, Sky, useGLTF, Line, useTexture } from '@react-three/drei';
import { Geometry, Base, Subtraction } from '@react-three/csg';
import * as THREE from 'three';
import { InteriorWallConfig, ExteriorWallConfig, DoorConfig, WindowConfig, BumpoutConfig, InteriorAsset, RoofPart, TrussConfig, DormerConfig, CustomCamera } from '../App';

interface Preview3DProps {
  shape: 'rectangle' | 'l-shape' | 'u-shape' | 'h-shape' | 't-shape' | 'custom';
  widthIn: number;
  lengthIn: number;
  thicknessIn: number;
  lRightDepthIn: number;
  lBackWidthIn: number;
  uWallsIn: { w1: number; w2: number; w3: number; w4: number; w5: number; w6: number; w7: number; w8: number };
  hLeftBarWidthIn: number;
  hRightBarWidthIn: number;
  hMiddleBarHeightIn: number;
  hMiddleBarOffsetIn: number;
  tTopWidthIn: number;
  tTopLengthIn: number;
  tStemWidthIn: number;
  tStemLengthIn: number;
  interiorWalls: InteriorWallConfig[];
  exteriorWalls: ExteriorWallConfig[];
  doors: DoorConfig[];
  windows: WindowConfig[];
  bumpouts: BumpoutConfig[];
  wallHeightIn: number;
  foundationType: 'none' | 'slab' | 'slab-on-grade' | 'stem-wall';
  foundationShape: 'rectangle' | 'l-shape' | 'u-shape' | 'h-shape' | 't-shape' | 'custom';
  stemWallHeightIn: number;
  stemWallThicknessIn: number;
  footingWidthIn: number;
  footingThicknessIn: number;
  slabThicknessIn: number;
  thickenedEdgeDepthIn: number;
  addFloorFraming: boolean;
  joistSpacing: number;
  joistSize: string;
  joistDirection: 'x' | 'y';
  addSubfloor: boolean;
  subfloorThickness: number;
  subfloorMaterial: 'plywood' | 'osb';
  rimJoistThickness: number;
  addInsulation: boolean;
  insulationThickness: number;
  addSheathing: boolean;
  sheathingThickness: number;
  addDrywall: boolean;
  drywallThickness: number;
  studSpacing: number;
  studThickness: number;
  topPlates: number;
  bottomPlates: number;
  headerType: 'single' | 'double' | 'lvl';
  headerHeight: number;
  solidWallsOnly: boolean;
  noFramingFloorOnly: boolean;
  showGround: boolean;
  showSky: boolean;
  showSun: boolean;
  showRoof: boolean;
  additionalStories: number;
  currentFloorIndex: number;
  upperFloorWallHeightIn: number;
  upperFloorJoistSize: string;
  combinedBlocks: { id: string, x: number, y: number, w: number, h: number }[];
  shapeBlocks: { id: string, x: number, y: number, w: number, h: number }[];
  // 3D Model Reference
  referenceModelUrl: string | null;
  assets: InteriorAsset[];
  modelScale: number;
  modelOffset: { x: number; y: number; z: number };
  modelRotation: { x: number; y: number; z: number };
  modelOpacity: number;
  roofParts: RoofPart[];
  roofType: 'gable' | 'hip' | 'shed' | 'flat';
  roofPitch: number;
  roofOverhangIn: number;
  roofWidthIn: number;
  roofHeightIn: number;
  trussRuns: TrussConfig[];
  trussSpacing: number;
  dormers: DormerConfig[];
  lDirection?: 'front-left' | 'front-right' | 'back-right' | 'back-left';
  customCameras?: CustomCamera[];
  // Material Painter
  appliedMaterials?: Record<string, string>;
  activePaintMaterial?: string | null;
  onSurfacePainted?: (surfaceId: string, textureUrl: string) => void;
}


// ─── Material config type ────────────────────────────────────────────────
export interface MaterialConfig {
  scaleW: number;   // tile width in feet
  scaleH: number;   // tile height in feet
  opacity: number;  // 0 – 100
  lockAspect: boolean;
}

// ─── Texture helper – only called when we have a URL ───────────────────
const TexturedMaterial = ({
  url, roughness = 0.8, config, uvScale,
}: { url: string; roughness?: number; config?: MaterialConfig, uvScale?: [number, number] }) => {
  const texture = useTexture(`http://localhost:3001/api/serve-file?path=${encodeURIComponent(url)}`);
  
  const scopedTexture = React.useMemo(() => {
    if (!uvScale) return texture;
    const cloned = texture.clone();
    cloned.needsUpdate = true;
    return cloned;
  }, [texture, uvScale]);
  
  scopedTexture.wrapS = scopedTexture.wrapT = THREE.RepeatWrapping;
  
  if (uvScale) {
    const rw = Math.max(0.01, uvScale[0] / ((config?.scaleW ?? 5) * 12));
    const rh = Math.max(0.01, uvScale[1] / ((config?.scaleH ?? 5) * 12));
    scopedTexture.repeat.set(rw, rh);
  } else {
    const rw = Math.max(0.01, 1 / ((config?.scaleW ?? 5) * 12));
    const rh = Math.max(0.01, 1 / ((config?.scaleH ?? 5) * 12));
    scopedTexture.repeat.set(rw, rh);
  }

  const opacity = config?.opacity ?? 100;
  return (
    <meshStandardMaterial
      map={scopedTexture}
      roughness={roughness}
      metalness={0.05}
      opacity={opacity / 100}
      transparent={opacity < 100}
    />
  );
};

const SurfaceMaterial = ({
  textureUrl, color, hovered, isPaintMode, roughness, materialConfig, uvScale,
}: {
  textureUrl?: string; color: string; hovered: boolean;
  isPaintMode?: boolean; roughness?: number; materialConfig?: MaterialConfig;
  uvScale?: [number, number];
}) => {
  if (textureUrl) {
    return (
      <Suspense fallback={<meshStandardMaterial color={color} />}>
        <TexturedMaterial url={textureUrl} roughness={roughness ?? 0.8} config={materialConfig} uvScale={uvScale} />
      </Suspense>
    );
  }
  const paintHover = '#86efac';
  const finalColor = isPaintMode && hovered ? paintHover : hovered ? '#a1a1aa' : color;
  return <meshStandardMaterial color={finalColor} roughness={roughness ?? 0.7} metalness={0.1} />;
};

// ─── Material Editor Panel (SketchUp-style) ─────────────────────────────
const MaterialEditorPanel = ({
  onClose,
  activePaintMaterial, onSelectTexture,
  activeSurfaceId, onSurfaceConfigChange, materialConfigs, appliedMaterials,
  onSaveMaterialConfig, onClearBrush,
}: {
  onClose: () => void;
  activePaintMaterial: string | null;
  onSelectTexture: (url: string) => void;
  activeSurfaceId: string | null;
  materialConfigs: Record<string, MaterialConfig>;
  appliedMaterials: Record<string, string>;
  onSurfaceConfigChange: (textureUrl: string, config: MaterialConfig) => void;
  onSaveMaterialConfig: (textureUrl: string, config: MaterialConfig) => void;
  onClearBrush: () => void;
}) => {
  const [assets, setAssets] = React.useState<any[]>([]);
  const [activeTab, setActiveTab] = React.useState<'select' | 'edit'>('select');
  const [saveStatus, setSaveStatus] = React.useState<'idle' | 'saving' | 'saved'>('idle');
  const [hiddenTextures, setHiddenTextures] = React.useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('mat_editor_hidden');
      return new Set(saved ? JSON.parse(saved) : []);
    } catch { return new Set(); }
  });
  const [showHidden, setShowHidden] = React.useState(false);
  const IMAGE_EXTS = /\.(jpg|jpeg|png|webp)$/i;

  React.useEffect(() => {
    fetch(`http://localhost:3001/api/assets?t=${Date.now()}`)
      .then(r => r.json())
      .then(d => {
        if (d.assets) setAssets(d.assets.filter((a: any) => IMAGE_EXTS.test(a.name)));
      })
      .catch(console.error);
  }, []);

  // Which texture is currently painted on the active surface
  const surfaceTexture = activeSurfaceId ? appliedMaterials[activeSurfaceId] : null;
  // Active edit target: prefer the active surface's texture, fallback to brush
  const editTarget = surfaceTexture ?? activePaintMaterial;
  const editConfig: MaterialConfig = editTarget
    ? (materialConfigs[editTarget] ?? { scaleW: 5, scaleH: 5, opacity: 100, lockAspect: true })
    : { scaleW: 5, scaleH: 5, opacity: 100, lockAspect: true };

  const surfaceLabel = (id: string | null) => {
    if (!id) return 'None selected';
    if (id === 'ground') return '🌱 Ground';
    if (id === 'roof') return '🏠 Roof';
    if (id === 'foundation') return '🪨 Foundation';
    if (id === 'floor') return '🪵 Floor Structure';
    if (id === 'floor-finish') return '🏠 Floor Finish';
    if (id.startsWith('roof-')) {
      const parts = id.split('-'); // ['roof', '0', 'slope', 'front'] etc.
      const idx = parseInt(parts[1]) + 1;
      const facePart = parts.slice(2).join(' '); // 'slope front', 'end left', etc.
      const faceLabel: Record<string, string> = {
        'slope left':  'Left Slope',  'slope right': 'Right Slope',
        'slope front': 'Front Slope', 'slope back':  'Back Slope',
        'end front':   'Front Gable', 'end back':    'Back Gable',
        'end left':    'Left Hip',    'end right':   'Right Hip',
        'slope':       'Slope',
      };
      return `🏠 Roof #${idx} — ${faceLabel[facePart] ?? facePart}`;
    }
    if (id.startsWith('ext-wall-')) return `🧱 Ext Wall Face #${parseInt(id.replace('ext-wall-','')) + 1}`;
    if (id.startsWith('int-wall-')) return `🏛 Int Wall Face #${parseInt(id.replace('int-wall-','')) + 1}`;
    if (id.startsWith('drywall-')) return `🔲 Drywall Face #${parseInt(id.replace('drywall-','')) + 1}`;
    return id;
  };

  const handleSave = async () => {
    if (!editTarget) return;
    setSaveStatus('saving');
    onSaveMaterialConfig(editTarget, editConfig);
    setTimeout(() => setSaveStatus('saved'), 400);
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  const updateConfig = (patch: Partial<MaterialConfig>) => {
    if (!editTarget) return;
    const next = { ...editConfig, ...patch };
    if (next.lockAspect && patch.scaleW !== undefined) next.scaleH = patch.scaleW;
    if (next.lockAspect && patch.scaleH !== undefined) next.scaleW = patch.scaleH;
    onSurfaceConfigChange(editTarget, next);
  };

  const feetIn = (ft: number) => {
    const f = Math.floor(ft);
    const i = Math.round((ft - f) * 12);
    return { ft: f, inches: i };
  };

  return (
    <div
      style={{ maxHeight: 'calc(100vh - 5rem)', width: '300px' }}
      className="absolute top-4 left-4 z-20 bg-zinc-900/97 backdrop-blur-md border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
    >
      {/* ── Header ── */}
      <div className="px-4 py-3 border-b border-zinc-700 flex items-center justify-between flex-shrink-0 bg-zinc-950/50">
        <p className="text-white font-bold text-sm tracking-wide">🎨 Material Editor</p>
        <button onClick={onClose} className="text-zinc-400 hover:text-white text-lg leading-none">✕</button>
      </div>

      {/* ── Texture preview ── */}
      <div className="flex-shrink-0 bg-zinc-950 border-b border-zinc-800">
        <div className="flex gap-3 p-3 items-center">
          <div className="w-20 h-20 rounded-lg overflow-hidden border border-zinc-700 bg-zinc-800 flex-shrink-0">
            {editTarget ? (
              <img
                src={`http://localhost:3001/api/serve-file?path=${encodeURIComponent(editTarget)}`}
                alt="preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-600 text-2xl">🖼</div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold truncate">
              {editTarget ? editTarget.split(/[\\/]/).pop() : 'No texture selected'}
            </p>
            <p className="text-zinc-500 text-[10px] mt-1 truncate">{surfaceLabel(activeSurfaceId)}</p>
            {activePaintMaterial && (
              <div className="mt-1.5 px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/40 rounded text-emerald-400 text-[9px] font-bold uppercase tracking-wider inline-block">
                🪣 Painting active
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex border-b border-zinc-700 flex-shrink-0">
        {(['select', 'edit'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
              activeTab === tab
                ? 'text-indigo-400 border-b-2 border-indigo-400 bg-zinc-800/40'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {tab === 'select' ? '🗂 Select' : '✏️ Edit'}
          </button>
        ))}
      </div>

      {/* ── Scrollable body ── */}
      <div className="overflow-y-auto flex-1 min-h-0">

        {/* SELECT TAB — library hint + hidden item manager */}
        {activeTab === 'select' && (
          <div className="p-3 space-y-3">

            {/* Active brush preview if something is selected */}
            {activePaintMaterial ? (
              <div className="bg-zinc-800/60 border border-zinc-700 rounded-xl p-3 flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg overflow-hidden border border-zinc-600 flex-shrink-0">
                  <img
                    src={`http://localhost:3001/api/serve-file?path=${encodeURIComponent(activePaintMaterial)}`}
                    className="w-full h-full object-cover"
                    alt="brush"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-[11px] font-bold truncate">{activePaintMaterial.split(/[\\/]/).pop()}</p>
                  <p className="text-emerald-400 text-[10px] mt-0.5 font-bold">🪣 Brush loaded — click surfaces to paint</p>
                </div>
                <button
                  onClick={onClearBrush}
                  className="text-zinc-500 hover:text-white text-sm leading-none flex-shrink-0"
                  title="Clear brush"
                >✕</button>
              </div>
            ) : (
              /* No brush: show the big hint card */
              <div className="bg-zinc-800/40 border border-dashed border-zinc-600 rounded-xl p-4 text-center">
                <div className="text-3xl mb-2">🖼️</div>
                <p className="text-white text-xs font-bold mb-1">Double-click any texture</p>
                <p className="text-zinc-400 text-[11px] leading-relaxed">
                  Go to the <span className="text-indigo-400 font-bold">Local Library</span> tab, open a folder,
                  then <span className="text-indigo-400 font-bold">double-click</span> any image to load it as your paint brush.
                </p>
              </div>
            )}

            {/* Hidden texture manager — still accessible here */}
            {assets.length > 0 && (
              <div className="border border-zinc-700/60 rounded-xl overflow-hidden">
                <div
                  className="flex items-center justify-between px-3 py-2 bg-zinc-800/40 cursor-pointer hover:bg-zinc-800/70 transition-colors"
                  onClick={() => setShowHidden(v => !v)}
                >
                  <p className="text-zinc-400 text-[10px] uppercase tracking-wider font-bold">
                    Manage hidden textures
                    {hiddenTextures.size > 0 && (
                      <span className="ml-1.5 bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded text-[9px]">{hiddenTextures.size} hidden</span>
                    )}
                  </p>
                  <span className="text-zinc-500 text-xs">{showHidden ? '▴' : '▾'}</span>
                </div>

                {showHidden && (
                  <div className="p-2 space-y-1 max-h-48 overflow-y-auto">
                    {assets.length === 0 ? (
                      <p className="text-zinc-600 text-[10px] text-center py-2">No textures in library.</p>
                    ) : (
                      assets.map((asset, i) => {
                        const url = asset.absolutePath;
                        const isHid = hiddenTextures.has(url);
                        return (
                          <div key={i} className={`flex items-center gap-2 p-1.5 rounded-lg ${
                            isHid ? 'bg-zinc-800/50' : 'hover:bg-zinc-800/30'
                          }`}>
                            <img
                              src={`http://localhost:3001/api/serve-file?path=${encodeURIComponent(url)}`}
                              className={`w-8 h-8 rounded object-cover border border-zinc-700 flex-shrink-0 ${isHid ? 'opacity-40' : ''}`}
                              alt={asset.name}
                            />
                            <span className={`flex-1 text-[10px] truncate ${isHid ? 'text-zinc-500' : 'text-zinc-300'}`}>
                              {asset.name}
                            </span>
                            <button
                              onClick={() => {
                                setHiddenTextures(prev => {
                                  const next = new Set(prev);
                                  if (isHid) next.delete(url); else next.add(url);
                                  localStorage.setItem('mat_editor_hidden', JSON.stringify([...next]));
                                  return next;
                                });
                              }}
                              className={`flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded font-bold transition-colors ${
                                isHid
                                  ? 'text-amber-400 bg-amber-500/10 hover:bg-amber-500/20'
                                  : 'text-zinc-500 hover:text-red-400 hover:bg-red-500/10'
                              }`}
                            >
                              {isHid ? '↩ Unhide' : '✕ Hide'}
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* EDIT TAB */}
        {activeTab === 'edit' && (
          <div className="p-3 space-y-3">
            {!editTarget ? (
              <p className="text-zinc-500 text-xs text-center py-6">
                Select or paint a texture first to edit its properties.
              </p>
            ) : (
              <>
                {/* Scale */}
                <div className="bg-zinc-800/50 rounded-xl p-3 border border-zinc-700">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-zinc-300 text-[11px] font-bold uppercase tracking-wider">Tile Size</p>
                    <button
                      onClick={() => updateConfig({ lockAspect: !editConfig.lockAspect })}
                      title={editConfig.lockAspect ? 'Aspect locked' : 'Aspect free'}
                      className={`text-[11px] px-2 py-0.5 rounded border transition-colors ${
                        editConfig.lockAspect
                          ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
                          : 'border-zinc-600 text-zinc-500'
                      }`}
                    >
                      {editConfig.lockAspect ? '🔗 Linked' : '🔓 Free'}
                    </button>
                  </div>
                  {/* Width */}
                  <div className="mb-2">
                    <label className="text-zinc-500 text-[10px] mb-1 block">↔ Width</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="number" min={0.1} max={100} step={0.5}
                        value={editConfig.scaleW.toFixed(1)}
                        onChange={e => updateConfig({ scaleW: Math.max(0.1, Number(e.target.value)) })}
                        className="w-20 bg-zinc-900 border border-zinc-600 rounded px-2 py-1 text-white text-xs text-center"
                      />
                      <span className="text-zinc-500 text-[10px]">ft</span>
                      <input
                        type="number" min={0} max={11} step={1}
                        value={feetIn(editConfig.scaleW).inches}
                        onChange={e => {
                          const ft = Math.floor(editConfig.scaleW);
                          updateConfig({ scaleW: Math.max(0.1, ft + Number(e.target.value) / 12) });
                        }}
                        className="w-14 bg-zinc-900 border border-zinc-600 rounded px-2 py-1 text-white text-xs text-center"
                      />
                      <span className="text-zinc-500 text-[10px]">in</span>
                    </div>
                  </div>
                  {/* Height */}
                  <div>
                    <label className="text-zinc-500 text-[10px] mb-1 block">↕ Height</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="number" min={0.1} max={100} step={0.5}
                        value={editConfig.scaleH.toFixed(1)}
                        onChange={e => updateConfig({ scaleH: Math.max(0.1, Number(e.target.value)) })}
                        className="w-20 bg-zinc-900 border border-zinc-600 rounded px-2 py-1 text-white text-xs text-center"
                      />
                      <span className="text-zinc-500 text-[10px]">ft</span>
                      <input
                        type="number" min={0} max={11} step={1}
                        value={feetIn(editConfig.scaleH).inches}
                        onChange={e => {
                          const ft = Math.floor(editConfig.scaleH);
                          updateConfig({ scaleH: Math.max(0.1, ft + Number(e.target.value) / 12) });
                        }}
                        className="w-14 bg-zinc-900 border border-zinc-600 rounded px-2 py-1 text-white text-xs text-center"
                      />
                      <span className="text-zinc-500 text-[10px]">in</span>
                    </div>
                  </div>
                </div>

                {/* Opacity */}
                <div className="bg-zinc-800/50 rounded-xl p-3 border border-zinc-700">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-zinc-300 text-[11px] font-bold uppercase tracking-wider">Opacity</p>
                    <span className="text-white text-xs font-mono">{editConfig.opacity}%</span>
                  </div>
                  <input
                    type="range" min={10} max={100} step={5}
                    value={editConfig.opacity}
                    onChange={e => updateConfig({ opacity: Number(e.target.value) })}
                    className="w-full accent-indigo-500"
                  />
                </div>

                {/* Save */}
                <button
                  onClick={handleSave}
                  disabled={saveStatus === 'saving'}
                  className={`w-full py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                    saveStatus === 'saved'
                      ? 'bg-emerald-600 text-white'
                      : saveStatus === 'saving'
                      ? 'bg-zinc-700 text-zinc-400 cursor-wait'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                  }`}
                >
                  {saveStatus === 'saved' ? '✓ Saved to Library' : saveStatus === 'saving' ? 'Saving…' : '💾 Save to Library'}
                </button>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

// ─── Split-aware Wall component ───────────────────────────────────────────
const Wall = ({
  x, y, z, w, h, d, color = "#e4e4e7", openings = [],
  isMeasuring, handleMeasureClick, handleMeasurePointerMove,
  surfaceId, appliedMaterials, activePaintMaterial, onSurfacePainted,
  materialConfigs = {},
  splitAt = 0,
}: {
  x: number; y: number; z: number; w: number; h: number; d: number;
  color?: string;
  openings?: { x: number; y: number; z: number; w: number; h: number; d: number }[];
  isMeasuring?: boolean;
  handleMeasureClick?: (e: any) => void;
  handleMeasurePointerMove?: (e: any) => void;
  surfaceId?: string;
  appliedMaterials?: Record<string, string>;
  activePaintMaterial?: string | null;
  onSurfacePainted?: (id: string, url: string) => void;
  materialConfigs?: Record<string, MaterialConfig>;
  splitAt?: number;
}) => {
  const [hoveredL, setHoveredL] = useState(false);
  const [hoveredU, setHoveredU] = useState(false);
  const isPaintMode = !!activePaintMaterial;

  // Per-face split zones — zone IDs are surfaceId + '-lower' / '-upper'
  const lowerSurfaceId = surfaceId ? surfaceId + '-lower' : undefined;
  const upperSurfaceId = surfaceId ? surfaceId + '-upper' : undefined;

  const doSplit = splitAt > 0 && splitAt < h;
  const lowerH = doSplit ? splitAt : h;
  const upperH = doSplit ? h - splitAt : 0;

  // Look up textures: zone-specific first, then base surfaceId
  const fallbackTexture = appliedMaterials && surfaceId ? appliedMaterials[surfaceId] : undefined;
  const lowerTexture = (appliedMaterials && lowerSurfaceId ? appliedMaterials[lowerSurfaceId] : undefined) ?? fallbackTexture;
  const upperTexture = (appliedMaterials && upperSurfaceId ? appliedMaterials[upperSurfaceId] : undefined) ?? fallbackTexture;

  const getConfig = (texUrl?: string) => texUrl ? materialConfigs[texUrl] : undefined;

  const makeClickHandler = (sid?: string) => (e: any) => {
    e.stopPropagation();
    if (isPaintMode && sid && activePaintMaterial && onSurfacePainted) {
      onSurfacePainted(sid, activePaintMaterial);
    } else if (isMeasuring && handleMeasureClick) {
      handleMeasureClick(e);
    }
  };

  const pointerMove = (e: any) => { if (isMeasuring && handleMeasurePointerMove) handleMeasurePointerMove(e); };

  const ZoneMesh = ({
    zoneY, zoneH, setHov, hov, sid, texUrl,
  }: {
    zoneY: number; zoneH: number; setHov: (v: boolean) => void; hov: boolean;
    sid?: string; texUrl?: string;
  }) => (
    <group position={[x + w / 2, zoneY + zoneH / 2, z + d / 2]}>
      <mesh
        castShadow receiveShadow
        onClick={makeClickHandler(sid)}
        onPointerMove={pointerMove}
        onPointerOver={() => setHov(true)}
        onPointerOut={() => setHov(false)}
      >
        {openings.length > 0 ? (
          <Geometry>
            <Base><boxGeometry args={[w, zoneH, d]} /></Base>
            {openings.map((op, oi) => (
              <Subtraction key={oi}
                position={[
                  op.x - (x + w / 2) + op.w / 2,
                  op.y - (zoneY + zoneH / 2) + op.h / 2,
                  op.z - (z + d / 2) + op.d / 2
                ]}
              >
                <boxGeometry args={[op.w, op.h, op.d]} />
              </Subtraction>
            ))}
          </Geometry>
        ) : (
          <boxGeometry args={[w, zoneH, d]} />
        )}
        <SurfaceMaterial
          textureUrl={texUrl}
          color={color}
          hovered={hov}
          isPaintMode={isPaintMode}
          materialConfig={getConfig(texUrl)}
          uvScale={[Math.max(w, d), zoneH]}
        />
      </mesh>
    </group>
  );

  return (
    <>
      {/* Lower zone (always rendered) */}
      <ZoneMesh zoneY={y} zoneH={lowerH} setHov={setHoveredL} hov={hoveredL}
        sid={doSplit ? lowerSurfaceId : surfaceId}
        texUrl={doSplit ? lowerTexture : fallbackTexture}
      />
      {/* Upper zone (only when split is active) */}
      {doSplit && (
        <ZoneMesh zoneY={y + lowerH} zoneH={upperH} setHov={setHoveredU} hov={hoveredU}
          sid={upperSurfaceId} texUrl={upperTexture}
        />
      )}
      {/* Top-face pink overlay for floor-plan mode */}
      <mesh position={[x + w / 2, y + h + 0.01, z + d / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w, d]} />
        <meshBasicMaterial color="#ffb6c1" side={THREE.DoubleSide} />
      </mesh>
    </>
  );
};


const FoundationPart = ({
  x, y, z, w, h, d, color = "#a1a1aa",
  isMeasuring, handleMeasureClick, handleMeasurePointerMove,
  surfaceId, appliedMaterials, activePaintMaterial, onSurfacePainted,
  materialConfigs = {},
}: {
  x: number; y: number; z: number; w: number; h: number; d: number;
  color?: string;
  isMeasuring?: boolean;
  handleMeasureClick?: (e: any) => void;
  handleMeasurePointerMove?: (e: any) => void;
  surfaceId?: string;
  appliedMaterials?: Record<string, string>;
  activePaintMaterial?: string | null;
  onSurfacePainted?: (id: string, url: string) => void;
  materialConfigs?: Record<string, MaterialConfig>;
}) => {
  const [hovered, setHovered] = useState(false);
  const textureUrl = surfaceId && appliedMaterials ? appliedMaterials[surfaceId] : undefined;
  const materialConfig = textureUrl ? materialConfigs[textureUrl] : undefined;
  const isPaintMode = !!activePaintMaterial;

  return (
    <mesh
      position={[x + w / 2, y + h / 2, z + d / 2]}
      castShadow receiveShadow
      onClick={(e) => {
        e.stopPropagation();
        if (isPaintMode && surfaceId && activePaintMaterial && onSurfacePainted) {
          onSurfacePainted(surfaceId, activePaintMaterial);
        } else if (isMeasuring && handleMeasureClick) {
          handleMeasureClick(e);
        }
      }}
      onPointerMove={(e) => { if (isMeasuring && handleMeasurePointerMove) handleMeasurePointerMove(e); }}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <boxGeometry args={[w, h, d]} />
      <SurfaceMaterial textureUrl={textureUrl} color={color} hovered={hovered} isPaintMode={isPaintMode} roughness={0.9} materialConfig={materialConfig} uvScale={[Math.max(w, d), h]} />
    </mesh>
  );
};

const Ground = ({
  onClick, onPointerMove,
}: {
  onClick: (e: any) => void;
  onPointerMove: (e: any) => void;
}) => {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow
      onClick={onClick}
      onPointerMove={onPointerMove}
    >
      <planeGeometry args={[2000, 2000]} />
      <meshStandardMaterial color="#2d3a1a" roughness={1} />
    </mesh>
  );
};


const Roof = ({
  x, y, z, w, h, d, color = "#71717a", textureUrl, isPaintMode, onPaintClick,
}: {
  x: number; y: number; z: number; w: number; h: number; d: number;
  color?: string;
  textureUrl?: string;
  isPaintMode?: boolean;
  onPaintClick?: () => void;
}) => {
  const [hovered, setHovered] = useState(false);
  return (
    <mesh
      position={[x + w / 2, y + h / 2, z + d / 2]} castShadow receiveShadow
      onClick={(e) => { e.stopPropagation(); if (isPaintMode && onPaintClick) onPaintClick(); }}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <boxGeometry args={[w, h, d]} />
      <SurfaceMaterial textureUrl={textureUrl} color={color} hovered={hovered} isPaintMode={isPaintMode} roughness={0.8} />
    </mesh>
  );
};

const Opening = ({ x, y, z, w, h, d }: { x: number, y: number, z: number, w: number, h: number, d: number }) => {
  return (
    <mesh position={[x + w / 2, y + h / 2, z + d / 2]}>
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial color="#18181b" transparent opacity={0.8} />
    </mesh>
  );
};

const Asset = ({ asset }: { asset: InteriorAsset }) => {
  return (
    <mesh position={[asset.x / 12, 0, asset.y / 12]} rotation={[0, asset.rotation * Math.PI / 180, 0]}>
      <boxGeometry args={[asset.scale * 3, asset.scale * 3, asset.scale * 3]} />
      <meshStandardMaterial color="#a1a1aa" />
    </mesh>
  );
};

const ReferenceModel = ({ url, scale, offset, rotation, opacity }: { url: string, scale: number, offset: {x: number, y: number, z: number}, rotation: {x: number, y: number, z: number}, opacity: number }) => {
  const { scene } = useGLTF(url);
  useMemo(() => {
    scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach(m => { m.transparent = true; m.opacity = opacity; });
          } else {
            mesh.material.transparent = true;
            mesh.material.opacity = opacity;
          }
        }
      }
    });
  }, [scene, opacity]);
  return (
    <primitive object={scene} scale={scale} position={[offset.x, offset.y, offset.z]}
      rotation={[rotation.x * Math.PI / 180, rotation.y * Math.PI / 180, rotation.z * Math.PI / 180]} />
  );
};

const DormerRoof = ({
  x, y, z, w, l, ridgeH, isHoriz, ridgeRatio = 0.5, fascia = 0, color = "#71717a",
  surfaceId, isPaintMode, appliedMaterials = {}, materialConfigs = {}, onSurfacePaintedFn
}: {
  x: number, y: number, z: number, w: number, l: number, ridgeH: number, isHoriz: boolean,
  ridgeRatio?: number, fascia?: number, color?: string,
  surfaceId?: string, isPaintMode?: boolean, 
  appliedMaterials?: Record<string, string>,
  materialConfigs?: Record<string, MaterialConfig>,
  onSurfacePaintedFn?: (faceId: string) => void
}) => {
  const span = isHoriz ? w : l;
  const depth = isHoriz ? l : w;
  
  const pts2D = [
    [0, 0],
    [span, 0],
  ];
  if (fascia > 0) pts2D.push([span, fascia]);
  pts2D.push([span * ridgeRatio, ridgeH + fascia]);
  if (fascia > 0) pts2D.push([0, fascia]);

  const localToWorld = (px: number, py: number, pz: number): [number, number, number] => {
     if (isHoriz) {
        return [x + px, y + py, z + pz];
     } else {
        return [x + pz, y + py, (z + l) - px];
     }
  };

  const frontPts: [number, number, number][] = [];
  const backPts: [number, number, number][] = [];

  pts2D.forEach(p => {
     frontPts.push(localToWorld(p[0], p[1], 0));
     backPts.push(localToWorld(p[0], p[1], depth));
  });

  const backPtsReversed = [...backPts].reverse();

  const fp = (subId: string) => ({
    color,
    isPaintMode,
    onPaintClick: () => onSurfacePaintedFn?.(surfaceId ? `${surfaceId}-${subId}` : subId),
    textureUrl: surfaceId ? appliedMaterials[`${surfaceId}-${subId}`] : undefined,
    materialConfig: surfaceId && appliedMaterials[`${surfaceId}-${subId}`] ? materialConfigs[appliedMaterials[`${surfaceId}-${subId}`]] : undefined
  });

  let vBL, vBR, vFR, vR, vFL;
  if (fascia > 0) {
    [vBL, vBR, vFR, vR, vFL] = [0, 1, 2, 3, 4];
  } else {
    [vBL, vBR, vR] = [0, 1, 2];
    vFR = 1;
    vFL = 0;
  }

  return (
    <group>
      <RoofFace pts={frontPts} {...fp('end-front')} />
      <RoofFace pts={backPtsReversed} {...fp('end-back')} />
      
      <RoofFace pts={[frontPts[vFL], frontPts[vR], backPts[vR], backPts[vFL]]} {...fp('slope-left')} />
      <RoofFace pts={[frontPts[vR], frontPts[vFR], backPts[vFR], backPts[vR]]} {...fp('slope-right')} />
      <RoofFace pts={[frontPts[0], frontPts[1], backPts[1], backPts[0]]} {...fp('underside')} />
      
      {fascia > 0 && (
         <>
           <RoofFace pts={[frontPts[1], frontPts[2], backPts[2], backPts[1]]} {...fp('fascia-right')} />
           <RoofFace pts={[frontPts[4], frontPts[0], backPts[0], backPts[4]]} {...fp('fascia-left')} />
         </>
      )}
    </group>
  );
};

const WebMember = ({ p1, p2, width, thickness }: { p1: [number, number], p2: [number, number], width: number, thickness: number }) => {
  const dx = p2[0] - p1[0];
  const dy = p2[1] - p1[1];
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);
  const cx = (p1[0] + p2[0]) / 2;
  const cy = (p1[1] + p2[1]) / 2;
  
  return (
    <mesh position={[cx, cy, 0]} rotation={[0, 0, angle]} castShadow receiveShadow>
      <boxGeometry args={[length, width, thickness]} />
      <meshStandardMaterial color="#d97706" roughness={0.8} />
    </mesh>
  );
};

const TrussMesh = ({ span, pitch, thickness, position, rotation, cutsLeft, cutsRight, type = 'Fink (W)', customScript }: { span: number, pitch: number, thickness: number, position: [number, number, number], rotation: [number, number, number], cutsLeft?: boolean, cutsRight?: boolean, type?: string, customScript?: string }) => {
  const theta = Math.atan(pitch / 12);
  const overhang = 12; // 12 inches
  const w = 3.5; // 2x4 width
  
  const topChordLength = (span / 2 + overhang) / Math.cos(theta);
  const height = (span / 2) * (pitch / 12);
  
  const tcLeftCx = (-span / 2 - overhang) / 2;
  const tcLeftCy = w + (height - overhang * (pitch / 12)) / 2 + (w / 2) / Math.cos(theta);
  
  const tcRightCx = (span / 2 + overhang) / 2;
  const tcRightCy = w + (height - overhang * (pitch / 12)) / 2 + (w / 2) / Math.cos(theta);

  const getTopChordY = (x: number) => {
    return w + (span / 2 - Math.abs(x)) * Math.tan(theta) + (w / 2) / Math.cos(theta);
  };

  return (
    <group position={position} rotation={rotation}>
      {/* Bottom chord */}
      {type === 'Scissor' ? (
        <>
          <mesh position={[-span / 4, (span / 4) * Math.tan(theta / 2) + w / 2, 0]} rotation={[0, 0, theta / 2]} castShadow receiveShadow>
            <boxGeometry args={[span / 2 / Math.cos(theta/2), w, thickness]} />
            <meshStandardMaterial color="#d97706" roughness={0.8} />
          </mesh>
          <mesh position={[span / 4, (span / 4) * Math.tan(theta / 2) + w / 2, 0]} rotation={[0, 0, -theta / 2]} castShadow receiveShadow>
            <boxGeometry args={[span / 2 / Math.cos(theta/2), w, thickness]} />
            <meshStandardMaterial color="#d97706" roughness={0.8} />
          </mesh>
        </>
      ) : (
        <mesh position={[0, w / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[span, w, thickness]} />
          <meshStandardMaterial color={type === 'custom' ? '#6366f1' : '#d97706'} roughness={0.8} />
        </mesh>
      )}
      
      {/* Left top chord */}
      {!cutsLeft && (
        <mesh 
          position={[tcLeftCx, tcLeftCy, 0]} 
          rotation={[0, 0, theta]} 
          castShadow receiveShadow
        >
          <boxGeometry args={[topChordLength, w, thickness]} />
          <meshStandardMaterial color={type === 'custom' ? '#6366f1' : '#d97706'} roughness={0.8} />
        </mesh>
      )}
      
      {/* Right top chord */}
      {!cutsRight && (
        <mesh 
          position={[tcRightCx, tcRightCy, 0]} 
          rotation={[0, 0, -theta]} 
          castShadow receiveShadow
        >
          <boxGeometry args={[topChordLength, w, thickness]} />
          <meshStandardMaterial color={type === 'custom' ? '#6366f1' : '#d97706'} roughness={0.8} />
        </mesh>
      )}
      
      {/* Webs */}
      {type === 'Fink (W)' && (
        <>
          {!cutsLeft && <WebMember p1={[0, w / 2]} p2={[-span / 4, getTopChordY(-span / 4)]} width={w} thickness={thickness} />}
          {!cutsRight && <WebMember p1={[0, w / 2]} p2={[span / 4, getTopChordY(span / 4)]} width={w} thickness={thickness} />}
          {!cutsLeft && <WebMember p1={[-span / 3, w / 2]} p2={[-span / 4, getTopChordY(-span / 4)]} width={w} thickness={thickness} />}
          {!cutsRight && <WebMember p1={[span / 3, w / 2]} p2={[span / 4, getTopChordY(span / 4)]} width={w} thickness={thickness} />}
        </>
      )}

      {type === 'Howe' && (
        <>
          <WebMember p1={[0, w/2]} p2={[0, getTopChordY(0)]} width={w} thickness={thickness} />
          {!cutsLeft && <WebMember p1={[-span/3, w/2]} p2={[-span/3, getTopChordY(-span/3)]} width={w} thickness={thickness} />}
          {!cutsRight && <WebMember p1={[span/3, w/2]} p2={[span/3, getTopChordY(span/3)]} width={w} thickness={thickness} />}
          {!cutsLeft && <WebMember p1={[-span/3, w/2]} p2={[0, getTopChordY(0)]} width={w} thickness={thickness} />}
          {!cutsRight && <WebMember p1={[span/3, w/2]} p2={[0, getTopChordY(0)]} width={w} thickness={thickness} />}
        </>
      )}

      {type === 'King Post' && (
        <>
          <WebMember p1={[0, w/2]} p2={[0, getTopChordY(0)]} width={w} thickness={thickness} />
        </>
      )}

      {type === 'Scissor' && (
        <>
          <WebMember p1={[0, span/2 * Math.tan(theta/2) + w/2]} p2={[0, getTopChordY(0)]} width={w} thickness={thickness} />
        </>
      )}

      {type === 'custom' && (
        <>
          <WebMember p1={[0, w/2]} p2={[0, getTopChordY(0)]} width={w} thickness={thickness} />
          {!cutsLeft && <WebMember p1={[-span/4, w/2]} p2={[-span/4, getTopChordY(-span/4)]} width={w} thickness={thickness} />}
          {!cutsRight && <WebMember p1={[span/4, w/2]} p2={[span/4, getTopChordY(span/4)]} width={w} thickness={thickness} />}
        </>
      )}
    </group>
  );
};

const CameraController = ({ presetTrigger, targetCenter, distance, customCameras = [] }: { presetTrigger: string | null, targetCenter: [number, number, number], distance: number, customCameras?: CustomCamera[] }) => {
  const { camera, controls } = useThree();
  
  useEffect(() => {
    if (!presetTrigger || !controls) return;
    
    const parts = presetTrigger.split('-');
    const timestamp = parts[0];
    const preset = parts.slice(1).join('-'); // handles multiple hyphenated ids if any
    
    const [cx, cy, cz] = targetCenter;
    const dist = distance * 1.2;

    const customCam = customCameras.find(c => c.id === preset);
    if (customCam) {
      const rotRad = customCam.rotation * (Math.PI / 180);
      const camX = customCam.x * 0.0254;
      const camZ = customCam.y * 0.0254;
      const eyeLevel = cy; // Uses targetCenter's mid-height (often ~4ft off ground inside)
      
      camera.position.set(camX, eyeLevel, camZ);
      
      const targetDist = 100 * 0.0254; // Look 100 inches ahead
      const tgtX = camX + Math.cos(rotRad) * targetDist;
      const tgtZ = camZ + Math.sin(rotRad) * targetDist;
      
      (controls as any).target.set(tgtX, eyeLevel, tgtZ);
      (controls as any).update();
      return;
    }
    
    const distOut = distance * 1.2; // Zoom out slightly outside footprint
    
    // Pan the focal point to the center of the house
    (controls as any).target.set(cx, cy, cz);
    
    // Move the camera
    switch (preset) {
      case 'top':
        camera.position.set(cx, cy + distOut * 1.5, cz + 0.1); // +0.1 Z prevents gimbal lock looking straight down
        break;
      case 'front':
        camera.position.set(cx, cy + distance * 0.3, cz + distOut);
        break;
      case 'back':
        camera.position.set(cx, cy + distance * 0.3, cz - distOut);
        break;
      case 'left':
        camera.position.set(cx - distOut, cy + distance * 0.3, cz);
        break;
      case 'right':
        camera.position.set(cx + distOut, cy + distance * 0.3, cz);
        break;
    }
    
    // Commit the matrix update to OrbitControls
    (controls as any).update();
  }, [presetTrigger, targetCenter, distance, camera, controls]);

  return null;
}

const ClipControls = ({ isFloorPlanView, cutHeight }: { isFloorPlanView: boolean, cutHeight: number }) => {
  const { gl, scene } = useThree();
  
  useEffect(() => {
    gl.localClippingEnabled = true;
    
    // Create a horizontal plane pointing down to slice everything above it
    const plane = new THREE.Plane(new THREE.Vector3(0, -1, 0), cutHeight);
    const planes = isFloorPlanView ? [plane] : [];
    
    // Apply globally
    gl.clippingPlanes = planes;
    
    // Force material instances to accept clipping overrides
    scene.traverse((child: any) => {
      if (child.isMesh && child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((m: any) => {
            m.clippingPlanes = planes;
            m.needsUpdate = true;
          });
        } else {
          child.material.clippingPlanes = planes;
          child.material.needsUpdate = true;
        }
      }
    });

  }, [isFloorPlanView, cutHeight, gl, scene]);
  
  return null;
}

export default function Preview3D({
  shape, widthIn, lengthIn, thicknessIn, lRightDepthIn, lBackWidthIn, uWallsIn,
  hLeftBarWidthIn, hRightBarWidthIn, hMiddleBarHeightIn, hMiddleBarOffsetIn,
  tTopWidthIn, tTopLengthIn, tStemWidthIn, tStemLengthIn,
  interiorWalls, exteriorWalls, doors, windows, bumpouts, wallHeightIn,
  foundationType, foundationShape, stemWallHeightIn, stemWallThicknessIn, footingWidthIn, footingThicknessIn,
  slabThicknessIn, thickenedEdgeDepthIn,
  addFloorFraming, joistSpacing, joistSize, joistDirection, addSubfloor, subfloorThickness, subfloorMaterial, rimJoistThickness,
  addInsulation, insulationThickness, addSheathing, sheathingThickness, addDrywall, drywallThickness,
  studSpacing, studThickness, topPlates, bottomPlates, headerType, headerHeight,
  solidWallsOnly,
  noFramingFloorOnly,
  showGround, showSky, showSun, showRoof,
  additionalStories, currentFloorIndex, upperFloorWallHeightIn, upperFloorJoistSize, combinedBlocks, shapeBlocks,
  referenceModelUrl, modelScale, modelOffset, modelRotation, modelOpacity,
  roofParts, roofType, roofPitch, roofOverhangIn, roofWidthIn, roofHeightIn,
  assets,
  trussRuns, trussSpacing,
  dormers,
  lDirection = 'front-left',
  customCameras = [],
  appliedMaterials: appliedMaterialsProp = {},
  activePaintMaterial: activePaintMaterialProp = null,
  onSurfacePainted,
}: Preview3DProps) {
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [measurePoints, setMeasurePoints] = useState<THREE.Vector3[]>([]);
  const [allMeasurements, setAllMeasurements] = useState<{ points: THREE.Vector3[], distance: number }[]>([]);
  const [currentMousePoint, setCurrentMousePoint] = useState<THREE.Vector3 | null>(null);
  const [axisLock, setAxisLock] = useState<'x' | 'y' | 'z' | null>(null);
  const [measureLabelPos, setMeasureLabelPos] = useState<{ x: number; y: number } | null>(null);
  const [cameraPresetTrigger, setCameraPresetTrigger] = useState<string | null>(null);
  const [isFloorPlanView, setIsFloorPlanView] = useState(false);
  // Material Painter internal state (supports standalone use without App wiring)
  const [localAppliedMaterials, setLocalAppliedMaterials] = useState<Record<string, string>>(appliedMaterialsProp);
  const [localActivePaint, setLocalActivePaint] = useState<string | null>(activePaintMaterialProp);
  const [isPainterOpen, setIsPainterOpen] = useState(false);
  const [activeSurfaceId, setActiveSurfaceId] = useState<string | null>(null);
  const [materialConfigs, setMaterialConfigs] = useState<Record<string, MaterialConfig>>({});
  const [splitHeight, setSplitHeight] = useState(0);

  // Load saved material configs on mount
  React.useEffect(() => {
    fetch('http://localhost:3001/api/material-configs')
      .then(r => r.json())
      .then(d => setMaterialConfigs(d))
      .catch(() => {});
  }, []);

  // Merge external prop overrides
  const activeMaterials = Object.keys(appliedMaterialsProp).length ? appliedMaterialsProp : localAppliedMaterials;
  const activePaint = activePaintMaterialProp ?? localActivePaint;

  const handleSurfacePainted = (surfaceId: string, url: string) => {
    const next = { ...activeMaterials, [surfaceId]: url };
    setLocalAppliedMaterials(next);
    if (onSurfacePainted) onSurfacePainted(surfaceId, url);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isMeasuring) return;
      if (e.key === 'Escape') { setAxisLock(null); return; }
      if (e.key === 'x' || e.key === 'X') setAxisLock(prev => prev === 'x' ? null : 'x');
      if (e.key === 'y' || e.key === 'Y') setAxisLock(prev => prev === 'y' ? null : 'y');
      if (e.key === 'z' || e.key === 'Z') setAxisLock(prev => prev === 'z' ? null : 'z');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMeasuring]);

  // Listen for double-click selections from the Asset Library
  useEffect(() => {
    const handler = (e: Event) => {
      const { url } = (e as CustomEvent).detail;
      if (!url) return;
      setLocalActivePaint(url);
      setIsPainterOpen(true);
    };
    window.addEventListener('dooley:paintTexture', handler);
    return () => window.removeEventListener('dooley:paintTexture', handler);
  }, []);

  
  const lastMeasureClickMs = React.useRef(0);

  // Apply axis lock — only constrains when explicitly locked by user (X/Y/Z keys)
  const applyAxisLock = (start: THREE.Vector3, raw: THREE.Vector3, lock: 'x'|'y'|'z'|null): THREE.Vector3 => {
    const pt = raw.clone();
    if (lock === 'x') { pt.y = start.y; pt.z = start.z; }
    else if (lock === 'y') { pt.x = start.x; pt.z = start.z; }
    else if (lock === 'z') { pt.x = start.x; pt.y = start.y; }
    return pt;
  };

  const handleMeasureClick = (event: any) => {
    if (!isMeasuring) return;
    // Debounce: ignore duplicate events from overlapping meshes within 80ms
    const now = Date.now();
    if (now - lastMeasureClickMs.current < 80) return;
    lastMeasureClickMs.current = now;
    event.stopPropagation();
    const raw = event.point.clone();

    setMeasurePoints(prev => {
      if (prev.length === 0) {
        return [raw];
      } else if (prev.length === 1) {
        const point = applyAxisLock(prev[0], raw, axisLock);
        const dist = prev[0].distanceTo(point) / 0.0254;
        setAllMeasurements(m => [...m, { points: [prev[0], point], distance: dist }]);
        setMeasureLabelPos(null);
        return [];
      } else {
        return [raw];
      }
    });
  };

  const clearMeasurements = () => {
    setAllMeasurements([]);
    setMeasurePoints([]);
    setMeasureLabelPos(null);
  };

  useEffect(() => {
    if (measurePoints.length === 0) setCurrentMousePoint(null);
  }, [measurePoints]);

  const handleMeasurePointerMove = (e: any) => {
    if (!isMeasuring) return;
    const raw = e.point.clone();
    if (measurePoints.length === 1) {
      const point = applyAxisLock(measurePoints[0], raw, axisLock);
      setCurrentMousePoint(point);
    } else {
      setCurrentMousePoint(raw);
    }
  };

  // liveAxis just reflects the explicit user lock (no auto-detection)
  const liveAxis = axisLock;

  const distance = useMemo(() => {
    if (measurePoints.length === 1 && currentMousePoint) {
      return measurePoints[0].distanceTo(currentMousePoint) / 0.0254;
    }
    return null;
  }, [measurePoints, currentMousePoint]);

  const fmtDistance = (inches: number) => {
    const ft = Math.floor(inches / 12);
    const inc = Math.round(inches % 12);
    return inc === 0 ? `${ft}'` : `${ft}' ${inc}"`;
  };

  const axisColor = (axis: 'x'|'y'|'z'|null) => {
    if (axis === 'x') return '#ef4444'; // red
    if (axis === 'z') return '#3b82f6'; // blue
    if (axis === 'y') return '#22c55e'; // green
    return '#ffffff'; // white
  };

  const foundationHeight = useMemo(() => {
    if (foundationType === 'none') return 0;
    if (foundationType === 'slab' || foundationType === 'slab-on-grade') return slabThicknessIn;
    return stemWallHeightIn;
  }, [foundationType, stemWallHeightIn, slabThicknessIn]);

  const joistH = useMemo(() => {
    if (!addFloorFraming) return 0;
    return joistSize === '2x6' ? 5.5 : joistSize === '2x8' ? 7.25 : joistSize === '2x10' ? 9.25 : 11.25;
  }, [addFloorFraming, joistSize]);

  const floorSystemHeight = useMemo(() => {
    return joistH + (addSubfloor ? subfloorThickness : 0);
  }, [joistH, addSubfloor, subfloorThickness]);

  const totalBaseHeight = foundationHeight + floorSystemHeight;

  const walls = useMemo(() => {
    const wallList: { x: number, y: number, z: number, w: number, h: number, d: number, color?: string }[] = [];
    
    const addWallsForStory = (currentY: number, currentWallHeight: number, floorIndex: number) => {
      const isUpper = floorIndex > 0;
      const extWalls: { id: number, x: number, y: number, w: number, h: number, isHorizontal: boolean, exteriorSide: 1 | -1 }[] = [];

      if (shape === 'rectangle') {
        extWalls.push({ id: 1, x: 0, y: 0, w: widthIn, h: thicknessIn, isHorizontal: true, exteriorSide: -1 });
        extWalls.push({ id: 3, x: 0, y: lengthIn - thicknessIn, w: widthIn, h: thicknessIn, isHorizontal: true, exteriorSide: 1 });
        extWalls.push({ id: 4, x: 0, y: thicknessIn, w: thicknessIn, h: lengthIn - 2 * thicknessIn, isHorizontal: false, exteriorSide: -1 });
        extWalls.push({ id: 2, x: widthIn - thicknessIn, y: thicknessIn, w: thicknessIn, h: lengthIn - 2 * thicknessIn, isHorizontal: false, exteriorSide: 1 });
      } else if (shape === 'l-shape') {
        extWalls.push({ id: 1, x: 0, y: 0, w: widthIn, h: thicknessIn, isHorizontal: true, exteriorSide: -1 });
        extWalls.push({ id: 2, x: widthIn - thicknessIn, y: thicknessIn, w: thicknessIn, h: lRightDepthIn - thicknessIn, isHorizontal: false, exteriorSide: 1 });
        extWalls.push({ id: 3, x: lBackWidthIn - thicknessIn, y: lRightDepthIn - thicknessIn, w: widthIn - lBackWidthIn, h: thicknessIn, isHorizontal: true, exteriorSide: 1 });
        extWalls.push({ id: 4, x: lBackWidthIn - thicknessIn, y: lRightDepthIn, w: thicknessIn, h: lengthIn - lRightDepthIn - thicknessIn, isHorizontal: false, exteriorSide: 1 });
        extWalls.push({ id: 5, x: 0, y: lengthIn - thicknessIn, w: lBackWidthIn, h: thicknessIn, isHorizontal: true, exteriorSide: 1 });
        extWalls.push({ id: 6, x: 0, y: thicknessIn, w: thicknessIn, h: lengthIn - 2 * thicknessIn, isHorizontal: false, exteriorSide: -1 });
      } else if (shape === 'u-shape') {
        extWalls.push({ id: 1, x: 0, y: 0, w: uWallsIn.w1, h: thicknessIn, isHorizontal: true, exteriorSide: -1 });
        extWalls.push({ id: 2, x: uWallsIn.w1 - thicknessIn, y: thicknessIn, w: thicknessIn, h: uWallsIn.w2 - thicknessIn, isHorizontal: false, exteriorSide: 1 });
        extWalls.push({ id: 3, x: uWallsIn.w1 - uWallsIn.w3, y: uWallsIn.w2 - thicknessIn, w: uWallsIn.w3 - thicknessIn, h: thicknessIn, isHorizontal: true, exteriorSide: 1 });
        extWalls.push({ id: 4, x: uWallsIn.w1 - uWallsIn.w3, y: uWallsIn.w2 - uWallsIn.w4, w: thicknessIn, h: uWallsIn.w4 - thicknessIn, isHorizontal: false, exteriorSide: -1 });
        extWalls.push({ id: 5, x: uWallsIn.w7 - thicknessIn, y: uWallsIn.w2 - uWallsIn.w4 - thicknessIn, w: uWallsIn.w5 + 2 * thicknessIn, h: thicknessIn, isHorizontal: true, exteriorSide: 1 });
        extWalls.push({ id: 6, x: uWallsIn.w7 - thicknessIn, y: uWallsIn.w8 - uWallsIn.w6, w: thicknessIn, h: uWallsIn.w6 - thicknessIn, isHorizontal: false, exteriorSide: 1 });
        extWalls.push({ id: 7, x: 0, y: uWallsIn.w8 - thicknessIn, w: uWallsIn.w7, h: thicknessIn, isHorizontal: true, exteriorSide: 1 });
        extWalls.push({ id: 8, x: 0, y: thicknessIn, w: thicknessIn, h: uWallsIn.w8 - 2 * thicknessIn, isHorizontal: false, exteriorSide: -1 });
      } else if (shape === 'h-shape') {
        // Left Bar
        extWalls.push({ id: 1, x: 0, y: 0, w: hLeftBarWidthIn, h: thicknessIn, isHorizontal: true, exteriorSide: -1 });
        extWalls.push({ id: 2, x: hLeftBarWidthIn - thicknessIn, y: thicknessIn, w: thicknessIn, h: hMiddleBarOffsetIn - thicknessIn, isHorizontal: false, exteriorSide: 1 });
        extWalls.push({ id: 3, x: hLeftBarWidthIn - thicknessIn, y: hMiddleBarOffsetIn + hMiddleBarHeightIn, w: thicknessIn, h: lengthIn - (hMiddleBarOffsetIn + hMiddleBarHeightIn) - thicknessIn, isHorizontal: false, exteriorSide: 1 });
        extWalls.push({ id: 4, x: 0, y: lengthIn - thicknessIn, w: hLeftBarWidthIn, h: thicknessIn, isHorizontal: true, exteriorSide: 1 });
        extWalls.push({ id: 5, x: 0, y: thicknessIn, w: thicknessIn, h: lengthIn - 2 * thicknessIn, isHorizontal: false, exteriorSide: -1 });
        // Middle Bar
        extWalls.push({ id: 6, x: hLeftBarWidthIn, y: hMiddleBarOffsetIn, w: widthIn - hLeftBarWidthIn - hRightBarWidthIn, h: thicknessIn, isHorizontal: true, exteriorSide: -1 });
        extWalls.push({ id: 7, x: hLeftBarWidthIn, y: hMiddleBarOffsetIn + hMiddleBarHeightIn - thicknessIn, w: widthIn - hLeftBarWidthIn - hRightBarWidthIn, h: thicknessIn, isHorizontal: true, exteriorSide: 1 });
        // Right Bar
        extWalls.push({ id: 8, x: widthIn - hRightBarWidthIn, y: 0, w: hRightBarWidthIn, h: thicknessIn, isHorizontal: true, exteriorSide: -1 });
        extWalls.push({ id: 9, x: widthIn - hRightBarWidthIn, y: thicknessIn, w: thicknessIn, h: hMiddleBarOffsetIn - thicknessIn, isHorizontal: false, exteriorSide: -1 });
        extWalls.push({ id: 10, x: widthIn - hRightBarWidthIn, y: hMiddleBarOffsetIn + hMiddleBarHeightIn, w: thicknessIn, h: lengthIn - (hMiddleBarOffsetIn + hMiddleBarHeightIn) - thicknessIn, isHorizontal: false, exteriorSide: -1 });
        extWalls.push({ id: 11, x: widthIn - hRightBarWidthIn, y: lengthIn - thicknessIn, w: hRightBarWidthIn, h: thicknessIn, isHorizontal: true, exteriorSide: 1 });
        extWalls.push({ id: 12, x: widthIn - thicknessIn, y: thicknessIn, w: thicknessIn, h: lengthIn - 2 * thicknessIn, isHorizontal: false, exteriorSide: 1 });
      } else if (shape === 't-shape') {
        const stemX = (tTopWidthIn - tStemWidthIn) / 2;
        // Top Bar
        extWalls.push({ id: 1, x: 0, y: 0, w: tTopWidthIn, h: thicknessIn, isHorizontal: true, exteriorSide: -1 });
        extWalls.push({ id: 2, x: tTopWidthIn - thicknessIn, y: thicknessIn, w: thicknessIn, h: tTopLengthIn - 2 * thicknessIn, isHorizontal: false, exteriorSide: 1 });
        extWalls.push({ id: 3, x: stemX + tStemWidthIn, y: tTopLengthIn - thicknessIn, w: tTopWidthIn - (stemX + tStemWidthIn), h: thicknessIn, isHorizontal: true, exteriorSide: 1 });
        extWalls.push({ id: 4, x: 0, y: tTopLengthIn - thicknessIn, w: stemX, h: thicknessIn, isHorizontal: true, exteriorSide: 1 });
        extWalls.push({ id: 5, x: 0, y: thicknessIn, w: thicknessIn, h: tTopLengthIn - 2 * thicknessIn, isHorizontal: false, exteriorSide: -1 });
        // Stem
        extWalls.push({ id: 6, x: stemX, y: tTopLengthIn, w: thicknessIn, h: tStemLengthIn - thicknessIn, isHorizontal: false, exteriorSide: -1 });
        extWalls.push({ id: 7, x: stemX + tStemWidthIn - thicknessIn, y: tTopLengthIn, w: thicknessIn, h: tStemLengthIn - thicknessIn, isHorizontal: false, exteriorSide: 1 });
        extWalls.push({ id: 8, x: stemX, y: tTopLengthIn + tStemLengthIn - thicknessIn, w: tStemWidthIn, h: thicknessIn, isHorizontal: true, exteriorSide: 1 });
      } else if (shape === 'custom') {
        const blocksToUse = (combinedBlocks && combinedBlocks.length > 0) ? combinedBlocks : shapeBlocks;
        blocksToUse.forEach((block, index) => {
          const baseId = (index + 1) * 100;
          // Top
          extWalls.push({ id: baseId + 1, x: block.x, y: block.y, w: block.w, h: thicknessIn, isHorizontal: true, exteriorSide: -1 });
          // Bottom
          extWalls.push({ id: baseId + 2, x: block.x, y: block.y + block.h - thicknessIn, w: block.w, h: thicknessIn, isHorizontal: true, exteriorSide: 1 });
          // Left
          extWalls.push({ id: baseId + 3, x: block.x, y: block.y + thicknessIn, w: thicknessIn, h: block.h - 2 * thicknessIn, isHorizontal: false, exteriorSide: -1 });
          // Right
          extWalls.push({ id: baseId + 4, x: block.x + block.w - thicknessIn, y: block.y + thicknessIn, w: thicknessIn, h: block.h - 2 * thicknessIn, isHorizontal: false, exteriorSide: 1 });
        });
      }

      exteriorWalls.filter(w => (w.floorIndex || 0) === floorIndex).forEach(wall => {
        const x = wall.xFt * 12 + wall.xInches;
        const y = wall.yFt * 12 + wall.yInches;
        const len = wall.lengthFt * 12 + wall.lengthInches;
        const isHorizontal = wall.orientation === 'horizontal';
        
        let w = isHorizontal ? len : wall.thicknessIn;
        let h = isHorizontal ? wall.thicknessIn : len;
        let finalX = x;
        let finalY = y;

        if (w < 0) {
          finalX += w;
          w = Math.abs(w);
        }
        if (h < 0) {
          finalY += h;
          h = Math.abs(h);
        }

        if (isHorizontal) {
          if (wall.exteriorSide === 1) finalY -= wall.thicknessIn;
        } else {
          if (wall.exteriorSide === 1) finalX -= wall.thicknessIn;
        }

        extWalls.push({
          id: wall.id,
          x: finalX,
          y: finalY,
          w,
          h,
          isHorizontal,
          exteriorSide: wall.exteriorSide
        });
      });

      // Add exterior walls to 3D list
      extWalls.forEach(w => {
        // Add core wall
        wallList.push({ x: w.x, y: currentY, z: w.y, w: w.w, h: currentWallHeight, d: w.h, color: "#e4e4e7" });
        
        if (addFloorFraming && addSheathing && !solidWallsOnly) {
          const shT = sheathingThickness;
          if (w.isHorizontal) {
            const sy = w.exteriorSide === 1 ? w.y + thicknessIn : w.y - shT;
            wallList.push({ x: w.x, y: currentY, z: sy, w: w.w, h: currentWallHeight, d: shT, color: "#c4a484" });
          } else {
            const sx = w.exteriorSide === 1 ? w.x + thicknessIn : w.x - shT;
            wallList.push({ x: sx, y: currentY, z: w.y, w: shT, h: currentWallHeight, d: w.h, color: "#c4a484" });
          }
        }

        if (addFloorFraming && addInsulation && !solidWallsOnly) {
          const inT = Math.min(insulationThickness, thicknessIn - 0.5);
          const offset = (thicknessIn - inT) / 2;
          if (w.isHorizontal) {
            wallList.push({ x: w.x, y: currentY, z: w.y + offset, w: w.w, h: currentWallHeight, d: inT, color: "#f472b6" });
          } else {
            wallList.push({ x: w.x + offset, y: currentY, z: w.y, w: inT, h: currentWallHeight, d: w.h, color: "#f472b6" });
          }
        }

        if (addFloorFraming && addDrywall && !solidWallsOnly) {
          const dwT = drywallThickness;
          if (w.isHorizontal) {
            const sy = w.exteriorSide === 1 ? w.y - dwT : w.y + thicknessIn;
            wallList.push({ x: w.x, y: currentY, z: sy, w: w.w, h: currentWallHeight, d: dwT, color: "#ffffff" });
          } else {
            const sx = w.exteriorSide === 1 ? w.x - dwT : w.x + thicknessIn;
            wallList.push({ x: sx, y: currentY, z: w.y, w: dwT, h: currentWallHeight, d: w.h, color: "#ffffff" });
          }
        }

        // Interior drywall face in solid-walls-only (no framing) mode — separate paintable surface
        if (solidWallsOnly) {
          const dwT = drywallThickness || 0.5;
          if (w.isHorizontal) {
            const sy = w.exteriorSide === 1 ? w.y - dwT : w.y + thicknessIn;
            wallList.push({ x: w.x, y: currentY, z: sy, w: w.w, h: currentWallHeight, d: dwT, color: "#ffffff" });
          } else {
            const sx = w.exteriorSide === 1 ? w.x - dwT : w.x + thicknessIn;
            wallList.push({ x: sx, y: currentY, z: w.y, w: dwT, h: currentWallHeight, d: w.h, color: "#ffffff" });
          }
        }
      });


      interiorWalls.filter(w => (w.floorIndex || 0) === floorIndex).forEach(w => {
          const x = w.xFt * 12 + w.xInches;
          const z = w.yFt * 12 + w.yInches;
          const len = w.lengthFt * 12 + w.lengthInches;
          const isHorizontal = w.orientation === 'horizontal';
          
          let width = isHorizontal ? len : w.thicknessIn;
          let depth = isHorizontal ? w.thicknessIn : len;
          let finalX = x;
          let finalZ = z;

          if (width < 0) {
            finalX += width;
            width = Math.abs(width);
          }
          if (depth < 0) {
            finalZ += depth;
            depth = Math.abs(depth);
          }

          wallList.push({
            x: finalX, y: currentY, z: finalZ,
            w: width,
            h: currentWallHeight,
            d: depth,
            color: "#d4d4d8"
          });

          if (addFloorFraming && addInsulation && !solidWallsOnly) {
            const inT = Math.min(insulationThickness, w.thicknessIn - 0.5);
            const offset = (w.thicknessIn - inT) / 2;
            wallList.push({
              x: isHorizontal ? finalX : finalX + offset,
              y: currentY,
              z: isHorizontal ? finalZ + offset : finalZ,
              w: isHorizontal ? width : inT,
              h: currentWallHeight,
              d: isHorizontal ? inT : depth,
              color: "#f472b6"
            });
          }

          if (addFloorFraming && addDrywall && !solidWallsOnly) {
            const dwT = drywallThickness;
            if (isHorizontal) {
              wallList.push({ x: finalX, y: currentY, z: finalZ - dwT, w: width, h: currentWallHeight, d: dwT, color: "#ffffff" });
              wallList.push({ x: finalX, y: currentY, z: finalZ + w.thicknessIn, w: width, h: currentWallHeight, d: dwT, color: "#ffffff" });
            } else {
              wallList.push({ x: finalX - dwT, y: currentY, z: finalZ, w: dwT, h: currentWallHeight, d: depth, color: "#ffffff" });
              wallList.push({ x: finalX + w.thicknessIn, y: currentY, z: finalZ, w: dwT, h: currentWallHeight, d: depth, color: "#ffffff" });
            }
          }
        });

        bumpouts.filter(b => (b.floorIndex || 0) === floorIndex).forEach(b => {
          const wallId = b.wall;
          const extWall = extWalls.find(w => w.id === wallId);
          if (!extWall) return;

          const bx = b.xFt * 12 + b.xInches;
          const bw = b.widthIn;
          const bd = b.depthIn;
          const t = thicknessIn;

          if (extWall.isHorizontal) {
            const sy = extWall.exteriorSide === 1 ? extWall.y : extWall.y - bd + t;
            // Left wall
            wallList.push({ x: extWall.x + bx, y: currentY, z: sy, w: t, h: currentWallHeight, d: bd, color: "#e4e4e7" });
            // Right wall
            wallList.push({ x: extWall.x + bx + bw - t, y: currentY, z: sy, w: t, h: currentWallHeight, d: bd, color: "#e4e4e7" });
            // Front wall
            wallList.push({ x: extWall.x + bx, y: currentY, z: extWall.y + extWall.exteriorSide * (bd - t), w: bw, h: currentWallHeight, d: t, color: "#e4e4e7" });
          } else {
            const sx = extWall.exteriorSide === 1 ? extWall.x : extWall.x - bd + t;
            // Left wall
            wallList.push({ x: sx, y: currentY, z: extWall.y + bx, w: bd, h: currentWallHeight, d: t, color: "#e4e4e7" });
            // Right wall
            wallList.push({ x: sx, y: currentY, z: extWall.y + bx + bw - t, w: bd, h: currentWallHeight, d: t, color: "#e4e4e7" });
            // Front wall
            wallList.push({ x: extWall.x + extWall.exteriorSide * (bd - t), y: currentY, z: extWall.y + bx, w: t, h: currentWallHeight, d: bw, color: "#e4e4e7" });
          }
        });
    };

    // 1st Floor
    if (currentFloorIndex === 0) {
      addWallsForStory(totalBaseHeight, wallHeightIn, 0);
    }

    // Upper Floors
    let currentZ = totalBaseHeight + wallHeightIn;
    for (let i = 0; i < additionalStories; i++) {
      const upperJoistH = upperFloorJoistSize === '2x6' ? 5.5 : upperFloorJoistSize === '2x8' ? 7.25 : upperFloorJoistSize === '2x10' ? 9.25 : 11.25;
      const upperFloorSystemH = upperJoistH + (addSubfloor ? subfloorThickness : 0);
      currentZ += upperFloorSystemH;
      
      if (currentFloorIndex === i + 1) {
        addWallsForStory(currentZ, upperFloorWallHeightIn, i + 1);
      }
      
      currentZ += upperFloorWallHeightIn;
    }

    return wallList;
  }, [shape, widthIn, lengthIn, thicknessIn, lRightDepthIn, lBackWidthIn, uWallsIn, exteriorWalls, interiorWalls, bumpouts, wallHeightIn, totalBaseHeight, addSheathing, sheathingThickness, addInsulation, insulationThickness, addDrywall, drywallThickness, additionalStories, upperFloorWallHeightIn, upperFloorJoistSize, addSubfloor, subfloorThickness, currentFloorIndex]);

  const roofs = useMemo(() => {
    const totalWallHeight = wallHeightIn + (additionalStories * upperFloorWallHeightIn);
    const roofY = totalBaseHeight + totalWallHeight;
    
    return roofParts.map(part => {
      const pitchFactor = part.pitch / 12;
      const maxDim = Math.max(part.widthIn, part.lengthIn);
      const ridgeHeight = (maxDim / 2) * pitchFactor;
      
      return {
        type: part.type,
        x: part.x,
        y: roofY,
        z: part.y,
        width: part.widthIn,
        length: part.lengthIn,
        ridgeHeight: ridgeHeight > 0 ? ridgeHeight : 0.1,
        overhang: 12, // Default overhang
        color: "#71717a",
        ridgeDirection: part.ridgeDirection
      };
    });
  }, [roofParts, totalBaseHeight, wallHeightIn, additionalStories, upperFloorWallHeightIn]);

  const foundation = useMemo(() => {
    if (currentFloorIndex !== 0) return [];
    if (foundationType === 'none') return [];
    const parts: { x: number, y: number, z: number, w: number, h: number, d: number, color?: string }[] = [];

    const drawFoundationPart = (start_x: number, start_z: number, length: number, depth: number, is_x_dir: boolean) => {
      if (foundationType === 'stem-wall') {
        const sw_z = 0;
        const sw_h = stemWallHeightIn;
        const sw_t = stemWallThicknessIn;
        
        const ft_z = sw_z - footingThicknessIn;
        const ft_h = footingThicknessIn;
        const ft_w = footingWidthIn;
        
        if (is_x_dir) {
          const sw_y = start_z + (depth - sw_t) / 2.0;
          parts.push({ x: start_x, y: sw_z, z: sw_y, w: length, h: sw_h, d: sw_t, color: "#a1a1aa" });
          
          const ft_y = start_z + (depth - ft_w) / 2.0;
          parts.push({ x: start_x, y: ft_z, z: ft_y, w: length, h: ft_h, d: ft_w, color: "#71717a" });
        } else {
          const sw_x = start_x + (depth - sw_t) / 2.0;
          parts.push({ x: sw_x, y: sw_z, z: start_z, w: sw_t, h: sw_h, d: length, color: "#a1a1aa" });
          
          const ft_x = start_x + (depth - ft_w) / 2.0;
          parts.push({ x: ft_x, y: ft_z, z: start_z, w: ft_w, h: ft_h, d: length, color: "#71717a" });
        }
      } else if (foundationType === 'slab' || foundationType === 'slab-on-grade') {
        const slab_h = slabThicknessIn;
        const edge_d = thickenedEdgeDepthIn;
        const edge_w = 12; // Default thickened edge width
        
        if (is_x_dir) {
          // Main slab part for this section
          parts.push({ x: start_x, y: 0, z: start_z, w: length, h: slab_h, d: depth, color: "#a1a1aa" });
          
          // Thickened edge (integral footing) - ONLY for slab-on-grade
          if (foundationType === 'slab-on-grade') {
            const edge_y = start_z + (depth - edge_w) / 2.0;
            parts.push({ x: start_x, y: -edge_d + slab_h, z: edge_y, w: length, h: edge_d - slab_h, d: edge_w, color: "#71717a" });
          }
        } else {
          parts.push({ x: start_x, y: 0, z: start_z, w: depth, h: slab_h, d: length, color: "#a1a1aa" });
          
          if (foundationType === 'slab-on-grade') {
            const edge_x = start_x + (depth - edge_w) / 2.0;
            parts.push({ x: edge_x, y: -edge_d + slab_h, z: start_z, w: edge_w, h: edge_d - slab_h, d: length, color: "#71717a" });
          }
        }
      }
    };

    // Perimeter - ONLY for stem-wall to avoid redundancy with slab
    const t = thicknessIn;
    if (foundationType === 'stem-wall') {
      if (foundationShape === 'rectangle') {
        drawFoundationPart(0, 0, widthIn, t, true);
        drawFoundationPart(0, lengthIn - t, widthIn, t, true);
        drawFoundationPart(0, t, lengthIn - 2 * t, t, false);
        drawFoundationPart(widthIn - t, t, lengthIn - 2 * t, t, false);
      } else if (foundationShape === 'l-shape') {
        drawFoundationPart(0, 0, widthIn, t, true);
        drawFoundationPart(widthIn - t, t, lRightDepthIn - t, t, false);
        drawFoundationPart(lBackWidthIn, lRightDepthIn - t, widthIn - lBackWidthIn - t, t, true);
        drawFoundationPart(lBackWidthIn, lRightDepthIn, lengthIn - lRightDepthIn - t, t, false);
        drawFoundationPart(0, lengthIn - t, lBackWidthIn + t, t, true);
        drawFoundationPart(0, t, lengthIn - 2 * t, t, false);
      } else if (foundationShape === 'u-shape') {
        drawFoundationPart(0, 0, uWallsIn.w1, t, true);
        drawFoundationPart(uWallsIn.w1 - t, t, uWallsIn.w2 - t, t, false);
        drawFoundationPart(uWallsIn.w1 - uWallsIn.w3, uWallsIn.w2 - t, uWallsIn.w3 - t, t, true);
        drawFoundationPart(uWallsIn.w1 - uWallsIn.w3, uWallsIn.w2 - uWallsIn.w4, uWallsIn.w4 - t, t, false);
        drawFoundationPart(uWallsIn.w7 - t, uWallsIn.w2 - uWallsIn.w4 - t, uWallsIn.w5 + 2 * t, t, true);
        drawFoundationPart(uWallsIn.w7 - t, uWallsIn.w8 - uWallsIn.w6, uWallsIn.w6 - t, t, false);
        drawFoundationPart(0, uWallsIn.w8 - t, uWallsIn.w7, t, true);
        drawFoundationPart(0, t, uWallsIn.w8 - 2 * t, t, false);
      } else if (foundationShape === 'h-shape') {
        drawFoundationPart(0, 0, hLeftBarWidthIn, t, true);
        drawFoundationPart(hLeftBarWidthIn - t, t, hMiddleBarOffsetIn - t, t, false);
        drawFoundationPart(hLeftBarWidthIn - t, hMiddleBarOffsetIn + hMiddleBarHeightIn, lengthIn - (hMiddleBarOffsetIn + hMiddleBarHeightIn) - t, t, false);
        drawFoundationPart(0, lengthIn - t, hLeftBarWidthIn, t, true);
        drawFoundationPart(0, t, lengthIn - 2 * t, t, false);
        drawFoundationPart(hLeftBarWidthIn, hMiddleBarOffsetIn, widthIn - hLeftBarWidthIn - hRightBarWidthIn, t, true);
        drawFoundationPart(hLeftBarWidthIn, hMiddleBarOffsetIn + hMiddleBarHeightIn - t, widthIn - hLeftBarWidthIn - hRightBarWidthIn, t, true);
        drawFoundationPart(widthIn - hRightBarWidthIn, 0, hRightBarWidthIn, t, true);
        drawFoundationPart(widthIn - hRightBarWidthIn, t, hMiddleBarOffsetIn - t, t, false);
        drawFoundationPart(widthIn - hRightBarWidthIn, hMiddleBarOffsetIn + hMiddleBarHeightIn, lengthIn - (hMiddleBarOffsetIn + hMiddleBarHeightIn) - t, t, false);
        drawFoundationPart(widthIn - hRightBarWidthIn, lengthIn - t, hRightBarWidthIn, t, true);
        drawFoundationPart(widthIn - t, t, lengthIn - 2 * t, t, false);
      } else if (foundationShape === 't-shape') {
        const stemX = (tTopWidthIn - tStemWidthIn) / 2;
        drawFoundationPart(0, 0, tTopWidthIn, t, true);
        drawFoundationPart(tTopWidthIn - t, t, tTopLengthIn - 2 * t, t, false);
        drawFoundationPart(stemX + tStemWidthIn, tTopLengthIn - t, tTopWidthIn - (stemX + tStemWidthIn), t, true);
        drawFoundationPart(0, tTopLengthIn - t, stemX, t, true);
        drawFoundationPart(0, t, tTopLengthIn - 2 * t, t, false);
        drawFoundationPart(stemX, tTopLengthIn, tStemLengthIn - t, t, false);
        drawFoundationPart(stemX + tStemWidthIn - t, tTopLengthIn, tStemLengthIn - t, t, false);
        drawFoundationPart(stemX, tTopLengthIn + tStemLengthIn - t, tStemWidthIn, t, true);
      } else if (foundationShape === 'custom') {
        const blocksToUse = (combinedBlocks && combinedBlocks.length > 0) ? combinedBlocks : shapeBlocks;
        blocksToUse.forEach(block => {
          drawFoundationPart(block.x, block.y, block.w, block.h, true);
        });
      }
      
      // Custom walls foundation
      exteriorWalls.forEach(wall => {
        const x = wall.xFt * 12 + wall.xInches;
        const z = wall.yFt * 12 + wall.yInches;
        const len = wall.lengthFt * 12 + wall.lengthInches;
        drawFoundationPart(x, z, len, wall.thicknessIn, wall.orientation === 'horizontal');
      });
    }

    // Additional foundation for custom walls (for both stem-wall and slab types)
    // We already handled exteriorWalls inside stem-wall block for stem-wall specific parts,
    // but for slab it was missing. Let's make it consistent.
    if (foundationType === 'slab' || foundationType === 'slab-on-grade') {
      exteriorWalls.forEach(wall => {
        const x = wall.xFt * 12 + wall.xInches;
        const z = wall.yFt * 12 + wall.yInches;
        const len = wall.lengthFt * 12 + wall.lengthInches;
        drawFoundationPart(x, z, len, wall.thicknessIn, wall.orientation === 'horizontal');
      });
    }

    // Interior walls foundation
    interiorWalls.forEach(wall => {
      const x = wall.xFt * 12 + wall.xInches;
      const z = wall.yFt * 12 + wall.yInches;
      const len = wall.lengthFt * 12 + wall.lengthInches;
      drawFoundationPart(x, z, len, wall.thicknessIn, wall.orientation === 'horizontal');
    });

    // Bumpouts Foundation
    bumpouts.forEach(b => {
      const wallId = b.wall;
      const extWallList: { id: number, x: number, y: number, w: number, h: number, isHorizontal: boolean, exteriorSide: 1 | -1 }[] = [];
      if (shape === 'rectangle') {
        extWallList.push({ id: 1, x: 0, y: 0, w: widthIn, h: t, isHorizontal: true, exteriorSide: -1 });
        extWallList.push({ id: 3, x: 0, y: lengthIn - t, w: widthIn, h: t, isHorizontal: true, exteriorSide: 1 });
        extWallList.push({ id: 4, x: 0, y: t, w: t, h: lengthIn - 2 * t, isHorizontal: false, exteriorSide: -1 });
        extWallList.push({ id: 2, x: widthIn - t, y: t, w: t, h: lengthIn - 2 * t, isHorizontal: false, exteriorSide: 1 });
      } else if (shape === 'l-shape') {
        extWallList.push({ id: 1, x: 0, y: 0, w: widthIn, h: t, isHorizontal: true, exteriorSide: -1 });
        extWallList.push({ id: 2, x: widthIn - t, y: t, w: t, h: lRightDepthIn - t, isHorizontal: false, exteriorSide: 1 });
        extWallList.push({ id: 3, x: lBackWidthIn, y: lRightDepthIn - t, w: widthIn - lBackWidthIn - t, h: t, isHorizontal: true, exteriorSide: 1 });
        extWallList.push({ id: 4, x: lBackWidthIn, y: lRightDepthIn, w: t, h: lengthIn - lRightDepthIn - t, isHorizontal: false, exteriorSide: 1 });
        extWallList.push({ id: 5, x: 0, y: lengthIn - t, w: lBackWidthIn + t, h: t, isHorizontal: true, exteriorSide: 1 });
        extWallList.push({ id: 6, x: 0, y: t, w: t, h: lengthIn - 2 * t, isHorizontal: false, exteriorSide: -1 });
      } else if (shape === 'u-shape') {
        extWallList.push({ id: 1, x: 0, y: 0, w: uWallsIn.w1, h: t, isHorizontal: true, exteriorSide: -1 });
        extWallList.push({ id: 2, x: uWallsIn.w1 - t, y: t, w: t, h: uWallsIn.w2 - t, isHorizontal: false, exteriorSide: 1 });
        extWallList.push({ id: 3, x: uWallsIn.w1 - uWallsIn.w3, y: uWallsIn.w2 - t, w: uWallsIn.w3 - t, h: t, isHorizontal: true, exteriorSide: 1 });
        extWallList.push({ id: 4, x: uWallsIn.w1 - uWallsIn.w3, y: uWallsIn.w2 - uWallsIn.w4, w: t, h: uWallsIn.w4 - t, isHorizontal: false, exteriorSide: 1 });
        extWallList.push({ id: 5, x: uWallsIn.w7 - t, y: uWallsIn.w2 - uWallsIn.w4 - t, w: uWallsIn.w5 + 2 * t, h: t, isHorizontal: true, exteriorSide: -1 });
        extWallList.push({ id: 6, x: uWallsIn.w7 - t, y: uWallsIn.w8 - uWallsIn.w6, w: t, h: uWallsIn.w6 - t, isHorizontal: false, exteriorSide: -1 });
        extWallList.push({ id: 7, x: 0, y: uWallsIn.w8 - t, w: uWallsIn.w7, h: t, isHorizontal: true, exteriorSide: 1 });
        extWallList.push({ id: 8, x: 0, y: t, w: t, h: uWallsIn.w8 - 2 * t, isHorizontal: false, exteriorSide: -1 });
      }
      
      exteriorWalls.forEach(wall => {
        const x = wall.xFt * 12 + wall.xInches;
        const y = wall.yFt * 12 + wall.yInches;
        const len = wall.lengthFt * 12 + wall.lengthInches;
        const isHorizontal = wall.orientation === 'horizontal';
        
        let w = isHorizontal ? len : wall.thicknessIn;
        let h = isHorizontal ? wall.thicknessIn : len;
        let finalX = x;
        let finalY = y;

        if (w < 0) {
          finalX += w;
          w = Math.abs(w);
        }
        if (h < 0) {
          finalY += h;
          h = Math.abs(h);
        }

        if (isHorizontal) {
          if (wall.exteriorSide === 1) finalY -= wall.thicknessIn;
        } else {
          if (wall.exteriorSide === 1) finalX -= wall.thicknessIn;
        }

        extWallList.push({
          id: wall.id,
          x: finalX,
          y: finalY,
          w,
          h,
          isHorizontal,
          exteriorSide: wall.exteriorSide
        });
      });

      const extWall = extWallList.find(w => w.id === wallId);
      if (!extWall) return;

      const bx = b.xFt * 12 + b.xInches;
      const bw = b.widthIn;
      const bd = b.depthIn;
      const isHorizontal = extWall.isHorizontal;
      const wallX = extWall.x;
      const wallY = extWall.y;

      if (foundationType === 'slab' || foundationType === 'slab-on-grade') {
        const slab_h = slabThicknessIn;
        if (isHorizontal) {
          const sy = extWall.exteriorSide === 1 ? wallY : wallY - bd + t;
          parts.push({ x: wallX + bx, y: 0, z: sy, w: bw, h: slab_h, d: bd, color: "#a1a1aa" });
          
          if (foundationType === 'slab-on-grade') {
            const edge_d = thickenedEdgeDepthIn;
            const edge_w = 12;
            const edge_y = sy + (bd - edge_w) / 2.0;
            parts.push({ x: wallX + bx, y: -edge_d + slab_h, z: edge_y, w: bw, h: edge_d - slab_h, d: edge_w, color: "#71717a" });
          }
        } else {
          const sx = extWall.exteriorSide === 1 ? wallX : wallX - bd + t;
          parts.push({ x: sx, y: 0, z: wallY + bx, w: bd, h: slab_h, d: bw, color: "#a1a1aa" });
          
          if (foundationType === 'slab-on-grade') {
            const edge_d = thickenedEdgeDepthIn;
            const edge_w = 12;
            const edge_x = sx + (bd - edge_w) / 2.0;
            parts.push({ x: edge_x, y: -edge_d + slab_h, z: wallY + bx, w: edge_w, h: edge_d - slab_h, d: bw, color: "#71717a" });
          }
        }
      } else {
        if (isHorizontal) {
          const sy = extWall.exteriorSide === 1 ? wallY : wallY - bd + t;
          drawFoundationPart(wallX + bx, sy, t, bd, false);
          drawFoundationPart(wallX + bx + bw - t, sy, t, bd, false);
          drawFoundationPart(wallX + bx, wallY + extWall.exteriorSide * (bd - t), bw, t, true);
        } else {
          const sx = extWall.exteriorSide === 1 ? wallX : wallX - bd + t;
          drawFoundationPart(sx, wallY + bx, bd, t, true);
          drawFoundationPart(sx, wallY + bx + bw - t, bd, t, true);
          drawFoundationPart(wallX + extWall.exteriorSide * (bd - t), wallY + bx, t, bw, false);
        }
      }
    });

    // Main Slab
    if (foundationType === 'slab' || foundationType === 'slab-on-grade') {
      const slab_h = slabThicknessIn;
      if (foundationShape === 'rectangle') {
        parts.push({ x: 0, y: 0, z: 0, w: widthIn, h: slab_h, d: lengthIn, color: "#a1a1aa" });
      } else if (foundationShape === 'l-shape') {
        // L-shape slab as 2 boxes
        parts.push({ x: 0, y: 0, z: 0, w: widthIn, h: slab_h, d: lRightDepthIn, color: "#a1a1aa" });
        parts.push({ x: 0, y: 0, z: lRightDepthIn, w: lBackWidthIn, h: slab_h, d: lengthIn - lRightDepthIn, color: "#a1a1aa" });
      } else if (foundationShape === 'u-shape') {
        // U-shape slab as 3 boxes
        parts.push({ x: 0, y: 0, z: 0, w: uWallsIn.w7, h: slab_h, d: uWallsIn.w8, color: "#a1a1aa" }); // Left leg
        parts.push({ x: uWallsIn.w1 - uWallsIn.w3, y: 0, z: 0, w: uWallsIn.w3, h: slab_h, d: uWallsIn.w2, color: "#a1a1aa" }); // Right leg
        parts.push({ x: uWallsIn.w7, y: 0, z: 0, w: uWallsIn.w1 - uWallsIn.w3 - uWallsIn.w7, h: slab_h, d: uWallsIn.w2 - uWallsIn.w4, color: "#a1a1aa" }); // Bridge
      } else if (foundationShape === 'h-shape') {
        parts.push({ x: 0, y: 0, z: 0, w: hLeftBarWidthIn, h: slab_h, d: lengthIn, color: "#a1a1aa" });
        parts.push({ x: hLeftBarWidthIn, y: 0, z: hMiddleBarOffsetIn, w: widthIn - hLeftBarWidthIn - hRightBarWidthIn, h: slab_h, d: hMiddleBarHeightIn, color: "#a1a1aa" });
        parts.push({ x: widthIn - hRightBarWidthIn, y: 0, z: 0, w: hRightBarWidthIn, h: slab_h, d: lengthIn, color: "#a1a1aa" });
      } else if (foundationShape === 't-shape') {
        const stemX = (tTopWidthIn - tStemWidthIn) / 2;
        parts.push({ x: 0, y: 0, z: 0, w: tTopWidthIn, h: slab_h, d: tTopLengthIn, color: "#a1a1aa" });
        parts.push({ x: stemX, y: 0, z: tTopLengthIn, w: tStemWidthIn, h: slab_h, d: tStemLengthIn, color: "#a1a1aa" });
      } else if (foundationShape === 'custom') {
        const blocksToUse = (combinedBlocks && combinedBlocks.length > 0) ? combinedBlocks : shapeBlocks;
        blocksToUse.forEach(block => {
          parts.push({ x: block.x, y: 0, z: block.y, w: block.w, h: slab_h, d: block.h, color: "#a1a1aa" });
        });
      }
    }

    return parts;
  }, [foundationType, foundationShape, stemWallHeightIn, stemWallThicknessIn, footingWidthIn, footingThicknessIn, widthIn, lengthIn, thicknessIn, lRightDepthIn, lBackWidthIn, uWallsIn, exteriorWalls, bumpouts, shape, interiorWalls, combinedBlocks]);

  const openings = useMemo(() => {
    const list: { x: number, y: number, z: number, w: number, h: number, d: number }[] = [];
    
    const calculateOpeningsForStory = (currentY: number, currentWallHeight: number, floorIndex: number) => {
      const extWalls: { id: number, x: number, y: number, w: number, h: number, isHorizontal: boolean }[] = [];

      exteriorWalls.filter(w => (w.floorIndex || 0) === floorIndex).forEach(w => {
        const x = w.xFt * 12 + w.xInches;
        const y = w.yFt * 12 + w.yInches;
        const len = w.lengthFt * 12 + w.lengthInches;
        const isHorizontal = w.orientation === 'horizontal';
        
        let width = isHorizontal ? len : w.thicknessIn;
        let depth = isHorizontal ? w.thicknessIn : len;
        let finalX = x;
        let finalY = y;

        if (width < 0) {
          finalX += width;
          width = Math.abs(width);
        }
        if (depth < 0) {
          finalY += depth;
          depth = Math.abs(depth);
        }

        if (isHorizontal) {
          if (w.exteriorSide === 1) finalY -= w.thicknessIn;
        } else {
          if (w.exteriorSide === 1) finalX -= w.thicknessIn;
        }

        extWalls.push({
          id: w.id,
          x: finalX,
          y: finalY,
          w: width,
          h: depth,
          isHorizontal
        });
      });

      if (shape === 'rectangle') {
        extWalls.push({ id: 1, x: 0, y: 0, w: widthIn, h: thicknessIn, isHorizontal: true });
        extWalls.push({ id: 2, x: widthIn - thicknessIn, y: thicknessIn, w: thicknessIn, h: lengthIn - 2 * thicknessIn, isHorizontal: false });
        extWalls.push({ id: 3, x: 0, y: lengthIn - thicknessIn, w: widthIn, h: thicknessIn, isHorizontal: true });
        extWalls.push({ id: 4, x: 0, y: thicknessIn, w: thicknessIn, h: lengthIn - 2 * thicknessIn, isHorizontal: false });
      } else if (shape === 'l-shape') {
        extWalls.push({ id: 1, x: 0, y: 0, w: widthIn, h: thicknessIn, isHorizontal: true });
        extWalls.push({ id: 2, x: widthIn - thicknessIn, y: thicknessIn, w: thicknessIn, h: lRightDepthIn - thicknessIn, isHorizontal: false });
        extWalls.push({ id: 3, x: lBackWidthIn, y: lRightDepthIn - thicknessIn, w: widthIn - lBackWidthIn - thicknessIn, h: thicknessIn, isHorizontal: true });
        extWalls.push({ id: 4, x: lBackWidthIn, y: lRightDepthIn, w: thicknessIn, h: lengthIn - lRightDepthIn - thicknessIn, isHorizontal: false });
        extWalls.push({ id: 5, x: 0, y: lengthIn - thicknessIn, w: lBackWidthIn + thicknessIn, h: thicknessIn, isHorizontal: true });
        extWalls.push({ id: 6, x: 0, y: thicknessIn, w: thicknessIn, h: lengthIn - 2 * thicknessIn, isHorizontal: false });

        if (lDirection === 'front-right' || lDirection === 'back-right') {
          extWalls.forEach(w => w.x = widthIn - w.x - w.w);
        }
        if (lDirection === 'back-left' || lDirection === 'back-right') {
          extWalls.forEach(w => w.y = lengthIn - w.y - w.h);
        }
      } else if (shape === 'u-shape') {
        extWalls.push({ id: 1, x: 0, y: 0, w: uWallsIn.w1, h: thicknessIn, isHorizontal: true });
        extWalls.push({ id: 2, x: uWallsIn.w1 - thicknessIn, y: thicknessIn, w: thicknessIn, h: uWallsIn.w2 - thicknessIn, isHorizontal: false });
        extWalls.push({ id: 3, x: uWallsIn.w1 - uWallsIn.w3, y: uWallsIn.w2 - thicknessIn, w: uWallsIn.w3 - thicknessIn, h: thicknessIn, isHorizontal: true });
        extWalls.push({ id: 4, x: uWallsIn.w1 - uWallsIn.w3, y: uWallsIn.w2 - uWallsIn.w4, w: thicknessIn, h: uWallsIn.w4 - thicknessIn, isHorizontal: false });
        extWalls.push({ id: 5, x: uWallsIn.w7 - thicknessIn, y: uWallsIn.w2 - uWallsIn.w4 - thicknessIn, w: uWallsIn.w5 + 2 * thicknessIn, h: thicknessIn, isHorizontal: true });
        extWalls.push({ id: 6, x: uWallsIn.w7 - thicknessIn, y: uWallsIn.w8 - uWallsIn.w6, w: thicknessIn, h: uWallsIn.w6 - thicknessIn, isHorizontal: false });
        extWalls.push({ id: 7, x: 0, y: uWallsIn.w8 - thicknessIn, w: uWallsIn.w7, h: thicknessIn, isHorizontal: true });
        extWalls.push({ id: 8, x: 0, y: thicknessIn, w: thicknessIn, h: uWallsIn.w8 - 2 * thicknessIn, isHorizontal: false });
      } else if (shape === 'h-shape') {
        extWalls.push({ id: 1, x: 0, y: 0, w: hLeftBarWidthIn, h: thicknessIn, isHorizontal: true });
        extWalls.push({ id: 2, x: hLeftBarWidthIn - thicknessIn, y: thicknessIn, w: thicknessIn, h: hMiddleBarOffsetIn - thicknessIn, isHorizontal: false });
        extWalls.push({ id: 3, x: hLeftBarWidthIn - thicknessIn, y: hMiddleBarOffsetIn + hMiddleBarHeightIn, w: thicknessIn, h: lengthIn - (hMiddleBarOffsetIn + hMiddleBarHeightIn) - thicknessIn, isHorizontal: false });
        extWalls.push({ id: 4, x: 0, y: lengthIn - thicknessIn, w: hLeftBarWidthIn, h: thicknessIn, isHorizontal: true });
        extWalls.push({ id: 5, x: 0, y: thicknessIn, w: thicknessIn, h: lengthIn - 2 * thicknessIn, isHorizontal: false });
        extWalls.push({ id: 6, x: hLeftBarWidthIn, y: hMiddleBarOffsetIn, w: widthIn - hLeftBarWidthIn - hRightBarWidthIn, h: thicknessIn, isHorizontal: true });
        extWalls.push({ id: 7, x: hLeftBarWidthIn, y: hMiddleBarOffsetIn + hMiddleBarHeightIn - thicknessIn, w: widthIn - hLeftBarWidthIn - hRightBarWidthIn, h: thicknessIn, isHorizontal: true });
        extWalls.push({ id: 8, x: widthIn - hRightBarWidthIn, y: 0, w: hRightBarWidthIn, h: thicknessIn, isHorizontal: true });
        extWalls.push({ id: 9, x: widthIn - hRightBarWidthIn, y: thicknessIn, w: thicknessIn, h: hMiddleBarOffsetIn - thicknessIn, isHorizontal: false });
        extWalls.push({ id: 10, x: widthIn - hRightBarWidthIn, y: hMiddleBarOffsetIn + hMiddleBarHeightIn, w: thicknessIn, h: lengthIn - (hMiddleBarOffsetIn + hMiddleBarHeightIn) - thicknessIn, isHorizontal: false });
        extWalls.push({ id: 11, x: widthIn - hRightBarWidthIn, y: lengthIn - thicknessIn, w: hRightBarWidthIn, h: thicknessIn, isHorizontal: true });
        extWalls.push({ id: 12, x: widthIn - thicknessIn, y: thicknessIn, w: thicknessIn, h: lengthIn - 2 * thicknessIn, isHorizontal: false });
      } else if (shape === 't-shape') {
        const stemX = (tTopWidthIn - tStemWidthIn) / 2;
        extWalls.push({ id: 1, x: 0, y: 0, w: tTopWidthIn, h: thicknessIn, isHorizontal: true });
        extWalls.push({ id: 2, x: tTopWidthIn - thicknessIn, y: thicknessIn, w: thicknessIn, h: tTopLengthIn - 2 * thicknessIn, isHorizontal: false });
        extWalls.push({ id: 3, x: stemX + tStemWidthIn, y: tTopLengthIn - thicknessIn, w: tTopWidthIn - (stemX + tStemWidthIn), h: thicknessIn, isHorizontal: true });
        extWalls.push({ id: 4, x: 0, y: tTopLengthIn - thicknessIn, w: stemX, h: thicknessIn, isHorizontal: true });
        extWalls.push({ id: 5, x: 0, y: thicknessIn, w: thicknessIn, h: tTopLengthIn - 2 * thicknessIn, isHorizontal: false });
        extWalls.push({ id: 6, x: stemX, y: tTopLengthIn, w: thicknessIn, h: tStemLengthIn - thicknessIn, isHorizontal: false });
        extWalls.push({ id: 7, x: stemX + tStemWidthIn - thicknessIn, y: tTopLengthIn, w: thicknessIn, h: tStemLengthIn - thicknessIn, isHorizontal: false });
        extWalls.push({ id: 8, x: stemX, y: tTopLengthIn + tStemLengthIn - thicknessIn, w: tStemWidthIn, h: thicknessIn, isHorizontal: true });
      }

      doors.filter(d => (d.floorIndex || 0) === floorIndex).forEach(d => {
        const wall = extWalls.find(w => w.id === d.wall);
        if (!wall) return;
        const ox = d.xFt * 12 + d.xInches;
        if (wall.isHorizontal) {
          list.push({ x: wall.x + ox, y: currentY, z: wall.y - 1, w: d.widthIn, h: d.heightIn, d: thicknessIn + 2 });
        } else {
          list.push({ x: wall.x - 1, y: currentY, z: wall.y + ox, w: thicknessIn + 2, h: d.heightIn, d: d.widthIn });
        }
      });

      windows.filter(w => (w.floorIndex || 0) === floorIndex).forEach(w => {
        const wall = extWalls.find(wall => wall.id === w.wall);
        if (!wall) return;
        const ox = w.xFt * 12 + w.xInches;
        if (wall.isHorizontal) {
          list.push({ x: wall.x + ox, y: currentY + w.sillHeightIn, z: wall.y - 1, w: w.widthIn, h: w.heightIn, d: thicknessIn + 2 });
        } else {
          list.push({ x: wall.x - 1, y: currentY + w.sillHeightIn, z: wall.y + ox, w: thicknessIn + 2, h: w.heightIn, d: w.widthIn });
        }
      });
    };

    // 1st Floor
    if (currentFloorIndex === 0) {
      calculateOpeningsForStory(totalBaseHeight, wallHeightIn, 0);
    }

    // Upper Floors
    let currentZ = totalBaseHeight + wallHeightIn;
    for (let i = 0; i < additionalStories; i++) {
      const upperJoistH = upperFloorJoistSize === '2x6' ? 5.5 : upperFloorJoistSize === '2x8' ? 7.25 : upperFloorJoistSize === '2x10' ? 9.25 : 11.25;
      const upperFloorSystemH = upperJoistH + (addSubfloor ? subfloorThickness : 0);
      currentZ += upperFloorSystemH;
      if (currentFloorIndex === i + 1) {
        calculateOpeningsForStory(currentZ, upperFloorWallHeightIn, i + 1);
      }
      currentZ += upperFloorWallHeightIn;
    }

    return list;
  }, [doors, windows, exteriorWalls, shape, widthIn, lengthIn, thicknessIn, uWallsIn, lRightDepthIn, lBackWidthIn, totalBaseHeight, wallHeightIn, additionalStories, upperFloorWallHeightIn, upperFloorJoistSize, addSubfloor, subfloorThickness, currentFloorIndex]);

  const floorSystem = useMemo(() => {
    const parts: { x: number, y: number, z: number, w: number, h: number, d: number, color?: string }[] = [];
    
    const addFloorForStory = (currentY: number, currentJoistSize: string) => {
      if (!addFloorFraming && !noFramingFloorOnly) return;
      
      const joistH = currentJoistSize === '2x6' ? 5.5 : currentJoistSize === '2x8' ? 7.25 : currentJoistSize === '2x10' ? 9.25 : 11.25;
      const t = 1.5;
      const rt = rimJoistThickness; // Rim joist thickness from props

      if (noFramingFloorOnly) {
        const floorColor = "#d4d4d8";
        if (shape === 'rectangle') {
          parts.push({ x: 0, y: currentY, z: 0, w: widthIn, h: joistH, d: lengthIn, color: floorColor });
        } else if (shape === 'l-shape') {
          parts.push({ x: 0, y: currentY, z: 0, w: widthIn, h: joistH, d: lRightDepthIn, color: floorColor });
          parts.push({ x: 0, y: currentY, z: lRightDepthIn, w: lBackWidthIn, h: joistH, d: lengthIn - lRightDepthIn, color: floorColor });
        } else if (shape === 'u-shape') {
          parts.push({ x: 0, y: currentY, z: 0, w: uWallsIn.w7, h: joistH, d: uWallsIn.w8, color: floorColor });
          parts.push({ x: uWallsIn.w1 - uWallsIn.w3, y: currentY, z: 0, w: uWallsIn.w3, h: joistH, d: uWallsIn.w2, color: floorColor });
          parts.push({ x: uWallsIn.w7, y: currentY, z: 0, w: uWallsIn.w1 - uWallsIn.w3 - uWallsIn.w7, h: joistH, d: uWallsIn.w2 - uWallsIn.w4, color: floorColor });
        } else if (shape === 'h-shape') {
          parts.push({ x: 0, y: currentY, z: 0, w: hLeftBarWidthIn, h: joistH, d: lengthIn, color: floorColor });
          parts.push({ x: hLeftBarWidthIn, y: currentY, z: hMiddleBarOffsetIn, w: widthIn - hLeftBarWidthIn - hRightBarWidthIn, h: joistH, d: hMiddleBarHeightIn, color: floorColor });
          parts.push({ x: widthIn - hRightBarWidthIn, y: currentY, z: 0, w: hRightBarWidthIn, h: joistH, d: lengthIn, color: floorColor });
        } else if (shape === 't-shape') {
          const stemX = (tTopWidthIn - tStemWidthIn) / 2;
          parts.push({ x: 0, y: currentY, z: 0, w: tTopWidthIn, h: joistH, d: tTopLengthIn, color: floorColor });
          parts.push({ x: stemX, y: currentY, z: tTopLengthIn, w: tStemWidthIn, h: joistH, d: tStemLengthIn, color: floorColor });
        } else if (shape === 'custom') {
          const blocksToUse = (combinedBlocks && combinedBlocks.length > 0) ? combinedBlocks : shapeBlocks;
          blocksToUse.forEach(block => {
            parts.push({ x: block.x, y: currentY, z: block.y, w: block.w, h: joistH, d: block.h, color: floorColor });
          });
        }
      } else if (joistDirection === 'y') {
        // Rim joists (front and back)
        parts.push({ x: 0, y: currentY, z: 0, w: widthIn, h: joistH, d: rt, color: "#a1a1aa" });
        if (shape === 'rectangle') {
          parts.push({ x: 0, y: currentY, z: lengthIn - rt, w: widthIn, h: joistH, d: rt, color: "#a1a1aa" });
        } else if (shape === 'l-shape') {
          parts.push({ x: 0, y: currentY, z: lengthIn - rt, w: lBackWidthIn, h: joistH, d: rt, color: "#a1a1aa" });
          parts.push({ x: lBackWidthIn, y: currentY, z: lRightDepthIn - rt, w: widthIn - lBackWidthIn, h: joistH, d: rt, color: "#a1a1aa" });
        } else if (shape === 'u-shape') {
          parts.push({ x: 0, y: currentY, z: uWallsIn.w8 - rt, w: uWallsIn.w7, h: joistH, d: rt, color: "#a1a1aa" });
          parts.push({ x: uWallsIn.w1 - uWallsIn.w3, y: currentY, z: uWallsIn.w2 - rt, w: uWallsIn.w3, h: joistH, d: rt, color: "#a1a1aa" });
          parts.push({ x: uWallsIn.w7, y: currentY, z: uWallsIn.w2 - uWallsIn.w4 - rt, w: uWallsIn.w1 - uWallsIn.w3 - uWallsIn.w7, h: joistH, d: rt, color: "#a1a1aa" });
        } else if (shape === 'h-shape') {
          parts.push({ x: 0, y: currentY, z: 0, w: hLeftBarWidthIn, h: joistH, d: rt, color: "#a1a1aa" });
          parts.push({ x: 0, y: currentY, z: lengthIn - rt, w: hLeftBarWidthIn, h: joistH, d: rt, color: "#a1a1aa" });
          parts.push({ x: widthIn - hRightBarWidthIn, y: currentY, z: 0, w: hRightBarWidthIn, h: joistH, d: rt, color: "#a1a1aa" });
          parts.push({ x: widthIn - hRightBarWidthIn, y: currentY, z: lengthIn - rt, w: hRightBarWidthIn, h: joistH, d: rt, color: "#a1a1aa" });
        } else if (shape === 't-shape') {
          parts.push({ x: 0, y: currentY, z: 0, w: tTopWidthIn, h: joistH, d: rt, color: "#a1a1aa" });
          parts.push({ x: (tTopWidthIn - tStemWidthIn) / 2.0, y: currentY, z: tTopLengthIn + tStemLengthIn - rt, w: tStemWidthIn, h: joistH, d: rt, color: "#a1a1aa" });
        } else if (shape === 'custom') {
          const blocksToUse = (combinedBlocks && combinedBlocks.length > 0) ? combinedBlocks : shapeBlocks;
          blocksToUse.forEach(block => {
            parts.push({ x: block.x, y: currentY, z: block.y, w: block.w, h: joistH, d: rt, color: "#a1a1aa" });
            parts.push({ x: block.x, y: currentY, z: block.y + block.h - rt, w: block.w, h: joistH, d: rt, color: "#a1a1aa" });
          });
        }

        const numJoists = Math.ceil(widthIn / joistSpacing) + 1;
        for (let i = 0; i < numJoists; i++) {
          let jx = i * joistSpacing;
          if (jx + t > widthIn) jx = widthIn - t;
          
          if (shape === 'rectangle') {
            parts.push({ x: jx, y: currentY, z: rt, w: t, h: joistH, d: lengthIn - 2 * rt, color: "#d4d4d8" });
          } else if (shape === 'l-shape') {
            const len = jx < lBackWidthIn ? lengthIn : lRightDepthIn;
            parts.push({ x: jx, y: currentY, z: rt, w: t, h: joistH, d: len - 2 * rt, color: "#d4d4d8" });
          } else if (shape === 'u-shape') {
            if (jx < uWallsIn.w7) {
              parts.push({ x: jx, y: currentY, z: rt, w: t, h: joistH, d: uWallsIn.w8 - 2 * rt, color: "#d4d4d8" });
            } else if (jx < (uWallsIn.w1 - uWallsIn.w3)) {
              parts.push({ x: jx, y: currentY, z: rt, w: t, h: joistH, d: uWallsIn.w2 - uWallsIn.w4 - 2 * rt, color: "#d4d4d8" });
            } else {
              parts.push({ x: jx, y: currentY, z: rt, w: t, h: joistH, d: uWallsIn.w2 - 2 * rt, color: "#d4d4d8" });
            }
          } else if (shape === 'h-shape') {
            if (jx < hLeftBarWidthIn || jx > (widthIn - hRightBarWidthIn)) {
              parts.push({ x: jx, y: currentY, z: rt, w: t, h: joistH, d: lengthIn - 2 * rt, color: "#d4d4d8" });
            } else {
              parts.push({ x: jx, y: currentY, z: hMiddleBarOffsetIn + rt, w: t, h: joistH, d: hMiddleBarHeightIn - 2 * rt, color: "#d4d4d8" });
            }
          } else if (shape === 't-shape') {
            if (jx >= (widthIn - tStemWidthIn) / 2.0 && jx <= (widthIn + tStemWidthIn) / 2.0) {
              parts.push({ x: jx, y: currentY, z: rt, w: t, h: joistH, d: tTopLengthIn + tStemLengthIn - 2 * rt, color: "#d4d4d8" });
            } else {
              parts.push({ x: jx, y: currentY, z: rt, w: t, h: joistH, d: tTopLengthIn - 2 * rt, color: "#d4d4d8" });
            }
          } else if (shape === 'custom') {
            const blocksToUse = (combinedBlocks && combinedBlocks.length > 0) ? combinedBlocks : shapeBlocks;
            blocksToUse.forEach(block => {
              if (jx >= block.x && jx < block.x + block.w) {
                parts.push({ x: jx, y: currentY, z: block.y + rt, w: t, h: joistH, d: block.h - 2 * rt, color: "#d4d4d8" });
              }
            });
          }
        }
      } else {
        // Rim joists (left and right)
        parts.push({ x: 0, y: currentY, z: 0, w: rt, h: joistH, d: lengthIn, color: "#a1a1aa" });
        if (shape === 'rectangle') {
          parts.push({ x: widthIn - rt, y: currentY, z: 0, w: rt, h: joistH, d: lengthIn, color: "#a1a1aa" });
        } else if (shape === 'l-shape') {
          parts.push({ x: widthIn - rt, y: currentY, z: 0, w: rt, h: joistH, d: lRightDepthIn, color: "#a1a1aa" });
          parts.push({ x: lBackWidthIn - rt, y: currentY, z: lRightDepthIn, w: rt, h: joistH, d: lengthIn - lRightDepthIn, color: "#a1a1aa" });
        } else if (shape === 'u-shape') {
          parts.push({ x: uWallsIn.w1 - rt, y: currentY, z: 0, w: rt, h: joistH, d: uWallsIn.w2, color: "#a1a1aa" });
          parts.push({ x: uWallsIn.w7 - rt, y: currentY, z: uWallsIn.w2 - uWallsIn.w4, w: rt, h: joistH, d: uWallsIn.w8 - (uWallsIn.w2 - uWallsIn.w4), color: "#a1a1aa" });
        } else if (shape === 'h-shape') {
          parts.push({ x: 0, y: currentY, z: 0, w: rt, h: joistH, d: lengthIn, color: "#a1a1aa" });
          parts.push({ x: widthIn - rt, y: currentY, z: 0, w: rt, h: joistH, d: lengthIn, color: "#a1a1aa" });
          parts.push({ x: hLeftBarWidthIn, y: currentY, z: hMiddleBarOffsetIn, w: rt, h: joistH, d: hMiddleBarHeightIn, color: "#a1a1aa" });
          parts.push({ x: widthIn - hRightBarWidthIn - rt, y: currentY, z: hMiddleBarOffsetIn, w: rt, h: joistH, d: hMiddleBarHeightIn, color: "#a1a1aa" });
        } else if (shape === 't-shape') {
          parts.push({ x: 0, y: currentY, z: 0, w: rt, h: joistH, d: tTopLengthIn, color: "#a1a1aa" });
          parts.push({ x: widthIn - rt, y: currentY, z: 0, w: rt, h: joistH, d: tTopLengthIn, color: "#a1a1aa" });
          parts.push({ x: (widthIn - tStemWidthIn) / 2.0, y: currentY, z: tTopLengthIn, w: rt, h: joistH, d: tStemLengthIn, color: "#a1a1aa" });
          parts.push({ x: (widthIn + tStemWidthIn) / 2.0 - rt, y: currentY, z: tTopLengthIn, w: rt, h: joistH, d: tStemLengthIn, color: "#a1a1aa" });
        } else if (shape === 'custom') {
          // For custom shapes, we use the combinedBlocks to draw the floor system
          const blocksToUse = (combinedBlocks && combinedBlocks.length > 0) ? combinedBlocks : shapeBlocks;
          blocksToUse.forEach(block => {
            // Rim joists for each block (simplified)
            parts.push({ x: block.x, y: currentY, z: block.y, w: rt, h: joistH, d: block.h, color: "#a1a1aa" });
            parts.push({ x: block.x + block.w - rt, y: currentY, z: block.y, w: rt, h: joistH, d: block.h, color: "#a1a1aa" });
            parts.push({ x: block.x + rt, y: currentY, z: block.y, w: block.w - 2 * rt, h: joistH, d: rt, color: "#a1a1aa" });
            parts.push({ x: block.x + rt, y: currentY, z: block.y + block.h - rt, w: block.w - 2 * rt, h: joistH, d: rt, color: "#a1a1aa" });

            // Joists for each block
            const numJoists = Math.ceil(block.h / joistSpacing) + 1;
            for (let i = 0; i < numJoists; i++) {
              let jz = block.y + i * joistSpacing;
              if (jz + t > block.y + block.h) jz = block.y + block.h - t;
              parts.push({ x: block.x + rt, y: currentY, z: jz, w: block.w - 2 * rt, h: joistH, d: t, color: "#d4d4d8" });
            }
          });
        }

        const numJoists = Math.ceil(lengthIn / joistSpacing) + 1;
        for (let i = 0; i < numJoists; i++) {
          let jz = i * joistSpacing;
          if (jz + t > lengthIn) jz = lengthIn - t;
          
          if (shape === 'rectangle') {
            parts.push({ x: rt, y: currentY, z: jz, w: widthIn - 2 * rt, h: joistH, d: t, color: "#d4d4d8" });
          } else if (shape === 'l-shape') {
            const wid = jz < lRightDepthIn ? widthIn : lBackWidthIn;
            parts.push({ x: rt, y: currentY, z: jz, w: wid - 2 * rt, h: joistH, d: t, color: "#d4d4d8" });
          } else if (shape === 'u-shape') {
            if (jz < (uWallsIn.w2 - uWallsIn.w4)) {
              parts.push({ x: rt, y: currentY, z: jz, w: uWallsIn.w1 - 2 * rt, h: joistH, d: t, color: "#d4d4d8" });
            } else {
              // Left leg
              parts.push({ x: rt, y: currentY, z: jz, w: uWallsIn.w7 - 2 * rt, h: joistH, d: t, color: "#d4d4d8" });
              // Right leg
              parts.push({ x: uWallsIn.w1 - uWallsIn.w3 + rt, y: currentY, z: jz, w: uWallsIn.w3 - 2 * rt, h: joistH, d: t, color: "#d4d4d8" });
            }
          } else if (shape === 'h-shape') {
            if (jz >= hMiddleBarOffsetIn && jz <= (hMiddleBarOffsetIn + hMiddleBarHeightIn)) {
              parts.push({ x: rt, y: currentY, z: jz, w: widthIn - 2 * rt, h: joistH, d: t, color: "#d4d4d8" });
            } else {
              // Left bar
              parts.push({ x: rt, y: currentY, z: jz, w: hLeftBarWidthIn - 2 * rt, h: joistH, d: t, color: "#d4d4d8" });
              // Right bar
              parts.push({ x: widthIn - hRightBarWidthIn + rt, y: currentY, z: jz, w: hRightBarWidthIn - 2 * rt, h: joistH, d: t, color: "#d4d4d8" });
            }
          } else if (shape === 't-shape') {
            if (jz < tTopLengthIn) {
              parts.push({ x: rt, y: currentY, z: jz, w: widthIn - 2 * rt, h: joistH, d: t, color: "#d4d4d8" });
            } else {
              parts.push({ x: (widthIn - tStemWidthIn) / 2.0 + rt, y: currentY, z: jz, w: tStemWidthIn - 2 * rt, h: joistH, d: t, color: "#d4d4d8" });
            }
          }
        }
      }

      if (addSubfloor) {
        const sfColor = subfloorMaterial === 'plywood' ? "#deb887" : "#cd853f";
        const sfY = currentY + joistH;
        if (shape === 'rectangle') {
          parts.push({ x: 0, y: sfY, z: 0, w: widthIn, h: subfloorThickness, d: lengthIn, color: sfColor });
        } else if (shape === 'l-shape') {
          parts.push({ x: 0, y: sfY, z: 0, w: widthIn, h: subfloorThickness, d: lRightDepthIn, color: sfColor });
          parts.push({ x: 0, y: sfY, z: lRightDepthIn, w: lBackWidthIn, h: subfloorThickness, d: lengthIn - lRightDepthIn, color: sfColor });
        } else if (shape === 'u-shape') {
          parts.push({ x: 0, y: sfY, z: 0, w: uWallsIn.w7, h: subfloorThickness, d: uWallsIn.w8, color: sfColor });
          parts.push({ x: uWallsIn.w1 - uWallsIn.w3, y: sfY, z: 0, w: uWallsIn.w3, h: subfloorThickness, d: uWallsIn.w2, color: sfColor });
          parts.push({ x: uWallsIn.w7, y: sfY, z: 0, w: uWallsIn.w1 - uWallsIn.w3 - uWallsIn.w7, h: subfloorThickness, d: uWallsIn.w2 - uWallsIn.w4, color: sfColor });
        } else if (shape === 'h-shape') {
          parts.push({ x: 0, y: sfY, z: 0, w: hLeftBarWidthIn, h: subfloorThickness, d: lengthIn, color: sfColor });
          parts.push({ x: hLeftBarWidthIn, y: sfY, z: hMiddleBarOffsetIn, w: widthIn - hLeftBarWidthIn - hRightBarWidthIn, h: subfloorThickness, d: hMiddleBarHeightIn, color: sfColor });
          parts.push({ x: widthIn - hRightBarWidthIn, y: sfY, z: 0, w: hRightBarWidthIn, h: subfloorThickness, d: lengthIn, color: sfColor });
        } else if (shape === 't-shape') {
          const stemX = (tTopWidthIn - tStemWidthIn) / 2;
          parts.push({ x: 0, y: sfY, z: 0, w: tTopWidthIn, h: subfloorThickness, d: tTopLengthIn, color: sfColor });
          parts.push({ x: stemX, y: sfY, z: tTopLengthIn, w: tStemWidthIn, h: subfloorThickness, d: tStemLengthIn, color: sfColor });
        } else if (shape === 'custom') {
          const blocksToUse = (combinedBlocks && combinedBlocks.length > 0) ? combinedBlocks : shapeBlocks;
          blocksToUse.forEach(block => {
            parts.push({ x: block.x, y: sfY, z: block.y, w: block.w, h: subfloorThickness, d: block.h, color: sfColor });
          });
        }
      }
    };

    // 1st Floor
    if (currentFloorIndex === 0) {
      addFloorForStory(foundationHeight, joistSize);
    }

    // Upper Floors
    let currentZ = foundationHeight + floorSystemHeight + wallHeightIn;
    for (let i = 0; i < additionalStories; i++) {
      if (currentFloorIndex === i + 1) {
        addFloorForStory(currentZ, upperFloorJoistSize);
      }
      
      const upperJoistH = upperFloorJoistSize === '2x6' ? 5.5 : upperFloorJoistSize === '2x8' ? 7.25 : upperFloorJoistSize === '2x10' ? 9.25 : 11.25;
      const upperFloorSystemH = upperJoistH + (addSubfloor ? subfloorThickness : 0);
      currentZ += upperFloorSystemH + upperFloorWallHeightIn;
    }

    return parts;
  }, [addFloorFraming, joistSpacing, joistSize, joistDirection, addSubfloor, subfloorThickness, subfloorMaterial, widthIn, lengthIn, shape, lBackWidthIn, lRightDepthIn, uWallsIn, foundationHeight, floorSystemHeight, wallHeightIn, additionalStories, upperFloorWallHeightIn, upperFloorJoistSize, combinedBlocks, currentFloorIndex]);

  const activeFloorCutHeight = useMemo(() => {
    let z = totalBaseHeight;
    let h = wallHeightIn;
    for (let i = 0; i < additionalStories; i++) {
      if (currentFloorIndex === i + 1) {
        h = upperFloorWallHeightIn;
        break;
      }
      const upperJoistH = upperFloorJoistSize === '2x6' ? 5.5 : upperFloorJoistSize === '2x8' ? 7.25 : upperFloorJoistSize === '2x10' ? 9.25 : 11.25;
      const upperFloorSystemH = upperJoistH + (addSubfloor ? subfloorThickness : 0);
      z += h + upperFloorSystemH;
    }
    return (z + h * 0.9) * 0.0254; // Cut at 90% of the active floor's wall height
  }, [totalBaseHeight, wallHeightIn, additionalStories, currentFloorIndex, upperFloorWallHeightIn, upperFloorJoistSize, addSubfloor, subfloorThickness]);

  return (
    <div className="w-full h-full bg-zinc-100 dark:bg-zinc-900 rounded-xl overflow-hidden relative border border-zinc-200 dark:border-zinc-800">
      <Canvas shadows dpr={[1, 2]}>
        <Suspense fallback={null}>
          <PerspectiveCamera makeDefault position={[widthIn * 0.03, wallHeightIn * 0.08, lengthIn * 0.03]} fov={50} />
          <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 2.1} />
          
          <ambientLight intensity={0.4} />
          {showSky && <Sky distance={450000} sunPosition={[10, 20, 10]} inclination={0} azimuth={0.25} />}
          {showSun && (
            <directionalLight
              position={[10, 20, 10]}
              intensity={1.5}
              castShadow
              shadow-mapSize={[2048, 2048]}
              shadow-camera-left={-50}
              shadow-camera-right={50}
              shadow-camera-top={50}
              shadow-camera-bottom={-50}
            />
          )}
          <Environment preset="city" />
          <CameraController 
            presetTrigger={cameraPresetTrigger} 
            targetCenter={[(widthIn / 2.0) * 0.0254, totalBaseHeight * 0.0254 + (wallHeightIn / 2) * 0.0254, (lengthIn / 2.0) * 0.0254]} 
            distance={Math.max(widthIn, lengthIn, 360) * 0.0254} 
            customCameras={customCameras}
          />
          <ClipControls 
            isFloorPlanView={isFloorPlanView} 
            cutHeight={activeFloorCutHeight} 
          />
          <axesHelper args={[500]} rotation={[-Math.PI / 2, 0, 0]} />
          {showGround && <Ground
            onClick={handleMeasureClick}
            onPointerMove={(e) => { if (isMeasuring) handleMeasurePointerMove(e); }}
          />}
          
          {/* Invisible plane: pointer-move ONLY (no click — meshes handle clicks to avoid double-fire) */}
          {isMeasuring && (
            <mesh
              visible={false}
              onPointerMove={handleMeasurePointerMove}
              position={[0, 0, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <planeGeometry args={[2000, 2000]} />
              <meshBasicMaterial />
            </mesh>
          )}
          
              <group scale={0.0254}> {/* Convert inches to meters for Three.js scale */}
                {foundation.map((f, i) => (
                  <FoundationPart key={`fd-${i}`} {...f}
                    isMeasuring={isMeasuring} handleMeasureClick={handleMeasureClick} handleMeasurePointerMove={handleMeasurePointerMove}
                    surfaceId="foundation" appliedMaterials={activeMaterials} materialConfigs={materialConfigs}
                    activePaintMaterial={localActivePaint}
                    onSurfacePainted={(sid, url) => { handleSurfacePainted(sid, url); setActiveSurfaceId(sid); }}
                  />
                ))}
              {floorSystem.map((f, i) => (
                <FoundationPart key={`fl-${i}`} {...f}
                  isMeasuring={isMeasuring} handleMeasureClick={handleMeasureClick} handleMeasurePointerMove={handleMeasurePointerMove}
                  surfaceId="floor" appliedMaterials={activeMaterials} materialConfigs={materialConfigs}
                  activePaintMaterial={localActivePaint}
                  onSurfacePainted={(sid, url) => { handleSurfacePainted(sid, url); setActiveSurfaceId(sid); }}
                />
              ))}
              {!addFloorFraming && (
                <group>
                  {shape === 'rectangle' && <FoundationPart x={0} y={foundationHeight} z={0} w={widthIn} h={subfloorThickness} d={lengthIn} color="#d4d4d8" isMeasuring={isMeasuring} handleMeasureClick={handleMeasureClick} handleMeasurePointerMove={handleMeasurePointerMove} surfaceId="floor" appliedMaterials={activeMaterials} materialConfigs={materialConfigs} activePaintMaterial={localActivePaint} onSurfacePainted={(sid, url) => { handleSurfacePainted(sid, url); setActiveSurfaceId(sid); }} />}
                  {shape === 'l-shape' && (
                    <>
                      <FoundationPart x={0} y={foundationHeight} z={0} w={widthIn} h={subfloorThickness} d={lRightDepthIn} color="#d4d4d8" isMeasuring={isMeasuring} handleMeasureClick={handleMeasureClick} handleMeasurePointerMove={handleMeasurePointerMove} surfaceId="floor" appliedMaterials={activeMaterials} materialConfigs={materialConfigs} activePaintMaterial={localActivePaint} onSurfacePainted={(sid, url) => { handleSurfacePainted(sid, url); setActiveSurfaceId(sid); }} />
                      <FoundationPart x={0} y={foundationHeight} z={lRightDepthIn} w={lBackWidthIn} h={subfloorThickness} d={lengthIn - lRightDepthIn} color="#d4d4d8" isMeasuring={isMeasuring} handleMeasureClick={handleMeasureClick} handleMeasurePointerMove={handleMeasurePointerMove} surfaceId="floor" appliedMaterials={activeMaterials} materialConfigs={materialConfigs} activePaintMaterial={localActivePaint} onSurfacePainted={(sid, url) => { handleSurfacePainted(sid, url); setActiveSurfaceId(sid); }} />
                    </>
                  )}
                  {shape === 'u-shape' && (
                    <>
                      <FoundationPart x={0} y={foundationHeight} z={0} w={uWallsIn.w7} h={subfloorThickness} d={uWallsIn.w8} color="#d4d4d8" isMeasuring={isMeasuring} handleMeasureClick={handleMeasureClick} handleMeasurePointerMove={handleMeasurePointerMove} surfaceId="floor" appliedMaterials={activeMaterials} materialConfigs={materialConfigs} activePaintMaterial={localActivePaint} onSurfacePainted={(sid, url) => { handleSurfacePainted(sid, url); setActiveSurfaceId(sid); }} />
                      <FoundationPart x={uWallsIn.w1 - uWallsIn.w3} y={foundationHeight} z={0} w={uWallsIn.w3} h={subfloorThickness} d={uWallsIn.w2} color="#d4d4d8" isMeasuring={isMeasuring} handleMeasureClick={handleMeasureClick} handleMeasurePointerMove={handleMeasurePointerMove} surfaceId="floor" appliedMaterials={activeMaterials} materialConfigs={materialConfigs} activePaintMaterial={localActivePaint} onSurfacePainted={(sid, url) => { handleSurfacePainted(sid, url); setActiveSurfaceId(sid); }} />
                      <FoundationPart x={uWallsIn.w7} y={foundationHeight} z={0} w={uWallsIn.w1 - uWallsIn.w3 - uWallsIn.w7} h={subfloorThickness} d={uWallsIn.w2 - uWallsIn.w4} color="#d4d4d8" isMeasuring={isMeasuring} handleMeasureClick={handleMeasureClick} handleMeasurePointerMove={handleMeasurePointerMove} surfaceId="floor" appliedMaterials={activeMaterials} materialConfigs={materialConfigs} activePaintMaterial={localActivePaint} onSurfacePainted={(sid, url) => { handleSurfacePainted(sid, url); setActiveSurfaceId(sid); }} />
                    </>
                  )}
                  {shape === 'h-shape' && (
                    <>
                      <FoundationPart x={0} y={foundationHeight} z={0} w={hLeftBarWidthIn} h={subfloorThickness} d={lengthIn} color="#d4d4d8" isMeasuring={isMeasuring} handleMeasureClick={handleMeasureClick} handleMeasurePointerMove={handleMeasurePointerMove} surfaceId="floor" appliedMaterials={activeMaterials} materialConfigs={materialConfigs} activePaintMaterial={localActivePaint} onSurfacePainted={(sid, url) => { handleSurfacePainted(sid, url); setActiveSurfaceId(sid); }} />
                      <FoundationPart x={hLeftBarWidthIn} y={foundationHeight} z={hMiddleBarOffsetIn} w={widthIn - hLeftBarWidthIn - hRightBarWidthIn} h={subfloorThickness} d={hMiddleBarHeightIn} color="#d4d4d8" isMeasuring={isMeasuring} handleMeasureClick={handleMeasureClick} handleMeasurePointerMove={handleMeasurePointerMove} surfaceId="floor" appliedMaterials={activeMaterials} materialConfigs={materialConfigs} activePaintMaterial={localActivePaint} onSurfacePainted={(sid, url) => { handleSurfacePainted(sid, url); setActiveSurfaceId(sid); }} />
                      <FoundationPart x={widthIn - hRightBarWidthIn} y={foundationHeight} z={0} w={hRightBarWidthIn} h={subfloorThickness} d={lengthIn} color="#d4d4d8" isMeasuring={isMeasuring} handleMeasureClick={handleMeasureClick} handleMeasurePointerMove={handleMeasurePointerMove} surfaceId="floor" appliedMaterials={activeMaterials} materialConfigs={materialConfigs} activePaintMaterial={localActivePaint} onSurfacePainted={(sid, url) => { handleSurfacePainted(sid, url); setActiveSurfaceId(sid); }} />
                    </>
                  )}
                  {shape === 't-shape' && (
                    <>
                      <FoundationPart x={0} y={foundationHeight} z={0} w={tTopWidthIn} h={subfloorThickness} d={tTopLengthIn} color="#d4d4d8" isMeasuring={isMeasuring} handleMeasureClick={handleMeasureClick} handleMeasurePointerMove={handleMeasurePointerMove} surfaceId="floor" appliedMaterials={activeMaterials} materialConfigs={materialConfigs} activePaintMaterial={localActivePaint} onSurfacePainted={(sid, url) => { handleSurfacePainted(sid, url); setActiveSurfaceId(sid); }} />
                      <FoundationPart x={(tTopWidthIn - tStemWidthIn) / 2} y={foundationHeight} z={tTopLengthIn} w={tStemWidthIn} h={subfloorThickness} d={tStemLengthIn} color="#d4d4d8" isMeasuring={isMeasuring} handleMeasureClick={handleMeasureClick} handleMeasurePointerMove={handleMeasurePointerMove} surfaceId="floor" appliedMaterials={activeMaterials} materialConfigs={materialConfigs} activePaintMaterial={localActivePaint} onSurfacePainted={(sid, url) => { handleSurfacePainted(sid, url); setActiveSurfaceId(sid); }} />
                    </>
                  )}
                  {shape === 'custom' && (combinedBlocks.length > 0 ? combinedBlocks : shapeBlocks).map(block => (
                    <FoundationPart key={block.id} x={block.x} y={foundationHeight} z={block.y} w={block.w} h={subfloorThickness} d={block.h} color="#d4d4d8" isMeasuring={isMeasuring} handleMeasureClick={handleMeasureClick} handleMeasurePointerMove={handleMeasurePointerMove} surfaceId="floor" appliedMaterials={activeMaterials} materialConfigs={materialConfigs} activePaintMaterial={localActivePaint} onSurfacePainted={(sid, url) => { handleSurfacePainted(sid, url); setActiveSurfaceId(sid); }} />
                  ))}
                </group>
              )}

              {/* ── Interior floor finish — sits on top of floor system, independently paintable ── */}
              {(addFloorFraming || noFramingFloorOnly || !addFloorFraming) && (() => {
                const ffy = foundationHeight + floorSystemHeight; // top of the full floor structure
                const ffh = 0.5; // thin finish layer (0.5")
                const ffColor = "#c8b89a"; // warm natural tone — overridden by applied texture
                const ffPaint = {
                  isMeasuring, handleMeasureClick, handleMeasurePointerMove,
                  surfaceId: "floor-finish" as string,
                  appliedMaterials: activeMaterials,
                  materialConfigs,
                  activePaintMaterial: localActivePaint,
                  onSurfacePainted: (sid: string, url: string) => { handleSurfacePainted(sid, url); setActiveSurfaceId(sid); },
                };
                if (shape === 'rectangle') return (
                  <FoundationPart key="ff-rect" x={0} y={ffy} z={0} w={widthIn} h={ffh} d={lengthIn} color={ffColor} {...ffPaint} />
                );
                if (shape === 'l-shape') return (
                  <>
                    <FoundationPart key="ff-l1" x={0} y={ffy} z={0} w={widthIn} h={ffh} d={lRightDepthIn} color={ffColor} {...ffPaint} />
                    <FoundationPart key="ff-l2" x={0} y={ffy} z={lRightDepthIn} w={lBackWidthIn} h={ffh} d={lengthIn - lRightDepthIn} color={ffColor} {...ffPaint} />
                  </>
                );
                if (shape === 'u-shape') return (
                  <>
                    <FoundationPart key="ff-u1" x={0} y={ffy} z={0} w={uWallsIn.w7} h={ffh} d={uWallsIn.w8} color={ffColor} {...ffPaint} />
                    <FoundationPart key="ff-u2" x={uWallsIn.w1 - uWallsIn.w3} y={ffy} z={0} w={uWallsIn.w3} h={ffh} d={uWallsIn.w2} color={ffColor} {...ffPaint} />
                    <FoundationPart key="ff-u3" x={uWallsIn.w7} y={ffy} z={0} w={uWallsIn.w1 - uWallsIn.w3 - uWallsIn.w7} h={ffh} d={uWallsIn.w2 - uWallsIn.w4} color={ffColor} {...ffPaint} />
                  </>
                );
                if (shape === 'h-shape') return (
                  <>
                    <FoundationPart key="ff-h1" x={0} y={ffy} z={0} w={hLeftBarWidthIn} h={ffh} d={lengthIn} color={ffColor} {...ffPaint} />
                    <FoundationPart key="ff-h2" x={hLeftBarWidthIn} y={ffy} z={hMiddleBarOffsetIn} w={widthIn - hLeftBarWidthIn - hRightBarWidthIn} h={ffh} d={hMiddleBarHeightIn} color={ffColor} {...ffPaint} />
                    <FoundationPart key="ff-h3" x={widthIn - hRightBarWidthIn} y={ffy} z={0} w={hRightBarWidthIn} h={ffh} d={lengthIn} color={ffColor} {...ffPaint} />
                  </>
                );
                if (shape === 't-shape') return (
                  <>
                    <FoundationPart key="ff-t1" x={0} y={ffy} z={0} w={tTopWidthIn} h={ffh} d={tTopLengthIn} color={ffColor} {...ffPaint} />
                    <FoundationPart key="ff-t2" x={(tTopWidthIn - tStemWidthIn) / 2} y={ffy} z={tTopLengthIn} w={tStemWidthIn} h={ffh} d={tStemLengthIn} color={ffColor} {...ffPaint} />
                  </>
                );
                if (shape === 'custom') return (
                  <>
                    {(combinedBlocks.length > 0 ? combinedBlocks : shapeBlocks).map(block => (
                      <FoundationPart key={`ff-c-${block.id}`} x={block.x} y={ffy} z={block.y} w={block.w} h={ffh} d={block.h} color={ffColor} {...ffPaint} />
                    ))}
                  </>
                );
                return null;
              })()}



              {walls.map((w, i) => {
                // Per-face IDs: exterior walls are ext-wall-N, interior/drywall are int-wall-N
                const isExt = w.color === "#e4e4e7" || w.color === "#c4a484";
                const isDrywall = w.color === "#ffffff";
                const isInt = !isExt && !isDrywall;
                const surfaceId = isExt ? `ext-wall-${i}` : isDrywall ? `drywall-${i}` : `int-wall-${i}`;
                const texUrl = activeMaterials[surfaceId];
                const cfg = texUrl ? materialConfigs[texUrl] : undefined;
                return (
                  <Wall key={i} {...w} openings={openings}
                    isMeasuring={isMeasuring} handleMeasureClick={handleMeasureClick} handleMeasurePointerMove={handleMeasurePointerMove}
                    surfaceId={surfaceId} appliedMaterials={activeMaterials}
                    materialConfigs={materialConfigs}
                    activePaintMaterial={localActivePaint}
                    onSurfacePainted={(sid, url) => {
                      handleSurfacePainted(sid, url);
                      setActiveSurfaceId(sid);
                    }}
                    splitAt={splitHeight}
                  />
                );
              })}
              {!isFloorPlanView && showRoof && roofs.map((roof, i) => {
                // Build a per-face paint map for this roof index
                const faceNames = roof.type === 'gable'
                  ? ['slope-left', 'slope-right', 'end-front', 'end-back']
                  : roof.type === 'hip'
                  ? ['slope-front', 'slope-back', 'slope-left', 'slope-right']
                  : ['slope', 'end-left', 'end-right']; // shed

                const facePaints = Object.fromEntries(faceNames.map(face => {
                  const sid = `roof-${i}-${face}`;
                  const tex = activeMaterials[sid];
                  const cfg = tex ? materialConfigs[tex] : undefined;
                  return [face, {
                    isPaintMode: !!localActivePaint,
                    textureUrl: tex,
                    materialConfig: cfg,
                    onPaintClick: () => {
                      if (localActivePaint) {
                        handleSurfacePainted(sid, localActivePaint);
                        setActiveSurfaceId(sid);
                      }
                    },
                  }];
                }));

                const baseProps = {
                  key: i,
                  x: roof.x, y: roof.y + totalBaseHeight + wallHeightIn, z: roof.z,
                  width: roof.width, length: roof.length,
                  ridgeHeight: roof.ridgeHeight, overhang: roof.overhang,
                  color: roof.color, ridgeDirection: roof.ridgeDirection,
                  facePaints,
                };

                return roof.type === 'gable' ? (
                  <GableRoof {...baseProps} />
                ) : roof.type === 'hip' ? (
                  <HipRoof {...baseProps} />
                ) : (
                  <ShedRoof {...baseProps} height={roof.ridgeHeight} />
                );
              })}


              {!isFloorPlanView && showRoof && dormers && dormers.map((d, i) => {
                const w = d.rotation === 0 ? d.widthIn : d.depthIn;
                const l = d.rotation === 0 ? d.depthIn : d.widthIn;
                
                const wallH = d.wallHeightIn ?? 48; // fallback to 48 if undefined
                const pitch = d.pitch ?? 6;
                const overhang = d.overhangIn ?? 12;
                const fascia = d.fasciaIn ?? 0;
                
                const eaveDrop = overhang * (pitch / 12);
                const ridgeH = (w / 2) * (pitch / 12) + eaveDrop;
                
                return (
                  <group key={`dormer-${i}`}>
                    {/* Walls */}
                    <mesh position={[d.x, totalBaseHeight + wallHeightIn + (wallH / 2), d.y]} castShadow receiveShadow>
                      <boxGeometry args={[w, wallH, l]} />
                      <meshStandardMaterial color="#e4e4e7" roughness={0.7} />
                    </mesh>
                    
                    {/* Roof */}
                    <DormerRoof 
                      x={d.x - w / 2 - overhang} 
                      y={totalBaseHeight + wallHeightIn + wallH - eaveDrop} 
                      z={d.y - l / 2 - overhang} 
                      w={w + 2 * overhang} 
                      l={l + 2 * overhang} 
                      ridgeH={ridgeH} 
                      isHoriz={d.rotation === 0}
                      fascia={fascia}
                      surfaceId={`dormer-roof-${i}`}
                      appliedMaterials={activeMaterials}
                      materialConfigs={materialConfigs}
                      isPaintMode={!!localActivePaint}
                      onSurfacePaintedFn={(faceId) => { if (localActivePaint) handleSurfacePainted(faceId, localActivePaint); }}
                    />
                  </group>
                );
              })}

              {/* Truss Runs */}
              {!isFloorPlanView && trussRuns.map((run, i) => {
                const w = run.rotation === 0 ? run.lengthFt * 12 : run.spanFt * 12;
                const d = run.rotation === 0 ? run.spanFt * 12 : run.lengthFt * 12;
                const rx = run.x - w / 2;
                const rz = run.y - d / 2;
                const y = totalBaseHeight + wallHeightIn;
                
                const trusses = [];
                if (run.type === 'Solid Shell') {
                  const overhang = run.overhangIn || 12;
                  const eaveDrop = overhang * (run.pitch / 12);
                  const fasciaIn = run.fasciaIn || 0;
                  const height = (run.spanFt * 12 / 2) * (run.pitch / 12) + eaveDrop;
                  return (
                    <group key={`run-${i}`}>
                      <DormerRoof
                        x={rx - overhang}
                        y={y - eaveDrop}
                        z={rz - overhang}
                        w={w + 2 * overhang}
                        l={d + 2 * overhang}
                        ridgeH={height}
                        isHoriz={run.rotation !== 0}
                        ridgeRatio={run.ridgeRatio !== undefined ? (run.ridgeRatio / 100) : 0.5}
                        fascia={fasciaIn}
                        color="#9ca3af"
                        surfaceId={`truss-shell-${run.id}`}
                        isPaintMode={!!activePaint}
                        appliedMaterials={activeMaterials}
                        materialConfigs={materialConfigs}
                        onSurfacePaintedFn={(faceId) => { if (activePaint) handleSurfacePainted(faceId, activePaint); }}
                      />
                    </group>
                  );
                }
                
                if (run.spacingIn > 0) {
                  if (run.rotation === 0) {
                    const numTrusses = Math.floor(w / run.spacingIn) + 1;
                    for (let j = 0; j < numTrusses; j++) {
                      const tx = rx + j * run.spacingIn;
                      
                      let cutsLeft = false;
                      let cutsRight = false;
                      if (dormers) {
                        const intersected = dormers.find(dorm => {
                          const dw = dorm.rotation === 0 ? dorm.widthIn : dorm.depthIn;
                          return tx >= dorm.x - dw / 2 && tx <= dorm.x + dw / 2;
                        });
                        if (intersected) {
                          if (intersected.y < rz + d / 2) cutsLeft = true;
                          else cutsRight = true;
                        }
                      }

                      trusses.push(
                        <TrussMesh 
                          key={`truss-${i}-${j}`} 
                          span={run.spanFt * 12} 
                          pitch={run.pitch} 
                          thickness={1.5} 
                          position={[tx - 1.5 / 2, y, rz + d / 2]} 
                          rotation={[0, Math.PI / 2, 0]} 
                          cutsLeft={cutsLeft}
                          cutsRight={cutsRight}
                          type={run.type}
                          customScript={run.customScript}
                        />
                      );
                    }
                  } else {
                    const numTrusses = Math.floor(d / run.spacingIn) + 1;
                    for (let j = 0; j < numTrusses; j++) {
                      const tz = rz + j * run.spacingIn;
                      
                      let cutsLeft = false;
                      let cutsRight = false;
                      if (dormers) {
                        const intersected = dormers.find(dorm => {
                          const dl = dorm.rotation === 0 ? dorm.depthIn : dorm.widthIn;
                          return tz >= dorm.y - dl / 2 && tz <= dorm.y + dl / 2;
                        });
                        if (intersected) {
                          if (intersected.x < rx + w / 2) cutsLeft = true;
                          else cutsRight = true;
                        }
                      }

                      trusses.push(
                        <TrussMesh 
                          key={`truss-${i}-${j}`} 
                          span={run.spanFt * 12} 
                          pitch={run.pitch} 
                          thickness={1.5} 
                          position={[rx + w / 2, y, tz - 1.5 / 2]} 
                          rotation={[0, 0, 0]} 
                          cutsLeft={cutsLeft}
                          cutsRight={cutsRight}
                          type={run.type}
                          customScript={run.customScript}
                        />
                      );
                    }
                  }
                }

                if (run.hasPlywood) {
                  const overhang = run.overhangIn || 12;
                  const eaveDrop = overhang * (run.pitch / 12);
                  const fasciaIn = run.fasciaIn || 0;
                  const height = (run.spanFt * 12 / 2) * (run.pitch / 12) + eaveDrop;
                  
                  trusses.push(
                    <DormerRoof
                      key={`plywood-${i}`}
                      x={rx - overhang}
                      y={y - eaveDrop + 0.5} 
                      z={rz - overhang}
                      w={w + 2 * overhang}
                      l={d + 2 * overhang}
                      ridgeH={height}
                      isHoriz={run.rotation !== 0}
                      ridgeRatio={run.ridgeRatio !== undefined ? (run.ridgeRatio / 100) : 0.5}
                      fascia={fasciaIn}
                      color="#deb887"
                      surfaceId={`truss-plywood-${run.id}`}
                      isPaintMode={!!activePaint}
                      appliedMaterials={activeMaterials}
                      materialConfigs={materialConfigs}
                      onSurfacePaintedFn={(faceId) => { if (activePaint) handleSurfacePainted(faceId, activePaint); }}
                    />
                  );
                }

                return <group key={`truss-run-${i}`}>{trusses}</group>;
              })}
              
              {/* Render shape blocks as semi-transparent guides while in custom mode */}
              {shape === 'custom' && shapeBlocks.map((block) => (
                <mesh key={block.id} position={[block.x + block.w / 2, foundationHeight / 2, block.y + block.h / 2]}>
                  <boxGeometry args={[block.w, foundationHeight || 4, block.h]} />
                  <meshStandardMaterial color="#4f46e5" transparent opacity={0.2} />
                </mesh>
              ))}

              {/* Reference Model */}
              {referenceModelUrl && (
                <Suspense fallback={null}>
                  <ReferenceModel 
                    url={referenceModelUrl} 
                    scale={modelScale} 
                    offset={modelOffset} 
                    rotation={modelRotation} 
                    opacity={modelOpacity}
                  />
                </Suspense>
              )}

              {/* Click catcher removed */}

              {/* Assets */}
              {assets.filter(a => (a.floorIndex || 0) === currentFloorIndex).map(asset => (
                <Asset key={asset.id} asset={asset} />
              ))}

              {/* Openings are now subtracted from walls using CSG, so we don't render them as dark boxes anymore */}
            </group>

              {/* ── Tape Measure Visualization ── */}
              {isMeasuring && (
                <group>
                  {/* Start point: small pulsing blue sphere */}
                  {measurePoints.length >= 1 && (
                    <mesh position={measurePoints[0]}>
                      <sphereGeometry args={[0.04, 16, 16]} />
                      <meshBasicMaterial color="#60a5fa" depthTest={false} />
                    </mesh>
                  )}

                  {/* Live dashed line to cursor */}
                  {measurePoints.length === 1 && currentMousePoint && (
                    <Line
                      points={[measurePoints[0], currentMousePoint]}
                      color={axisColor(liveAxis)}
                      lineWidth={2}
                      dashed
                      dashSize={0.15}
                      gapSize={0.1}
                      depthTest={false}
                    />
                  )}

                  {/* Cursor crosshair dot */}
                  {measurePoints.length === 1 && currentMousePoint && (
                    <mesh position={currentMousePoint}>
                      <sphereGeometry args={[0.03, 12, 12]} />
                      <meshBasicMaterial color={axisColor(liveAxis)} depthTest={false} />
                    </mesh>
                  )}
                </group>
              )}

              {/* Completed measurements */}
              {allMeasurements.map((m, i) => {
                const mid = new THREE.Vector3(
                  (m.points[0].x + m.points[1].x) / 2,
                  (m.points[0].y + m.points[1].y) / 2,
                  (m.points[0].z + m.points[1].z) / 2,
                );
                const col = '#ef4444'; // saved measurements in red
                return (
                  <group key={i}>
                    <mesh position={m.points[0]}>
                      <sphereGeometry args={[0.04, 12, 12]} />
                      <meshBasicMaterial color={col} depthTest={false} />
                    </mesh>
                    <mesh position={m.points[1]}>
                      <sphereGeometry args={[0.04, 12, 12]} />
                      <meshBasicMaterial color={col} depthTest={false} />
                    </mesh>
                    <Line
                      points={m.points}
                      color={col}
                      lineWidth={2}
                      dashed
                      dashSize={0.15}
                      gapSize={0.1}
                      depthTest={false}
                    />
                  </group>
                );
              })}


          
          <ContactShadows position={[0, -0.01, 0]} opacity={0.4} scale={40} blur={2} far={4.5} />
        </Suspense>
      </Canvas>
      
      {/* Live measurement label — follows cursor */}
      {isMeasuring && measurePoints.length === 1 && distance !== null && (
        <div
          className="absolute pointer-events-none z-30"
          style={{
            top: '50%', left: '50%',  // fallback; updated via CSS var trick below
          }}
        >
          {/* We use onPointerMove on the canvas wrapper below to position this */}
        </div>
      )}

      <div
        className="absolute inset-0"
        style={{ cursor: isMeasuring ? 'crosshair' : 'default', pointerEvents: 'none' }}
        onMouseMove={(e) => {
          if (!isMeasuring || measurePoints.length !== 1) return;
          setMeasureLabelPos({ x: e.clientX, y: e.clientY });
        }}
      />

      {/* Floating distance label following physical mouse */}
      {isMeasuring && measurePoints.length === 1 && distance !== null && measureLabelPos && (
        <div
          className="fixed pointer-events-none z-50"
          style={{ left: measureLabelPos.x + 16, top: measureLabelPos.y - 12 }}
        >
          <div className={`px-2 py-1 rounded text-xs font-bold text-white shadow-lg ${
            liveAxis === 'x' ? 'bg-red-600' :
            liveAxis === 'z' ? 'bg-blue-600' :
            liveAxis === 'y' ? 'bg-green-600' :
            'bg-black/80'
          }`}>
            {fmtDistance(distance)}
            {liveAxis && <span className="ml-1 opacity-70 uppercase text-[9px]">{liveAxis}</span>}
          </div>
        </div>
      )}

      <div className="absolute top-4 left-4 flex flex-col gap-2"
        onMouseMove={(e) => {
          if (!isMeasuring || measurePoints.length !== 1) return;
          setMeasureLabelPos({ x: e.clientX, y: e.clientY });
        }}
      >
        <button
          onClick={() => {
            setIsMeasuring(!isMeasuring);
            setMeasurePoints([]);
            setAxisLock(null);
          }}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            isMeasuring
              ? 'bg-indigo-600 text-white shadow-lg'
              : 'bg-white/80 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-200 hover:bg-white dark:hover:bg-zinc-700'
          }`}
        >
          {isMeasuring ? 'Stop' : <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15.5 2.5 5.8 5.8a1 1 0 0 1 0 1.4l-8.6 8.6a1 1 0 0 1-1.4 0l-5.8-5.8a1 1 0 0 1 0-1.4l8.6-8.6a1 1 0 0 1 1.4 0Z"/><path d="m17 7 3-3"/><path d="m13 11 3 3"/></svg>}
        </button>
        <button
          onClick={() => {
            setIsPainterOpen(v => !v);
            setIsMeasuring(false);
          }}
          title="Material Painter"
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            isPainterOpen
              ? 'bg-emerald-600 text-white shadow-lg'
              : 'bg-white/80 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-200 hover:bg-white dark:hover:bg-zinc-700'
          }`}
        >
          🎨
        </button>
        {isPainterOpen && (
          <MaterialEditorPanel
            activePaintMaterial={localActivePaint}
            onClose={() => { setIsPainterOpen(false); setLocalActivePaint(null); setActiveSurfaceId(null); }}
            onSelectTexture={(url) => setLocalActivePaint(url || null)}
            activeSurfaceId={activeSurfaceId}
            appliedMaterials={activeMaterials}
            materialConfigs={materialConfigs}
            onSurfaceConfigChange={(texUrl, cfg) => setMaterialConfigs(prev => ({ ...prev, [texUrl]: cfg }))}
            onSaveMaterialConfig={(texUrl, cfg) => {
              setMaterialConfigs(prev => ({ ...prev, [texUrl]: cfg }));
              fetch('http://localhost:3001/api/save-material-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ textureUrl: texUrl, config: cfg }),
              }).catch(console.error);
            }}
            onClearBrush={() => setLocalActivePaint(null)}
          />
        )}
        {isMeasuring && (
          <div className="bg-black/85 backdrop-blur-md px-3 py-2.5 rounded-xl text-sm text-white border border-white/10 shadow-xl mt-2 min-w-[200px]">
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-xs uppercase tracking-wider text-zinc-300">📏 Tape Measure</span>
              <button onClick={clearMeasurements} className="text-[10px] text-red-400 hover:text-red-300">Clear all</button>
            </div>

            {/* Axis lock indicator */}
            <div className="flex gap-1 mb-2">
              {(['x','y','z'] as const).map(ax => (
                <button
                  key={ax}
                  onClick={() => setAxisLock(prev => prev === ax ? null : ax)}
                  className={`flex-1 py-0.5 rounded text-[10px] font-bold uppercase transition-colors ${
                    axisLock === ax
                      ? ax === 'x' ? 'bg-red-600 text-white' : ax === 'z' ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'
                      : 'bg-white/10 text-zinc-400 hover:bg-white/20'
                  }`}
                >
                  {ax}
                </button>
              ))}
            </div>

            <p className="text-[10px] text-zinc-400 mb-1">
              {measurePoints.length === 0 ? '· Click a point to start' : '· Click end point to measure'}
            </p>

            {/* Live reading */}
            {distance !== null && (
              <div className={`font-bold text-lg leading-none ${
                liveAxis === 'x' ? 'text-red-400' : liveAxis === 'z' ? 'text-blue-400' : liveAxis === 'y' ? 'text-green-400' : 'text-white'
              }`}>
                {fmtDistance(distance)}
              </div>
            )}

            {/* Saved measurements */}
            {allMeasurements.length > 0 && (
              <div className="mt-2 pt-2 border-t border-white/10 space-y-1">
                {allMeasurements.map((m, i) => (
                  <div key={i} className="flex justify-between text-[11px] text-zinc-300">
                    <span className="text-zinc-500">{i + 1}.</span>
                    <span className="font-semibold text-red-300">{fmtDistance(m.distance)}</span>
                  </div>
                ))}
              </div>
            )}

            <p className="text-[9px] text-zinc-600 mt-2">Press X/Y/Z to lock axis · Esc to unlock</p>
          </div>
        )}
      </div>
      
      {/* View Presets */}
      <div className="absolute top-4 right-4 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-md rounded-lg border border-zinc-200 dark:border-zinc-700 shadow-sm p-1.5 flex flex-col gap-1 items-end pointer-events-auto">
        <div className="flex gap-1">
          <button 
            onClick={() => {
              const next = !isFloorPlanView;
              setIsFloorPlanView(next);
              if (next) setCameraPresetTrigger(`${Date.now()}-top`);
            }} 
            className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded transition-colors ${isFloorPlanView ? 'bg-indigo-600 text-white' : 'text-zinc-600 dark:text-zinc-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400'}`}
          >
            {isFloorPlanView ? 'Exit Floor Plan' : 'Floor Plan'}
          </button>
          <div className="w-px bg-zinc-200 dark:bg-zinc-700 mx-1"></div>
          <button onClick={() => setCameraPresetTrigger(`${Date.now()}-top`)} className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 rounded transition-colors">Top</button>
          <button onClick={() => setCameraPresetTrigger(`${Date.now()}-front`)} className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 rounded transition-colors">Front</button>
          <button onClick={() => setCameraPresetTrigger(`${Date.now()}-back`)} className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 rounded transition-colors">Back</button>
          <button onClick={() => setCameraPresetTrigger(`${Date.now()}-left`)} className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 rounded transition-colors">Left</button>
          <button onClick={() => setCameraPresetTrigger(`${Date.now()}-right`)} className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 rounded transition-colors">Right</button>
        </div>
        
        {customCameras.length > 0 && (
          <div className="flex gap-1 w-full justify-end border-t border-zinc-100 dark:border-zinc-700 pt-1 mt-1">
            {customCameras.map(cam => (
              <button 
                key={cam.id}
                onClick={() => setCameraPresetTrigger(`${Date.now()}-${cam.id}`)} 
                className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-emerald-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded transition-colors border border-indigo-100 dark:border-emerald-900/30"
              >
                {cam.name}
              </button>
            ))}
          </div>
        )}
      </div>
      
      <div className="absolute bottom-4 right-4 bg-white/80 dark:bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-zinc-200 dark:border-white/10 text-[10px] text-zinc-600 dark:text-zinc-300 font-medium pointer-events-none shadow-sm">
        Left-click to rotate • Right-click to pan • Scroll to zoom
      </div>
    </div>
  );
}
