'use client';

import { useState } from 'react';
import { Package, Wrench, Save, X } from 'lucide-react';
import {
  InventoryItem,
  InventoryCategory,
  UnitOfMeasure,
  UNIT_OF_MEASURE_OPTIONS,
} from '@/types/inventory';
import { cn } from '@/lib/utils';

interface InventoryItemFormProps {
  item?: InventoryItem;
  onSubmit: (data: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function InventoryItemForm({
  item,
  onSubmit,
  onCancel,
  loading = false,
}: InventoryItemFormProps) {
  const [formData, setFormData] = useState({
    name: item?.name || '',
    sku: item?.sku || '',
    category: item?.category || ('material' as InventoryCategory),
    description: item?.description || '',
    unitOfMeasure: item?.unitOfMeasure || ('each' as UnitOfMeasure),
    parLevel: item?.parLevel || 0,
    manufacturer: item?.manufacturer || '',
    partNumber: item?.partNumber || '',
    cost: item?.cost || 0,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (formData.parLevel < 0) {
      newErrors.parLevel = 'Par level must be 0 or greater';
    }

    if (formData.cost < 0) {
      newErrors.cost = 'Cost must be 0 or greater';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    await onSubmit({
      name: formData.name.trim(),
      sku: formData.sku.trim() || undefined,
      category: formData.category,
      description: formData.description.trim() || undefined,
      unitOfMeasure: formData.unitOfMeasure,
      parLevel: formData.parLevel,
      manufacturer: formData.manufacturer.trim() || undefined,
      partNumber: formData.partNumber.trim() || undefined,
      cost: formData.cost || undefined,
      createdBy: '', // Will be set by the calling component
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Category Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Category
        </label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setFormData({ ...formData, category: 'material' })}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border transition-colors',
              formData.category === 'material'
                ? 'border-gold bg-gold/10 text-gold'
                : 'border-gray-700 text-gray-400 hover:border-gray-600'
            )}
          >
            <Package className="h-5 w-5" />
            Material
          </button>
          <button
            type="button"
            onClick={() => setFormData({ ...formData, category: 'tool' })}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border transition-colors',
              formData.category === 'tool'
                ? 'border-blue-500 bg-blue-500/10 text-blue-500'
                : 'border-gray-700 text-gray-400 hover:border-gray-600'
            )}
          >
            <Wrench className="h-5 w-5" />
            Tool
          </button>
        </div>
      </div>

      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className={cn(
            'w-full px-4 py-2 bg-gray-900 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold',
            errors.name ? 'border-red-500' : 'border-gray-800'
          )}
          placeholder="Enter item name"
        />
        {errors.name && (
          <p className="text-red-500 text-sm mt-1">{errors.name}</p>
        )}
      </div>

      {/* SKU */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          SKU
        </label>
        <input
          type="text"
          value={formData.sku}
          onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
          className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold"
          placeholder="Enter SKU (optional)"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          rows={3}
          className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold resize-none"
          placeholder="Enter description (optional)"
        />
      </div>

      {/* Unit of Measure and Par Level */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Unit of Measure
          </label>
          <select
            value={formData.unitOfMeasure}
            onChange={(e) =>
              setFormData({
                ...formData,
                unitOfMeasure: e.target.value as UnitOfMeasure,
              })
            }
            className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:border-gold"
          >
            {UNIT_OF_MEASURE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Par Level
          </label>
          <input
            type="number"
            min="0"
            value={formData.parLevel}
            onChange={(e) =>
              setFormData({
                ...formData,
                parLevel: parseInt(e.target.value) || 0,
              })
            }
            className={cn(
              'w-full px-4 py-2 bg-gray-900 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold',
              errors.parLevel ? 'border-red-500' : 'border-gray-800'
            )}
          />
          {errors.parLevel && (
            <p className="text-red-500 text-sm mt-1">{errors.parLevel}</p>
          )}
        </div>
      </div>

      {/* Manufacturer and Part Number */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Manufacturer
          </label>
          <input
            type="text"
            value={formData.manufacturer}
            onChange={(e) =>
              setFormData({ ...formData, manufacturer: e.target.value })
            }
            className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold"
            placeholder="Optional"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Part Number
          </label>
          <input
            type="text"
            value={formData.partNumber}
            onChange={(e) =>
              setFormData({ ...formData, partNumber: e.target.value })
            }
            className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold"
            placeholder="Optional"
          />
        </div>
      </div>

      {/* Cost */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Cost per Unit ($)
        </label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={formData.cost}
          onChange={(e) =>
            setFormData({
              ...formData,
              cost: parseFloat(e.target.value) || 0,
            })
          }
          className={cn(
            'w-full px-4 py-2 bg-gray-900 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold',
            errors.cost ? 'border-red-500' : 'border-gray-800'
          )}
          placeholder="0.00"
        />
        {errors.cost && (
          <p className="text-red-500 text-sm mt-1">{errors.cost}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors"
        >
          <X className="h-4 w-4" />
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gold text-black rounded-lg font-medium hover:bg-gold/90 transition-colors disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {loading ? 'Saving...' : item ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  );
}
