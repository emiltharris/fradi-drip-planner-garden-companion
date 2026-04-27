/**
 * FRADI Drip Planner — Deterministic Design Engine
 *
 * Pure function: intake answers + catalogs → complete drip irrigation design
 * No side effects, fully testable, deterministic output
 */

// ============================================================================
// Main Entry Point
// ============================================================================

export async function designGarden(answers, catalogs) {
  // Validate inputs
  if (!answers || !catalogs) {
    throw new Error('designGarden requires (answers, catalogs)');
  }

  // Extract crop info from catalog
  const selectedCrops = Array.from(answers.crops || [])
    .map(cropId => catalogs.crops.find(c => c.id === cropId))
    .filter(Boolean);

  if (selectedCrops.length === 0) {
    throw new Error('No crops selected');
  }

  // Layout beds across the plot
  const plotArea = answers.size.length * answers.size.width;
  const beds = layoutBeds(
    plotArea,
    selectedCrops,
    answers.ground.slope,
    answers.water.distance
  );

  // Compute per-bed tubing and dripper counts
  beds.forEach(bed => {
    const crop = selectedCrops.find(c => c.id === bed.crop_id);
    bed.spacing_cm = crop.spacing_cm;
    bed.tubing_m = bed.length_m;
    bed.dripper_count = Math.ceil(bed.length_m * 100 / bed.spacing_cm);
    bed.water_l_per_day = bed.dripper_count * crop.water_l_per_plant_per_day;
  });

  // Total water demand
  const dailyWaterL = beds.reduce((sum, bed) => sum + bed.water_l_per_day, 0);

  // Compute daily water available from intake
  const cansPerDay = answers.water.cans;
  const waterAvailableL = cansPerDay * 20; // 20L per jerry can

  // BOM: bill of materials
  const tubeGramsPerMeter = resolveTubingGramsPerMeter(catalogs.parts);
  const totalTubingM = beds.reduce((sum, bed) => sum + bed.tubing_m, 0);
  const totalTubingGrams = totalTubingM * tubeGramsPerMeter;

  const totalDrippers = beds.reduce((sum, bed) => sum + bed.dripper_count, 0);
  const wickGramsPerMeter = resolvePartGramsPerMeter(catalogs.parts, 'cotton-wick-tape', 12);
  const totalWickM = totalTubingM; // one wick per meter of tubing
  const totalWickGrams = totalWickM * wickGramsPerMeter;

  // Manifold: pick based on number of beds
  const bedsPerManifold = 4; // one 4-outlet manifold per 4 beds max
  const manifoldCount = Math.ceil(beds.length / bedsPerManifold);

  // Connectors: one per bed
  const connectorCount = beds.length;

  const bom = {
    tubing_m: totalTubingM,
    tubing_grams: Math.round(totalTubingGrams),
    wicks_m: totalWickM,
    wicks_grams: Math.round(totalWickGrams),
    drippers_count: totalDrippers,
    manifolds_count: manifoldCount,
    connectors_count: connectorCount
  };

  // Manufacturing times and settings
  const manufacturing = computeManufacturing(bom, catalogs);

  // Watering schedule
  const schedule = computeWateringSchedule(
    dailyWaterL,
    waterAvailableL,
    totalDrippers,
    answers.water.source,
    answers.tank.type
  );

  return {
    plot: {
      length_m: answers.size.length,
      width_m: answers.size.width,
      area_m2: plotArea,
      soil: answers.ground.soil,
      slope: answers.ground.slope,
      water_direction: answers.ground.direction,
      water_clarity: answers.clarity
    },
    beds,
    daily_water_l: Math.round(dailyWaterL * 10) / 10,
    water_available_l: waterAvailableL,
    bom,
    manufacturing,
    watering_schedule: schedule,
    gardener_name: answers.confirm.name,
    language: answers.confirm.language
  };
}

// ============================================================================
// Layout: Divide plot into beds for each crop
// ============================================================================

