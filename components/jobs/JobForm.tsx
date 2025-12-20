'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Job, JobType, Customer, JobCosts, JobDates, Warranty } from '@/types/job';
import { Address } from '@/types/contractor';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { createJob, updateJob, generateJobNumber } from '@/lib/firebase/jobs';
import { JOB_TYPE_LABELS } from '@/lib/utils/jobs';
import { Timestamp } from 'firebase/firestore';
import {
  User,
  MapPin,
  DollarSign,
  Calendar,
  Briefcase,
  Save,
  Loader2,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';

interface JobFormProps {
  job?: Job;
  initialTab?: string;
}

type JobFormData = {
  jobNumber: string;
  type: JobType;
  customer: Customer;
  costs: JobCosts;
  notes: string;
  salesRepId: string | null;
  pmId: string | null;
  crewIds: string[];
  warranty: Warranty;
  dates: Omit<JobDates, 'created'>;
};

const DEFAULT_ADDRESS: Address = {
  street: '',
  city: '',
  state: '',
  zip: '',
};

const DEFAULT_CUSTOMER: Customer = {
  name: '',
  phone: '',
  email: '',
  address: DEFAULT_ADDRESS,
};

const DEFAULT_COSTS: JobCosts = {
  materialProjected: 0,
  materialActual: 0,
  laborProjected: 0,
  laborActual: 0,
};

const DEFAULT_WARRANTY: Warranty = {
  startDate: null,
  endDate: null,
  status: 'pending',
};

export function JobForm({ job, initialTab = 'customer' }: JobFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(initialTab);

  const [formData, setFormData] = useState<JobFormData>({
    jobNumber: job?.jobNumber || '',
    type: job?.type || 'bathroom',
    customer: job?.customer || DEFAULT_CUSTOMER,
    costs: job?.costs || DEFAULT_COSTS,
    notes: job?.notes || '',
    salesRepId: job?.salesRepId || null,
    pmId: job?.pmId || null,
    crewIds: job?.crewIds || [],
    warranty: job?.warranty || DEFAULT_WARRANTY,
    dates: {
      sold: job?.dates.sold || null,
      scheduledStart: job?.dates.scheduledStart || null,
      actualStart: job?.dates.actualStart || null,
      targetCompletion: job?.dates.targetCompletion || null,
      actualCompletion: job?.dates.actualCompletion || null,
      paidInFull: job?.dates.paidInFull || null,
    },
  });

  // Generate job number for new jobs
  useEffect(() => {
    if (!job) {
      generateJobNumber().then((num) => {
        setFormData((prev) => ({ ...prev, jobNumber: num }));
      });
    }
  }, [job]);

  const updateField = <K extends keyof JobFormData>(
    field: K,
    value: JobFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updateCustomer = (updates: Partial<Customer>) => {
    setFormData((prev) => ({
      ...prev,
      customer: { ...prev.customer, ...updates },
    }));
  };

  const updateCustomerAddress = (updates: Partial<Address>) => {
    setFormData((prev) => ({
      ...prev,
      customer: {
        ...prev.customer,
        address: { ...prev.customer.address, ...updates },
      },
    }));
  };

  const updateCosts = (updates: Partial<JobCosts>) => {
    setFormData((prev) => ({
      ...prev,
      costs: { ...prev.costs, ...updates },
    }));
  };

  const handleSubmit = async () => {
    setError(null);
    setSaving(true);

    try {
      if (job) {
        // Update existing job
        await updateJob(job.id, {
          ...formData,
          dates: {
            created: job.dates.created,
            ...formData.dates,
          },
        });
        router.push(`/kr/${job.id}`);
      } else {
        // Create new job
        const id = await createJob({
          ...formData,
          status: 'lead',
          dates: {
            created: Timestamp.now(),
            ...formData.dates,
          },
        });
        router.push(`/kr/${id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save job');
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href={job ? `/kr/${job.id}` : '/kr'}
            className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {job ? 'Back to Job' : 'Back to Jobs'}
          </Link>
          <h1 className="text-2xl font-bold text-white">
            {job ? `Edit Job ${job.jobNumber}` : 'Create New Job'}
          </h1>
        </div>
        <Button onClick={handleSubmit} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              {job ? 'Save Changes' : 'Create Job'}
            </>
          )}
        </Button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}

      {/* Form Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="customer">Customer</TabsTrigger>
          <TabsTrigger value="job">Job Details</TabsTrigger>
          <TabsTrigger value="costs">Costs</TabsTrigger>
          <TabsTrigger value="dates">Dates</TabsTrigger>
        </TabsList>

        {/* Customer Tab */}
        <TabsContent value="customer">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-brand-gold" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Customer Name *
                  </label>
                  <Input
                    value={formData.customer.name}
                    onChange={(e) => updateCustomer({ name: e.target.value })}
                    placeholder="John Smith"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Phone *
                  </label>
                  <Input
                    value={formData.customer.phone}
                    onChange={(e) => updateCustomer({ phone: e.target.value })}
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm text-gray-400 mb-1">
                    Email
                  </label>
                  <Input
                    type="email"
                    value={formData.customer.email}
                    onChange={(e) => updateCustomer({ email: e.target.value })}
                    placeholder="john@example.com"
                  />
                </div>
              </div>

              <div>
                <h4 className="flex items-center gap-2 text-white font-medium mb-3">
                  <MapPin className="w-4 h-4 text-brand-gold" />
                  Address
                </h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="block text-sm text-gray-400 mb-1">
                      Street Address *
                    </label>
                    <Input
                      value={formData.customer.address.street}
                      onChange={(e) =>
                        updateCustomerAddress({ street: e.target.value })
                      }
                      placeholder="123 Main Street"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      City *
                    </label>
                    <Input
                      value={formData.customer.address.city}
                      onChange={(e) =>
                        updateCustomerAddress({ city: e.target.value })
                      }
                      placeholder="Dallas"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">
                        State *
                      </label>
                      <Input
                        value={formData.customer.address.state}
                        onChange={(e) =>
                          updateCustomerAddress({ state: e.target.value })
                        }
                        placeholder="TX"
                        maxLength={2}
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">
                        ZIP *
                      </label>
                      <Input
                        value={formData.customer.address.zip}
                        onChange={(e) =>
                          updateCustomerAddress({ zip: e.target.value })
                        }
                        placeholder="75201"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Job Details Tab */}
        <TabsContent value="job">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-brand-gold" />
                Job Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Job Number
                  </label>
                  <Input
                    value={formData.jobNumber}
                    onChange={(e) => updateField('jobNumber', e.target.value)}
                    disabled={!!job}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Job Type *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => updateField('type', e.target.value as JobType)}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-brand-gold/50"
                  >
                    {Object.entries(JOB_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => updateField('notes', e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold/50 resize-none"
                  placeholder="Additional notes about this job..."
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Costs Tab */}
        <TabsContent value="costs">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-brand-gold" />
                Cost Estimates
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="text-white font-medium mb-3">Projected Costs</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      Materials
                    </label>
                    <Input
                      type="number"
                      value={formData.costs.materialProjected}
                      onChange={(e) =>
                        updateCosts({
                          materialProjected: parseFloat(e.target.value) || 0,
                        })
                      }
                      min={0}
                      step={0.01}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      Labor
                    </label>
                    <Input
                      type="number"
                      value={formData.costs.laborProjected}
                      onChange={(e) =>
                        updateCosts({
                          laborProjected: parseFloat(e.target.value) || 0,
                        })
                      }
                      min={0}
                      step={0.01}
                    />
                  </div>
                </div>
              </div>

              {job && (
                <div>
                  <h4 className="text-white font-medium mb-3">Actual Costs</h4>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">
                        Materials
                      </label>
                      <Input
                        type="number"
                        value={formData.costs.materialActual}
                        onChange={(e) =>
                          updateCosts({
                            materialActual: parseFloat(e.target.value) || 0,
                          })
                        }
                        min={0}
                        step={0.01}
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">
                        Labor
                      </label>
                      <Input
                        type="number"
                        value={formData.costs.laborActual}
                        onChange={(e) =>
                          updateCosts({
                            laborActual: parseFloat(e.target.value) || 0,
                          })
                        }
                        min={0}
                        step={0.01}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-gray-700">
                <div className="flex justify-between text-lg">
                  <span className="text-gray-400">Total Projected</span>
                  <span className="text-white font-bold">
                    ${(
                      formData.costs.materialProjected +
                      formData.costs.laborProjected
                    ).toLocaleString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dates Tab */}
        <TabsContent value="dates">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-brand-gold" />
                Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Scheduled Start
                  </label>
                  <Input
                    type="date"
                    value={
                      formData.dates.scheduledStart
                        ? formData.dates.scheduledStart.toDate().toISOString().split('T')[0]
                        : ''
                    }
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        dates: {
                          ...prev.dates,
                          scheduledStart: e.target.value
                            ? Timestamp.fromDate(new Date(e.target.value))
                            : null,
                        },
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Target Completion
                  </label>
                  <Input
                    type="date"
                    value={
                      formData.dates.targetCompletion
                        ? formData.dates.targetCompletion.toDate().toISOString().split('T')[0]
                        : ''
                    }
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        dates: {
                          ...prev.dates,
                          targetCompletion: e.target.value
                            ? Timestamp.fromDate(new Date(e.target.value))
                            : null,
                        },
                      }))
                    }
                  />
                </div>
              </div>

              {job && (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">
                        Actual Start
                      </label>
                      <Input
                        type="date"
                        value={
                          formData.dates.actualStart
                            ? formData.dates.actualStart.toDate().toISOString().split('T')[0]
                            : ''
                        }
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            dates: {
                              ...prev.dates,
                              actualStart: e.target.value
                                ? Timestamp.fromDate(new Date(e.target.value))
                                : null,
                            },
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">
                        Actual Completion
                      </label>
                      <Input
                        type="date"
                        value={
                          formData.dates.actualCompletion
                            ? formData.dates.actualCompletion.toDate().toISOString().split('T')[0]
                            : ''
                        }
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            dates: {
                              ...prev.dates,
                              actualCompletion: e.target.value
                                ? Timestamp.fromDate(new Date(e.target.value))
                                : null,
                            },
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">
                        Sold Date
                      </label>
                      <Input
                        type="date"
                        value={
                          formData.dates.sold
                            ? formData.dates.sold.toDate().toISOString().split('T')[0]
                            : ''
                        }
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            dates: {
                              ...prev.dates,
                              sold: e.target.value
                                ? Timestamp.fromDate(new Date(e.target.value))
                                : null,
                            },
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">
                        Paid in Full Date
                      </label>
                      <Input
                        type="date"
                        value={
                          formData.dates.paidInFull
                            ? formData.dates.paidInFull.toDate().toISOString().split('T')[0]
                            : ''
                        }
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            dates: {
                              ...prev.dates,
                              paidInFull: e.target.value
                                ? Timestamp.fromDate(new Date(e.target.value))
                                : null,
                            },
                          }))
                        }
                      />
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
