'use client';

import { useState } from 'react';
import { Timestamp } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { MeasurementDiagram } from './MeasurementDiagram';
import { MeasurementForm } from './MeasurementForm';
import {
  MeasurementSet,
  ColorFamily,
  WallStyle,
  MeasurementReference,
  WallMeasurements,
  MeasurementSystemType,
  MEASUREMENT_LABELS,
  MEASUREMENT_FIELD_NAMES,
} from '@/types/measurements';
import { ChevronDown, ChevronUp, Edit2, Trash2, Bath, ShowerHead } from 'lucide-react';

interface MeasurementSetCardProps {
  measurementSet: MeasurementSet;
  canEdit: boolean;
  userId: string;
  userName: string;
  onUpdate: (data: {
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
  onDelete: () => Promise<void>;
}

type MainMeasurementKey = keyof Omit<WallMeasurements, 'windowHeight' | 'windowWidth' | 'windowDepth'>;

export function MeasurementSetCard({
  measurementSet,
  canEdit,
  userId,
  userName,
  onUpdate,
  onDelete,
}: MeasurementSetCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { systemType, colorFamily, colorName, tileName, style, measurements, measuredByName, measuredAt } = measurementSet;

  const formatDate = (timestamp: Timestamp) => {
    return timestamp.toDate().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getFilledCount = () => {
    const mainFields = Object.keys(MEASUREMENT_LABELS) as MainMeasurementKey[];
    return mainFields.filter((f) => measurements[f] !== null).length;
  };

  const handleSave = async (data: {
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
  }) => {
    setSaving(true);
    try {
      await onUpdate(data);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this measurement set?')) return;

    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
    }
  };

  if (editing) {
    return (
      <Card>
        <CardContent>
          <MeasurementForm
            initialData={measurementSet}
            systemType={systemType}
            userId={userId}
            userName={userName}
            onSave={handleSave}
            onCancel={() => setEditing(false)}
            saving={saving}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card padding="none">
      {/* Header - always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand-gold/20 rounded-lg">
            {systemType === 'tub_wall' ? (
              <Bath className="w-5 h-5 text-brand-gold" />
            ) : (
              <ShowerHead className="w-5 h-5 text-brand-gold" />
            )}
          </div>
          <div>
            <h4 className="font-medium text-white">
              {systemType === 'tub_wall' ? 'Tub Wall System' : 'Shower Wall System'}
            </h4>
            <p className="text-sm text-gray-400">
              {colorName || 'No color'} • {tileName || 'No tile'} • {style === 'smooth' ? 'Smooth' : 'Simulated Tile'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right mr-2">
            <p className="text-sm text-gray-400">{getFilledCount()}/8 measurements</p>
            <p className="text-xs text-gray-500">by {measuredByName} • {formatDate(measuredAt)}</p>
          </div>
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-gray-800 p-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Diagram */}
            <MeasurementDiagram
              systemType={systemType}
              measurements={measurements}
            />

            {/* Values list */}
            <div>
              <h5 className="text-sm font-medium text-gray-300 mb-3">Measurements</h5>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {(Object.keys(MEASUREMENT_LABELS) as MainMeasurementKey[]).map((field) => (
                  <div key={field} className="flex justify-between py-1 border-b border-gray-800">
                    <span className="text-gray-400">
                      <span className="text-brand-gold font-bold">{MEASUREMENT_LABELS[field]}</span> {MEASUREMENT_FIELD_NAMES[field]}
                    </span>
                    <span className="text-white font-medium">
                      {measurements[field] !== null ? `${measurements[field]}"` : '—'}
                    </span>
                  </div>
                ))}
              </div>

              {/* Window kit */}
              {(measurements.windowHeight !== null || measurements.windowWidth !== null || measurements.windowDepth !== null) && (
                <div className="mt-4">
                  <h5 className="text-sm font-medium text-gray-300 mb-2">Window Kit</h5>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="text-center p-2 bg-gray-800/50 rounded">
                      <p className="text-xs text-gray-400">Height</p>
                      <p className="text-white font-medium">
                        {measurements.windowHeight !== null ? `${measurements.windowHeight}"` : '—'}
                      </p>
                    </div>
                    <div className="text-center p-2 bg-gray-800/50 rounded">
                      <p className="text-xs text-gray-400">Width</p>
                      <p className="text-white font-medium">
                        {measurements.windowWidth !== null ? `${measurements.windowWidth}"` : '—'}
                      </p>
                    </div>
                    <div className="text-center p-2 bg-gray-800/50 rounded">
                      <p className="text-xs text-gray-400">Depth</p>
                      <p className="text-white font-medium">
                        {measurements.windowDepth !== null ? `${measurements.windowDepth}"` : '—'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              {measurementSet.notes && (
                <div className="mt-4">
                  <h5 className="text-sm font-medium text-gray-300 mb-2">Notes</h5>
                  <p className="text-sm text-gray-400 whitespace-pre-wrap">{measurementSet.notes}</p>
                </div>
              )}

              {/* Product info */}
              <div className="mt-4 p-3 bg-gray-800/30 rounded-lg">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">Color Family:</span>{' '}
                    <span className="text-white capitalize">{colorFamily}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Reference:</span>{' '}
                    <span className="text-white capitalize">
                      {measurementSet.measurementReference === 'ceiling' ? 'To Ceiling' : 'To Top of Tile'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          {canEdit && (
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-800">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                loading={deleting}
                className="text-red-400 hover:text-red-300"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Delete
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditing(true)}
              >
                <Edit2 className="w-4 h-4 mr-1" />
                Edit
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
