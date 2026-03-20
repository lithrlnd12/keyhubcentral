'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Upload,
  FileSpreadsheet,
  FileText,
  Image,
  Sparkles,
  Trash2,
  Check,
  X,
  Package,
  Wrench,
  Edit3,
  AlertTriangle,
} from 'lucide-react';
import { useAuth, useInventoryMutations } from '@/lib/hooks';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import type { InventoryCategory, UnitOfMeasure, Company } from '@/types/inventory';

interface ParsedItem {
  name: string;
  category: InventoryCategory;
  sku: string;
  description: string;
  unitOfMeasure: UnitOfMeasure;
  parLevel: number;
  currentQuantity: number;
  cost: number | null;
  manufacturer: string;
  partNumber: string;
  // UI state
  selected: boolean;
  editing: boolean;
}

const ACCEPTED_TYPES = '.xlsx,.xls,.csv,.pdf,.jpg,.jpeg,.png,.webp';

export default function ImportInventoryPage() {
  const router = useRouter();
  const { user, getIdToken } = useAuth();
  const { createItem } = useInventoryMutations();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [items, setItems] = useState<ParsedItem[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0 });
  const [importComplete, setImportComplete] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const getFileIcon = (file: File) => {
    if (file.type.includes('spreadsheet') || file.type.includes('excel') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv')) {
      return <FileSpreadsheet className="h-8 w-8 text-green-400" />;
    }
    if (file.type === 'application/pdf') {
      return <FileText className="h-8 w-8 text-red-400" />;
    }
    if (file.type.startsWith('image/')) {
      return <Image className="h-8 w-8 text-blue-400" />;
    }
    return <FileText className="h-8 w-8 text-gray-400" />;
  };

  const handleFile = useCallback(async (selectedFile: File) => {
    setFile(selectedFile);
    setParseError(null);
    setItems([]);
    setSummary(null);
    setImportComplete(false);
    setParsing(true);

    try {
      const token = await getIdToken();
      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await fetch('/api/inventory/import', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to parse file');
      }

      const data = await res.json();
      const parsed: ParsedItem[] = (data.items || []).map((item: ParsedItem) => ({
        ...item,
        selected: true,
        editing: false,
      }));

      setItems(parsed);
      setSummary(data.summary || `Parsed ${parsed.length} items`);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setParsing(false);
    }
  }, [getIdToken]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFile(droppedFile);
  }, [handleFile]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) handleFile(selectedFile);
  };

  const toggleItem = (idx: number) => {
    setItems(prev => prev.map((item, i) =>
      i === idx ? { ...item, selected: !item.selected } : item
    ));
  };

  const removeItem = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, updates: Partial<ParsedItem>) => {
    setItems(prev => prev.map((item, i) =>
      i === idx ? { ...item, ...updates } : item
    ));
  };

  const toggleSelectAll = () => {
    const allSelected = items.every(i => i.selected);
    setItems(prev => prev.map(item => ({ ...item, selected: !allSelected })));
  };

  const handleImport = async () => {
    const selectedItems = items.filter(i => i.selected);
    if (selectedItems.length === 0) return;

    setImporting(true);
    setImportProgress({ done: 0, total: selectedItems.length });

    try {
      for (let i = 0; i < selectedItems.length; i++) {
        const item = selectedItems[i];
        await createItem({
          name: item.name,
          category: item.category,
          sku: item.sku || undefined,
          description: item.description || undefined,
          unitOfMeasure: item.unitOfMeasure || 'each',
          parLevel: item.parLevel || 0,
          cost: item.cost ?? undefined,
          manufacturer: item.manufacturer || undefined,
          partNumber: item.partNumber || undefined,
          createdBy: user?.uid || '',
        });
        setImportProgress({ done: i + 1, total: selectedItems.length });
      }
      setImportComplete(true);
    } catch (err) {
      setParseError(`Import failed at item ${importProgress.done + 1}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setImporting(false);
    }
  };

  const selectedCount = items.filter(i => i.selected).length;
  const materialCount = items.filter(i => i.selected && i.category === 'material').length;
  const toolCount = items.filter(i => i.selected && i.category === 'tool').length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/kts/inventory"
          className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Import Inventory</h1>
          <p className="text-gray-400">Upload a spreadsheet, PDF, or photo to bulk-add items</p>
        </div>
      </div>

      {/* Import Complete */}
      {importComplete && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6 text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-3 bg-green-500/20 rounded-full">
              <Check className="h-8 w-8 text-green-400" />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Import Complete!</h2>
            <p className="text-gray-400 mt-1">
              Successfully imported {importProgress.total} item{importProgress.total !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" onClick={() => {
              setFile(null);
              setItems([]);
              setSummary(null);
              setImportComplete(false);
              setParseError(null);
            }}>
              Import More
            </Button>
            <Button onClick={() => router.push('/kts/inventory/items')}>
              View Inventory
            </Button>
          </div>
        </div>
      )}

      {/* Upload Area */}
      {!importComplete && !items.length && !parsing && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
            dragOver
              ? 'border-brand-gold bg-brand-gold/5'
              : 'border-gray-700 hover:border-gray-500 hover:bg-gray-900/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES}
            onChange={handleFileInput}
            className="hidden"
          />
          <Upload className={`h-12 w-12 mx-auto mb-4 ${dragOver ? 'text-brand-gold' : 'text-gray-500'}`} />
          <h3 className="text-lg font-medium text-white mb-2">
            Drop your file here or click to browse
          </h3>
          <p className="text-gray-400 text-sm mb-4">
            Supports Excel (.xlsx, .xls), CSV, PDF, and images (JPG, PNG, WEBP)
          </p>
          <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <FileSpreadsheet className="h-3.5 w-3.5 text-green-400" /> Excel/CSV
            </span>
            <span className="flex items-center gap-1">
              <FileText className="h-3.5 w-3.5 text-red-400" /> PDF
            </span>
            <span className="flex items-center gap-1">
              <Image className="h-3.5 w-3.5 text-blue-400" /> Photo/Scan
            </span>
          </div>
          <p className="text-xs text-gray-600 mt-3">Max 10MB</p>
        </div>
      )}

      {/* Parsing State */}
      {parsing && file && (
        <div className="bg-brand-charcoal border border-gray-800 rounded-xl p-8 text-center space-y-4">
          <div className="flex justify-center">{getFileIcon(file)}</div>
          <p className="text-white font-medium text-sm">{file.name}</p>
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <div className="animate-spin h-10 w-10 border-2 border-brand-gold border-t-transparent rounded-full" />
              <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-brand-gold animate-pulse" />
            </div>
            <div>
              <p className="text-white font-medium">AI is parsing your inventory...</p>
              <p className="text-gray-500 text-sm mt-1">This may take a moment for large files</p>
            </div>
          </div>
        </div>
      )}

      {/* Parse Error */}
      {parseError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-400 font-medium">Error</p>
            <p className="text-gray-400 text-sm mt-1">{parseError}</p>
          </div>
          <button
            onClick={() => {
              setParseError(null);
              setFile(null);
              setItems([]);
            }}
            className="text-gray-500 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Parsed Results */}
      {items.length > 0 && !importComplete && (
        <>
          {/* Summary Bar */}
          <div className="bg-brand-gold/5 border border-brand-gold/20 rounded-lg p-3 flex items-center gap-3">
            <Sparkles className="h-4 w-4 text-brand-gold flex-shrink-0" />
            <p className="text-sm text-gray-300 flex-1">{summary}</p>
            {file && (
              <button
                onClick={() => {
                  setFile(null);
                  setItems([]);
                  setSummary(null);
                }}
                className="text-xs text-gray-500 hover:text-white"
              >
                Upload different file
              </button>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-brand-charcoal border border-gray-800 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-white">{selectedCount}</p>
              <p className="text-xs text-gray-500">Selected</p>
            </div>
            <div className="bg-brand-charcoal border border-gray-800 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-amber-400">{materialCount}</p>
              <p className="text-xs text-gray-500">Materials</p>
            </div>
            <div className="bg-brand-charcoal border border-gray-800 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-blue-400">{toolCount}</p>
              <p className="text-xs text-gray-500">Tools</p>
            </div>
          </div>

          {/* Select All / Actions */}
          <div className="flex items-center justify-between">
            <button
              onClick={toggleSelectAll}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              {items.every(i => i.selected) ? 'Deselect All' : 'Select All'}
            </button>
            <p className="text-sm text-gray-500">
              {selectedCount} of {items.length} items selected
            </p>
          </div>

          {/* Items List */}
          <div className="space-y-2">
            {items.map((item, idx) => (
              <div
                key={idx}
                className={`bg-brand-charcoal border rounded-xl p-4 transition-all ${
                  item.selected
                    ? 'border-gray-700'
                    : 'border-gray-800/50 opacity-50'
                }`}
              >
                {item.editing ? (
                  /* Edit Mode */
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Name</label>
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => updateItem(idx, { name: e.target.value })}
                          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-brand-gold focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Category</label>
                        <select
                          value={item.category}
                          onChange={(e) => updateItem(idx, { category: e.target.value as InventoryCategory })}
                          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-brand-gold focus:outline-none"
                        >
                          <option value="material">Material</option>
                          <option value="tool">Tool</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">SKU</label>
                        <input
                          type="text"
                          value={item.sku}
                          onChange={(e) => updateItem(idx, { sku: e.target.value })}
                          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-brand-gold focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Par Level</label>
                        <input
                          type="number"
                          value={item.parLevel}
                          onChange={(e) => updateItem(idx, { parLevel: parseInt(e.target.value) || 0 })}
                          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-brand-gold focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Unit Cost</label>
                        <input
                          type="number"
                          step="0.01"
                          value={item.cost ?? ''}
                          onChange={(e) => updateItem(idx, { cost: e.target.value ? parseFloat(e.target.value) : null })}
                          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-brand-gold focus:outline-none"
                          placeholder="—"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Unit</label>
                        <select
                          value={item.unitOfMeasure}
                          onChange={(e) => updateItem(idx, { unitOfMeasure: e.target.value as UnitOfMeasure })}
                          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-brand-gold focus:outline-none"
                        >
                          {['each', 'box', 'pack', 'roll', 'case', 'pair', 'set', 'gallon', 'quart', 'foot', 'yard', 'pound', 'bag', 'bundle'].map(u => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Manufacturer</label>
                        <input
                          type="text"
                          value={item.manufacturer}
                          onChange={(e) => updateItem(idx, { manufacturer: e.target.value })}
                          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-brand-gold focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Part Number</label>
                        <input
                          type="text"
                          value={item.partNumber}
                          onChange={(e) => updateItem(idx, { partNumber: e.target.value })}
                          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-brand-gold focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button
                        onClick={() => updateItem(idx, { editing: false })}
                        className="text-sm text-brand-gold hover:text-brand-gold/80"
                      >
                        Done editing
                      </button>
                    </div>
                  </div>
                ) : (
                  /* View Mode */
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={item.selected}
                      onChange={() => toggleItem(idx)}
                      className="h-4 w-4 rounded border-gray-600 text-brand-gold focus:ring-brand-gold bg-gray-900"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0 ${
                          item.category === 'tool'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {item.category === 'tool' ? 'TOOL' : 'MAT'}
                        </span>
                        <p className="text-white text-sm font-medium truncate">{item.name}</p>
                        {item.sku && (
                          <span className="text-xs text-gray-500 flex-shrink-0">{item.sku}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                        {item.manufacturer && <span>{item.manufacturer}</span>}
                        <span>Par: {item.parLevel} {item.unitOfMeasure}</span>
                        {item.cost != null && <span>${item.cost.toFixed(2)}/unit</span>}
                        {item.description && (
                          <span className="truncate max-w-[200px]">{item.description}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => updateItem(idx, { editing: true })}
                        className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => removeItem(idx)}
                        className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Remove"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Import Button */}
          <div className="sticky bottom-0 bg-brand-dark/95 backdrop-blur-sm border-t border-gray-800 -mx-4 px-4 py-4 sm:-mx-6 sm:px-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-400">
                {selectedCount} item{selectedCount !== 1 ? 's' : ''} will be imported
              </p>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setFile(null);
                    setItems([]);
                    setSummary(null);
                  }}
                  disabled={importing}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={selectedCount === 0 || importing}
                >
                  {importing ? (
                    <>
                      <Spinner className="h-4 w-4 mr-2" />
                      Importing {importProgress.done}/{importProgress.total}...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Import {selectedCount} Item{selectedCount !== 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
