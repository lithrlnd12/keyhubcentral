'use client';

import { useState } from 'react';
import { Timestamp } from 'firebase/firestore';
import { Job } from '@/types/job';
import {
  MeasurementSet,
  MeasurementSystemType,
  ColorFamily,
  WallStyle,
  MeasurementReference,
  WallMeasurements,
} from '@/types/measurements';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { MeasurementSetCard } from './MeasurementSetCard';
import { MeasurementForm } from './MeasurementForm';
import { MeasurementUploadModal } from './MeasurementUploadModal';
import {
  addMeasurementSet,
  updateMeasurementSet,
  deleteMeasurementSet,
  uploadMeasurementForm,
  removeMeasurementForm,
} from '@/lib/firebase/measurements';
import { Plus, Upload, FileText, Bath, ShowerHead } from 'lucide-react';

interface JobMeasurementsProps {
  job: Job;
  canEdit: boolean;
  userId: string;
  userName: string;
  onUpdate: () => void;
}

export function JobMeasurements({ job, canEdit, userId, userName, onUpdate }: JobMeasurementsProps) {
  const [addingType, setAddingType] = useState<MeasurementSystemType | null>(null);
  const [saving, setSaving] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const measurementsData = job.measurements || { sets: [] };
  const sets = measurementsData.sets || [];
  const uploadedForm = measurementsData.uploadedFormUrl
    ? { url: measurementsData.uploadedFormUrl, name: measurementsData.uploadedFormName || 'Measurement Form.pdf' }
    : null;

  const handleAddSet = async (data: {
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
    setError(null);

    try {
      await addMeasurementSet(job.id, data);
      setAddingType(null);
      onUpdate();
    } catch (err) {
      console.error('Error adding measurement set:', err);
      setError('Failed to add measurement set. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateSet = async (setId: string, data: {
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
    setError(null);
    try {
      await updateMeasurementSet(job.id, setId, data);
      onUpdate();
    } catch (err) {
      console.error('Error updating measurement set:', err);
      setError('Failed to update measurement set. Please try again.');
      throw err;
    }
  };

  const handleDeleteSet = async (setId: string) => {
    setError(null);
    try {
      await deleteMeasurementSet(job.id, setId);
      onUpdate();
    } catch (err) {
      console.error('Error deleting measurement set:', err);
      setError('Failed to delete measurement set. Please try again.');
      throw err;
    }
  };

  const handleUploadForm = async (file: File) => {
    setError(null);
    try {
      await uploadMeasurementForm(job.id, file);
      onUpdate();
    } catch (err) {
      console.error('Error uploading form:', err);
      setError('Failed to upload form. Please try again.');
      throw err;
    }
  };

  const handleRemoveForm = async () => {
    setError(null);
    try {
      await removeMeasurementForm(job.id);
      onUpdate();
    } catch (err) {
      console.error('Error removing form:', err);
      setError('Failed to remove form. Please try again.');
      throw err;
    }
  };

  // Show add form if adding
  if (addingType) {
    return (
      <Card>
        <CardContent>
          <MeasurementForm
            systemType={addingType}
            userId={userId}
            userName={userName}
            onSave={handleAddSet}
            onCancel={() => setAddingType(null)}
            saving={saving}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-500 text-sm">
          {error}
        </div>
      )}

      {/* Header with actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Wall Measurements</h3>
          <p className="text-sm text-gray-400">
            Enter wall measurements digitally or upload a filled-out PDF form
          </p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowUploadModal(true)}
            >
              <Upload className="w-4 h-4 mr-1" />
              {uploadedForm ? 'View PDF' : 'Upload PDF'}
            </Button>
            <div className="relative group">
              <Button size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Add Measurements
              </Button>
              {/* Dropdown */}
              <div className="absolute right-0 mt-1 w-48 bg-brand-charcoal border border-gray-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                <button
                  onClick={() => setAddingType('tub_wall')}
                  className="w-full px-4 py-3 text-left text-sm text-white hover:bg-white/5 flex items-center gap-2 rounded-t-lg"
                >
                  <Bath className="w-4 h-4 text-brand-gold" />
                  Tub Wall System
                </button>
                <button
                  onClick={() => setAddingType('shower_wall')}
                  className="w-full px-4 py-3 text-left text-sm text-white hover:bg-white/5 flex items-center gap-2 rounded-b-lg border-t border-gray-700"
                >
                  <ShowerHead className="w-4 h-4 text-brand-gold" />
                  Shower Wall System
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Uploaded form banner */}
      {uploadedForm && (
        <Card padding="sm" className="bg-brand-gold/10 border-brand-gold/30">
          <CardContent>
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-brand-gold" />
              <div className="flex-1">
                <p className="text-white font-medium">Uploaded Measurement Form</p>
                <p className="text-sm text-gray-400">{uploadedForm.name}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowUploadModal(true)}
              >
                View
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Measurement sets list */}
      {sets.length > 0 ? (
        <div className="space-y-4">
          {sets.map((set) => (
            <MeasurementSetCard
              key={set.id}
              measurementSet={set}
              canEdit={canEdit}
              userId={userId}
              userName={userName}
              onUpdate={(data) => handleUpdateSet(set.id, data)}
              onDelete={() => handleDeleteSet(set.id)}
            />
          ))}
        </div>
      ) : !uploadedForm ? (
        /* Empty state */
        <Card>
          <CardContent className="py-12 text-center">
            <div className="flex justify-center gap-4 mb-4">
              <Bath className="w-12 h-12 text-gray-600" />
              <ShowerHead className="w-12 h-12 text-gray-600" />
            </div>
            <h4 className="text-lg font-medium text-white mb-2">No Measurements Yet</h4>
            <p className="text-gray-400 max-w-sm mx-auto mb-6">
              Add wall measurements for tub or shower wall systems, or upload a filled-out measurement form PDF.
            </p>
            {canEdit && (
              <div className="flex justify-center gap-3">
                <Button variant="secondary" onClick={() => setShowUploadModal(true)}>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload PDF
                </Button>
                <Button onClick={() => setAddingType('tub_wall')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Tub Wall
                </Button>
                <Button onClick={() => setAddingType('shower_wall')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Shower Wall
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* Upload modal */}
      <MeasurementUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUpload={handleUploadForm}
        onRemove={canEdit ? handleRemoveForm : undefined}
        existingFile={uploadedForm || undefined}
      />
    </div>
  );
}
