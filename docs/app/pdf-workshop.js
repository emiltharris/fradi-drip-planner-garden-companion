/**
 * FRADI Drip Planner — Workshop Build Sheet PDF
 *
 * Technical document for FRADI staff: BOM, extrusion settings, moulder cycles
 * 1-2 pages, A4 portrait, English
 */

import { PDFDocument, PDFPage, rgb } from 'https://esm.sh/pdf-lib';

export async function generateWorkshopPDF(design) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4 portrait

  const margins = { top: 40, left: 40, right: 40, bottom: 40 };
  let y = 842 - margins.top;

  // ========== HEADER ==========
  page.drawText('FRADI Drip Planner — Workshop Build Sheet', {
    x: margins.left,
    y,
    size: 18,
    color: rgb(22 / 255, 129 / 255, 87 / 255),
  });
  y -= 30;

  const headerInfo = [
    `Gardener: ${design.gardener_name}`,
    `Plot: ${design.plot.length_m}m × ${design.plot.width_m}m (${design.plot.area_m2} m²)`,
    `Generated: ${new Date().toISOString().split('T')[0]}`,
    `Daily Water: ${design.daily_water_l}L (${design.bom.drippers_count} drippers)`
  ];
  headerInfo.forEach(line => {
    page.drawText(line, { x: margins.left, y, size: 10, color: rgb(0, 0, 0) });
    y -= 14;
  });
  y -= 10;

  // ========== BILL OF MATERIALS ==========
  drawSection(page, 'Bill of Materials', margins.left, y);
  y -= 22;

  const bomRows = [
    ['Part', 'Qty', 'Material', 'Total Weight'],
    ['HDPE Lateral Tubing 16mm', `${design.bom.tubing_m}m`, 'HDPE', `${design.bom.tubing_grams}g`],
    ['Cotton Wick Tape', `${design.bom.wicks_m}m`, 'Cotton', `${design.bom.wicks_grams}g`],
    ['PP Manifold 4-outlet', design.bom.manifolds_count, 'PP', `${design.bom.manifolds_count * 12}g`],
    ['PP Barbed Connector M16', design.bom.connectors_count, 'PP', `${design.bom.connectors_count * 2.5}g`]
  ];

  y = drawTable(page, bomRows, margins.left, y, [120, 60, 80, 100]);
  y -= 15;

  // ========== SHREDDER SECTION ==========
  drawSection(page, 'Shredder Pro V4', margins.left, y);
  y -= 22;

  const shredderData = design.manufacturing.shredder;
  const shredderInfo = [
    `Polymer: ${shredderData.polymer}`,
    `Sieve Size: ${shredderData.sieve_size_mm}mm`,
    `Total Feedstock: ${shredderData.kg_input} kg (includes 10% loss)`,
    `Notes: ${shredderData.notes}`
  ];
  shredderInfo.forEach(line => {
    page.drawText(line, { x: margins.left + 10, y, size: 9, color: rgb(0, 0, 0) });
    y -= 12;
  });
  y -= 10;

  // ========== EXTRUDER SECTION ==========
  drawSection(page, 'Extrusion Pro V4 — HDPE Tubing', margins.left, y);
  y -= 22;

  const extruderData = design.manufacturing.extruder;
  const zoneTemps = extruderData.zone_temps_celsius;
  const extruderInfo = [
    `Total Tubing: ${extruderData.total_m}m`,
    `Zone Temperatures: Feed ${zoneTemps.feed}°C | Barrel ${zoneTemps.barrel}°C | Nozzle ${zoneTemps.nozzle}°C`,
    `Screw RPM: ${extruderData.screw_rpm}`,
    `Throughput: ${extruderData.throughput_kg_per_hr} kg/hr`,
    `Runtime: ${extruderData.runtime_min} minutes (${Math.round(extruderData.runtime_min / 60 * 10) / 10} hrs)`
  ];
  extruderInfo.forEach(line => {
    page.drawText(line, { x: margins.left + 10, y, size: 9, color: rgb(0, 0, 0) });
    y -= 12;
  });
  y -= 10;

  // ========== MOULDER SECTION ==========
  drawSection(page, 'Injection Moulder — PP Parts', margins.left, y);
  y -= 22;

  const moulderData = design.manufacturing.moulder;

  page.drawText('Manifold Chamber (4-outlet):', { x: margins.left + 10, y, size: 10, color: rgb(0, 0, 0) });
  y -= 12;
  const manifoldInfo = [
    `Count: ${moulderData.manifolds.count} | Cycle Time: ${moulderData.manifolds.cycle_sec}s`,
    `Total Time: ${moulderData.manifolds.total_sec}s (${Math.round(moulderData.manifolds.total_sec / 60 * 10) / 10} min)`,
    `Barrel Temp: ${moulderData.manifolds.barrel_temp}°C`
  ];
  manifoldInfo.forEach(line => {
    page.drawText(line, { x: margins.left + 20, y, size: 9, color: rgb(80/255, 80/255, 80/255) });
    y -= 11;
  });
  y -= 8;

  page.drawText('Barbed Connectors M16:', { x: margins.left + 10, y, size: 10, color: rgb(0, 0, 0) });
  y -= 12;
  const connectorInfo = [
    `Count: ${moulderData.connectors.count} | Cycle Time: ${moulderData.connectors.cycle_sec}s`,
    `Total Time: ${moulderData.connectors.total_sec}s (${Math.round(moulderData.connectors.total_sec / 60 * 10) / 10} min)`,
    `Barrel Temp: ${moulderData.connectors.barrel_temp}°C`
  ];
  connectorInfo.forEach(line => {
    page.drawText(line, { x: margins.left + 20, y, size: 9, color: rgb(80/255, 80/255, 80/255) });
    y -= 11;
  });
  y -= 8;

  page.drawText(`Total Moulder Runtime: ${moulderData.total_min} minutes`, {
    x: margins.left + 10,
    y,
    size: 9,
    color: rgb(22 / 255, 129 / 255, 87 / 255)
  });
  y -= 14;

  // ========== BED LAYOUT ==========
  drawSection(page, 'Bed Layout', margins.left, y);
  y -= 22;

  const bedRows = [['Bed', 'Crop', 'Length', 'Drippers', 'Water (L/day)']];
  design.beds.forEach((bed, idx) => {
    bedRows.push([
      `${idx + 1}`,
      bed.crop_name,
      `${bed.length_m}m`,
      bed.dripper_count,
      Math.round(bed.water_l_per_day * 10) / 10
    ]);
  });

  y = drawTable(page, bedRows, margins.left, y, [30, 80, 70, 70, 80]);

  // ========== FOOTER ==========
  page.drawText('Generated by FRADI Drip Planner | Keep this sheet with the kit for assembly reference', {
    x: margins.left,
    y: margins.bottom - 10,
    size: 8,
    color: rgb(150 / 255, 150 / 255, 150 / 255)
  });

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

