'use client';

import { useState } from 'react';
import {
  X,
  Download,
  ShoppingCart,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Copy,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

export interface ShoppingListItem {
  itemName: string;
  sku: string;
  currentQuantity: number;
  parLevel: number;
  orderQuantity: number;
  unitOfMeasure: string;
  estimatedCost: number | null;
  priority: 'critical' | 'low' | 'restock';
  locationName: string;
  notes: string;
}

export interface ShoppingListData {
  items: ShoppingListItem[];
  summary: string;
  totalEstimatedCost: number | null;
  generatedAt: string;
}

interface ShoppingListModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ShoppingListData | null;
  loading: boolean;
  error: string | null;
  onRegenerate: () => void;
}

const PRIORITY_CONFIG = {
  critical: {
    label: 'Critical',
    color: 'text-red-400',
    bg: 'bg-red-500/20',
    border: 'border-red-500/30',
    icon: AlertTriangle,
  },
  low: {
    label: 'Low Stock',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/20',
    border: 'border-yellow-500/30',
    icon: AlertCircle,
  },
  restock: {
    label: 'Restock',
    color: 'text-blue-400',
    bg: 'bg-blue-500/20',
    border: 'border-blue-500/30',
    icon: RefreshCw,
  },
};

function exportToCSV(data: ShoppingListData) {
  const headers = [
    'Priority',
    'Item Name',
    'SKU',
    'Location',
    'Current Qty',
    'Par Level',
    'Order Qty',
    'Unit',
    'Est. Cost',
    'Notes',
  ];

  const rows = data.items.map((item) => [
    item.priority.toUpperCase(),
    item.itemName,
    item.sku || '',
    item.locationName,
    item.currentQuantity,
    item.parLevel,
    item.orderQuantity,
    item.unitOfMeasure,
    item.estimatedCost != null ? `$${item.estimatedCost.toFixed(2)}` : '',
    item.notes,
  ]);

  // Add total row
  if (data.totalEstimatedCost != null) {
    rows.push(['', '', '', '', '', '', '', '', `$${data.totalEstimatedCost.toFixed(2)}`, 'TOTAL']);
  }

  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row.map((cell) => {
        const str = String(cell);
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      }).join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const date = new Date().toISOString().split('T')[0];
  link.download = `shopping-list-${date}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function copyToClipboard(data: ShoppingListData): string {
  const lines = ['SHOPPING LIST', '='.repeat(40), '', data.summary, ''];

  const grouped = {
    critical: data.items.filter((i) => i.priority === 'critical'),
    low: data.items.filter((i) => i.priority === 'low'),
    restock: data.items.filter((i) => i.priority === 'restock'),
  };

  for (const [priority, items] of Object.entries(grouped)) {
    if (items.length === 0) continue;
    lines.push(`--- ${priority.toUpperCase()} ---`);
    for (const item of items) {
      const cost = item.estimatedCost != null ? ` (~$${item.estimatedCost.toFixed(2)})` : '';
      lines.push(`[ ] ${item.orderQuantity} ${item.unitOfMeasure} - ${item.itemName}${item.sku ? ` (${item.sku})` : ''} @ ${item.locationName}${cost}`);
    }
    lines.push('');
  }

  if (data.totalEstimatedCost != null) {
    lines.push(`ESTIMATED TOTAL: $${data.totalEstimatedCost.toFixed(2)}`);
  }

  return lines.join('\n');
}

export function ShoppingListModal({
  isOpen,
  onClose,
  data,
  loading,
  error,
  onRegenerate,
}: ShoppingListModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(copyToClipboard(data));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for non-HTTPS
      const textarea = document.createElement('textarea');
      textarea.value = copyToClipboard(data);
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const criticalItems = data?.items.filter((i) => i.priority === 'critical') || [];
  const lowItems = data?.items.filter((i) => i.priority === 'low') || [];
  const restockItems = data?.items.filter((i) => i.priority === 'restock') || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-3xl max-h-[85vh] bg-brand-charcoal border border-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-gold/10 rounded-lg">
              <ShoppingCart className="h-5 w-5 text-brand-gold" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">AI Shopping List</h2>
              {data && (
                <p className="text-xs text-gray-500">
                  Generated {new Date(data.generatedAt).toLocaleString()}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {data && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  title="Copy to clipboard"
                >
                  {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => exportToCSV(data)}
                  title="Export CSV"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRegenerate}
                  title="Regenerate"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="relative">
                <div className="animate-spin h-10 w-10 border-2 border-brand-gold border-t-transparent rounded-full" />
                <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-brand-gold animate-pulse" />
              </div>
              <div className="text-center">
                <p className="text-white font-medium">Analyzing inventory...</p>
                <p className="text-gray-500 text-sm mt-1">Claude is building your shopping list</p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="p-3 bg-red-500/10 rounded-full">
                <AlertTriangle className="h-8 w-8 text-red-400" />
              </div>
              <div className="text-center">
                <p className="text-white font-medium">Failed to generate list</p>
                <p className="text-gray-500 text-sm mt-1">{error}</p>
              </div>
              <Button variant="outline" size="sm" onClick={onRegenerate}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          )}

          {data && !loading && (
            <div className="space-y-5">
              {/* Summary */}
              <div className="p-3 bg-brand-gold/5 border border-brand-gold/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-brand-gold mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-300">{data.summary}</p>
                </div>
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-900 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-white">{data.items.length}</p>
                  <p className="text-xs text-gray-500">Items to Order</p>
                </div>
                <div className="bg-gray-900 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-red-400">{criticalItems.length}</p>
                  <p className="text-xs text-gray-500">Critical</p>
                </div>
                <div className="bg-gray-900 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-brand-gold">
                    {data.totalEstimatedCost != null
                      ? `$${data.totalEstimatedCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : 'N/A'}
                  </p>
                  <p className="text-xs text-gray-500">Est. Total</p>
                </div>
              </div>

              {/* Priority Sections */}
              {[
                { key: 'critical' as const, items: criticalItems },
                { key: 'low' as const, items: lowItems },
                { key: 'restock' as const, items: restockItems },
              ]
                .filter((section) => section.items.length > 0)
                .map((section) => {
                  const config = PRIORITY_CONFIG[section.key];
                  const Icon = config.icon;
                  return (
                    <div key={section.key}>
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className={`h-4 w-4 ${config.color}`} />
                        <h3 className={`text-sm font-semibold ${config.color}`}>
                          {config.label} ({section.items.length})
                        </h3>
                      </div>
                      <div className="space-y-2">
                        {section.items.map((item, idx) => (
                          <div
                            key={idx}
                            className={`flex items-center justify-between p-3 rounded-lg border ${config.bg} ${config.border}`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-white text-sm font-medium truncate">
                                  {item.itemName}
                                </p>
                                {item.sku && (
                                  <span className="text-xs text-gray-500 flex-shrink-0">
                                    {item.sku}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                                <span>{item.locationName}</span>
                                <span>
                                  {item.currentQuantity}/{item.parLevel} {item.unitOfMeasure}
                                </span>
                              </div>
                              {item.notes && (
                                <p className="text-xs text-gray-500 mt-1">{item.notes}</p>
                              )}
                            </div>
                            <div className="text-right flex-shrink-0 ml-4">
                              <p className="text-white font-semibold text-sm">
                                +{item.orderQuantity} {item.unitOfMeasure}
                              </p>
                              {item.estimatedCost != null && (
                                <p className="text-xs text-gray-400">
                                  ~${item.estimatedCost.toFixed(2)}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Footer */}
        {data && !loading && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-gray-800 bg-gray-900/50">
            <p className="text-xs text-gray-500">
              Powered by Claude AI
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleCopy}>
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-1.5 text-green-400" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1.5" />
                    Copy List
                  </>
                )}
              </Button>
              <Button size="sm" onClick={() => exportToCSV(data)}>
                <Download className="h-4 w-4 mr-1.5" />
                Export CSV
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
