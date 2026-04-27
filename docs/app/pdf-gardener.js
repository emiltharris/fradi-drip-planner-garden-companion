/**
 * FRADI Drip Planner — Gardener's Guide PDF
 *
 * Farmer-focused: plot diagram, watering schedule, crop care tips, troubleshooting
 * 1 page, A4 landscape, in gardener's language (en/sw/ar/so)
 */

import { PDFDocument, PDFPage, rgb } from 'https://esm.sh/pdf-lib';

async function embedUnicodeFont(pdfDoc, lang) {
  // For Arabic/Somali, embed a Unicode font that supports these characters
  try {
    // Use Noto Sans Arabic for ar, Noto Sans for so (fallback)
    const fontUrls = {
      ar: 'https://cdn.jsdelivr.net/npm/noto-sans-arabic@latest/NotoSansArabic-Regular.ttf',
      so: 'https://cdn.jsdelivr.net/npm/@fontsource/noto-sans@latest/files/noto-sans-latin-400-normal.ttf'
    };

    const fontUrl = fontUrls[lang] || fontUrls.so;
    console.log(`Embedding font for ${lang}:`, fontUrl);

    const response = await fetch(fontUrl, { mode: 'cors' });
    if (!response.ok) throw new Error(`Font fetch failed: ${response.status}`);

    const fontBytes = await response.arrayBuffer();
    console.log(`Font loaded: ${fontBytes.byteLength} bytes`);

    const font = await pdfDoc.embedFont(fontBytes);
    console.log('Font embedded successfully');
    return font;
  } catch (err) {
    console.error('Failed to embed Unicode font:', err);
    // Fallback: return null and hope text renders (will likely fail with WinAnsi error)
    return null;
  }
}

