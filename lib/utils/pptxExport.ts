import pptxgen from 'pptxgenjs';
import { ReportConfig, ReportResult } from '@/types/report';
import { tenant } from '@/lib/config/tenant';
import type { PresentationSlideContent } from '@/app/api/ai/presentation/route';

// ── Derive palette from tenant brand colors ──────────────────────────────────

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function blendHex(hex: string, blendWith: string, ratio: number): string {
  const a = hexToRgb(hex);
  const b = hexToRgb(blendWith);
  const r = Math.round(a.r * ratio + b.r * (1 - ratio)).toString(16).padStart(2, '0');
  const g = Math.round(a.g * ratio + b.g * (1 - ratio)).toString(16).padStart(2, '0');
  const bl = Math.round(a.b * ratio + b.b * (1 - ratio)).toString(16).padStart(2, '0');
  return `${r}${g}${bl}`.toUpperCase();
}

// pptxgenjs wants hex WITHOUT the leading #
const PRIMARY   = tenant.colors.primary.replace('#', '').toUpperCase();
const PRIMARY_DARK = tenant.colors.primaryDark.replace('#', '').toUpperCase();
const BG_DARK   = tenant.colors.background.replace('#', '').toUpperCase();
const SURFACE   = tenant.colors.surface.replace('#', '').toUpperCase();
const WHITE     = 'FFFFFF';
const GRAY_MID  = '9CA3AF';
const GRAY_LIGHT = 'F3F4F6';

