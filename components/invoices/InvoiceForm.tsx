'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Timestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import {
  createInvoice,
  updateInvoice,
  generateInvoiceNumber,
  calculateDueDate,
  calculateInvoiceTotals,
} from '@/lib/firebase/invoices';
import { Invoice, InvoiceEntity, LineItem, NET_TERMS_DAYS } from '@/types/invoice';
import { formatCurrency } from '@/lib/utils/formatters';
import { Plus, Trash2, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InvoiceFormProps {
  invoice?: Invoice;
  mode: 'create' | 'edit';
}

const entityOptions: { value: InvoiceEntity['entity']; label: string }[] = [
  { value: 'kd', label: 'Keynote Digital' },
  { value: 'kts', label: 'Key Trade Solutions' },
  { value: 'kr', label: 'Key Renovations' },
  { value: 'customer', label: 'Customer' },
  { value: 'subscriber', label: 'Subscriber' },
];

const defaultLineItem: LineItem = {
  description: '',
  qty: 1,
  rate: 0,
  total: 0,
};

export function InvoiceForm({ invoice, mode }: InvoiceFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [fromEntity, setFromEntity] = useState<InvoiceEntity['entity']>(
    invoice?.from.entity || 'kd'
  );
  const [fromName, setFromName] = useState(invoice?.from.name || '');
  const [toEntity, setToEntity] = useState<InvoiceEntity['entity']>(
    invoice?.to.entity || 'kr'
  );
  const [toName, setToName] = useState(invoice?.to.name || '');
  const [toEmail, setToEmail] = useState(invoice?.to.email || '');
  const [lineItems, setLineItems] = useState<LineItem[]>(
    invoice?.lineItems.length ? invoice.lineItems : [{ ...defaultLineItem }]
  );
  const [discount, setDiscount] = useState(invoice?.discount || 0);

  // Get default name for entity
  const getDefaultEntityName = (entity: InvoiceEntity['entity']): string => {
    switch (entity) {
      case 'kd':
        return 'Keynote Digital';
      case 'kts':
        return 'Key Trade Solutions';
      case 'kr':
        return 'Key Renovations';
      default:
        return '';
    }
  };

  // Update line item
  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    setLineItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
      // Recalculate total
      if (field === 'qty' || field === 'rate') {
        updated[index].total = Number(updated[index].qty) * Number(updated[index].rate);
      }
      return updated;
    });
  };

  // Add line item
  const addLineItem = () => {
    setLineItems((prev) => [...prev, { ...defaultLineItem }]);
  };

  // Remove line item
  const removeLineItem = (index: number) => {
    if (lineItems.length <= 1) return;
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Calculate totals
  const { subtotal, total } = calculateInvoiceTotals(lineItems, discount);

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate
      if (lineItems.some((item) => !item.description || item.rate <= 0)) {
        throw new Error('Please fill in all line items with valid amounts');
      }

      const fromEntityData: InvoiceEntity = {
        entity: fromEntity,
        name: fromName || getDefaultEntityName(fromEntity),
      };

      const toEntityData: InvoiceEntity = {
        entity: toEntity,
        name: toName || getDefaultEntityName(toEntity),
        email: toEmail || undefined,
      };

      if (mode === 'create') {
        const invoiceNumber = await generateInvoiceNumber(
          fromEntity === 'kd' ? 'KD' : fromEntity === 'kts' ? 'KTS' : 'KR'
        );

        const id = await createInvoice({
          invoiceNumber,
          from: fromEntityData,
          to: toEntityData,
          lineItems,
          subtotal,
          discount,
          total,
          status: 'draft',
          dueDate: calculateDueDate(),
          sentAt: null,
          paidAt: null,
        });

        router.push(`/financials/invoices/${id}`);
      } else if (invoice) {
        await updateInvoice(invoice.id, {
          from: fromEntityData,
          to: toEntityData,
          lineItems,
          subtotal,
          discount,
          total,
        });

        router.push(`/financials/invoices/${invoice.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save invoice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* From / To */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>From</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Entity
              </label>
              <select
                value={fromEntity}
                onChange={(e) => {
                  setFromEntity(e.target.value as InvoiceEntity['entity']);
                  setFromName(getDefaultEntityName(e.target.value as InvoiceEntity['entity']));
                }}
                className="w-full bg-brand-black border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand-gold"
              >
                {entityOptions.slice(0, 3).map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Name
              </label>
              <input
                type="text"
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                placeholder={getDefaultEntityName(fromEntity)}
                className="w-full bg-brand-black border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder:text-gray-500 focus:outline-none focus:border-brand-gold"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>To</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Entity Type
              </label>
              <select
                value={toEntity}
                onChange={(e) => {
                  setToEntity(e.target.value as InvoiceEntity['entity']);
                  if (['kd', 'kts', 'kr'].includes(e.target.value)) {
                    setToName(getDefaultEntityName(e.target.value as InvoiceEntity['entity']));
                  } else {
                    setToName('');
                  }
                }}
                className="w-full bg-brand-black border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand-gold"
              >
                {entityOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Name {(toEntity === 'customer' || toEntity === 'subscriber') && '*'}
              </label>
              <input
                type="text"
                value={toName}
                onChange={(e) => setToName(e.target.value)}
                placeholder={
                  toEntity === 'customer' || toEntity === 'subscriber'
                    ? 'Enter name'
                    : getDefaultEntityName(toEntity)
                }
                required={toEntity === 'customer' || toEntity === 'subscriber'}
                className="w-full bg-brand-black border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder:text-gray-500 focus:outline-none focus:border-brand-gold"
              />
            </div>
            {(toEntity === 'customer' || toEntity === 'subscriber') && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={toEmail}
                  onChange={(e) => setToEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full bg-brand-black border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder:text-gray-500 focus:outline-none focus:border-brand-gold"
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Line Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Line Items</CardTitle>
          <Button type="button" variant="secondary" size="sm" onClick={addLineItem}>
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-gray-400 text-sm font-medium px-6 py-3">
                  Description
                </th>
                <th className="text-right text-gray-400 text-sm font-medium px-6 py-3 w-24">
                  Qty
                </th>
                <th className="text-right text-gray-400 text-sm font-medium px-6 py-3 w-32">
                  Rate
                </th>
                <th className="text-right text-gray-400 text-sm font-medium px-6 py-3 w-32">
                  Total
                </th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item, index) => (
                <tr key={index} className="border-b border-gray-800/50">
                  <td className="px-6 py-3">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                      placeholder="Item description"
                      required
                      className="w-full bg-transparent text-white placeholder:text-gray-600 focus:outline-none"
                    />
                  </td>
                  <td className="px-6 py-3">
                    <input
                      type="number"
                      value={item.qty}
                      onChange={(e) => updateLineItem(index, 'qty', Number(e.target.value))}
                      min="1"
                      required
                      className="w-full bg-transparent text-white text-right focus:outline-none"
                    />
                  </td>
                  <td className="px-6 py-3">
                    <input
                      type="number"
                      value={item.rate}
                      onChange={(e) => updateLineItem(index, 'rate', Number(e.target.value))}
                      min="0"
                      step="0.01"
                      required
                      className="w-full bg-transparent text-white text-right focus:outline-none"
                    />
                  </td>
                  <td className="px-6 py-3 text-right text-white font-medium">
                    {formatCurrency(item.total)}
                  </td>
                  <td className="px-3 py-3">
                    {lineItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLineItem(index)}
                        className="text-gray-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
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
                  {formatCurrency(subtotal)}
                </td>
                <td></td>
              </tr>
              <tr className="border-b border-gray-800/50">
                <td colSpan={3} className="px-6 py-3 text-right text-gray-400">
                  <div className="flex items-center justify-end gap-2">
                    <span>Discount</span>
                    <input
                      type="number"
                      value={discount}
                      onChange={(e) => setDiscount(Number(e.target.value))}
                      min="0"
                      step="0.01"
                      className="w-24 bg-brand-black border border-gray-700 rounded px-2 py-1 text-white text-right focus:outline-none focus:border-brand-gold"
                    />
                  </div>
                </td>
                <td className="px-6 py-3 text-right text-green-400">
                  {discount > 0 && `-${formatCurrency(discount)}`}
                </td>
                <td></td>
              </tr>
              <tr>
                <td colSpan={3} className="px-6 py-4 text-right text-white font-semibold">
                  Total
                </td>
                <td className="px-6 py-4 text-right text-2xl font-bold text-brand-gold">
                  {formatCurrency(total)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </CardContent>
      </Card>

      {/* Terms info */}
      <div className="text-sm text-gray-400">
        Payment terms: Net {NET_TERMS_DAYS} days
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-4">
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.back()}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button type="submit" loading={loading}>
          <Save className="w-4 h-4 mr-2" />
          {mode === 'create' ? 'Create Invoice' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