function layoutBeds(areaM2, crops, slope, waterDistance) {
  // Simple layout: allocate area proportionally to crop water demand
  const totalWaterDemand = crops.reduce((sum, c) => sum + c.water_l_per_plant_per_day, 0);

  // Assume beds are 1.2m wide (standard), adjust length per crop
  const bedWidth = 1.2;
  const beds = [];

  crops.forEach((crop, idx) => {
    const areaShare = (crop.water_l_per_plant_per_day / totalWaterDemand) * areaM2;
    const bedLength = areaShare / bedWidth;

    beds.push({
      crop_id: crop.id,
      crop_name: crop.name.en,
      width_m: bedWidth,
      length_m: Math.round(bedLength * 100) / 100,
      area_m2: Math.round(areaShare * 100) / 100,
      index: idx + 1
    });
  });

  return beds;
}

// ============================================================================
// Manufacturing: Compute shredder, extruder, moulder times
// ============================================================================

function computeManufacturing(bom, catalogs) {
  // Extrusion Pro V4 specs from catalog
  const hdpeProfile = catalogs.extrusion_profiles[0]; // hdpe-tubing-v4
  const throughputKgHr = hdpeProfile.throughput_kg_per_hr;
  const extrusionRuntimeMin = (bom.tubing_grams / 1000 / throughputKgHr) * 60;

  // Shredder: input HDPE with 10% loss factor
  const hdpeInputKg = (bom.tubing_grams / 1000) * 1.1;

  // Moulder: manifold + connector cycles
  const manifoldMould = catalogs.moulds.find(m => m.id === 'manifold-mould-std');
  const connectorMould = catalogs.moulds.find(m => m.id === 'connector-mould-m16');

  const manifoldCycleSec = manifoldMould.cycle_seconds;
  const connectorCycleSec = connectorMould.cycle_seconds;

  const manifoldTotalSec = bom.manifolds_count * manifoldCycleSec;
  const connectorTotalSec = bom.connectors_count * connectorCycleSec;
  const moulderTotalMin = (manifoldTotalSec + connectorTotalSec) / 60;

  return {
    shredder: {
      polymer: 'HDPE',
      sieve_size_mm: 3, // tubing extrusion uses finer sieve
      kg_input: Math.round(hdpeInputKg * 100) / 100,
      notes: 'Includes 10% loss factor for resin'
    },
    extruder: {
      polymer: 'HDPE',
      profile_id: 'hdpe-tubing-v4',
      total_m: bom.tubing_m,
      zone_temps_celsius: hdpeProfile.zone_temps_celsius,
      screw_rpm: hdpeProfile.screw_rpm,
      runtime_min: Math.round(extrusionRuntimeMin),
      throughput_kg_per_hr: throughputKgHr
    },
    moulder: {
      manifolds: {
        count: bom.manifolds_count,
        cycle_sec: manifoldCycleSec,
        total_sec: manifoldTotalSec,
        barrel_temp: manifoldMould.barrel_temp_celsius,
        polymer: 'PP'
      },
      connectors: {
        count: bom.connectors_count,
        cycle_sec: connectorCycleSec,
        total_sec: connectorTotalSec,
        barrel_temp: connectorMould.barrel_temp_celsius,
        polymer: 'PP'
      },
      total_min: Math.round(moulderTotalMin)
    }
  };
}

// ============================================================================
// Watering Schedule: Frequency, duration, time of day
// ============================================================================

function computeWateringSchedule(dailyWaterL, waterAvailableL, emitterCount, waterSource, tankType) {
  const runsPerDay = waterAvailableL >= dailyWaterL ? 1 : 2;
  const waterPerRun = dailyWaterL / runsPerDay;

  // Cotton wick flow is per emitter, not for the entire system.
  const totalFlowRateLHr = Math.max(emitterCount, 1) * 0.3;
  const runTimeHours = waterPerRun / totalFlowRateLHr;

  const timeOfDay = waterSource === 'tap' ? '06:00' : '07:00'; // Early morning watering

  return {
    runs_per_day: runsPerDay,
    water_per_run_l: Math.round(waterPerRun * 10) / 10,
    runtime_hours: Math.round(runTimeHours * 100) / 100,
    time_of_day: timeOfDay,
    frequency_text: runsPerDay === 1 ? 'Once daily' : 'Twice daily',
    notes: `Cotton wicks deliver water at capillary rate. ${tankType === 'none' ? 'Manual watering with jerry cans.' : 'Tank gravity feed available.'}`
  };
}

