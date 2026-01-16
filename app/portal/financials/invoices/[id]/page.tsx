'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useInvoice } from '@/lib/hooks/useInvoice';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  markInvoiceAsSent,
  deleteInvoice,
} from '@/lib/firebase/invoices';
import { functions } from '@/lib/firebase/config';
import { httpsCallable } from 'firebase/functions';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import {
  formatInvoiceDate,
  formatDueDateWithStatus,
  isOverdue,
} from '@/lib/utils/invoices';
import { formatCurrency } from '@/lib/utils/formatters';
import {
  ArrowLeft,
  Send,
  Trash2,
  Calendar,
  Mail,
  AlertTriangle,
  FileText,
  CheckCircle,
} from 'lucide-react';

// Dynamic import for PDF button (SSR disabled for @react-pdf/renderer)
const InvoicePDFButton = dynamic(
  () => import('@/components/pdf/InvoicePDFButton').then((mod) => mod.InvoicePDFButton),
  { ssr: false, loading: () => null }
);

export default function ContractorInvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { invoice, loading, error } = useInvoice(id, { realtime: true });
  const { user } = useAuth();
  const { showToast } = useToast();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Check if user owns this invoice
  const isOwner = invoice?.from?.contractorId === user?.uid;
  const overdue = invoice ? isOverdue(invoice) : false;

  const handleMarkAsSent = async () => {
    if (!invoice || !isOwner) return;
    setActionLoading('send');
    try {
      await markInvoiceAsSent(invoice.id);
    } catch (err) {
      console.error('Failed to mark as sent:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!invoice || !isOwner) return;
    if (!confirm('Are you sure you want to delete this invoice?')) return;

    setActionLoading('delete');
    try {
      await deleteInvoice(invoice.id);
      router.push('/portal/financials/invoices');
    } catch (err) {
      console.error('Failed to delete:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendEmail = () => {
    if (!invoice || !isOwner) return;

    const recipientEmail = invoice.to?.email;
    if (!recipientEmail) {
      showToast('No email address on invoice. Add recipient email when creating invoice.', 'error');
      return;
    }

    setActionLoading('email');

    // Defer network call to allow UI to update first (fixes INP)
    setTimeout(async () => {
      try {
        const sendInvoiceEmail = httpsCallable(functions, 'sendInvoiceEmail');
        await sendInvoiceEmail({ invoiceId: invoice.id });
        const action = invoice.status === 'sent' ? 'resent' : 'sent';
        showToast(`Invoice ${action} to ${recipientEmail}`, 'success');
      } catch (err) {
        console.error('Failed to send email:', err);
        showToast('Failed to send invoice. Please try again.', 'error');
      } finally {
        setActionLoading(null);
      }
    }, 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="space-y-6">
        <Link href="/portal/financials/invoices" className="inline-flex items-center gap-2 text-gray-400 hover:text-white">
          <ArrowLeft className="w-4 h-4" />
          Back to Invoices
        </Link>
        <Card className="p-6 text-center border-red-500/20 bg-red-500/10">
          <p className="text-red-400">{error || 'Invoice not found'}</p>
        </Card>
      </div>
    );
  }

  // Unauthorized access
  if (!isOwner) {
    return (
      <div className="space-y-6">
        <Link href="/portal/financials/invoices" className="inline-flex items-center gap-2 text-gray-400 hover:text-white">
          <ArrowLeft className="w-4 h-4" />
          Back to Invoices
        </Link>
        <Card className="p-6 text-center border-yellow-500/20 bg-yellow-500/10">
          <p className="text-yellow-400">You do not have permission to view this invoice.</p>
        </Card>
      </div>
    );
  }

  const dueStatus = formatDueDateWithStatus(invoice);

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link href="/portal/financials/invoices" className="inline-flex items-center gap-2 text-gray-400 hover:text-white">
        <ArrowLeft className="w-4 h-4" />
        Back to Invoices
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{invoice.invoiceNumber}</h1>
            <Badge
              variant={
                invoice.status === 'paid'
                  ? 'success'
                  : invoice.status === 'sent'
                  ? 'warning'
                  : overdue
                  ? 'error'
                  : 'default'
              }
            >
              {overdue && invoice.status !== 'paid' ? 'Overdue' : invoice.status}
            </Badge>
            {overdue && invoice.status !== 'paid' && (
              <AlertTriangle className="w-5 h-5 text-red-400" />
            )}
          </div>
          <p className="text-gray-400 mt-1">
            To: {invoice.to.name}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {invoice.status === 'draft' && (
            <>
              {invoice.to?.email && (
                <Button
                  onClick={handleSendEmail}
                  disabled={!!actionLoading}
                >
                  {actionLoading === 'email' ? (
                    <Spinner size="sm" className="mr-2" />
                  ) : (
                    <Mail className="w-4 h-4 mr-2" />
                  )}
                  Send Email
                </Button>
              )}
              <Button
                variant="outline"
                onClick={handleMarkAsSent}
                disabled={!!actionLoading}
              >
                {actionLoading === 'send' ? (
                  <Spinner size="sm" className="mr-2" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Mark Sent
              </Button>
              <Button
                variant="outline"
                className="text-red-400 hover:text-red-300 border-red-500/50"
                onClick={handleDelete}
                disabled={!!actionLoading}
              >
                {actionLoading === 'delete' ? (
                  <Spinner size="sm" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </Button>
            </>
          )}
          {invoice.status === 'sent' && invoice.to?.email && (
            <Button
              variant="outline"
              onClick={handleSendEmail}
              disabled={!!actionLoading}
            >
              {actionLoading === 'email' ? (
                <Spinner size="sm" className="mr-2" />
              ) : (
                <Mail className="w-4 h-4 mr-2" />
              )}
              Resend Email
            </Button>
          )}
          {invoice.status === 'paid' && (
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Paid</span>
            </div>
          )}
          <InvoicePDFButton invoice={invoice} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* From / To */}
          <Card className="p-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-gray-400 text-sm mb-2">From</p>
                <p className="font-semibold text-white">
                  {invoice.from.name}
                </p>
                {invoice.from.email && (
                  <p className="text-sm text-gray-400">{invoice.from.email}</p>
                )}
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-2">To</p>
                <p className="font-semibold text-white">
                  {invoice.to.name}
                </p>
                {invoice.to.email && (
                  <div className="flex items-center gap-2 mt-1 text-sm text-gray-400">
                    <Mail className="w-4 h-4" />
                    {invoice.to.email}
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Line Items */}
          <Card className="overflow-hidden">
            <div className="p-4 border-b border-gray-800">
              <h2 className="text-lg font-semibold text-white">Line Items</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left text-gray-400 text-sm font-medium px-6 py-3">
                      Description
                    </th>
                    <th className="text-right text-gray-400 text-sm font-medium px-6 py-3">
                      Qty
                    </th>
                    <th className="text-right text-gray-400 text-sm font-medium px-6 py-3">
                      Rate
                    </th>
                    <th className="text-right text-gray-400 text-sm font-medium px-6 py-3">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.lineItems.map((item, index) => (
                    <tr key={index} className="border-b border-gray-800/50">
                      <td className="px-6 py-4 text-white">{item.description}</td>
                      <td className="px-6 py-4 text-gray-400 text-right">{item.qty}</td>
                      <td className="px-6 py-4 text-gray-400 text-right">
                        {formatCurrency(item.rate)}
                      </td>
                      <td className="px-6 py-4 text-white text-right font-medium">
                        {formatCurrency(item.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-b border-gray-800/50">
                    <td colSpan={3} className="px-6 py-3 text-right text-gray-400">
                      Subtotal
                    </td>
                    <td className="px-6 py-3 text-right text-white">
                      {formatCurrency(invoice.subtotal)}
                    </td>
                  </tr>
                  {invoice.discount > 0 && (
                    <tr className="border-b border-gray-800/50">
                      <td colSpan={3} className="px-6 py-3 text-right text-gray-400">
                        Discount
                      </td>
                      <td className="px-6 py-3 text-right text-green-400">
                        -{formatCurrency(invoice.discount)}
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td colSpan={3} className="px-6 py-4 text-right text-white font-semibold">
                      Total
                    </td>
                    <td className="px-6 py-4 text-right text-2xl font-bold text-gold">
                      {formatCurrency(invoice.total)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Dates */}
          <Card className="p-4">
            <h3 className="text-lg font-semibold text-white mb-4">Dates</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Created</span>
                <span className="text-white">{formatInvoiceDate(invoice.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Due Date</span>
                <span className={dueStatus.color}>{formatInvoiceDate(invoice.dueDate)}</span>
              </div>
              {invoice.sentAt && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Sent</span>
                  <span className="text-white">{formatInvoiceDate(invoice.sentAt)}</span>
                </div>
              )}
              {invoice.paidAt && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Paid</span>
                  <span className="text-green-400">{formatInvoiceDate(invoice.paidAt)}</span>
                </div>
              )}
            </div>
          </Card>

          {/* Status Info */}
          <Card className="p-4">
            <h3 className="text-lg font-semibold text-white mb-4">Status</h3>
            <div className="flex items-center gap-3">
              <Badge
                variant={
                  invoice.status === 'paid'
                    ? 'success'
                    : invoice.status === 'sent'
                    ? 'warning'
                    : overdue
                    ? 'error'
                    : 'default'
                }
                className="text-sm"
              >
                {overdue && invoice.status !== 'paid' ? 'Overdue' : invoice.status}
              </Badge>
              <span className={`text-sm ${dueStatus.color}`}>{dueStatus.text}</span>
            </div>

            {overdue && invoice.status !== 'paid' && (
              <div className="mt-4 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                <div className="flex items-center gap-2 text-red-400">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm font-medium">This invoice is overdue</span>
                </div>
                <p className="text-sm text-gray-400 mt-1">
                  Follow up with the recipient about payment.
                </p>
              </div>
            )}
          </Card>

          {/* Amount Summary */}
          <Card className="p-6">
            <div className="text-center">
              <p className="text-gray-400 text-sm">Total Amount</p>
              <p className="text-3xl font-bold text-gold mt-1">
                {formatCurrency(invoice.total)}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                {invoice.status === 'paid' ? 'Paid' : 'Outstanding'}
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
