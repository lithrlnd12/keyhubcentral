'use client';

import { useState } from 'react';
import { Job } from '@/types/job';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { calculateCostVariance } from '@/lib/utils/jobs';
import { formatCurrency } from '@/lib/utils/formatters';
import { DollarSign, TrendingUp, TrendingDown, Edit2, Save, X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface JobCostsProps {
  job: Job;
  canEdit: boolean;
  onUpdate: (data: Partial<Job>) => Promise<void>;
}

export function JobCosts({ job, canEdit, onUpdate }: JobCostsProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [costs, setCosts] = useState(job.costs);

  const variance = calculateCostVariance(job.costs);
  const totalProjected = job.costs.materialProjected + job.costs.laborProjected;
  const totalActual = job.costs.materialActual + job.costs.laborActual;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate({ costs });
      setEditing(false);
    } catch (error) {
      console.error('Failed to save costs:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setCosts(job.costs);
    setEditing(false);
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Projected Total</p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(totalProjected)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-gray-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Actual Total</p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(totalActual)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-gray-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Variance</p>
                <p className={cn(
                  'text-2xl font-bold',
                  variance.totalVariance > 0 && 'text-red-400',
                  variance.totalVariance < 0 && 'text-green-400',
                  variance.totalVariance === 0 && 'text-white'
                )}>
                  {variance.totalVariance >= 0 ? '+' : ''}{formatCurrency(variance.totalVariance)}
                </p>
              </div>
              {variance.totalVariance > 0 ? (
                <TrendingUp className="w-8 h-8 text-red-400" />
              ) : variance.totalVariance < 0 ? (
                <TrendingDown className="w-8 h-8 text-green-400" />
              ) : (
                <DollarSign className="w-8 h-8 text-gray-600" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Costs */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-brand-gold" />
            Cost Breakdown
          </CardTitle>
          {canEdit && !editing && (
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
              <Edit2 className="w-4 h-4 mr-1" />
              Edit
            </Button>
          )}
          {editing && (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={handleCancel} disabled={saving}>
                <X className="w-4 h-4 mr-1" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                <Save className="w-4 h-4 mr-1" />
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left text-sm text-gray-500 font-medium py-3">Category</th>
                  <th className="text-right text-sm text-gray-500 font-medium py-3">Projected</th>
                  <th className="text-right text-sm text-gray-500 font-medium py-3">Actual</th>
                  <th className="text-right text-sm text-gray-500 font-medium py-3">Variance</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-700/50">
                  <td className="py-4 text-white">Materials</td>
                  <td className="py-4 text-right">
                    {editing ? (
                      <Input
                        type="number"
                        value={costs.materialProjected}
                        onChange={(e) =>
                          setCosts({ ...costs, materialProjected: parseFloat(e.target.value) || 0 })
                        }
                        className="w-28 ml-auto text-right"
                      />
                    ) : (
                      <span className="text-gray-300">{formatCurrency(job.costs.materialProjected)}</span>
                    )}
                  </td>
                  <td className="py-4 text-right">
                    {editing ? (
                      <Input
                        type="number"
                        value={costs.materialActual}
                        onChange={(e) =>
                          setCosts({ ...costs, materialActual: parseFloat(e.target.value) || 0 })
                        }
                        className="w-28 ml-auto text-right"
                      />
                    ) : (
                      <span className="text-gray-300">{formatCurrency(job.costs.materialActual)}</span>
                    )}
                  </td>
                  <td className={cn(
                    'py-4 text-right font-medium',
                    variance.materialVariance > 0 && 'text-red-400',
                    variance.materialVariance < 0 && 'text-green-400',
                    variance.materialVariance === 0 && 'text-gray-400'
                  )}>
                    {variance.materialVariance >= 0 ? '+' : ''}{formatCurrency(variance.materialVariance)}
                  </td>
                </tr>
                <tr className="border-b border-gray-700/50">
                  <td className="py-4 text-white">Labor</td>
                  <td className="py-4 text-right">
                    {editing ? (
                      <Input
                        type="number"
                        value={costs.laborProjected}
                        onChange={(e) =>
                          setCosts({ ...costs, laborProjected: parseFloat(e.target.value) || 0 })
                        }
                        className="w-28 ml-auto text-right"
                      />
                    ) : (
                      <span className="text-gray-300">{formatCurrency(job.costs.laborProjected)}</span>
                    )}
                  </td>
                  <td className="py-4 text-right">
                    {editing ? (
                      <Input
                        type="number"
                        value={costs.laborActual}
                        onChange={(e) =>
                          setCosts({ ...costs, laborActual: parseFloat(e.target.value) || 0 })
                        }
                        className="w-28 ml-auto text-right"
                      />
                    ) : (
                      <span className="text-gray-300">{formatCurrency(job.costs.laborActual)}</span>
                    )}
                  </td>
                  <td className={cn(
                    'py-4 text-right font-medium',
                    variance.laborVariance > 0 && 'text-red-400',
                    variance.laborVariance < 0 && 'text-green-400',
                    variance.laborVariance === 0 && 'text-gray-400'
                  )}>
                    {variance.laborVariance >= 0 ? '+' : ''}{formatCurrency(variance.laborVariance)}
                  </td>
                </tr>
                <tr className="font-bold">
                  <td className="py-4 text-white">Total</td>
                  <td className="py-4 text-right text-white">{formatCurrency(totalProjected)}</td>
                  <td className="py-4 text-right text-white">{formatCurrency(totalActual)}</td>
                  <td className={cn(
                    'py-4 text-right',
                    variance.totalVariance > 0 && 'text-red-400',
                    variance.totalVariance < 0 && 'text-green-400',
                    variance.totalVariance === 0 && 'text-gray-400'
                  )}>
                    {variance.totalVariance >= 0 ? '+' : ''}{formatCurrency(variance.totalVariance)}
                    {variance.totalVariancePercent !== 0 && (
                      <span className="text-sm ml-1">
                        ({variance.totalVariancePercent >= 0 ? '+' : ''}{variance.totalVariancePercent.toFixed(1)}%)
                      </span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
