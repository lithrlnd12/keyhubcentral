'use client';

import { useState, useEffect, useCallback } from 'react';
import { Job, JobMaterial, MaterialStatus } from '@/types/job';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { MaterialStatusBadge, getMaterialStatusOptions } from './MaterialStatusBadge';
import {
  addJobMaterial,
  updateJobMaterial,
  removeJobMaterial,
  updateMaterialStatus,
  getMaterialCostSummary,
  MaterialCostSummary,
} from '@/lib/firebase/jobMaterials';
import { useAuth } from '@/lib/hooks';
import { Timestamp } from 'firebase/firestore';
import {
  Plus,
  Edit2,
  Trash2,
  Package,
  DollarSign,
  Calendar,
  Building2,
  Hash,
  X,
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';

interface JobMaterialsProps {
  job: Job;
  onMaterialsChange?: () => void;
  readOnly?: boolean;
}

interface MaterialFormData {
  name: string;
  quantity: number;
  estimatedCost: number;
  actualCost?: number;
  supplier?: string;
  orderNumber?: string;
  expectedArrival?: string;
  notes?: string;
}

const INITIAL_FORM_DATA: MaterialFormData = {
  name: '',
  quantity: 1,
  estimatedCost: 0,
  supplier: '',
  orderNumber: '',
  expectedArrival: '',
  notes: '',
};

export function JobMaterials({ job, onMaterialsChange, readOnly = false }: JobMaterialsProps) {
  const { user } = useAuth();
  const [materials, setMaterials] = useState<JobMaterial[]>(job.materials || []);
  const [costSummary, setCostSummary] = useState<MaterialCostSummary | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<MaterialFormData>(INITIAL_FORM_DATA);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadCostSummary = useCallback(async () => {
    try {
      const summary = await getMaterialCostSummary(job.id);
      setCostSummary(summary);
    } catch (error) {
      console.error('Failed to load cost summary:', error);
    }
  }, [job.id]);

  useEffect(() => {
    setMaterials(job.materials || []);
    loadCostSummary();
  }, [job.materials, loadCostSummary]);

  const handleSubmit = async () => {
    if (!formData.name || formData.quantity <= 0) {
      return;
    }

    setLoading(true);
    try {
      const materialData = {
        name: formData.name,
        quantity: formData.quantity,
        estimatedCost: formData.estimatedCost,
        actualCost: formData.actualCost,
        status: 'pending' as MaterialStatus,
        supplier: formData.supplier || undefined,
        orderNumber: formData.orderNumber || undefined,
        expectedArrival: formData.expectedArrival
          ? Timestamp.fromDate(new Date(formData.expectedArrival))
          : undefined,
        notes: formData.notes || undefined,
      };

      if (editingId) {
        await updateJobMaterial(job.id, editingId, materialData);
      } else {
        await addJobMaterial(job.id, materialData);
      }

      setFormData(INITIAL_FORM_DATA);
      setShowAddForm(false);
      setEditingId(null);
      onMaterialsChange?.();
    } catch (error) {
      console.error('Failed to save material:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (material: JobMaterial) => {
    setFormData({
      name: material.name,
      quantity: material.quantity,
      estimatedCost: material.estimatedCost,
      actualCost: material.actualCost,
      supplier: material.supplier || '',
      orderNumber: material.orderNumber || '',
      expectedArrival: material.expectedArrival
        ? new Date(material.expectedArrival.seconds * 1000).toISOString().split('T')[0]
        : '',
      notes: material.notes || '',
    });
    setEditingId(material.id);
    setShowAddForm(true);
  };

  const handleDelete = async (materialId: string) => {
    if (!confirm('Are you sure you want to remove this material?')) {
      return;
    }

    setLoading(true);
    try {
      await removeJobMaterial(job.id, materialId);
      onMaterialsChange?.();
    } catch (error) {
      console.error('Failed to delete material:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (materialId: string, newStatus: MaterialStatus) => {
    setLoading(true);
    try {
      await updateMaterialStatus(job.id, materialId, newStatus, {
        arrivalDate: newStatus === 'arrived' ? Timestamp.now() : undefined,
        collectedBy: newStatus === 'collected' ? user?.uid : undefined,
      });
      onMaterialsChange?.();
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setLoading(false);
    }
  };

  const cancelForm = () => {
    setFormData(INITIAL_FORM_DATA);
    setShowAddForm(false);
    setEditingId(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (timestamp: Timestamp | null | undefined) => {
    if (!timestamp) return '-';
    return new Date(timestamp.seconds * 1000).toLocaleDateString();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5 text-brand-gold" />
          Materials
        </CardTitle>
        {!readOnly && (
          <Button
            size="sm"
            onClick={() => setShowAddForm(true)}
            disabled={showAddForm}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Material
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Cost Summary */}
        {costSummary && materials.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-gray-800/50 rounded-lg">
            <div>
              <p className="text-xs text-gray-400">Estimated</p>
              <p className="text-sm text-white font-medium">
                {formatCurrency(costSummary.totalEstimated)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Actual</p>
              <p className="text-sm text-white font-medium">
                {formatCurrency(costSummary.totalActual)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Variance</p>
              <p
                className={`text-sm font-medium ${
                  costSummary.variance > 0
                    ? 'text-red-400'
                    : costSummary.variance < 0
                    ? 'text-green-400'
                    : 'text-gray-400'
                }`}
              >
                {costSummary.variance >= 0 ? '+' : ''}
                {formatCurrency(costSummary.variance)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">% Variance</p>
              <p
                className={`text-sm font-medium ${
                  costSummary.percentVariance > 0
                    ? 'text-red-400'
                    : costSummary.percentVariance < 0
                    ? 'text-green-400'
                    : 'text-gray-400'
                }`}
              >
                {costSummary.percentVariance >= 0 ? '+' : ''}
                {costSummary.percentVariance.toFixed(1)}%
              </p>
            </div>
          </div>
        )}

        {/* Add/Edit Form */}
        {showAddForm && (
          <div className="p-4 bg-gray-800 border border-gray-700 rounded-lg space-y-3">
            <h4 className="text-sm font-medium text-white">
              {editingId ? 'Edit Material' : 'Add Material'}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm"
                  placeholder="Material name"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400">Quantity *</label>
                <input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })
                  }
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm"
                  min="1"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400">Estimated Cost (per unit)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="number"
                    value={formData.estimatedCost}
                    onChange={(e) =>
                      setFormData({ ...formData, estimatedCost: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full pl-8 pr-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400">Actual Cost (per unit)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="number"
                    value={formData.actualCost || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        actualCost: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                    className="w-full pl-8 pr-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm"
                    min="0"
                    step="0.01"
                    placeholder="Optional"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400">Supplier</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    className="w-full pl-8 pr-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm"
                    placeholder="Optional"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400">Order Number</label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={formData.orderNumber}
                    onChange={(e) => setFormData({ ...formData, orderNumber: e.target.value })}
                    className="w-full pl-8 pr-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm"
                    placeholder="Optional"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400">Expected Arrival</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="date"
                    value={formData.expectedArrival}
                    onChange={(e) =>
                      setFormData({ ...formData, expectedArrival: e.target.value })
                    }
                    className="w-full pl-8 pr-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm"
                  />
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-gray-400">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm resize-none"
                  rows={2}
                  placeholder="Optional notes"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={cancelForm} disabled={loading}>
                <X className="w-4 h-4 mr-1" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSubmit} disabled={loading || !formData.name}>
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 mr-1" />
                )}
                {editingId ? 'Update' : 'Add'}
              </Button>
            </div>
          </div>
        )}

        {/* Materials List */}
        {materials.length === 0 && !showAddForm ? (
          <p className="text-center text-gray-400 py-8">
            No materials added yet. Click &quot;Add Material&quot; to get started.
          </p>
        ) : (
          <div className="space-y-2">
            {materials.map((material) => (
              <div
                key={material.id}
                className="border border-gray-700 rounded-lg overflow-hidden"
              >
                <div
                  className="flex items-center justify-between p-3 bg-gray-800/50 cursor-pointer"
                  onClick={() =>
                    setExpandedId(expandedId === material.id ? null : material.id)
                  }
                >
                  <div className="flex items-center gap-3">
                    <MaterialStatusBadge status={material.status} size="sm" />
                    <div>
                      <p className="text-white text-sm font-medium">{material.name}</p>
                      <p className="text-xs text-gray-400">
                        Qty: {material.quantity} × {formatCurrency(material.estimatedCost)}
                        {' = '}
                        {formatCurrency(material.quantity * material.estimatedCost)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!readOnly && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(material);
                          }}
                          className="p-1 text-gray-400 hover:text-white transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(material.id);
                          }}
                          className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    {expandedId === material.id ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedId === material.id && (
                  <div className="p-3 border-t border-gray-700 bg-gray-900/50 space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-gray-400">Supplier</p>
                        <p className="text-white">{material.supplier || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Order #</p>
                        <p className="text-white">{material.orderNumber || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Expected Arrival</p>
                        <p className="text-white">{formatDate(material.expectedArrival)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Actual Arrival</p>
                        <p className="text-white">{formatDate(material.arrivalDate)}</p>
                      </div>
                      {material.actualCost !== undefined && (
                        <div>
                          <p className="text-xs text-gray-400">Actual Cost</p>
                          <p className="text-white">{formatCurrency(material.actualCost)}</p>
                        </div>
                      )}
                      {material.collectedBy && (
                        <div>
                          <p className="text-xs text-gray-400">Collected At</p>
                          <p className="text-white">{formatDate(material.collectedAt)}</p>
                        </div>
                      )}
                    </div>
                    {material.notes && (
                      <div>
                        <p className="text-xs text-gray-400">Notes</p>
                        <p className="text-white text-sm">{material.notes}</p>
                      </div>
                    )}
                    {!readOnly && (
                      <div>
                        <p className="text-xs text-gray-400 mb-2">Update Status</p>
                        <div className="flex flex-wrap gap-2">
                          {getMaterialStatusOptions().map((option) => (
                            <button
                              key={option.value}
                              onClick={() => handleStatusChange(material.id, option.value)}
                              disabled={loading || material.status === option.value}
                              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                                material.status === option.value
                                  ? 'bg-brand-gold/20 text-brand-gold border border-brand-gold'
                                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                              }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