export async function generateGardenerPDF(design, answers) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([842, 595]); // A4 landscape

  const margins = { top: 30, left: 30, right: 30, bottom: 30 };
  let y = 595 - margins.top;
  const pageWidth = 842 - margins.left - margins.right;

  const lang = answers.confirm.language || 'en';
  const t = translations[lang] || translations.en;

  // Load Unicode font for ar/so, use default for en/sw
  let unicodeFont = null;
  if (lang === 'ar' || lang === 'so') {
    unicodeFont = await embedUnicodeFont(pdfDoc, lang);
  }

  // Helper to apply font if needed
  const fontOpt = unicodeFont ? { font: unicodeFont } : {};

  // ========== HEADER ==========
  page.drawText('FRADI Drip Planner', {
    x: margins.left,
    y,
    size: 16,
    color: rgb(22 / 255, 129 / 255, 87 / 255),
    ...fontOpt
  });
  page.drawText(`${t.guide}`, {
    x: margins.left + 200,
    y,
    size: 16,
    color: rgb(0, 0, 0),
    ...fontOpt
  });
  y -= 25;

  // Gardener name and date
  page.drawText(`${t.gardener}: ${design.gardener_name}`, {
    x: margins.left,
    y,
    size: 9,
    color: rgb(80/255, 80/255, 80/255),
    ...fontOpt
  });
  page.drawText(`${new Date().toISOString().split('T')[0]}`, {
    x: margins.left + 400,
    y,
    size: 9,
    color: rgb(80/255, 80/255, 80/255),
    ...fontOpt
  });
  y -= 14;

  // ========== PLOT OVERVIEW (LEFT COLUMN) ==========
  let leftX = margins.left;
  let rightX = margins.left + pageWidth / 2 + 10;
  let colY = y;

  // Plot dimensions box
  drawSectionBox(page, t.plotOverview, leftX, colY, pageWidth / 2 - 10, 16);
  colY -= 22;

  const plotInfo = [
    `${t.size}: ${design.plot.length_m}m × ${design.plot.width_m}m`,
    `${t.area}: ${design.plot.area_m2} m²`,
    `${t.soil}: ${design.plot.soil}`,
    `${t.water}: ${design.daily_water_l}L ${t.perDay}`
  ];
  plotInfo.forEach(line => {
    page.drawText(line, { x: leftX + 5, y: colY, size: 9, color: rgb(0, 0, 0), ...fontOpt });
    colY -= 11;
  });
  colY -= 8;

  // Beds summary
  drawSectionBox(page, t.beds, leftX, colY, pageWidth / 2 - 10, 16, fontOpt);
  colY -= 22;
  design.beds.forEach((bed, idx) => {
    const cropName = getCropName(bed.crop_id, answers.crops, lang);
    page.drawText(`${idx + 1}. ${cropName}: ${bed.length_m}m (${bed.dripper_count} ${t.drippers})`, {
      x: leftX + 5,
      y: colY,
      size: 8,
      color: rgb(0, 0, 0),
      ...fontOpt
    });
    colY -= 10;
  });

  // ========== WATERING SCHEDULE (RIGHT COLUMN) ==========
  let schedY = y;
  drawSectionBox(page, t.wateringSchedule, rightX, schedY, pageWidth / 2 - 10, 16, fontOpt);
  schedY -= 22;

  const schedule = design.watering_schedule;
  const scheduleInfo = [
    `${t.frequency}: ${schedule.frequency_text}`,
    `${t.time}: ${schedule.time_of_day}`,
    `${t.perRun}: ${schedule.water_per_run_l}L`,
    `${t.runtime}: ${schedule.runtime_hours} ${t.hours}`
  ];
  scheduleInfo.forEach(line => {
    page.drawText(line, { x: rightX + 5, y: schedY, size: 9, color: rgb(0, 0, 0), ...fontOpt });
    schedY -= 11;
  });
  schedY -= 5;
  page.drawText(schedule.notes, {
    x: rightX + 5,
    y: schedY,
    size: 8,
    color: rgb(100/255, 100/255, 100/255),
    ...fontOpt
  });

  // ========== PER-CROP CARE STRIPS ==========
  y -= 120;
  drawSectionBox(page, t.cropCare, margins.left, y, pageWidth, 16, fontOpt);
  y -= 22;

  const stripHeight = 45;
  const stripsPerRow = 3;
  let stripX = margins.left;
  let stripIdx = 0;

  design.beds.forEach((bed, bedIdx) => {
    const crop = answers.crops.find(c => c.id === bed.crop_id);
    if (!crop) return;

    const cropName = getCropName(bed.crop_id, [crop], lang);
    const cropLangName = crop.name[lang] || crop.name.en;
    const careText = crop.care_text[lang] || crop.care_text.en || '';

    // Crop strip box
    page.drawRectangle({
      x: stripX,
      y: y - stripHeight,
      width: pageWidth / stripsPerRow - 3,
      height: stripHeight,
      color: rgb(245 / 255, 250 / 255, 245 / 255),
      borderColor: rgb(22 / 255, 129 / 255, 87 / 255),
      borderWidth: 1
    });

    // Crop name (bold-ish by using larger size)
    page.drawText(cropLangName, {
      x: stripX + 4,
      y: y - 10,
      size: 11,
      color: rgb(22 / 255, 129 / 255, 87 / 255),
      ...fontOpt
    });

    // Spacing and water
    page.drawText(`${t.spacing}: ${crop.spacing_cm}cm  ${t.water}/plant: ${crop.water_l_per_plant_per_day}L`, {
      x: stripX + 4,
      y: y - 22,
      size: 8,
      color: rgb(60/255, 60/255, 60/255),
      ...fontOpt
    });

    // Care tip (truncate if needed)
    const careTrunc = careText.length > 70 ? careText.substring(0, 67) + '...' : careText;
    page.drawText(careTrunc, {
      x: stripX + 4,
      y: y - 32,
      size: 7,
      color: rgb(100/255, 100/255, 100/255),
      ...fontOpt
    });

    stripX += pageWidth / stripsPerRow;
    stripIdx++;
    if (stripIdx % stripsPerRow === 0) {
      stripX = margins.left;
      y -= stripHeight + 5;
    }
  });

  // Adjust y for next section if last row was partial
  if (stripIdx % stripsPerRow !== 0) {
    y -= stripHeight + 5;
  }

  // ========== TROUBLESHOOTING ==========
  y -= 10;
  drawSectionBox(page, t.troubleshooting, margins.left, y, pageWidth, 16, fontOpt);
  y -= 22;

  const issues = [
    {
      problem: t.noFlow,
      fix: t.noFlowFix
    },
    {
      problem: t.pooling,
      fix: t.poolingFix
    },
    {
      problem: t.yellowLeaves,
      fix: t.yellowLeavesFix
    }
  ];

  issues.forEach(issue => {
    page.drawText(`• ${issue.problem}`, {
      x: margins.left + 5,
      y,
      size: 8,
      color: rgb(200/255, 0, 0),
      ...fontOpt
    });
    y -= 10;
    page.drawText(`  ${issue.fix}`, {
      x: margins.left + 12,
      y,
      size: 8,
      color: rgb(60/255, 60/255, 60/255),
      ...fontOpt
    });
    y -= 12;
  });

  // ========== FOOTER ==========
  page.drawText('Keep this guide with your garden. For questions, contact your FRADI extension officer.', {
    x: margins.left,
    y: margins.bottom - 5,
    size: 7,
    color: rgb(150 / 255, 150 / 255, 150 / 255),
    ...fontOpt
  });

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

