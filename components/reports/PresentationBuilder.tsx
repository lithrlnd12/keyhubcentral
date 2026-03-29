'use client';

import { useState } from 'react';
import { X, Presentation, Sparkles, Download, ChevronRight, ChevronLeft, BarChart3, PieChart, TrendingUp, Table2, Lightbulb, Quote } from 'lucide-react';
import { Button } from '@/components/ui';
import { ReportConfig, ReportResult } from '@/types/report';
import type { PresentationSlideContent } from '@/app/api/ai/presentation/route';
import { useAuth } from '@/lib/hooks';

interface PresentationBuilderProps {
  config: ReportConfig;
  result: ReportResult;
  onClose: () => void;
}

const SLIDE_OUTLINE = [
  { label: 'Title Slide', desc: 'Report name, subtitle, date range' },
  { label: 'Executive Summary', desc: 'AI-written 3-point summary' },
  { label: 'Key Metrics', desc: 'KPI cards with narrative context' },
  { label: 'Data Chart', desc: 'Bar chart from grouped data' },
  { label: 'Data Breakdown', desc: 'Top rows table' },
  { label: 'Insights & Recommendations', desc: 'AI analysis and action items' },
  { label: 'Closing', desc: 'Brand close with key statement' },
];

const PROMPT_SUGGESTIONS = [
  'Monthly ROI summary for client review',
  'Q1 board presentation with trends',
  'Weekly team performance update',
  'Sales pipeline status for executives',
];

type Step = 'prompt' | 'generating' | 'ready' | 'error';

