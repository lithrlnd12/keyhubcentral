'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Building2,
  MapPin,
  Calendar,
  Clock,
  Users,
  Wrench,
  FileText,
  CheckCircle2,
  ImageIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useLaborRequest } from '@/lib/hooks/useLaborRequests';
import { useContractors } from '@/lib/hooks/useContractors';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  updateLaborRequestStatus,
  assignContractorsToRequest,
} from '@/lib/firebase/laborRequests';
import {
  LaborRequestStatus,
  LABOR_REQUEST_STATUS_ORDER,
  getLaborRequestStatusLabel,
  WORK_TYPE_OPTIONS,
} from '@/types/partner';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { MultiSelect } from '@/components/ui/MultiSelect';
import { Textarea } from '@/components/ui/Textarea';
import { Spinner } from '@/components/ui/Spinner';

const STATUS_COLORS: Record<LaborRequestStatus, string> = {
  new: 'bg-yellow-500/20 text-yellow-400',
  reviewed: 'bg-blue-500/20 text-blue-400',
  approved: 'bg-purple-500/20 text-purple-400',
  assigned: 'bg-indigo-500/20 text-indigo-400',
  in_progress: 'bg-orange-500/20 text-orange-400',
  complete: 'bg-green-500/20 text-green-400',
  cancelled: 'bg-red-500/20 text-red-400',
};

