'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, Send, Save } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useAuth, useContractorJobs } from '@/lib/hooks';
import { findAndLinkContractor } from '@/lib/firebase/contractors';
import { createContractorInvoice, markInvoiceAsSent } from '@/lib/firebase/invoices';
import { Contractor } from '@/types/contractor';
import { Job } from '@/types/job';
import { LineItem, InvoiceEntity } from '@/types/invoice';
import { formatCurrency } from '@/lib/utils/formatters';

const BILL_TO_OPTIONS = [
  { value: 'kts', label: 'Key Trade Solutions (KTS)' },
  { value: 'customer', label: 'Customer (from a job)' },
];

export default function NewContractorInvoicePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [contractor, setContractor] = useState<Contractor | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [billToType, setBillToType] = useState<'kts' | 'customer'>('kts');
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: '', qty: 1, rate: 0, total: 0 },
  ]);
  const [discount, setDiscount] = useState(0);

  const { completedJobs, getCompletedJobsForInvoicing } = useContractorJobs({
    contractorId: user?.uid || '',
    realtime: false,
  });

  const [jobOptions, setJobOptions] = useState<Job[]>([]);

  useEffect(() => {
    async function loadData() {
      if (user?.uid && user?.email) {
        try {
          const [contractorData, jobs] = await Promise.all([
            findAndLinkContractor(user.uid, user.email),
            getCompletedJobsForInvoicing(),
          ]);
          setContractor(contractorData);
          setJobOptions(jobs);
        } catch (error) {
          console.error('Error loading data:', error);
        } finally {
          setLoading(false);
        }
      }
    }
    loadData();
  }, [user?.uid, user?.email, getCompletedJobsForInvoicing]);

  // Calculate totals
  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
  const total = Math.max(0, subtotal - discount);

  // Update line item
  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    const newItems = [...lineItems];
    const item = { ...newItems[index] };

    if (field === 'qty' || field === 'rate') {
      const numValue = typeof value === 'string' ? parseFloat(value) || 0 : value;
      item[field] = numValue;
      item.total = item.qty * item.rate;
    } else if (field === 'description') {
      item.description = value as string;
    }

    newItems[index] = item;
    setLineItems(newItems);
  };

  // Add line item
  const addLineItem = () => {
    setLineItems([...lineItems, { description: '', qty: 1, rate: 0, total: 0 }]);
  };

  // Remove line item
  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  // Get selected job
  const selectedJob = jobOptions.find((j) => j.id === selectedJobId);

  // Build toEntity
  const getToEntity = (): InvoiceEntity => {
    if (billToType === 'kts') {
      return { entity: 'kts', name: 'Key Trade Solutions' };
    }

    if (selectedJob) {
      return {
        entity: 'customer',
        name: selectedJob.customer.name,
        email: selectedJob.customer.email,
      };
    }

    return { entity: 'customer', name: 'Unknown Customer' };
  };

  // Submit invoice
  const handleSubmit = async (sendImmediately: boolean) => {
    if (!user?.uid || !contractor) return;

    // Validation
    if (billToType === 'customer' && !selectedJobId) {
      setError('Please select a job');
      return;
    }

    if (lineItems.some((item) => !item.description || item.rate <= 0)) {
      setError('Please fill in all line items with valid descriptions and amounts');
      return;
    }

    if (total <= 0) {
      setError('Invoice total must be greater than zero');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const invoiceId = await createContractorInvoice(
        user.uid,
        contractor.businessName || user.displayName || 'Contractor',
        user.email || undefined,
        getToEntity(),
        lineItems,
        discount
      );

      if (sendImmediately) {
        await markInvoiceAsSent(invoiceId);
      }

      router.push(`/portal/financials/invoices/${invoiceId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create invoice');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-gold border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/portal/financials/invoices">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Create Invoice</h1>
          <p className="text-gray-400 mt-1">
            Bill for your services
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <Card className="p-4 border-red-500 bg-red-500/10">
          <p className="text-red-400">{error}</p>
        </Card>
      )}

      {/* From Section */}
      <Card className="p-4">
        <h2 className="text-lg font-semibold text-white mb-4">From</h2>
        <div className="bg-gray-800/50 p-3 rounded-lg">
          <p className="text-white font-medium">
            {contractor?.businessName || user?.displayName || 'Your Business'}
          </p>
          <p className="text-sm text-gray-400">{user?.email}</p>
        </div>
      </Card>

      {/* Bill To Section */}
      <Card className="p-4">
        <h2 className="text-lg font-semibold text-white mb-4">Bill To</h2>

        <div className="space-y-4">
          <Select
            label="Invoice Type"
            value={billToType}
            onChange={(e) => {
              setBillToType(e.target.value as 'kts' | 'customer');
              setSelectedJobId('');
            }}
            options={BILL_TO_OPTIONS}
          />

          {billToType === 'customer' && (
            <Select
              label="Select Job"
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              options={[
                { value: '', label: 'Select a completed job...' },
                ...jobOptions.map((job) => ({
                  value: job.id,
                  label: `${job.jobNumber} - ${job.customer.name}`,
                })),
              ]}
            />
          )}

          {billToType === 'customer' && jobOptions.length === 0 && (
            <p className="text-yellow-400 text-sm">
              No completed jobs available. You can only invoice customers from jobs you have worked on.
            </p>
          )}

          {billToType === 'customer' && selectedJob && (
            <div className="bg-gray-800/50 p-3 rounded-lg">
              <p className="text-white font-medium">{selectedJob.customer.name}</p>
              <p className="text-sm text-gray-400">{selectedJob.customer.email}</p>
              <p className="text-sm text-gray-400">
                {selectedJob.customer.address.street}, {selectedJob.customer.address.city}
              </p>
            </div>
          )}

          {billToType === 'kts' && (
            <div className="bg-gray-800/50 p-3 rounded-lg">
              <p className="text-white font-medium">Key Trade Solutions</p>
              <p className="text-sm text-gray-400">Labor & Services Invoice</p>
            </div>
          )}
        </div>
      </Card>

      {/* Line Items */}
      <Card className="p-4">
        <h2 className="text-lg font-semibold text-white mb-4">Line Items</h2>

        <div className="space-y-4">
          {/* Header */}
          <div className="hidden sm:grid grid-cols-12 gap-4 text-sm text-gray-400">
            <div className="col-span-5">Description</div>
            <div className="col-span-2">Qty</div>
            <div className="col-span-2">Rate</div>
            <div className="col-span-2">Total</div>
            <div className="col-span-1"></div>
          </div>

          {/* Items */}
          {lineItems.map((item, index) => (
            <div key={index} className="grid grid-cols-12 gap-4 items-start">
              <div className="col-span-12 sm:col-span-5">
                <Input
                  placeholder="Description"
                  value={item.description}
                  onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                />
              </div>
              <div className="col-span-4 sm:col-span-2">
                <Input
                  type="number"
                  placeholder="Qty"
                  value={item.qty || ''}
                  onChange={(e) => updateLineItem(index, 'qty', e.target.value)}
                  min={1}
                />
              </div>
              <div className="col-span-4 sm:col-span-2">
                <Input
                  type="number"
                  placeholder="Rate"
                  value={item.rate || ''}
                  onChange={(e) => updateLineItem(index, 'rate', e.target.value)}
                  min={0}
                  step={0.01}
                />
              </div>
              <div className="col-span-3 sm:col-span-2 flex items-center">
                <span className="text-white font-medium">{formatCurrency(item.total)}</span>
              </div>
              <div className="col-span-1 flex items-center justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeLineItem(index)}
                  disabled={lineItems.length === 1}
                  className="text-gray-400 hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          <Button variant="outline" onClick={addLineItem} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Line Item
          </Button>
        </div>
      </Card>

      {/* Totals */}
      <Card className="p-4">
        <div className="space-y-3">
          <div className="flex justify-between text-gray-400">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-400">Discount</span>
            <Input
              type="number"
              value={discount || ''}
              onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
              min={0}
              className="w-32 text-right"
            />
          </div>

          <div className="flex justify-between text-white text-lg font-bold pt-3 border-t border-gray-700">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>
      </Card>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Button
          variant="outline"
          onClick={() => handleSubmit(false)}
          disabled={submitting}
          className="flex-1"
        >
          <Save className="h-4 w-4 mr-2" />
          Save as Draft
        </Button>
        <Button
          onClick={() => handleSubmit(true)}
          disabled={submitting}
          className="flex-1"
        >
          <Send className="h-4 w-4 mr-2" />
          {submitting ? 'Creating...' : 'Send Invoice'}
        </Button>
      </div>
    </div>
  );
}
