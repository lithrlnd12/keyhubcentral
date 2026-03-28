'use client';

import { useState } from 'react';
import { X, Presentation, Sparkles, Download, ChevronRight } from 'lucide-react';
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

          {/* Ready state */}
          {step === 'ready' && slideContent && (
            <div className="space-y-4">
              {/* Preview of generated content */}
              <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 space-y-3">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">Title</p>
                  <p className="text-white font-semibold">{slideContent.title}</p>
                  <p className="text-sm text-brand-gold">{slideContent.subtitle}</p>
                </div>

                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Executive Summary</p>
                  <ul className="space-y-1">
                    {slideContent.executiveSummary.map((b, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-brand-gold flex-shrink-0" />
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Insights</p>
                    <ol className="space-y-1">
                      {slideContent.insights.map((ins, i) => (
                        <li key={i} className="text-xs text-gray-400">
                          <span className="text-brand-gold font-bold mr-1">{i + 1}.</span>
                          {ins}
                        </li>
                      ))}
                    </ol>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Recommendations</p>
                    <ol className="space-y-1">
                      {slideContent.recommendations.map((rec, i) => (
                        <li key={i} className="text-xs text-gray-400">
                          <span className="text-brand-gold font-bold mr-1">{i + 1}.</span>
                          {rec}
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => { setStep('prompt'); setSlideContent(null); }}
                  className="flex-1"
                >
                  Regenerate
                </Button>
                <Button
                  onClick={handleDownload}
                  loading={downloading}
                  disabled={downloading}
                  className="flex-1"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download .pptx
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
