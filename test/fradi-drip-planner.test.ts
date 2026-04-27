import { expect, test } from 'bun:test';

import { designGarden } from '../docs/app/engine.js';
import cropsCatalog from '../docs/data/crops-catalog.json';
import extrusionProfiles from '../docs/data/extrusion-profiles.json';
import mouldCatalog from '../docs/data/mould-catalog.json';
import partsCatalog from '../docs/data/parts-catalog.json';

const catalogs = {
  crops: cropsCatalog.crops,
  parts: partsCatalog.parts,
  extrusion_profiles: extrusionProfiles.profiles,
  moulds: mouldCatalog.moulds
};

test('designGarden allocates the full plot and produces realistic BOM values', async () => {
  const design = await designGarden({
    size: { length: 3, width: 4 },
    ground: { soil: 'loamy', slope: 'flat', direction: 'N' },
    water: { source: 'jerrycan', distance: 'next', height: 'level', cans: 2 },
    clarity: 'clear',
    tank: { type: 'none', litres: 0 },
    crops: new Set(['tomato', 'kale', 'spinach']),
    confirm: { name: 'Test Gardener', language: 'en' }
  }, catalogs);

  const allocatedArea = design.beds.reduce((sum, bed) => sum + bed.area_m2, 0);

  expect(allocatedArea).toBeCloseTo(design.plot.area_m2, 1);
  expect(design.bom.tubing_grams).toBeGreaterThan(100);
  expect(design.bom.wicks_grams).toBeGreaterThan(50);
  expect(design.watering_schedule.runtime_hours).toBeLessThan(24);
});