// ========== Helpers ==========

function drawSection(page, title, x, y) {
  page.drawText(title, {
    x,
    y,
    size: 13,
    color: rgb(22 / 255, 129 / 255, 87 / 255)
  });
  page.drawLine({
    start: { x, y: y - 4 },
    end: { x: x + 200, y: y - 4 },
    color: rgb(22 / 255, 129 / 255, 87 / 255),
    thickness: 1
  });
}

function drawTable(page, rows, x, y, colWidths) {
  const rowHeight = 18;
  const cellPadding = 5;

  rows.forEach((row, rowIdx) => {
    let cellX = x;
    const isHeader = rowIdx === 0;
    const textColor = isHeader ? rgb(1, 1, 1) : rgb(0, 0, 0);
    const bgColor = isHeader ? rgb(22 / 255, 129 / 255, 87 / 255) : rgb(245 / 255, 245 / 255, 245 / 255);
    const borderColor = rgb(200 / 255, 200 / 255, 200 / 255);

    // Draw row background
    page.drawRectangle({
      x,
      y: y - rowHeight,
      width: colWidths.reduce((a, b) => a + b, 0),
      height: rowHeight,
      color: bgColor,
      opacity: isHeader ? 1 : 0.5
    });

    // Draw cells
    row.forEach((cell, colIdx) => {
      page.drawText(String(cell), {
        x: cellX + cellPadding,
        y: y - rowHeight + cellPadding,
        size: isHeader ? 10 : 9,
        color: textColor
      });
      cellX += colWidths[colIdx];
    });

    y -= rowHeight;
  });

  return y;
}
