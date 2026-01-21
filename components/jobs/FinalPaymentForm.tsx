'use client';

import { useState, useRef } from 'react';
import { Job, FinalPaymentInfo, PaymentMethod } from '@/types/job';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/hooks';
import { doc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { uploadJobDocument } from '@/lib/firebase/storage';
import {
  DollarSign,
  CreditCard,
  Banknote,
  FileText,
  CheckCircle2,
  Upload,
  Check,
  Loader2,
  Calendar,
  Hash,
} from 'lucide-react';

interface FinalPaymentFormProps {
  job: Job;
  onSaved?: () => void;
  readOnly?: boolean;
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: React.ReactNode }[] = [
  { value: 'cash', label: 'Cash', icon: <Banknote className="w-5 h-5" /> },
  { value: 'check', label: 'Check', icon: <FileText className="w-5 h-5" /> },
  { value: 'card', label: 'Card', icon: <CreditCard className="w-5 h-5" /> },
  { value: 'financing', label: 'Financing', icon: <DollarSign className="w-5 h-5" /> },
];

export function FinalPaymentForm({
  job,
  onSaved,
  readOnly = false,
}: FinalPaymentFormProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calculate remaining balance
  const contractValue = job.commission?.contractValue || 0;
  const downPayment = job.documents?.downPayment?.amount || 0;
  const remainingBalance = contractValue - downPayment;

  const [method, setMethod] = useState<PaymentMethod>(job.finalPayment?.method || 'check');
  const [amount, setAmount] = useState(job.finalPayment?.amount?.toString() || remainingBalance.toString());
  const [referenceNumber, setReferenceNumber] = useState(job.finalPayment?.referenceNumber || '');
  const [receivedDate, setReceivedDate] = useState(
    job.finalPayment?.receivedAt
      ? new Date(job.finalPayment.receivedAt.seconds * 1000).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState(job.finalPayment?.notes || '');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const handleSubmit = async () => {
    if (!user) {
      setError('You must be logged in');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid payment amount');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let proofUrl: string | undefined;

      // Upload proof if provided
      if (proofFile) {
        proofUrl = await uploadJobDocument(job.id, proofFile, 'final_payment');
      }

      const paymentInfo: FinalPaymentInfo = {
        amount: amountNum,
        method,
        receivedAt: Timestamp.fromDate(new Date(receivedDate)),
        receivedBy: user.uid,
        proofUrl: proofUrl || job.finalPayment?.proofUrl,
        referenceNumber: referenceNumber || undefined,
        notes: notes || undefined,
      };

      const jobRef = doc(db, 'jobs', job.id);
      await updateDoc(jobRef, {
        finalPayment: paymentInfo,
        updatedAt: serverTimestamp(),
      });

      onSaved?.();
    } catch (err) {
      console.error('Failed to save payment:', err);
      setError(err instanceof Error ? err.message : 'Failed to save payment');
    } finally {
      setLoading(false);
    }
  };

  // If already recorded and readOnly
  if (job.finalPayment && readOnly) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-400" />
            Final Payment
            <span className="ml-2 px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
              Received
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-400">Amount</p>
              <p className="text-white font-medium">
                {formatCurrency(job.finalPayment.amount)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Method</p>
              <p className="text-white capitalize">{job.finalPayment.method}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Received</p>
              <p className="text-white">
                {new Date(job.finalPayment.receivedAt.seconds * 1000).toLocaleDateString()}
              </p>
            </div>
            {job.finalPayment.referenceNumber && (
              <div>
                <p className="text-xs text-gray-400">Reference #</p>
                <p className="text-white">{job.finalPayment.referenceNumber}</p>
              </div>
            )}
          </div>
          {job.finalPayment.notes && (
            <div>
              <p className="text-xs text-gray-400">Notes</p>
              <p className="text-white text-sm">{job.finalPayment.notes}</p>
            </div>
          )}
          {job.finalPayment.proofUrl && (
            <div>
              <a
                href={job.finalPayment.proofUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-brand-gold hover:underline flex items-center gap-1"
              >
                <FileText className="w-4 h-4" />
                View Payment Proof
              </a>
            </div>
          )}
          <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
            <p className="text-sm text-green-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Final payment has been received and recorded
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-brand-gold" />
          Final Payment
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Payment Summary */}
        <div className="p-3 bg-gray-800/50 rounded-lg space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Contract Value</span>
            <span className="text-white">{formatCurrency(contractValue)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Down Payment Received</span>
            <span className="text-green-400">- {formatCurrency(downPayment)}</span>
          </div>
          <div className="border-t border-gray-700 pt-2 flex justify-between text-sm font-medium">
            <span className="text-gray-300">Remaining Balance</span>
            <span className="text-brand-gold">{formatCurrency(remainingBalance)}</span>
          </div>
        </div>

        {/* Payment Method */}
        <div className="space-y-2">
          <label className="text-sm text-gray-400 font-medium">Payment Method</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {PAYMENT_METHODS.map((pm) => (
              <label
                key={pm.value}
                className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                  method === pm.value
                    ? 'bg-brand-gold/20 border-brand-gold'
                    : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value={pm.value}
                  checked={method === pm.value}
                  onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                  className="sr-only"
                  disabled={loading}
                />
                <span className={method === pm.value ? 'text-brand-gold' : 'text-gray-400'}>
                  {pm.icon}
                </span>
                <span className={method === pm.value ? 'text-white text-sm' : 'text-gray-400 text-sm'}>
                  {pm.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Amount */}
        <div className="space-y-2">
          <label className="text-sm text-gray-400 font-medium">Amount Received</label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              step="0.01"
              min="0"
              disabled={loading}
            />
          </div>
        </div>

        {/* Date Received */}
        <div className="space-y-2">
          <label className="text-sm text-gray-400 font-medium">Date Received</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={receivedDate}
              onChange={(e) => setReceivedDate(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              disabled={loading}
            />
          </div>
        </div>

        {/* Reference Number (for check/card) */}
        {(method === 'check' || method === 'card') && (
          <div className="space-y-2">
            <label className="text-sm text-gray-400 font-medium">
              {method === 'check' ? 'Check Number' : 'Transaction ID'} (Optional)
            </label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                placeholder={method === 'check' ? 'Check #' : 'Transaction ID'}
                disabled={loading}
              />
            </div>
          </div>
        )}

        {/* Proof Upload */}
        <div className="space-y-2">
          <label className="text-sm text-gray-400 font-medium">Payment Proof (Optional)</label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={(e) => setProofFile(e.target.files?.[0] || null)}
            className="hidden"
            disabled={loading}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
              proofFile
                ? 'bg-green-500/10 border-green-500/30'
                : 'bg-gray-800 border-gray-700 hover:border-gray-600'
            }`}
            disabled={loading}
          >
            {proofFile ? (
              <>
                <Check className="w-5 h-5 text-green-400" />
                <span className="text-green-400 text-sm truncate flex-1 text-left">
                  {proofFile.name}
                </span>
                <FileText className="w-4 h-4 text-gray-400" />
              </>
            ) : (
              <>
                <Upload className="w-5 h-5 text-gray-400" />
                <span className="text-gray-400 text-sm">Upload receipt/screenshot</span>
              </>
            )}
          </button>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <label className="text-sm text-gray-400 font-medium">Notes (Optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm resize-none"
            rows={2}
            placeholder="Any additional notes..."
            disabled={loading}
          />
        </div>

        {/* Error */}
        {error && <p className="text-red-400 text-sm">{error}</p>}

        {/* Actions */}
        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={loading || !amount}
            className="bg-green-500 hover:bg-green-600 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Record Payment
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