// ========== Helpers ==========

function drawSectionBox(page, title, x, y, width, height, fontOpt = {}) {
  // Background
  page.drawRectangle({
    x,
    y: y - height,
    width,
    height,
    color: rgb(22 / 255, 129 / 255, 87 / 255),
  });
  // Title
  page.drawText(title, {
    x: x + 5,
    y: y - height + 4,
    size: 12,
    color: rgb(1, 1, 1),
    ...fontOpt
  });
}

function getCropName(cropId, crops, lang) {
  const crop = crops.find(c => c.id === cropId);
  if (!crop) return cropId;
  return crop.name[lang] || crop.name.en || crop.name;
}

const translations = {
  en: {
    guide: 'Gardener\'s Guide',
    gardener: 'Gardener',
    plotOverview: 'Your Plot',
    size: 'Size',
    area: 'Area',
    soil: 'Soil',
    water: 'Water',
    perDay: 'per day',
    beds: 'Beds',
    drippers: 'drippers',
    wateringSchedule: 'Watering Schedule',
    frequency: 'Frequency',
    time: 'Best time',
    perRun: 'Per run',
    runtime: 'Runtime',
    hours: 'hours',
    cropCare: 'Crop Care',
    spacing: 'Spacing',
    troubleshooting: 'Troubleshooting',
    noFlow: 'No water flowing from drippers',
    noFlowFix: 'Check inlet is open. Check for blockages in tubing (sand, insects). Clean wicks with soft brush.',
    pooling: 'Water pooling or not reaching all plants',
    poolingFix: 'Check bed is level. Adjust watering time. Ensure all wick connections are tight.',
    yellowLeaves: 'Yellow leaves despite watering',
    yellowLeavesFix: 'May need more nutrients. Water more frequently but in shorter runs. Check soil drainage.'
  },
  sw: {
    guide: 'Mwongozo wa Mkulima',
    gardener: 'Jina la mkulima',
    plotOverview: 'Ardhi Yako',
    size: 'Ukubwa',
    area: 'Eneo',
    soil: 'Udongo',
    water: 'Maji',
    perDay: 'kwa siku',
    beds: 'Vitalu',
    drippers: 'matirifu',
    wateringSchedule: 'Ratiba ya Kumwagilia',
    frequency: 'Mara kwa mara',
    time: 'Wakati mzuri',
    perRun: 'Kwa jimbo',
    runtime: 'Muda wa kumwagilia',
    hours: 'saa',
    cropCare: 'Huduma ya Mazao',
    spacing: 'Umbali',
    troubleshooting: 'Kutatua Matatizo',
    noFlow: 'Hapana maji yanayotoka kwenye matirifu',
    noFlowFix: 'Angalia kuwa lango la uingiaji limefunguliwa. Angalia kuzingira kwa kuzama katika tube (kumimina, wadudu). Safa tapu kwa mdak laini.',
    pooling: 'Maji yanayokusanyika au hayafikii mimea yote',
    poolingFix: 'Angalia vitalu vina usawa. Badilisha muda wa kumwagilia. Hakikisha kuwa unganisho la tapu zote ni imara.',
    yellowLeaves: 'Majani ya manjano ingawa kumwagilia',
    yellowLeavesFix: 'Inaweza kuhitaji virutubishi zaidi. Kumwagilia zaidi lakini kwa vipindi vifupi. Angalia tafsili ya udongo.'
  },
  ar: {
    guide: 'دليل المزارع',
    gardener: 'اسم المزارع',
    plotOverview: 'قطعتك الأرضية',
    size: 'الحجم',
    area: 'المساحة',
    soil: 'التربة',
    water: 'المياه',
    perDay: 'يومياً',
    beds: 'الأسرة',
    drippers: 'قطرات',
    wateringSchedule: 'جدول الري',
    frequency: 'التكرار',
    time: 'أفضل وقت',
    perRun: 'لكل جلسة',
    runtime: 'مدة الري',
    hours: 'ساعات',
    cropCare: 'رعاية المحاصيل',
    spacing: 'المسافة',
    troubleshooting: 'استكشاف الأخطاء',
    noFlow: 'لا توجد مياه تتدفق من القطرات',
    noFlowFix: 'تحقق من فتح مدخل المياه. تحقق من الانسدادات في الأنابيب (الرمل والحشرات). نظف الفتائل بفرشاة ناعمة.',
    pooling: 'تجمع المياه أو عدم وصولها لجميع النباتات',
    poolingFix: 'تحقق من استواء السرير. اضبط وقت الري. تأكد من ربط جميع الفتائل بإحكام.',
    yellowLeaves: 'أوراق صفراء رغم الري',
    yellowLeavesFix: 'قد تحتاج إلى سماد أكثر. اسقِ بشكل متكرر لكن لفترات أقصر. تحقق من صرف التربة.'
  },
  so: {
    guide: 'Garashada Beeraleygu',
    gardener: 'Magaalada Beeraleygu',
    plotOverview: 'Labadaada',
    size: 'Hadka',
    area: 'Aagga',
    soil: 'Cidda',
    water: 'Biyo',
    perDay: 'maalin walba',
    beds: 'Sedada',
    drippers: 'qadhaadh',
    wateringSchedule: 'Jadwalka Biyo',
    frequency: 'Mara',
    time: 'Waqtiga ugu fiican',
    perRun: 'Kasta oo jog',
    runtime: 'Waqtigii biyo',
    hours: 'saac',
    cropCare: 'Dhawr Caleega',
    spacing: 'Gacan',
    troubleshooting: 'Lixda dhacdooyinka',
    noFlow: 'Biyo looma arag qadhaadh',
    noFlowFix: 'Hubi furitaanka biyo. Hubi ceceybka tuubo (ciid, cayayaan). Nadiif fal timaha buugga.',
    pooling: 'Biyo xususta ama gaar u gaara',
    poolingFix: 'Hubi sedada mid le\'eg. Beddelid waqtigii biyo. Hubi xirka fal yar yar.',
    yellowLeaves: 'Catay sungo jafan oo laga bilaabo biyo',
    yellowLeavesFix: 'Laga yaabee in lagu dhaco caasimad badan. Biyo dhaco iska badan laakiin jog gaaban. Hubi biyo biyo cidda.'
  }
};
