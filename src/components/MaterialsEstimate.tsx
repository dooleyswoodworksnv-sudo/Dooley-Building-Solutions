import React, { useMemo, useState } from 'react';
import { AppState, MaterialCosts, DEFAULT_MATERIAL_COSTS } from '../App';
import { sanitize } from '../utils/math';
import { Calculator, DollarSign, Package, Edit2, Save, X } from 'lucide-react';

interface Props {
  state: AppState;
  onUpdateCosts: (costs: MaterialCosts) => void;
}

export default function MaterialsEstimate({ state, onUpdateCosts }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [editCosts, setEditCosts] = useState<MaterialCosts>(state.materialCosts || DEFAULT_MATERIAL_COSTS);

  React.useEffect(() => {
    if (!isEditing) {
      setEditCosts(state.materialCosts || DEFAULT_MATERIAL_COSTS);
    }
  }, [state.materialCosts, isEditing]);

  const handleSaveCosts = () => {
    onUpdateCosts(editCosts);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditCosts(state.materialCosts || DEFAULT_MATERIAL_COSTS);
    setIsEditing(false);
  };

  const estimate = useMemo(() => {
    let extWallLengthIn = 0;

    const w = state.widthFt * 12 + state.widthInches;
    const l = state.lengthFt * 12 + state.lengthInches;

    if (state.shape === 'custom') {
      state.exteriorWalls.forEach(wall => extWallLengthIn += (wall.lengthFt * 12 + wall.lengthInches));
    } else if (state.shape === 'u-shape') {
      const w1 = state.uWalls.w1 * 12 + state.uWallsInches.w1;
      const w2 = state.uWalls.w2 * 12 + state.uWallsInches.w2;
      const w3 = state.uWalls.w3 * 12 + state.uWallsInches.w3;
      const w4 = state.uWalls.w4 * 12 + state.uWallsInches.w4;
      const w5 = state.uWalls.w5 * 12 + state.uWallsInches.w5;
      const w6 = state.uWalls.w6 * 12 + state.uWallsInches.w6;
      const w7 = state.uWalls.w7 * 12 + state.uWallsInches.w7;
      const w8 = state.uWalls.w8 * 12 + state.uWallsInches.w8;
      extWallLengthIn = w1 + w2 + w3 + w4 + w5 + w6 + w7 + w8;
    } else if (state.shape === 'h-shape') {
      const hMiddleBarHeightIn = state.hMiddleBarHeightFt * 12 + state.hMiddleBarHeightInches;
      extWallLengthIn = (w + l) * 2 + 2 * (l - hMiddleBarHeightIn);
    } else {
      // rectangle, l-shape, t-shape all have perimeter equal to their bounding box
      extWallLengthIn = (w + l) * 2;
    }

    let totalWallLengthIn = extWallLengthIn;
    state.interiorWalls.forEach(wall => totalWallLengthIn += (wall.lengthFt * 12 + wall.lengthInches));

    const totalWallLengthFt = totalWallLengthIn / 12;
    const wallHeightFt = state.wallHeightFt + state.wallHeightInches / 12;
    const totalWallAreaSqFt = totalWallLengthFt * wallHeightFt;
    const extWallAreaSqFt = (extWallLengthIn / 12) * wallHeightFt;

    // Studs (approx 1 per studSpacing, plus extras for corners/openings)
    const baseStuds = Math.ceil(totalWallLengthIn / state.studSpacing);
    const extraStuds = (state.shape === 'custom' ? state.exteriorWalls.length : 8) + state.interiorWalls.length * 2 + (state.doors.length + state.windows.length) * 4;
    const totalStuds = baseStuds + extraStuds;

    // Plates (Top and Bottom)
    const totalPlatesFt = totalWallLengthFt * (state.bottomPlates + state.topPlates);
    const totalPlates = Math.ceil(totalPlatesFt / 8); // Assuming 8' plates

    // Sheathing (Exterior only)
    const sheathingSheets = (state.addSheathing || state.solidWallsOnly || state.noFramingFloorOnly) ? Math.ceil(extWallAreaSqFt / 32) : 0; // 4x8 sheet = 32 sq ft

    // Drywall (Interior and Exterior)
    const drywallSheets = (state.addDrywall || state.solidWallsOnly || state.noFramingFloorOnly) ? Math.ceil((totalWallAreaSqFt * 2) / 32) : 0; // Assuming both sides for interior, one for exterior (simplified)

    // Insulation (Exterior walls)
    const insulationRolls = (state.addInsulation || state.solidWallsOnly || state.noFramingFloorOnly) ? Math.ceil(extWallAreaSqFt / 40) : 0; // Assuming 40 sq ft per roll

    // Foundation Concrete (Simplified for bounding box area)
    let concreteCy = 0;
    if (state.foundationType !== 'none') {
      let areaSqFt = w * l / 144;
      if (state.shape === 'l-shape') {
        const l1 = state.lRightDepthFt * 12 + state.lRightDepthInches;
        const w2 = state.lBackWidthFt * 12 + state.lBackWidthInches;
        areaSqFt = (w * l1 + w2 * (l - l1)) / 144;
      }
      // For simplicity on other shapes, we use bounding box or rough estimate
      const volumeCuFt = areaSqFt * (state.slabThicknessIn / 12);
      concreteCy = volumeCuFt / 27;
    }

    // Floor Joists
    let floorJoists = 0;
    let subfloorSheets = 0;
    if (state.addFloorFraming || state.noFramingFloorOnly) {
      const areaSqFt = w * l / 144;
      const spanIn = state.joistDirection === 'y' ? l : w;
      floorJoists = Math.ceil(spanIn / state.joistSpacing);
      subfloorSheets = (state.addSubfloor || state.noFramingFloorOnly) ? Math.ceil(areaSqFt / 32) : 0;
    }

    // Roof Framing
    let roofTrusses = 0;
    let roofSheathingSheets = 0;
    if (state.roofParts.length > 0 || state.trussRuns.length > 0) {
      const footprintAreaSqFt = w * l / 144;
      const pitchFactor = Math.sqrt(1 + Math.pow(state.roofPitch / 12, 2));
      const overhangFt = state.roofOverhangIn / 12;
      
      // Rough estimate for roof area including overhangs
      const roofAreaSqFt = (state.widthFt + 2 * overhangFt) * (state.lengthFt + 2 * overhangFt) * pitchFactor;
      
      roofTrusses = Math.ceil((state.lengthFt * 12) / state.trussSpacing) + 1;
      roofSheathingSheets = Math.ceil(roofAreaSqFt / 32);
    }

    // Basic Cost Assumptions (National Averages)
    const prices = state.materialCosts || DEFAULT_MATERIAL_COSTS;

    const costs = {
      studs: totalStuds * prices.stud,
      plates: totalPlates * prices.plate,
      sheathing: sheathingSheets * prices.sheathing,
      drywall: drywallSheets * prices.drywall,
      insulation: insulationRolls * prices.insulation,
      concrete: concreteCy * prices.concrete,
      joists: floorJoists * prices.joist,
      subfloor: subfloorSheets * prices.subfloor,
      doors: state.doors.length * prices.door,
      windows: state.windows.length * prices.window,
      trusses: roofTrusses * prices.truss,
      roofSheathing: roofSheathingSheets * prices.roofSheathing
    };

    const totalCost = Object.values(costs).reduce((a, b) => a + b, 0);

    return {
      quantities: {
        studs: totalStuds,
        plates: totalPlates,
        sheathing: sheathingSheets,
        drywall: drywallSheets,
        insulation: insulationRolls,
        concrete: concreteCy.toFixed(1),
        joists: floorJoists,
        subfloor: subfloorSheets,
        doors: state.doors.length,
        windows: state.windows.length,
        trusses: roofTrusses,
        roofSheathing: roofSheathingSheets
      },
      costs,
      totalCost
    };
  }, [state]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const handleCostChange = (key: keyof MaterialCosts, value: string) => {
    const numValue = parseFloat(value);
    setEditCosts(prev => ({
      ...prev,
      [key]: isNaN(numValue) ? 0 : numValue
    }));
  };

  const displayTotalCost = isEditing 
    ? Object.keys(editCosts).reduce((total, key) => {
        const qtyKey = key === 'stud' ? 'studs' : 
                       key === 'plate' ? 'plates' : 
                       key === 'joist' ? 'joists' : 
                       key === 'door' ? 'doors' : 
                       key === 'window' ? 'windows' : key;
        return total + Number(estimate.quantities[qtyKey as keyof typeof estimate.quantities]) * editCosts[key as keyof MaterialCosts];
      }, 0)
    : estimate.totalCost;

  return (
    <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#252526] space-y-4">
      <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">Estimated Material Cost</span>
          <DollarSign size={16} className="text-emerald-600 dark:text-emerald-500" />
        </div>
        <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300">
          {formatCurrency(displayTotalCost)}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-2">
            <Package size={14} className="text-indigo-500 dark:text-indigo-400" />
            Materials Spreadsheet
          </h3>
          {!isEditing ? (
            <button 
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded text-[10px] font-bold uppercase tracking-wider transition-colors border border-zinc-200 dark:border-zinc-700 shadow-sm"
            >
              <Edit2 size={12} />
              Edit Costs
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button 
                onClick={handleCancelEdit}
                className="flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-zinc-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 rounded text-[10px] font-bold uppercase tracking-wider transition-colors border border-zinc-200 dark:border-zinc-700 shadow-sm"
              >
                <X size={12} />
                Cancel
              </button>
              <button 
                onClick={handleSaveCosts}
                className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded text-[10px] font-bold uppercase tracking-wider transition-colors shadow-sm"
              >
                <Save size={12} />
                Save
              </button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-[#1E1E1E] shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-100 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400 uppercase tracking-wider text-[9px] border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="px-3 py-2 font-bold">Material</th>
                <th className="px-3 py-2 font-bold text-right">Qty</th>
                <th className="px-3 py-2 font-bold text-right">Unit Cost</th>
                <th className="px-3 py-2 font-bold text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
              {[
                { id: 'stud', name: "Wall Studs (8')", qty: estimate.quantities.studs, active: true },
                { id: 'plate', name: "Plates (8')", qty: estimate.quantities.plates, active: true },
                { id: 'sheathing', name: "Sheathing (4x8)", qty: estimate.quantities.sheathing, active: state.addSheathing || state.solidWallsOnly },
                { id: 'drywall', name: "Drywall (4x8)", qty: estimate.quantities.drywall, active: state.addDrywall || state.solidWallsOnly },
                { id: 'insulation', name: "Insulation (Rolls)", qty: estimate.quantities.insulation, active: state.addInsulation || state.solidWallsOnly },
                { id: 'concrete', name: "Concrete (CY)", qty: estimate.quantities.concrete, active: state.foundationType !== 'none' },
                { id: 'joist', name: "Floor Joists", qty: estimate.quantities.joists, active: state.addFloorFraming },
                { id: 'subfloor', name: "Subfloor (4x8)", qty: estimate.quantities.subfloor, active: state.addFloorFraming && state.addSubfloor },
                { id: 'door', name: "Doors", qty: estimate.quantities.doors, active: state.doors.length > 0 },
                { id: 'window', name: "Windows", qty: estimate.quantities.windows, active: state.windows.length > 0 },
                { id: 'truss', name: "Roof Trusses", qty: estimate.quantities.trusses, active: state.trussRuns.length > 0 },
                { id: 'roofSheathing', name: "Roof Sheathing", qty: estimate.quantities.roofSheathing, active: state.roofParts.length > 0 },
              ].map((item) => {
                const currentCost = isEditing ? editCosts[item.id as keyof MaterialCosts] : (state.materialCosts || DEFAULT_MATERIAL_COSTS)[item.id as keyof MaterialCosts];
                const totalCost = Number(item.qty) * currentCost;
                
                return (
                <tr key={item.id} className={`${item.active ? 'bg-white dark:bg-[#1E1E1E]' : 'bg-zinc-50/50 dark:bg-zinc-800/30 opacity-60'}`}>
                  <td className="px-3 py-2 font-medium text-zinc-800 dark:text-zinc-200">{item.name}</td>
                  <td className="px-3 py-2 text-right text-zinc-600 dark:text-zinc-400">{item.qty}</td>
                  <td className="px-3 py-2 text-right">
                    {isEditing ? (
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-zinc-400 dark:text-zinc-500">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={sanitize(editCosts[item.id as keyof MaterialCosts])}
                          onChange={(e) => handleCostChange(item.id as keyof MaterialCosts, e.target.value)}
                          className="w-16 px-1 py-0.5 text-right bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:text-zinc-200"
                        />
                      </div>
                    ) : (
                      <span className="text-zinc-600 dark:text-zinc-400">{formatCurrency(currentCost)}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-medium text-zinc-800 dark:text-zinc-200">{formatCurrency(totalCost)}</td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
