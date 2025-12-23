'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useInvoice } from '@/lib/hooks/useInvoice';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  markInvoiceAsSent,
  markInvoiceAsPaid,
  deleteInvoice,
} from '@/lib/firebase/invoices';
import { functions } from '@/lib/firebase/config';
import { httpsCallable } from 'firebase/functions';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { InvoiceStatusBadge } from '@/components/invoices';
import { Spinner } from '@/components/ui/Spinner';
import {
  formatEntityName,
  formatInvoiceDate,
  formatDueDateWithStatus,
  getInvoiceType,
  isOverdue,
  ENTITY_CONFIG,
} from '@/lib/utils/invoices';
import { formatCurrency } from '@/lib/utils/formatters';
import { canViewFinancials } from '@/types/user';
import {
  ArrowLeft,
  ArrowRight,
  Edit,
  Send,
  CheckCircle,
  Trash2,
  Calendar,
  Mail,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Dynamic import for PDF button (SSR disabled for @react-pdf/renderer)
const InvoicePDFButton = dynamic(
  () => import('@/components/pdf/InvoicePDFButton').then((mod) => mod.InvoicePDFButton),
  { ssr: false, loading: () => null }
);

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { invoice, loading, error } = useInvoice(id, { realtime: true });
  const { user } = useAuth();
  const { showToast } = useToast();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const canManage = user?.role && canViewFinancials(user.role);
  const overdue = invoice ? isOverdue(invoice) : false;

  const handleMarkAsSent = async () => {
    if (!invoice) return;
    setActionLoading('send');
    try {
      await markInvoiceAsSent(invoice.id);
    } catch (err) {
      console.error('Failed to mark as sent:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkAsPaid = async () => {
    if (!invoice) return;
    setActionLoading('paid');
    try {
      await markInvoiceAsPaid(invoice.id);
    } catch (err) {
      console.error('Failed to mark as paid:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!invoice) return;
    if (!confirm('Are you sure you want to delete this invoice?')) return;

    setActionLoading('delete');
    try {
      await deleteInvoice(invoice.id);
      router.push('/financials');
    } catch (err) {
      console.error('Failed to delete:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendEmail = () => {
    if (!invoice) return;

    const recipientEmail = invoice.to?.email;
    if (!recipientEmail) {
      showToast('No email address on invoice. Add one in Edit mode.', 'error');
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
        <Link href="/financials" className="inline-flex items-center gap-2 text-gray-400 hover:text-white">
          <ArrowLeft className="w-4 h-4" />
          Back to Financials
        </Link>
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
          <p className="text-red-400">{error || 'Invoice not found'}</p>
        </div>
      </div>
    );
  }

  const dueStatus = formatDueDateWithStatus(invoice);

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link href="/financials" className="inline-flex items-center gap-2 text-gray-400 hover:text-white">
        <ArrowLeft className="w-4 h-4" />
        Back to Financials
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{invoice.invoiceNumber}</h1>
            <InvoiceStatusBadge status={overdue ? 'overdue' : invoice.status} />
            {overdue && <AlertTriangle className="w-5 h-5 text-red-400" />}
          </div>
          <p className="text-gray-400 mt-1">{getInvoiceType(invoice)}</p>
        </div>

        {canManage && (
          <div className="flex items-center gap-2">
            {invoice.status === 'draft' && (
              <>
                <Link href={`/financials/invoices/${invoice.id}/edit`}>
                  <Button variant="secondary">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                </Link>
                <Button
                  onClick={handleMarkAsSent}
                  loading={actionLoading === 'send'}
                  disabled={!!actionLoading}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Mark as Sent
                </Button>
                {invoice.to?.email && (
                  <Button
                    onClick={handleSendEmail}
                    loading={actionLoading === 'email'}
                    disabled={!!actionLoading}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Send Email
                  </Button>
                )}
              </>
            )}
            {invoice.status === 'sent' && (
              <>
                <Button
                  onClick={handleMarkAsPaid}
                  loading={actionLoading === 'paid'}
                  disabled={!!actionLoading}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Mark as Paid
                </Button>
                {invoice.to?.email && (
                  <Button
                    variant="secondary"
                    onClick={handleSendEmail}
                    loading={actionLoading === 'email'}
                    disabled={!!actionLoading}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Resend
                  </Button>
                )}
              </>
            )}
            <InvoicePDFButton invoice={invoice} />
            {invoice.status === 'draft' && (
              <Button
                variant="danger"
                onClick={handleDelete}
                loading={actionLoading === 'delete'}
                disabled={!!actionLoading}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* From / To */}
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-gray-400 text-sm mb-2">From</p>
                  <p className={cn('font-semibold', ENTITY_CONFIG[invoice.from?.entity]?.color || 'text-gray-400')}>
                    {formatEntityName(invoice.from) || 'Unknown'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-2">To</p>
                  <p className={cn('font-semibold', ENTITY_CONFIG[invoice.to?.entity]?.color || 'text-gray-400')}>
                    {formatEntityName(invoice.to) || 'Unknown'}
                  </p>
                  {invoice.to?.email && (
                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-400">
                      <Mail className="w-4 h-4" />
                      {invoice.to.email}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader>
              <CardTitle>Line Items</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
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
                    <td className="px-6 py-4 text-right text-2xl font-bold text-brand-gold">
                      {formatCurrency(invoice.total)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Dates */}
          <Card>
            <CardHeader>
              <CardTitle>Dates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
            </CardContent>
          </Card>

          {/* Status Info */}
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <InvoiceStatusBadge status={overdue ? 'overdue' : invoice.status} size="md" />
                <span className={cn('text-sm', dueStatus.color)}>{dueStatus.text}</span>
              </div>

              {overdue && (
                <div className="mt-4 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                  <div className="flex items-center gap-2 text-red-400">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-sm font-medium">This invoice is overdue</span>
                  </div>
                  <p className="text-sm text-gray-400 mt-1">
                    Consider sending a reminder to the recipient.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Amount Summary */}
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-gray-400 text-sm">Total Amount</p>
                <p className="text-3xl font-bold text-brand-gold mt-1">
                  {formatCurrency(invoice.total)}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  {invoice.status === 'paid' ? 'Paid' : 'Outstanding'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