export default function LaborRequestDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { user } = useAuth();

  const { request, loading, error } = useLaborRequest(id, true);
  const { contractors, loading: contractorsLoading } = useContractors({
    initialFilters: { status: 'active' },
  });

  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedContractors, setSelectedContractors] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Initialize form state when request loads
  useState(() => {
    if (request) {
      setSelectedStatus(request.status);
      setSelectedContractors(request.assignedContractorIds || []);
    }
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Labor request not found</p>
      </div>
    );
  }

  const workTypeLabel =
    WORK_TYPE_OPTIONS.find((w) => w.value === request.workType)?.label ||
    request.workType;

  // Generate status options (all statuses including cancelled)
  const statusOptions = [
    ...LABOR_REQUEST_STATUS_ORDER.map((s) => ({
      value: s,
      label: getLaborRequestStatusLabel(s),
    })),
    { value: 'cancelled', label: 'Cancelled' },
  ];

  // Generate contractor options for multi-select
  const contractorOptions = contractors.map((c) => ({
    value: c.id,
    label: c.businessName || `Contractor ${c.id.slice(0, 6)}`,
  }));

  // Handle status update
  const handleUpdateStatus = async () => {
    if (!user?.uid || !selectedStatus) return;

    setUpdating(true);
    setUpdateError(null);

    try {
      const newStatus = selectedStatus as LaborRequestStatus;

      // If assigning contractors (status is assigned and contractors selected)
      if (newStatus === 'assigned' && selectedContractors.length > 0) {
        await assignContractorsToRequest(id, selectedContractors, user.uid);
      } else if (newStatus !== request.status) {
        await updateLaborRequestStatus(id, newStatus, user.uid, notes || undefined);
      }

      setNotes('');
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  // Get assigned contractor names
  const assignedContractorNames = contractors
    .filter((c) => request.assignedContractorIds.includes(c.id))
    .map((c) => c.businessName || `Contractor ${c.id.slice(0, 6)}`);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/admin/partner-requests"
            className="inline-flex items-center text-gray-400 hover:text-white mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Requests
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gold font-mono">
              {request.requestNumber}
            </h1>
            <span
              className={`text-sm px-3 py-1 rounded-full ${STATUS_COLORS[request.status]}`}
            >
              {getLaborRequestStatusLabel(request.status)}
            </span>
          </div>
          <p className="text-gray-400 flex items-center gap-2 mt-1">
            <Building2 className="w-4 h-4" />
            {request.partnerCompany}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Request Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Request Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-400">Work Type</p>
                  <p className="text-white flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-gold" />
                    {workTypeLabel}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Date Needed</p>
                  <p className="text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gold" />
                    {request.dateNeeded.toDate().toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Crew Size</p>
                  <p className="text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-gold" />
                    {request.crewSize} workers
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Estimated Duration</p>
                  <p className="text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gold" />
                    {request.estimatedDuration}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-400 mb-1">Description</p>
                <p className="text-white">{request.description}</p>
              </div>

              <div>
                <p className="text-sm text-gray-400 mb-1">Location</p>
                <p className="text-white flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gold" />
                  {request.location.street}, {request.location.city},{' '}
                  {request.location.state} {request.location.zip}
                </p>
              </div>

              {request.skillsRequired.length > 0 && (
                <div>
                  <p className="text-sm text-gray-400 mb-1">Skills Required</p>
                  <div className="flex flex-wrap gap-2">
                    {request.skillsRequired.map((skill, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 bg-gray-800 text-gray-300 rounded text-sm"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {request.specialEquipment && (
                <div>
                  <p className="text-sm text-gray-400 mb-1">Special Equipment</p>
                  <p className="text-white">{request.specialEquipment}</p>
                </div>
              )}

              {request.notes && (
                <div>
                  <p className="text-sm text-gray-400 mb-1">Notes</p>
                  <p className="text-white">{request.notes}</p>
                </div>
              )}

              {assignedContractorNames.length > 0 && (
                <div>
                  <p className="text-sm text-gray-400 mb-1">Assigned Contractors</p>
                  <div className="flex flex-wrap gap-2">
                    {assignedContractorNames.map((name, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 bg-gold/20 text-gold rounded text-sm"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Work Order */}
          {request.workOrderUrl && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-gold" />
                  Work Order
                </CardTitle>
              </CardHeader>
              <CardContent>
                <a
                  href={request.workOrderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-gold hover:underline text-sm"
                >
                  <FileText className="h-4 w-4" />
                  View uploaded work order PDF
                </a>
              </CardContent>
            </Card>
          )}

          {/* Photos */}
          {request.photos && request.photos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-gold" />
                  Photos ({request.photos.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {request.photos.map((url, index) => (
                    <a
                      key={index}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- Dynamic photo from upload */}
                      <img
                        src={url}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg bg-gray-900 hover:opacity-80 transition-opacity"
                      />
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Status History */}
          <Card>
            <CardHeader>
              <CardTitle>Status History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {request.statusHistory
                  .slice()
                  .reverse()
                  .map((change, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div
                        className={`p-1.5 rounded-full ${STATUS_COLORS[change.status]}`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium">
                            {getLaborRequestStatusLabel(change.status)}
                          </span>
                          <span className="text-gray-500 text-sm">
                            {change.changedAt.toDate().toLocaleString()}
                          </span>
                        </div>
                        {change.notes && (
                          <p className="text-gray-400 text-sm mt-0.5">
                            {change.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions Panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select
                label="Status"
                options={statusOptions}
                value={selectedStatus || request.status}
                onChange={(e) => setSelectedStatus(e.target.value)}
              />

              {/* Show contractor assignment when status is approved or assigned */}
              {['approved', 'assigned'].includes(
                selectedStatus || request.status
              ) && (
                <MultiSelect
                  label="Assign Contractors"
                  options={contractorOptions}
                  value={selectedContractors}
                  onChange={setSelectedContractors}
                  placeholder={
                    contractorsLoading
                      ? 'Loading contractors...'
                      : 'Select contractors...'
                  }
                />
              )}

              <Textarea
                label="Notes"
                placeholder="Add notes for this status change..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />

              {updateError && (
                <p className="text-red-400 text-sm">{updateError}</p>
              )}

              <Button
                onClick={handleUpdateStatus}
                loading={updating}
                disabled={
                  updating ||
                  (selectedStatus === request.status &&
                    selectedContractors.length === 0)
                }
                className="w-full"
              >
                <FileText className="w-4 h-4 mr-2" />
                Update Status
              </Button>
            </CardContent>
          </Card>

          {/* Quick Info */}
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Created</span>
                <span className="text-white">
                  {request.createdAt.toDate().toLocaleDateString()}
                </span>
              </div>
              {request.reviewedAt && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Reviewed</span>
                  <span className="text-white">
                    {request.reviewedAt.toDate().toLocaleDateString()}
                  </span>
                </div>
              )}
              {request.completedAt && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Completed</span>
                  <span className="text-white">
                    {request.completedAt.toDate().toLocaleDateString()}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
