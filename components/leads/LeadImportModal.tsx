'use client';

import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/lib/hooks/useAuth';
import { createLeadsBatch } from '@/lib/firebase/leads';
import { ParsedLead, LeadImportParseResponse } from '@/types/leadImport';
import { LeadSource, LeadQuality } from '@/types/lead';
import { X, Upload, FileText, AlertTriangle, CheckCircle } from 'lucide-react';

interface LeadImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: (count: number) => void;
}

const ACCEPTED_EXTENSIONS = '.csv,.xlsx,.xls,.pdf,.jpg,.jpeg,.png,.webp';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function LeadImportModal({ isOpen, onClose, onImportComplete }: LeadImportModalProps) {
  const { getIdToken } = useAuth();
  const { showToast } = useToast();

  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [parseResult, setParseResult] = useState<LeadImportParseResponse | null>(null);
  const [selectedLeads, setSelectedLeads] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const reset = useCallback(() => {
    setFile(null);
    setParsing(false);
    setImporting(false);
    setParseResult(null);
    setSelectedLeads(new Set());
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const validateFile = (f: File): string | null => {
    if (f.size > MAX_FILE_SIZE) {
      return 'File too large. Maximum 10MB.';
    }
    const ext = f.name.toLowerCase().split('.').pop();
    const validExts = ['csv', 'xlsx', 'xls', 'pdf', 'jpg', 'jpeg', 'png', 'webp'];
    if (!ext || !validExts.includes(ext)) {
      return 'Unsupported file type. Upload CSV, Excel, PDF, or image files.';
    }
    return null;
  };

  const handleFileSelect = async (selectedFile: File) => {
    const validationError = validateFile(selectedFile);
    if (validationError) {
      setError(validationError);
      return;
    }

    setFile(selectedFile);
    setError(null);
    setParseResult(null);
    setSelectedLeads(new Set());

    // Auto-parse on file selection
    await parseFile(selectedFile);
  };

  const parseFile = async (fileToUpload: File) => {
    setParsing(true);
    setError(null);

    try {
      const token = await getIdToken();
      if (!token) {
        throw new Error('You must be logged in to import leads');
      }

      const formData = new FormData();
      formData.append('file', fileToUpload);

      const response = await fetch('/api/leads/import', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to parse file');
      }

      const data: LeadImportParseResponse = await response.json();

      if (!data.leads || data.leads.length === 0) {
        throw new Error('No leads found in the uploaded file');
      }

      setParseResult(data);
      // Select all leads by default
      setSelectedLeads(new Set(data.leads.map((_, i) => i)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file');
    } finally {
      setParsing(false);
    }
  };

  const toggleLead = (index: number) => {
    setSelectedLeads((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (!parseResult) return;
    if (selectedLeads.size === parseResult.leads.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(parseResult.leads.map((_, i) => i)));
    }
  };

  const getValidationWarnings = (lead: ParsedLead): string[] => {
    const warnings: string[] = [];
    if (!lead.phone && !lead.email) {
      warnings.push('No phone or email');
    }
    if (!lead.name) {
      warnings.push('No name');
    }
    return warnings;
  };

  const handleImport = async () => {
    if (!parseResult || selectedLeads.size === 0) return;

    setImporting(true);
    setError(null);

    try {
      const leadsToImport = parseResult.leads
        .filter((_, i) => selectedLeads.has(i))
        .map((parsed) => ({
          source: (parsed.source || 'other') as LeadSource,
          campaignId: null,
          market: parsed.market || '',
          trade: parsed.trade || '',
          customer: {
            name: parsed.name || '',
            phone: parsed.phone || null,
            email: parsed.email || null,
            address: {
              street: parsed.address?.street || '',
              city: parsed.address?.city || '',
              state: parsed.address?.state || '',
              zip: parsed.address?.zip || '',
            },
            notes: parsed.notes || null,
          },
          quality: (parsed.quality || 'warm') as LeadQuality,
          status: 'new' as const,
          assignedTo: null,
          assignedType: null,
          returnReason: null,
          returnedAt: null,
          smsCallOptIn: false,
        }));

      const ids = await createLeadsBatch(leadsToImport);

      showToast(`Successfully imported ${ids.length} lead${ids.length === 1 ? '' : 's'}`, 'success');
      onImportComplete?.(ids.length);
      handleClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to import leads';
      setError(message);
      showToast(message, 'error');
    } finally {
      setImporting(false);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-white">Import Leads</h2>
            <p className="text-sm text-gray-400 mt-1">
              Upload a CSV, Excel, PDF, or image file to bulk import leads
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* File Drop Zone */}
          {!parseResult && !parsing && (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
                ${dragActive
                  ? 'border-brand-gold bg-brand-gold/5'
                  : 'border-gray-600 hover:border-gray-500 hover:bg-gray-800/50'
                }
              `}
            >
              <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
              <p className="text-white font-medium">
                {file ? file.name : 'Drop your file here or click to browse'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                CSV, Excel (.xlsx/.xls), PDF, or images (JPEG, PNG, WebP) up to 10MB
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_EXTENSIONS}
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
                className="hidden"
              />
            </div>
          )}

          {/* Parsing State */}
          {parsing && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Spinner size="lg" />
              <div className="text-center">
                <p className="text-white font-medium">Parsing your file...</p>
                <p className="text-sm text-gray-400 mt-1">
                  AI is extracting lead data from {file?.name}
                </p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-400 font-medium">Error</p>
                <p className="text-sm text-red-300 mt-1">{error}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={reset}
                  className="mt-2 text-red-400 hover:text-red-300"
                >
                  Try again
                </Button>
              </div>
            </div>
          )}

          {/* Parse Results */}
          {parseResult && !parsing && (
            <>
              {/* Summary */}
              <div className="bg-gray-800 rounded-lg p-4 flex items-start gap-3">
                <FileText className="w-5 h-5 text-brand-gold flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-white font-medium">{parseResult.summary}</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Source: {parseResult.sourceType} | {parseResult.leads.length} lead{parseResult.leads.length === 1 ? '' : 's'} found
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={reset}>
                  Upload different file
                </Button>
              </div>

              {/* Duplicate Warnings */}
              {parseResult.duplicateWarnings && parseResult.duplicateWarnings.length > 0 && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                  <p className="text-yellow-400 font-medium text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Duplicate Warnings
                  </p>
                  <ul className="mt-2 space-y-1">
                    {parseResult.duplicateWarnings.map((warning, i) => (
                      <li key={i} className="text-sm text-yellow-300">
                        {warning}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Leads Table */}
              <div className="border border-gray-700 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-800 text-gray-300">
                        <th className="p-3 text-left w-10">
                          <input
                            type="checkbox"
                            checked={selectedLeads.size === parseResult.leads.length}
                            onChange={toggleAll}
                            className="rounded border-gray-600 bg-gray-700 text-brand-gold focus:ring-brand-gold"
                          />
                        </th>
                        <th className="p-3 text-left">Name</th>
                        <th className="p-3 text-left">Phone</th>
                        <th className="p-3 text-left">Email</th>
                        <th className="p-3 text-left">City/State</th>
                        <th className="p-3 text-left">Quality</th>
                        <th className="p-3 text-left">Trade</th>
                        <th className="p-3 text-left w-12">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {parseResult.leads.map((lead, index) => {
                        const warnings = getValidationWarnings(lead);
                        const isSelected = selectedLeads.has(index);

                        return (
                          <tr
                            key={index}
                            className={`
                              transition-colors cursor-pointer
                              ${isSelected ? 'bg-gray-800/50' : 'bg-gray-900 opacity-50'}
                              hover:bg-gray-800
                            `}
                            onClick={() => toggleLead(index)}
                          >
                            <td className="p-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleLead(index)}
                                onClick={(e) => e.stopPropagation()}
                                className="rounded border-gray-600 bg-gray-700 text-brand-gold focus:ring-brand-gold"
                              />
                            </td>
                            <td className="p-3 text-white font-medium">
                              {lead.name || <span className="text-gray-500 italic">No name</span>}
                            </td>
                            <td className="p-3 text-gray-300">
                              {lead.phone || <span className="text-gray-500">-</span>}
                            </td>
                            <td className="p-3 text-gray-300 max-w-[200px] truncate">
                              {lead.email || <span className="text-gray-500">-</span>}
                            </td>
                            <td className="p-3 text-gray-300">
                              {lead.address?.city && lead.address?.state
                                ? `${lead.address.city}, ${lead.address.state}`
                                : lead.address?.city || lead.address?.state || <span className="text-gray-500">-</span>}
                            </td>
                            <td className="p-3">
                              <span
                                className={`
                                  inline-block px-2 py-0.5 rounded text-xs font-medium
                                  ${lead.quality === 'hot' ? 'bg-red-500/20 text-red-400' : ''}
                                  ${lead.quality === 'warm' ? 'bg-yellow-500/20 text-yellow-400' : ''}
                                  ${lead.quality === 'cold' ? 'bg-blue-500/20 text-blue-400' : ''}
                                `}
                              >
                                {lead.quality || 'warm'}
                              </span>
                            </td>
                            <td className="p-3 text-gray-300 max-w-[120px] truncate">
                              {lead.trade || <span className="text-gray-500">-</span>}
                            </td>
                            <td className="p-3">
                              {warnings.length > 0 ? (
                                <span title={warnings.join(', ')}>
                                  <AlertTriangle className="w-4 h-4 text-yellow-400" />
                                </span>
                              ) : (
                                <CheckCircle className="w-4 h-4 text-green-400" />
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {parseResult && !parsing && (
          <div className="flex items-center justify-between p-6 border-t border-gray-700">
            <p className="text-sm text-gray-400">
              {selectedLeads.size} of {parseResult.leads.length} leads selected
            </p>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={handleClose} disabled={importing}>
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                loading={importing}
                disabled={selectedLeads.size === 0}
              >
                Import {selectedLeads.size} Lead{selectedLeads.size === 1 ? '' : 's'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