// A very light tint of primary for subtle backgrounds
const PRIMARY_TINT = blendHex(tenant.colors.primary, '#FFFFFF', 0.15);

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatValue(v: unknown): string {
  if (v == null) return '—';
  if (typeof v === 'number') {
    return v % 1 === 0
      ? v.toLocaleString()
      : v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return String(v);
}

// ── Main export function ─────────────────────────────────────────────────────

export async function buildPresentationPptx(
  config: ReportConfig,
  result: ReportResult,
  slideContent: PresentationSlideContent
): Promise<Blob> {
  const pptx = new pptxgen();

  pptx.layout = 'LAYOUT_WIDE'; // 13.33" x 7.5"
  pptx.title = slideContent.title;
  pptx.author = tenant.appName;

  // ── Slide 1: Title ─────────────────────────────────────────────────────────
  {
    const slide = pptx.addSlide();

    // Dark full-bleed background
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: '100%', h: '100%',
      fill: { color: BG_DARK },
    });

    // Primary accent bar on left
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: 0.18, h: '100%',
      fill: { color: PRIMARY },
    });

    // Brand name (top right)
    slide.addText(tenant.appName.toUpperCase(), {
      x: 0.5, y: 0.3, w: 12.5, h: 0.4,
      fontSize: 10,
      bold: true,
      color: PRIMARY,
      charSpacing: 3,
      align: 'right',
    });

    // Main title
    slide.addText(slideContent.title, {
      x: 0.5, y: 2.2, w: 12.5, h: 1.6,
      fontSize: 44,
      bold: true,
      color: WHITE,
      align: 'center',
      wrap: true,
    });

    // Subtitle
    slide.addText(slideContent.subtitle, {
      x: 0.5, y: 3.9, w: 12.5, h: 0.6,
      fontSize: 18,
      color: PRIMARY,
      align: 'center',
    });

    // Date range
    slide.addText(`${config.dateRange.start}  —  ${config.dateRange.end}`, {
      x: 0.5, y: 4.7, w: 12.5, h: 0.4,
      fontSize: 12,
      color: GRAY_MID,
      align: 'center',
    });

    // Bottom rule
    slide.addShape(pptx.ShapeType.rect, {
      x: 4.5, y: 6.8, w: 4.5, h: 0.06,
      fill: { color: PRIMARY },
    });
  }

  // ── Slide 2: Executive Summary ─────────────────────────────────────────────
  {
    const slide = pptx.addSlide();
    _addSlideChrome(pptx, slide, 'Executive Summary');

    slideContent.executiveSummary.forEach((bullet, i) => {
      slide.addShape(pptx.ShapeType.rect, {
        x: 0.6, y: 1.6 + i * 1.4, w: 0.12, h: 0.12,
        fill: { color: PRIMARY },
        line: { color: PRIMARY },
      });
      slide.addText(bullet, {
        x: 0.9, y: 1.5 + i * 1.4, w: 11.8, h: 0.9,
        fontSize: 16,
        color: '374151',
        wrap: true,
      });
    });
  }

  // ── Slide 3: KPI Cards ─────────────────────────────────────────────────────
  {
    const slide = pptx.addSlide();
    _addSlideChrome(pptx, slide, 'Key Metrics');

    const kpis = slideContent.kpiNarratives;
    const cols = Math.min(kpis.length, 4);
    const cardW = 12.0 / cols;
    const cardX0 = 0.65;

    kpis.forEach((kpi, i) => {
      const cx = cardX0 + i * cardW;
      const cy = 1.6;

      // Card background
      slide.addShape(pptx.ShapeType.rect, {
        x: cx, y: cy, w: cardW - 0.2, h: 3.8,
        fill: { color: GRAY_LIGHT },
        line: { color: 'E5E7EB', pt: 1 },
        shadow: { type: 'outer', color: '00000015', blur: 6, offset: 2, angle: 45 },
      });

      // Top accent bar
      slide.addShape(pptx.ShapeType.rect, {
        x: cx, y: cy, w: cardW - 0.2, h: 0.18,
        fill: { color: PRIMARY },
      });

      // Label
      slide.addText(kpi.label.toUpperCase(), {
        x: cx + 0.15, y: cy + 0.3, w: cardW - 0.5, h: 0.4,
        fontSize: 9,
        bold: true,
        color: GRAY_MID,
        charSpacing: 1.5,
        wrap: true,
      });

      // Value
      slide.addText(kpi.value, {
        x: cx + 0.1, y: cy + 0.75, w: cardW - 0.4, h: 1.1,
        fontSize: 30,
        bold: true,
        color: PRIMARY_DARK,
        fit: 'shrink',
      });

      // Narrative
      slide.addText(kpi.narrative, {
        x: cx + 0.15, y: cy + 1.9, w: cardW - 0.5, h: 1.7,
        fontSize: 11,
        color: '6B7280',
        wrap: true,
      });
    });
  }

  // ── Slide 4: Data Chart ────────────────────────────────────────────────────
  if (result.data.length > 0 && config.groupBy) {
    const slide = pptx.addSlide();
    _addSlideChrome(pptx, slide, `Data by ${config.groupBy.charAt(0).toUpperCase() + config.groupBy.slice(1)}`);

    // Pull up to 12 rows, use first numeric column as the series
    const rows = result.data.slice(0, 12);
    const keys = Object.keys(rows[0] || {});
    const labelKey = keys[0];
    const valueKey = keys.find((k) => k !== labelKey && typeof rows[0][k] === 'number') ?? keys[1];

    if (labelKey && valueKey) {
      const labels = rows.map((r) => String(r[labelKey] ?? ''));
      const values = rows.map((r) => Number(r[valueKey] ?? 0));
      const seriesName = config.metrics.find((m) => m.field === valueKey)?.label ?? valueKey;

      slide.addChart(pptx.ChartType.bar, [
        {
          name: seriesName,
          labels,
          values,
        },
      ], {
        x: 0.6, y: 1.4, w: 12.1, h: 5.3,
        barDir: 'col',
        chartColors: [PRIMARY],
        valAxisLabelColor: '6B7280',
        catAxisLabelColor: '6B7280',
        valAxisLabelFontSize: 9,
        catAxisLabelFontSize: 9,
        showLegend: false,
        showValue: true,
        dataLabelColor: PRIMARY_DARK,
        dataLabelFontSize: 9,
        dataLabelFontBold: true,
      });
    }
  }

  // ── Slide 5: Data Table ────────────────────────────────────────────────────
  if (result.data.length > 0) {
    const slide = pptx.addSlide();
    _addSlideChrome(pptx, slide, 'Data Breakdown');

    const rows = result.data.slice(0, 10);
    const cols = Object.keys(rows[0] || {});

    // Header row
    const tableData = [
      cols.map((col) => ({
        text: col.toUpperCase(),
        options: {
          bold: true,
          color: WHITE,
          fill: { color: BG_DARK },
          fontSize: 9,
          align: 'center' as const,
        },
      })),
      ...rows.map((row, ri) =>
        cols.map((col) => ({
          text: formatValue(row[col]),
          options: {
            color: '374151',
            fill: { color: ri % 2 === 0 ? WHITE : GRAY_LIGHT },
            fontSize: 10,
            align: 'center' as const,
          },
        }))
      ),
    ];

    const colW = 12.5 / cols.length;
    slide.addTable(tableData, {
      x: 0.4, y: 1.5, w: 12.5,
      colW: cols.map(() => colW),
      border: { type: 'solid', color: 'E5E7EB', pt: 0.5 },
      rowH: 0.38,
    });
  }

  // ── Slide 6: Insights & Recommendations ───────────────────────────────────
  {
    const slide = pptx.addSlide();
    _addSlideChrome(pptx, slide, 'Insights & Recommendations');

    // Left column — Insights
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.4, y: 1.4, w: 5.8, h: 4.8,
      fill: { color: GRAY_LIGHT },
      line: { color: 'E5E7EB' },
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.4, y: 1.4, w: 5.8, h: 0.45,
      fill: { color: BG_DARK },
    });
    slide.addText('KEY INSIGHTS', {
      x: 0.4, y: 1.42, w: 5.8, h: 0.4,
      fontSize: 10, bold: true, color: PRIMARY, align: 'center', charSpacing: 2,
    });
    slideContent.insights.forEach((ins, i) => {
      slide.addShape(pptx.ShapeType.rect, {
        x: 0.65, y: 2.05 + i * 1.35, w: 0.1, h: 0.7,
        fill: { color: PRIMARY },
      });
      slide.addText(ins, {
        x: 0.9, y: 2.0 + i * 1.35, w: 5.0, h: 0.9,
        fontSize: 12, color: '374151', wrap: true,
      });
    });

    // Right column — Recommendations
    slide.addShape(pptx.ShapeType.rect, {
      x: 7.0, y: 1.4, w: 5.8, h: 4.8,
      fill: { color: GRAY_LIGHT },
      line: { color: 'E5E7EB' },
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: 7.0, y: 1.4, w: 5.8, h: 0.45,
      fill: { color: PRIMARY },
    });
    slide.addText('RECOMMENDATIONS', {
      x: 7.0, y: 1.42, w: 5.8, h: 0.4,
      fontSize: 10, bold: true, color: BG_DARK, align: 'center', charSpacing: 2,
    });
    slideContent.recommendations.forEach((rec, i) => {
      slide.addText(`${i + 1}`, {
        x: 7.2, y: 2.02 + i * 1.35, w: 0.38, h: 0.38,
        fontSize: 13, bold: true, color: WHITE, align: 'center',
        fill: { color: PRIMARY_DARK },
        shape: pptx.ShapeType.ellipse,
      });
      slide.addText(rec, {
        x: 7.72, y: 2.0 + i * 1.35, w: 4.8, h: 0.9,
        fontSize: 12, color: '374151', wrap: true,
      });
    });
  }

  // ── Slide 7: Closing ───────────────────────────────────────────────────────
  {
    const slide = pptx.addSlide();

    // Dark background
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: '100%', h: '100%',
      fill: { color: BG_DARK },
    });

    // Primary accent bar bottom
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 6.9, w: '100%', h: 0.6,
      fill: { color: PRIMARY },
    });

    // Closing statement
    slide.addText(slideContent.closingStatement, {
      x: 1.0, y: 2.0, w: 11.3, h: 2.0,
      fontSize: 26,
      bold: true,
      color: WHITE,
      align: 'center',
      wrap: true,
    });

    // Divider
    slide.addShape(pptx.ShapeType.rect, {
      x: 5.2, y: 4.2, w: 2.9, h: 0.06,
      fill: { color: PRIMARY },
    });

    // Brand
    slide.addText(tenant.appName, {
      x: 0.5, y: 4.5, w: 12.3, h: 0.5,
      fontSize: 14,
      bold: true,
      color: PRIMARY,
      align: 'center',
    });

    slide.addText(tenant.domain, {
      x: 0.5, y: 5.0, w: 12.3, h: 0.4,
      fontSize: 11,
      color: GRAY_MID,
      align: 'center',
    });
  }

  // Serialize to Blob
  const buffer = await pptx.write({ outputType: 'arraybuffer' }) as ArrayBuffer;
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  });
}

// ── Shared slide chrome (header bar + slide number) ──────────────────────────

function _addSlideChrome(pptx: pptxgen, slide: pptxgen.Slide, title: string) {
  // Light background
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: '100%', h: '100%',
    fill: { color: WHITE },
  });

  // Header band
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: '100%', h: 1.1,
    fill: { color: BG_DARK },
  });

  // Primary accent rule under header
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 1.1, w: '100%', h: 0.07,
    fill: { color: PRIMARY },
  });

  // Slide title
  slide.addText(title, {
    x: 0.5, y: 0.22, w: 11.0, h: 0.65,
    fontSize: 22,
    bold: true,
    color: WHITE,
  });

  // Brand name top-right
  slide.addText(tenant.shortName.toUpperCase(), {
    x: 0.5, y: 0.25, w: 12.6, h: 0.55,
    fontSize: 10,
    bold: true,
    color: PRIMARY,
    charSpacing: 2,
    align: 'right',
  });
}