function resolvePartGramsPerMeter(parts, partId, fallback) {
  const part = parts?.find(item => item.id === partId);
  if (typeof part?.grams_per_meter === 'number' && Number.isFinite(part.grams_per_meter) && part.grams_per_meter > 0) {
    return part.grams_per_meter;
  }
  return fallback;
}

function resolveTubingGramsPerMeter(parts) {
  const tubing = parts?.find(item => item.id === 'hdpe-lateral-16-perforated');
  if (!tubing) {
    return 65;
  }

  if (typeof tubing.grams_per_meter === 'number' && tubing.grams_per_meter >= 1) {
    return tubing.grams_per_meter;
  }

  const outerDiameterMm = Number(tubing.od_mm);
  const innerDiameterMm = Number(tubing.id_mm);
  if (outerDiameterMm > innerDiameterMm && innerDiameterMm > 0) {
    const outerRadiusM = outerDiameterMm / 2000;
    const innerRadiusM = innerDiameterMm / 2000;
    const crossSectionM2 = Math.PI * (outerRadiusM ** 2 - innerRadiusM ** 2);
    const hdpeDensityKgPerM3 = 950;
    return crossSectionM2 * hdpeDensityKgPerM3 * 1000;
  }

  return 65;
}

// ============================================================================
// Test Harness — Run this file directly to verify
// ============================================================================

async function testEngine() {
  // Load catalogs (in real app, these would come from /data/*.json via fetch)
  const mockCatalogs = {
    crops: [
      {
        id: 'tomato',
        name: { en: 'Tomato', sw: 'Nyanya', ar: 'الطماطم', so: 'Tomaato' },
        water_l_per_plant_per_day: 4.0,
        spacing_cm: 45,
        sun_min_hours: 6,
        growing_season_months: 7
      },
      {
        id: 'kale',
        name: { en: 'Kale', sw: 'Sukuma Kidogo', ar: 'الكرنب الأجعد', so: 'Kale' },
        water_l_per_plant_per_day: 2.5,
        spacing_cm: 35,
        sun_min_hours: 4,
        growing_season_months: 5
      },
      {
        id: 'spinach',
        name: { en: 'Spinach', sw: 'Mchicha', ar: 'السبانخ', so: 'Spinach' },
        water_l_per_plant_per_day: 1.5,
        spacing_cm: 12,
        sun_min_hours: 3,
        growing_season_months: 3
      }
    ],
    extrusion_profiles: [
      {
        id: 'hdpe-tubing-v4',
        polymer: 'HDPE',
        machine: 'Precious Plastic Extrusion Pro V4',
        screw_rpm: 50,
        throughput_kg_per_hr: 8,
        zone_temps_celsius: { feed: 170, barrel: 190, nozzle: 210 }
      }
    ],
    moulds: [
      {
        id: 'manifold-mould-std',
        name: 'Custom Manifold Chamber Mould',
        part_id: 'pp-manifold-chamber',
        cycle_seconds: 60,
        barrel_temp_celsius: 215
      },
      {
        id: 'connector-mould-m16',
        name: 'Custom M16 Barbed Connector Mould',
        part_id: 'pp-connector-m16',
        cycle_seconds: 20,
        barrel_temp_celsius: 212
      }
    ]
  };

  // Mock intake answers: 3m × 4m plot, loamy soil, flat, jerrycan 2/day, 3 crops
  const testAnswers = {
    size: { length: 3, width: 4 },
    ground: { soil: 'loamy', slope: 'flat', direction: 'N' },
    water: { source: 'jerrycan', distance: 'next', height: 'level', cans: 2 },
    clarity: 'clear',
    tank: { type: 'none', litres: 0 },
    crops: new Set(['tomato', 'kale', 'spinach']),
    confirm: { name: 'Test Gardener', language: 'sw' }
  };

  try {
    const design = await designGarden(testAnswers, mockCatalogs);
    console.log('✓ Test Design Generated:', design);
    return design;
  } catch (err) {
    console.error('✗ Test Failed:', err.message);
    throw err;
  }
}

// Auto-run test if this file is loaded directly (not imported as module)
if (typeof module !== 'undefined' && require.main === module) {
  testEngine();
}

// Also run test on browser load (if this script is a standalone test)
if (typeof window !== 'undefined') {
  window.testFRADIEngine = testEngine;
  console.log('Test harness loaded. Run testFRADIEngine() in console.');
}
