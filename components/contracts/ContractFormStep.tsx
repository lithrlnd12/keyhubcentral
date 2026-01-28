'use client';

import { useState, useEffect } from 'react';
import { Job } from '@/types/job';
import { ContractFormData, ContractPaymentMethod, PAYMENT_METHOD_LABELS } from '@/types/contract';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { User, MapPin, Phone, Mail, Calendar, DollarSign, Plus, X } from 'lucide-react';

interface ContractFormStepProps {
  job: Job;
  initialData?: Partial<ContractFormData>;
  onNext: (data: ContractFormData) => void;
  onCancel: () => void;
}

export function ContractFormStep({ job, initialData, onNext, onCancel }: ContractFormStepProps) {
  const [formData, setFormData] = useState<ContractFormData>(() => ({
    // Customer Info (auto-filled from job)
    buyerName: initialData?.buyerName || job.customer.name,
    buyerName2: initialData?.buyerName2 || '',
    address: initialData?.address || {
      street: job.customer.address.street,
      city: job.customer.address.city,
      state: job.customer.address.state,
      zip: job.customer.address.zip,
    },
    homePhone: initialData?.homePhone || '',
    cellPhone: initialData?.cellPhone || job.customer.phone,
    email: initialData?.email || job.customer.email,
    // Project Details
    contractDate: initialData?.contractDate || new Date(),
    estimatedStartDate: initialData?.estimatedStartDate || null,
    estimatedCompletionTime: initialData?.estimatedCompletionTime || '',
    purchasePrice: initialData?.purchasePrice || 0,
    downPayment: initialData?.downPayment || 0,
    balanceDue: initialData?.balanceDue || 0,
    paymentMethods: initialData?.paymentMethods || [],
    otherPaymentMethod: initialData?.otherPaymentMethod || '',
    // Acknowledgments
    leadHazardInitials: initialData?.leadHazardInitials || '',
  }));

  const [showBuyer2, setShowBuyer2] = useState(!!initialData?.buyerName2);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-calculate balance due when price or down payment changes
  useEffect(() => {
    const balance = formData.purchasePrice - formData.downPayment;
    setFormData((prev) => ({
      ...prev,
      balanceDue: balance > 0 ? balance : 0,
    }));
  }, [formData.purchasePrice, formData.downPayment]);

  const handleInputChange = (field: keyof ContractFormData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Clear error when field is edited
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleAddressChange = (field: keyof ContractFormData['address'], value: string) => {
    setFormData((prev) => ({
      ...prev,
      address: {
        ...prev.address,
        [field]: value,
      },
    }));
  };

  const togglePaymentMethod = (method: ContractPaymentMethod) => {
    setFormData((prev) => ({
      ...prev,
      paymentMethods: prev.paymentMethods.includes(method)
        ? prev.paymentMethods.filter((m) => m !== method)
        : [...prev.paymentMethods, method],
    }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.buyerName.trim()) {
      newErrors.buyerName = 'Buyer name is required';
    }
    if (!formData.address.street.trim()) {
      newErrors.street = 'Street address is required';
    }
    if (!formData.address.city.trim()) {
      newErrors.city = 'City is required';
    }
    if (!formData.address.state.trim()) {
      newErrors.state = 'State is required';
    }
    if (!formData.address.zip.trim()) {
      newErrors.zip = 'ZIP code is required';
    }
    if (!formData.cellPhone.trim()) {
      newErrors.cellPhone = 'Cell phone is required';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    }
    if (formData.purchasePrice <= 0) {
      newErrors.purchasePrice = 'Purchase price must be greater than 0';
    }
    if (formData.paymentMethods.length === 0) {
      newErrors.paymentMethods = 'Select at least one payment method';
    }
    if (formData.paymentMethods.includes('other') && !formData.otherPaymentMethod?.trim()) {
      newErrors.otherPaymentMethod = 'Specify the other payment method';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onNext(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Customer Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Customer Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Buyer Name"
              value={formData.buyerName}
              onChange={(e) => handleInputChange('buyerName', e.target.value)}
              error={errors.buyerName}
              required
            />
            {showBuyer2 ? (
              <div className="relative">
                <Input
                  label="Buyer 2 Name"
                  value={formData.buyerName2 || ''}
                  onChange={(e) => handleInputChange('buyerName2', e.target.value)}
                  placeholder="Second buyer (optional)"
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowBuyer2(false);
                    handleInputChange('buyerName2', '');
                  }}
                  className="absolute top-8 right-2 p-1 text-gray-400 hover:text-red-500"
                  title="Remove second buyer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBuyer2(true)}
                  className="mb-1"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Second Buyer
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Property Address */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Property Address
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Street Address"
            value={formData.address.street}
            onChange={(e) => handleAddressChange('street', e.target.value)}
            error={errors.street}
            required
          />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="col-span-2 md:col-span-2">
              <Input
                label="City"
                value={formData.address.city}
                onChange={(e) => handleAddressChange('city', e.target.value)}
                error={errors.city}
                required
              />
            </div>
            <Input
              label="State"
              value={formData.address.state}
              onChange={(e) => handleAddressChange('state', e.target.value)}
              error={errors.state}
              required
            />
            <Input
              label="ZIP Code"
              value={formData.address.zip}
              onChange={(e) => handleAddressChange('zip', e.target.value)}
              error={errors.zip}
              required
            />
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5" />
            Contact Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Home Phone"
              type="tel"
              value={formData.homePhone}
              onChange={(e) => handleInputChange('homePhone', e.target.value)}
              placeholder="Optional"
            />
            <Input
              label="Cell Phone"
              type="tel"
              value={formData.cellPhone}
              onChange={(e) => handleInputChange('cellPhone', e.target.value)}
              error={errors.cellPhone}
              required
            />
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              error={errors.email}
              required
            />
          </div>
        </CardContent>
      </Card>

      {/* Project Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Project Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Contract Date"
              type="date"
              value={
                formData.contractDate
                  ? new Date(formData.contractDate).toISOString().split('T')[0]
                  : ''
              }
              onChange={(e) =>
                handleInputChange('contractDate', e.target.value ? new Date(e.target.value) : null)
              }
              required
            />
            <Input
              label="Estimated Start Date"
              type="date"
              value={
                formData.estimatedStartDate
                  ? new Date(formData.estimatedStartDate).toISOString().split('T')[0]
                  : ''
              }
              onChange={(e) =>
                handleInputChange(
                  'estimatedStartDate',
                  e.target.value ? new Date(e.target.value) : null
                )
              }
            />
            <Input
              label="Est. Completion Time"
              value={formData.estimatedCompletionTime}
              onChange={(e) => handleInputChange('estimatedCompletionTime', e.target.value)}
              placeholder="e.g., 3-4 weeks"
            />
          </div>
        </CardContent>
      </Card>

      {/* Pricing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Pricing and Payment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Purchase Price"
              type="number"
              value={formData.purchasePrice || ''}
              onChange={(e) => handleInputChange('purchasePrice', parseFloat(e.target.value) || 0)}
              error={errors.purchasePrice}
              min={0}
              step={0.01}
              required
            />
            <Input
              label="Down Payment"
              type="number"
              value={formData.downPayment || ''}
              onChange={(e) => handleInputChange('downPayment', parseFloat(e.target.value) || 0)}
              min={0}
              step={0.01}
            />
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Balance Due</label>
              <div className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-lg font-semibold">
                ${formData.balanceDue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* Payment Methods */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Payment Method(s) {errors.paymentMethods && <span className="text-red-500">*</span>}
            </label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {(Object.keys(PAYMENT_METHOD_LABELS) as ContractPaymentMethod[]).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => togglePaymentMethod(method)}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    formData.paymentMethods.includes(method)
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600'
                  }`}
                >
                  {PAYMENT_METHOD_LABELS[method]}
                </button>
              ))}
            </div>
            {errors.paymentMethods && (
              <p className="text-red-500 text-sm mt-1">{errors.paymentMethods}</p>
            )}
            {formData.paymentMethods.includes('other') && (
              <div className="mt-3">
                <Input
                  label="Specify Other Payment Method"
                  value={formData.otherPaymentMethod || ''}
                  onChange={(e) => handleInputChange('otherPaymentMethod', e.target.value)}
                  error={errors.otherPaymentMethod}
                  placeholder="Describe the payment method"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lead Hazard Disclosure */}
      <Card>
        <CardHeader>
          <CardTitle>Lead-Based Paint Disclosure</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-400 mb-4">
            For homes built before 1978, buyer acknowledges receipt of EPA pamphlet &quot;Protect Your
            Family From Lead in Your Home&quot; and any known lead-based paint hazard information.
          </p>
          <Input
            label="Buyer Initials"
            value={formData.leadHazardInitials}
            onChange={(e) => handleInputChange('leadHazardInitials', e.target.value.toUpperCase())}
            placeholder="Enter initials"
            className="w-24"
            maxLength={4}
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Preview Contract</Button>
      </div>
    </form>
  );
}
