'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Warehouse,
  Truck,
  Plus,
  ArrowLeft,
  Pencil,
  Trash2,
  X,
  Check,
  MapPin,
} from 'lucide-react';
import { useInventoryLocations, useContractors, useAuth } from '@/lib/hooks';
import {
  createInventoryLocation,
  createTruckLocation,
  updateInventoryLocation,
  deactivateInventoryLocation,
  ensureWarehouseExists,
} from '@/lib/firebase/inventoryLocations';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import type { InventoryLocation, LocationType } from '@/types/inventory';

type FormMode = 'closed' | 'warehouse' | 'truck';

interface LocationForm {
  name: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  contractorId: string;
}

const emptyForm: LocationForm = {
  name: '',
  street: '',
  city: '',
  state: '',
  zip: '',
  contractorId: '',
};

export default function InventoryLocationsPage() {
  const { user } = useAuth();
  const { locations, loading, refetch } = useInventoryLocations({ realtime: true });
  const { contractors } = useContractors({ realtime: true });

  const [formMode, setFormMode] = useState<FormMode>('closed');
  const [form, setForm] = useState<LocationForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const canManage = user?.role && ['owner', 'admin'].includes(user.role);

  // Auto-create default warehouse if none exist
  useEffect(() => {
    if (!loading && locations.length === 0 && canManage) {
      ensureWarehouseExists().then(() => refetch());
    }
  }, [loading, locations.length, canManage]);

  const activeContractors = contractors.filter((c) => c.status === 'active');
  const warehouses = locations.filter((l) => l.type === 'warehouse');
  const trucks = locations.filter((l) => l.type === 'truck');

  function openAdd(type: 'warehouse' | 'truck') {
    setFormMode(type);
    setEditingId(null);
    setForm({
      ...emptyForm,
      name: type === 'warehouse' ? '' : '',
    });
    setError(null);
  }

  function openEdit(location: InventoryLocation) {
    setFormMode(location.type);
    setEditingId(location.id);
    setForm({
      name: location.name,
      street: location.address?.street || '',
      city: location.address?.city || '',
      state: location.address?.state || '',
      zip: location.address?.zip || '',
      contractorId: location.contractorId || '',
    });
    setError(null);
  }

  function closeForm() {
    setFormMode('closed');
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
  }

  async function handleSave() {
    const trimmedName = form.name.trim();
    if (!trimmedName) {
      setError('Location name is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (formMode === 'truck' && !editingId) {
        // Create truck for a contractor
        if (!form.contractorId) {
          setError('Select a contractor for this truck');
          setSaving(false);
          return;
        }
        const contractor = activeContractors.find((c) => c.id === form.contractorId);
        if (!contractor) {
          setError('Contractor not found');
          setSaving(false);
          return;
        }
        // Check if contractor already has a truck
        const existingTruck = trucks.find((t) => t.contractorId === form.contractorId);
        if (existingTruck) {
          setError(`${contractor.businessName || 'Unknown'} already has a truck location: "${existingTruck.name}"`);
          setSaving(false);
          return;
        }
        await createTruckLocation(contractor.id, contractor.businessName || 'Unknown');
      } else if (editingId) {
        // Update existing
        await updateInventoryLocation(editingId, {
          name: trimmedName,
          address: {
            street: form.street.trim(),
            city: form.city.trim(),
            state: form.state.trim(),
            zip: form.zip.trim(),
          },
        });
      } else {
        // Create warehouse
        await createInventoryLocation({
          type: 'warehouse',
          name: trimmedName,
          isActive: true,
          address: {
            street: form.street.trim(),
            city: form.city.trim(),
            state: form.state.trim(),
            zip: form.zip.trim(),
          },
        });
      }

      closeForm();
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save location');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(id: string) {
    try {
      await deactivateInventoryLocation(id);
      setDeleteConfirmId(null);
      await refetch();
    } catch (err) {
      console.error('Failed to deactivate location:', err);
    }
  }

  function updateField(field: keyof LocationForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/kts/inventory"
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Stock Locations</h1>
            <p className="text-gray-400">
              Manage warehouses and truck locations for inventory tracking
            </p>
          </div>
        </div>
        {canManage && formMode === 'closed' && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => openAdd('truck')}>
              <Truck className="w-4 h-4 mr-2" />
              Add Truck
            </Button>
            <Button size="sm" onClick={() => openAdd('warehouse')}>
              <Plus className="w-4 h-4 mr-2" />
              Add Warehouse
            </Button>
          </div>
        )}
      </div>

      {/* Add/Edit Form */}
      {formMode !== 'closed' && (
        <div className="bg-brand-charcoal border border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">
              {editingId ? 'Edit' : 'Add'} {formMode === 'warehouse' ? 'Warehouse' : 'Truck'} Location
            </h2>
            <button onClick={closeForm} className="text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Truck: contractor picker */}
            {formMode === 'truck' && !editingId && (
              <div>
                <label className="block text-sm text-gray-400 mb-1">Contractor</label>
                <select
                  value={form.contractorId}
                  onChange={(e) => updateField('contractorId', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-brand-gold/50"
                >
                  <option value="">Select a contractor...</option>
                  {activeContractors.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.businessName || 'Unknown'}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Name (warehouse or editing truck) */}
            {(formMode === 'warehouse' || editingId) && (
              <div>
                <label className="block text-sm text-gray-400 mb-1">Location Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder={formMode === 'warehouse' ? 'e.g., Main Warehouse' : 'e.g., John\'s Truck'}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold/50"
                />
              </div>
            )}

            {/* Address (warehouse only) */}
            {formMode === 'warehouse' && (
              <div>
                <label className="block text-sm text-gray-400 mb-2">Address (optional)</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={form.street}
                    onChange={(e) => updateField('street', e.target.value)}
                    placeholder="Street"
                    className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold/50 sm:col-span-2"
                  />
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => updateField('city', e.target.value)}
                    placeholder="City"
                    className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold/50"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={form.state}
                      onChange={(e) => updateField('state', e.target.value)}
                      placeholder="State"
                      className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold/50"
                    />
                    <input
                      type="text"
                      value={form.zip}
                      onChange={(e) => updateField('zip', e.target.value)}
                      placeholder="ZIP"
                      className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold/50"
                    />
                  </div>
                </div>
              </div>
            )}

            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={closeForm} disabled={saving}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? <Spinner className="w-4 h-4" /> : <Check className="w-4 h-4 mr-1" />}
                {editingId ? 'Save Changes' : 'Create Location'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Warehouses */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Warehouse className="w-5 h-5 text-brand-gold" />
          <h2 className="text-lg font-semibold text-white">
            Warehouses
            <span className="text-gray-500 text-sm font-normal ml-2">({warehouses.length})</span>
          </h2>
        </div>

        {warehouses.length === 0 ? (
          <div className="bg-brand-charcoal border border-gray-800 rounded-xl p-8 text-center">
            <Warehouse className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 mb-3">No warehouses yet</p>
            {canManage && (
              <Button size="sm" onClick={() => openAdd('warehouse')}>
                <Plus className="w-4 h-4 mr-1" />
                Add Warehouse
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {warehouses.map((loc) => (
              <LocationCard
                key={loc.id}
                location={loc}
                canManage={!!canManage}
                onEdit={() => openEdit(loc)}
                onDelete={() => setDeleteConfirmId(loc.id)}
                deleteConfirm={deleteConfirmId === loc.id}
                onDeleteConfirm={() => handleDeactivate(loc.id)}
                onDeleteCancel={() => setDeleteConfirmId(null)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Trucks */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Truck className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-semibold text-white">
            Trucks
            <span className="text-gray-500 text-sm font-normal ml-2">({trucks.length})</span>
          </h2>
        </div>

        {trucks.length === 0 ? (
          <div className="bg-brand-charcoal border border-gray-800 rounded-xl p-8 text-center">
            <Truck className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 mb-3">No truck locations yet</p>
            {canManage && activeContractors.length > 0 && (
              <Button size="sm" variant="outline" onClick={() => openAdd('truck')}>
                <Plus className="w-4 h-4 mr-1" />
                Add Truck
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {trucks.map((loc) => (
              <LocationCard
                key={loc.id}
                location={loc}
                canManage={!!canManage}
                onEdit={() => openEdit(loc)}
                onDelete={() => setDeleteConfirmId(loc.id)}
                deleteConfirm={deleteConfirmId === loc.id}
                onDeleteConfirm={() => handleDeactivate(loc.id)}
                onDeleteCancel={() => setDeleteConfirmId(null)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Location Card ---

interface LocationCardProps {
  location: InventoryLocation;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
  deleteConfirm: boolean;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
}

function LocationCard({
  location,
  canManage,
  onEdit,
  onDelete,
  deleteConfirm,
  onDeleteConfirm,
  onDeleteCancel,
}: LocationCardProps) {
  const hasAddress = location.address && (location.address.street || location.address.city);
  const addressStr = hasAddress
    ? [location.address?.street, location.address?.city, location.address?.state, location.address?.zip]
        .filter(Boolean)
        .join(', ')
    : null;

  return (
    <div className="flex items-center justify-between p-4 bg-brand-charcoal border border-gray-800 rounded-xl">
      <div className="flex items-center gap-3">
        <div
          className={`p-2 rounded-lg ${
            location.type === 'warehouse' ? 'bg-brand-gold/10' : 'bg-blue-500/10'
          }`}
        >
          {location.type === 'warehouse' ? (
            <Warehouse className="w-5 h-5 text-brand-gold" />
          ) : (
            <Truck className="w-5 h-5 text-blue-400" />
          )}
        </div>
        <div>
          <p className="text-white font-medium">{location.name}</p>
          <div className="flex items-center gap-3 text-sm text-gray-400">
            {location.contractorName && (
              <span>{location.contractorName}</span>
            )}
            {addressStr && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {addressStr}
              </span>
            )}
            {!location.contractorName && !addressStr && (
              <span className="capitalize">{location.type}</span>
            )}
          </div>
        </div>
      </div>

      {canManage && (
        <div className="flex items-center gap-1">
          {deleteConfirm ? (
            <>
              <span className="text-red-400 text-xs mr-2">Remove?</span>
              <button
                onClick={onDeleteConfirm}
                className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={onDeleteCancel}
                className="p-1.5 text-gray-400 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onEdit}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={onDelete}
                className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
