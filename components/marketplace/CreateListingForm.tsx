'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { MultiSelect } from '@/components/ui/MultiSelect';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { createListing } from '@/lib/firebase/marketplace';
import {
  TRADE_OPTIONS,
  JOB_TYPE_OPTIONS,
  TIME_BLOCK_LABELS,
} from '@/types/marketplace';
import { SPECIALTIES } from '@/types/contractor';
import { useToast } from '@/components/ui/Toast';

interface CreateListingFormProps {
  dealerId: string;
  dealerName: string;
  onSuccess: () => void;
}

export function CreateListingForm({ dealerId, dealerName, onSuccess }: CreateListingFormProps) {
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [jobType, setJobType] = useState('');
  const [trade, setTrade] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [dateNeeded, setDateNeeded] = useState('');
  const [timeBlock, setTimeBlock] = useState<'am' | 'pm' | 'evening' | 'full_day'>('am');
  const [estimatedDuration, setEstimatedDuration] = useState('');
  const [payRate, setPayRate] = useState<number>(0);
  const [payType, setPayType] = useState<'hourly' | 'flat' | 'per_job'>('hourly');
  const [requiredSkills, setRequiredSkills] = useState<string[]>([]);
  const [crewSize, setCrewSize] = useState(1);

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = 'Title is required';
    if (!description.trim()) newErrors.description = 'Description is required';
    if (!jobType) newErrors.jobType = 'Job type is required';
    if (!trade) newErrors.trade = 'Trade is required';
    if (!city.trim()) newErrors.city = 'City is required';
    if (!state.trim()) newErrors.state = 'State is required';
    if (!zip.trim()) newErrors.zip = 'ZIP code is required';
    if (!dateNeeded) newErrors.dateNeeded = 'Date is required';
    if (!estimatedDuration.trim()) newErrors.estimatedDuration = 'Duration is required';
    if (payRate <= 0) newErrors.payRate = 'Pay rate must be greater than 0';
    if (crewSize < 1) newErrors.crewSize = 'Crew size must be at least 1';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      await createListing({
        dealerId,
        dealerName,
        title: title.trim(),
        description: description.trim(),
        jobType,
        trade,
        location: {
          city: city.trim(),
          state: state.trim(),
          zip: zip.trim(),
        },
        dateNeeded,
        timeBlock,
        estimatedDuration: estimatedDuration.trim(),
        payRate,
        payType,
        requiredSkills,
        crewSize,
      });
      showToast('Listing created successfully', 'success');
      onSuccess();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to create listing', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const timeBlockOptions = Object.entries(TIME_BLOCK_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  const payTypeOptions = [
    { value: 'hourly', label: 'Hourly' },
    { value: 'flat', label: 'Flat Rate' },
    { value: 'per_job', label: 'Per Job' },
  ];

  const skillOptions = SPECIALTIES.map((s) => ({ value: s, label: s }));

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-white mb-6">Create New Listing</h3>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Title */}
        <Input
          label="Title"
          placeholder="e.g., Kitchen Cabinet Installation"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          error={errors.title}
        />

        {/* Description */}
        <Textarea
          label="Description"
          placeholder="Describe the work needed, any special requirements, materials provided, etc."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          error={errors.description}
        />

        {/* Job Type & Trade */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Job Type"
            options={JOB_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            value={jobType}
            onChange={(e) => setJobType(e.target.value)}
            placeholder="Select job type"
            error={errors.jobType}
          />
          <Select
            label="Trade"
            options={TRADE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            value={trade}
            onChange={(e) => setTrade(e.target.value)}
            placeholder="Select trade"
            error={errors.trade}
          />
        </div>

        {/* Location */}
        <div>
          <p className="text-sm font-medium text-gray-300 mb-2">Location</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Input
              placeholder="City"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              error={errors.city}
            />
            <Input
              placeholder="State"
              value={state}
              onChange={(e) => setState(e.target.value)}
              error={errors.state}
            />
            <Input
              placeholder="ZIP"
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              error={errors.zip}
            />
          </div>
        </div>

        {/* Date & Time */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Date Needed"
            type="date"
            value={dateNeeded}
            onChange={(e) => setDateNeeded(e.target.value)}
            error={errors.dateNeeded}
          />
          <Select
            label="Time Block"
            options={timeBlockOptions}
            value={timeBlock}
            onChange={(e) => setTimeBlock(e.target.value as typeof timeBlock)}
          />
        </div>

        {/* Duration */}
        <Input
          label="Estimated Duration"
          placeholder="e.g., 4 hours, 2 days"
          value={estimatedDuration}
          onChange={(e) => setEstimatedDuration(e.target.value)}
          error={errors.estimatedDuration}
        />

        {/* Pay */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Pay Rate ($)"
            type="number"
            min={0}
            step={0.01}
            value={payRate || ''}
            onChange={(e) => setPayRate(Number(e.target.value))}
            error={errors.payRate}
          />
          <Select
            label="Pay Type"
            options={payTypeOptions}
            value={payType}
            onChange={(e) => setPayType(e.target.value as typeof payType)}
          />
        </div>

        {/* Required Skills */}
        <MultiSelect
          label="Required Skills"
          options={skillOptions}
          value={requiredSkills}
          onChange={setRequiredSkills}
          placeholder="Select required skills..."
        />

        {/* Crew Size */}
        <Input
          label="Crew Size"
          type="number"
          min={1}
          value={crewSize}
          onChange={(e) => setCrewSize(Number(e.target.value) || 1)}
          error={errors.crewSize}
        />

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={submitting} className="flex-1">
            Post Listing
          </Button>
        </div>
      </form>
    </Card>
  );
}