export function PresentationBuilder({ config, result, onClose }: PresentationBuilderProps) {
  const { getIdToken } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [step, setStep] = useState<Step>('prompt');
  const [slideContent, setSlideContent] = useState<PresentationSlideContent | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [downloading, setDownloading] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setStep('generating');
    setErrorMsg('');

    try {
      const token = await getIdToken();
      const res = await fetch('/api/ai/presentation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ config, result, prompt }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setSlideContent(data.slideContent);
      setStep('ready');
    } catch (err) {
      console.error('Presentation generation failed:', err);
      setErrorMsg(err instanceof Error ? err.message : 'Failed to generate presentation');
      setStep('error');
    }
  };

  const handleDownload = async () => {
    if (!slideContent) return;
    setDownloading(true);
    try {
      const token = await getIdToken();
      const res = await fetch('/api/presentation/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ config, result, slideContent }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${config.name || 'presentation'}.pptx`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PPTX build failed:', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-brand-charcoal border border-gray-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-brand-gold/10 border border-brand-gold/30 flex items-center justify-center">
              <Presentation className="w-5 h-5 text-brand-gold" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">AI Presentation Builder</h2>
              <p className="text-xs text-gray-500">Generate a branded .pptx from your report</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Report info pill */}
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-900/60 rounded-lg border border-gray-800 text-sm">
            <span className="text-gray-400">Report:</span>
            <span className="text-white font-medium truncate">{config.name || 'Untitled'}</span>
            <span className="mx-1 text-gray-700">·</span>
            <span className="text-gray-500 text-xs">
              {config.dateRange.start} – {config.dateRange.end}
            </span>
          </div>

          {/* Slide outline */}
          <div>
            <p className="text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">
              Slides included
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SLIDE_OUTLINE.map((s, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2.5 px-3 py-2 bg-gray-900/40 rounded-lg border border-gray-800"
                >
                  <span className="mt-0.5 w-5 h-5 rounded-full bg-brand-gold/10 border border-brand-gold/30 text-brand-gold text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm text-white font-medium">{s.label}</p>
                    <p className="text-xs text-gray-500">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Prompt input */}
          {(step === 'prompt' || step === 'error') && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
                  Describe your presentation
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g. Q1 board review showing revenue growth and pipeline trends"
                  rows={3}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-gold/50 resize-none"
                />
              </div>

              {/* Suggestions */}
              <div className="flex flex-wrap gap-2">
                {PROMPT_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setPrompt(s)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md bg-gray-800 text-gray-400 hover:bg-brand-gold/10 hover:text-brand-gold border border-gray-700 hover:border-brand-gold/40 transition-colors"
                  >
                    <ChevronRight className="w-3 h-3" />
                    {s}
                  </button>
                ))}
              </div>

              {step === 'error' && (
                <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                  {errorMsg}
                </div>
              )}

              <Button
                onClick={handleGenerate}
                disabled={!prompt.trim()}
                className="w-full"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Presentation
              </Button>
            </div>
          )}

          {/* Generating state */}
          {step === 'generating' && (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <div className="w-14 h-14 rounded-full border-2 border-brand-gold/30 border-t-brand-gold animate-spin" />
              <div>
                <p className="text-white font-medium">Claude is building your deck...</p>
                <p className="text-sm text-gray-500 mt-1">
                  Analyzing data, writing narratives, and structuring slides
                </p>
              </div>
            </div>
          )}

          {/* Ready state — Slide Preview */}
          {step === 'ready' && slideContent && (
            <SlidePreview
              slideContent={slideContent}
              config={config}
              result={result}
              onRegenerate={() => { setStep('prompt'); setSlideContent(null); }}
              onDownload={handleDownload}
              downloading={downloading}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Slide Preview Component ──────────────────────────────────────────────────

interface SlidePreviewProps {
  slideContent: PresentationSlideContent;
  config: ReportConfig;
  result: ReportResult;
  onRegenerate: () => void;
  onDownload: () => void;
  downloading: boolean;
}

function SlidePreview({ slideContent, config, result, onRegenerate, onDownload, downloading }: SlidePreviewProps) {
  const [activeSlide, setActiveSlide] = useState(0);

  const slides = [
    { label: 'Title', icon: <Presentation className="w-3.5 h-3.5" /> },
    { label: 'Summary', icon: <Quote className="w-3.5 h-3.5" /> },
    { label: 'Key Metrics', icon: <BarChart3 className="w-3.5 h-3.5" /> },
    { label: 'Bar Chart', icon: <BarChart3 className="w-3.5 h-3.5" /> },
    { label: 'Distribution', icon: <PieChart className="w-3.5 h-3.5" /> },
    { label: 'Trends', icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { label: 'Data Table', icon: <Table2 className="w-3.5 h-3.5" /> },
    { label: 'Insights', icon: <Lightbulb className="w-3.5 h-3.5" /> },
    { label: 'Closing', icon: <Presentation className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-4">
      {/* Slide navigator */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setActiveSlide((s) => Math.max(0, s - 1))}
          disabled={activeSlide === 0}
          className="p-1.5 rounded-md bg-gray-800 text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 flex gap-1 overflow-x-auto scrollbar-thin">
          {slides.map((s, i) => (
            <button
              key={i}
              onClick={() => setActiveSlide(i)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                activeSlide === i
                  ? 'bg-brand-gold text-brand-black'
                  : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              {s.icon}
              {s.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setActiveSlide((s) => Math.min(slides.length - 1, s + 1))}
          disabled={activeSlide === slides.length - 1}
          className="p-1.5 rounded-md bg-gray-800 text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Slide preview area — 16:9 aspect ratio */}
      <div className="relative bg-gray-950 rounded-xl border border-gray-800 overflow-hidden" style={{ aspectRatio: '16/9' }}>
        {/* Slide 0: Title */}
        {activeSlide === 0 && (
          <div className="absolute inset-0 bg-[#1a1a2e] flex flex-col items-center justify-center p-8">
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-brand-gold" />
            <p className="text-[10px] text-brand-gold tracking-[3px] uppercase mb-8 self-end">
              {config.name || 'KEYHUB CENTRAL'}
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-white text-center">{slideContent.title}</h2>
            <p className="text-sm text-brand-gold mt-2 text-center">{slideContent.subtitle}</p>
            <p className="text-xs text-gray-500 mt-4">
              {config.dateRange.start} — {config.dateRange.end}
            </p>
            <div className="absolute bottom-6 w-24 h-0.5 bg-brand-gold" />
          </div>
        )}

        {/* Slide 1: Executive Summary */}
        {activeSlide === 1 && (
          <div className="absolute inset-0 bg-white flex flex-col">
            <div className="bg-[#1a1a2e] px-6 py-3">
              <h3 className="text-lg font-bold text-white">Executive Summary</h3>
            </div>
            <div className="h-0.5 bg-brand-gold" />
            <div className="flex-1 p-6 space-y-4">
              {slideContent.executiveSummary.map((b, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-2 h-2 mt-1.5 bg-brand-gold flex-shrink-0" />
                  <p className="text-sm text-gray-700">{b}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Slide 2: Key Metrics */}
        {activeSlide === 2 && (
          <div className="absolute inset-0 bg-white flex flex-col">
            <div className="bg-[#1a1a2e] px-6 py-3">
              <h3 className="text-lg font-bold text-white">Key Metrics</h3>
            </div>
            <div className="h-0.5 bg-brand-gold" />
            <div className="flex-1 p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
              {slideContent.kpiNarratives.map((kpi, i) => (
                <div key={i} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <div className="h-1 bg-brand-gold rounded-full mb-2" />
                  <p className="text-[9px] text-gray-400 uppercase tracking-wider">{kpi.label}</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">{kpi.value}</p>
                  <p className="text-[10px] text-gray-500 mt-2 line-clamp-2">{kpi.narrative}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Slide 3: Bar Chart placeholder */}
        {activeSlide === 3 && (
          <div className="absolute inset-0 bg-white flex flex-col">
            <div className="bg-[#1a1a2e] px-6 py-3">
              <h3 className="text-lg font-bold text-white">Data by {config.groupBy || 'Category'}</h3>
            </div>
            <div className="h-0.5 bg-brand-gold" />
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="flex items-end gap-2 h-32">
                {(result.data || []).slice(0, 8).map((_, i) => (
                  <div
                    key={i}
                    className="w-8 rounded-t"
                    style={{
                      height: `${30 + Math.random() * 70}%`,
                      backgroundColor: i === 0 ? 'var(--color-brand-gold, #D4A84B)' : '#E5E7EB',
                      opacity: 0.6 + (i === 0 ? 0.4 : 0),
                    }}
                  />
                ))}
              </div>
              <p className="absolute bottom-4 text-xs text-gray-400">Editable native bar chart in PowerPoint</p>
            </div>
          </div>
        )}

        {/* Slide 4: Distribution (Donut) */}
        {activeSlide === 4 && (
          <div className="absolute inset-0 bg-white flex flex-col">
            <div className="bg-[#1a1a2e] px-6 py-3">
              <h3 className="text-lg font-bold text-white">Distribution Breakdown</h3>
            </div>
            <div className="h-0.5 bg-brand-gold" />
            <div className="flex-1 flex items-center justify-center">
              <div className="w-28 h-28 rounded-full border-[12px] border-brand-gold relative">
                <div className="absolute inset-0 rounded-full border-[12px] border-blue-500 border-t-transparent border-l-transparent" />
              </div>
              <p className="absolute bottom-4 text-xs text-gray-400">Editable native donut chart in PowerPoint</p>
            </div>
          </div>
        )}

        {/* Slide 5: Trends (Line) */}
        {activeSlide === 5 && (
          <div className="absolute inset-0 bg-white flex flex-col">
            <div className="bg-[#1a1a2e] px-6 py-3">
              <h3 className="text-lg font-bold text-white">Trend Analysis</h3>
            </div>
            <div className="h-0.5 bg-brand-gold" />
            <div className="flex-1 flex items-center justify-center p-6">
              <svg viewBox="0 0 200 80" className="w-64 h-20">
                <polyline
                  points="10,60 40,45 70,50 100,30 130,35 160,20 190,15"
                  fill="none"
                  stroke="var(--color-brand-gold, #D4A84B)"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                />
                <polyline
                  points="10,65 40,55 70,58 100,48 130,52 160,42 190,38"
                  fill="none"
                  stroke="#3B82F6"
                  strokeWidth="2"
                  strokeLinejoin="round"
                  opacity="0.6"
                />
              </svg>
              <p className="absolute bottom-4 text-xs text-gray-400">Editable native line chart in PowerPoint</p>
            </div>
          </div>
        )}

        {/* Slide 6: Data Table */}
        {activeSlide === 6 && (
          <div className="absolute inset-0 bg-white flex flex-col">
            <div className="bg-[#1a1a2e] px-6 py-3">
              <h3 className="text-lg font-bold text-white">Data Breakdown</h3>
            </div>
            <div className="h-0.5 bg-brand-gold" />
            <div className="flex-1 p-4 overflow-hidden">
              {result.data.length > 0 ? (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[#1a1a2e]">
                      {Object.keys(result.data[0]).slice(0, 5).map((col) => (
                        <th key={col} className="px-2 py-1.5 text-white font-bold text-center uppercase text-[9px]">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.data.slice(0, 5).map((row, ri) => (
                      <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        {Object.values(row).slice(0, 5).map((val, ci) => (
                          <td key={ci} className="px-2 py-1 text-center text-gray-700 text-[10px]">
                            {val != null ? String(val) : '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-gray-400 text-center mt-8">No data rows to display</p>
              )}
            </div>
          </div>
        )}

        {/* Slide 7: Insights & Recommendations */}
        {activeSlide === 7 && (
          <div className="absolute inset-0 bg-white flex flex-col">
            <div className="bg-[#1a1a2e] px-6 py-3">
              <h3 className="text-lg font-bold text-white">Insights & Recommendations</h3>
            </div>
            <div className="h-0.5 bg-brand-gold" />
            <div className="flex-1 p-4 grid grid-cols-2 gap-4">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="bg-[#1a1a2e] rounded px-2 py-1 mb-2">
                  <p className="text-[9px] text-brand-gold font-bold tracking-wider text-center">KEY INSIGHTS</p>
                </div>
                {slideContent.insights.map((ins, i) => (
                  <div key={i} className="flex items-start gap-2 mb-2">
                    <div className="w-0.5 h-6 bg-brand-gold flex-shrink-0 mt-0.5" />
                    <p className="text-[10px] text-gray-600">{ins}</p>
                  </div>
                ))}
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="bg-brand-gold rounded px-2 py-1 mb-2">
                  <p className="text-[9px] text-[#1a1a2e] font-bold tracking-wider text-center">RECOMMENDATIONS</p>
                </div>
                {slideContent.recommendations.map((rec, i) => (
                  <div key={i} className="flex items-start gap-2 mb-2">
                    <span className="w-4 h-4 rounded-full bg-[#1a1a2e] text-white text-[8px] flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">{i + 1}</span>
                    <p className="text-[10px] text-gray-600">{rec}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Slide 8: Closing */}
        {activeSlide === 8 && (
          <div className="absolute inset-0 bg-[#1a1a2e] flex flex-col items-center justify-center p-8">
            <p className="text-lg font-bold text-white text-center max-w-lg">{slideContent.closingStatement}</p>
            <div className="w-16 h-0.5 bg-brand-gold mt-4" />
            <p className="text-sm font-bold text-brand-gold mt-3">{config.name || 'KeyHub Central'}</p>
            <div className="absolute bottom-0 left-0 right-0 h-4 bg-brand-gold" />
          </div>
        )}

        {/* Slide number badge */}
        <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/50 rounded text-[10px] text-gray-400">
          {activeSlide + 1} / {slides.length}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={onRegenerate}
          className="flex-1"
        >
          Regenerate
        </Button>
        <Button
          onClick={onDownload}
          loading={downloading}
          disabled={downloading}
          className="flex-1"
        >
          <Download className="w-4 h-4 mr-2" />
          Download .pptx
        </Button>
      </div>
    </div>
  );
}
