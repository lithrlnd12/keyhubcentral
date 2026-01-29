'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { MeasurementDiagram } from './MeasurementDiagram';
import {
  MeasurementSet,
  MeasurementSystemType,
  ColorFamily,
  WallStyle,
  MeasurementReference,
  WallMeasurements,
  EMPTY_WALL_MEASUREMENTS,
  MEASUREMENT_LABELS,
  MEASUREMENT_FIELD_NAMES,
} from '@/types/measurements';
import { X } from 'lucide-react';

interface MeasurementFormProps {
  initialData?: MeasurementSet;
  systemType: MeasurementSystemType;
  userId: string;
  userName: string;
  onSave: (data: {
    systemType: MeasurementSystemType;
    colorFamily: ColorFamily;
    colorName: string;
    tileName: string;
    style: WallStyle;
    measurementReference: MeasurementReference;
    measurements: WallMeasurements;
    notes: string;
    measuredBy: string;
    measuredByName: string;
  }) => Promise<void>;
  onCancel: () => void;
  saving?: boolean;
}

type MainMeasurementKey = keyof Omit<WallMeasurements, 'windowHeight' | 'windowWidth' | 'windowDepth'>;

export function MeasurementForm({
  initialData,
  systemType,
  userId,
  userName,
  onSave,
  onCancel,
  saving = false,
}: MeasurementFormProps) {
  const [colorFamily, setColorFamily] = useState<ColorFamily>(initialData?.colorFamily || 'standard');
  const [colorName, setColorName] = useState(initialData?.colorName || '');
  const [tileName, setTileName] = useState(initialData?.tileName || '');
  const [style, setStyle] = useState<WallStyle>(initialData?.style || 'smooth');
  const [measurementReference, setMeasurementReference] = useState<MeasurementReference>(
    initialData?.measurementReference || 'ceiling'
  );
  const [measurements, setMeasurements] = useState<WallMeasurements>(
    initialData?.measurements || { ...EMPTY_WALL_MEASUREMENTS }
  );
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [activeField, setActiveField] = useState<keyof WallMeasurements | null>(null);
  const [showWindowKit, setShowWindowKit] = useState(
    initialData?.measurements?.windowHeight !== null ||
    initialData?.measurements?.windowWidth !== null ||
    initialData?.measurements?.windowDepth !== null
  );

  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Focus on the input when a field is clicked in the diagram
  useEffect(() => {
    if (activeField && inputRefs.current[activeField]) {
      inputRefs.current[activeField]?.focus();
    }
  }, [activeField]);

  const handleMeasurementChange = (field: keyof WallMeasurements, value: string) => {
    const numValue = value === '' ? null : parseFloat(value);
    setMeasurements((prev) => ({
      ...prev,
      [field]: numValue,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await onSave({
      systemType,
      colorFamily,
      colorName,
      tileName,
      style,
      measurementReference,
      measurements,
      notes,
      measuredBy: userId,
      measuredByName: userName,
    });
  };

  const mainFields = Object.keys(MEASUREMENT_LABELS) as MainMeasurementKey[];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">
          {initialData ? 'Edit' : 'Add'} {systemType === 'tub_wall' ? 'Tub Wall' : 'Shower Wall'} Measurements
        </h3>
        <button
          type="button"
          onClick={onCancel}
          className="p-2 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Product info */}
      <Card padding="sm">
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Select
              label="Color Family"
              value={colorFamily}
              onChange={(e) => setColorFamily(e.target.value as ColorFamily)}
              options={[
                { value: 'standard', label: 'Standard' },
                { value: 'premium', label: 'Premium' },
              ]}
            />
            <Input
              label="Color Name"
              value={colorName}
              onChange={(e) => setColorName(e.target.value)}
              placeholder="e.g., White, Almond"
            />
            <Input
              label="Tile Name"
              value={tileName}
              onChange={(e) => setTileName(e.target.value)}
              placeholder="e.g., Subway, Windfall"
            />
            <Select
              label="Style"
              value={style}
              onChange={(e) => setStyle(e.target.value as WallStyle)}
              options={[
                { value: 'smooth', label: 'Smooth' },
                { value: 'simulated_tile', label: 'Simulated Tile' },
              ]}
            />
            <Select
              label="Measurement Reference"
              value={measurementReference}
              onChange={(e) => setMeasurementReference(e.target.value as MeasurementReference)}
              options={[
                { value: 'ceiling', label: 'To Ceiling' },
                { value: 'top_of_tile', label: 'To Top of Tile' },
              ]}
            />
          </div>
        </CardContent>
      </Card>

      {/* Main measurement area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Diagram */}
        <Card padding="sm">
          <CardContent>
            <MeasurementDiagram
              systemType={systemType}
              measurements={measurements}
              activeField={activeField}
              onFieldClick={(field) => setActiveField(field)}
            />
          </CardContent>
        </Card>

        {/* Input fields */}
        <Card padding="sm">
          <CardContent>
            <h4 className="text-sm font-medium text-gray-300 mb-4">Wall Measurements (inches)</h4>
            <div className="grid grid-cols-2 gap-3">
              {mainFields.map((field) => {
                const label = MEASUREMENT_LABELS[field];
                const name = MEASUREMENT_FIELD_NAMES[field];
                return (
                  <div key={field}>
                    <label className="block text-xs font-medium text-gray-400 mb-1">
                      <span className="text-brand-gold font-bold">{label}</span> - {name}
                    </label>
                    <input
                      ref={(el) => { inputRefs.current[field] = el; }}
                      type="number"
                      step="0.125"
                      min="0"
                      value={measurements[field] ?? ''}
                      onChange={(e) => handleMeasurementChange(field, e.target.value)}
                      onFocus={() => setActiveField(field)}
                      onBlur={() => setActiveField(null)}
                      placeholder="—"
                      className={`w-full px-3 py-2 bg-brand-charcoal border rounded-lg text-white placeholder-gray-600
                        focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent
                        ${activeField === field ? 'border-brand-gold' : 'border-gray-700'}`}
                    />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Window kit section */}
      <Card padding="sm">
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-medium text-gray-300">Window Kit (Optional)</h4>
            <button
              type="button"
              onClick={() => {
                setShowWindowKit(!showWindowKit);
                if (showWindowKit) {
                  setMeasurements((prev) => ({
                    ...prev,
                    windowHeight: null,
                    windowWidth: null,
                    windowDepth: null,
                  }));
                }
              }}
              className="text-sm text-brand-gold hover:text-brand-gold-light"
            >
              {showWindowKit ? 'Remove Window Kit' : 'Add Window Kit'}
            </button>
          </div>
          {showWindowKit && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Window Height (inches)
                </label>
                <input
                  type="number"
                  step="0.125"
                  min="0"
                  value={measurements.windowHeight ?? ''}
                  onChange={(e) => handleMeasurementChange('windowHeight', e.target.value)}
                  onFocus={() => setActiveField('windowHeight')}
                  onBlur={() => setActiveField(null)}
                  placeholder="—"
                  className="w-full px-3 py-2 bg-brand-charcoal border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Window Width (inches)
                </label>
                <input
                  type="number"
                  step="0.125"
                  min="0"
                  value={measurements.windowWidth ?? ''}
                  onChange={(e) => handleMeasurementChange('windowWidth', e.target.value)}
                  onFocus={() => setActiveField('windowWidth')}
                  onBlur={() => setActiveField(null)}
                  placeholder="—"
                  className="w-full px-3 py-2 bg-brand-charcoal border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Window Depth (inches)
                </label>
                <input
                  type="number"
                  step="0.125"
                  min="0"
                  value={measurements.windowDepth ?? ''}
                  onChange={(e) => handleMeasurementChange('windowDepth', e.target.value)}
                  onFocus={() => setActiveField('windowDepth')}
                  onBlur={() => setActiveField(null)}
                  placeholder="—"
                  className="w-full px-3 py-2 bg-brand-charcoal border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      <Textarea
        label="Notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Any special notes or observations..."
        className="min-h-[80px]"
      />

      {/* Footer */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" loading={saving}>
          {initialData ? 'Save Changes' : 'Add Measurement Set'}
        </Button>
      </div>
    </form>
  );
}
