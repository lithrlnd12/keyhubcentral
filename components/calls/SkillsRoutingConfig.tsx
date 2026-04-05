'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getRoutingRules,
  createRoutingRule,
  updateRoutingRule,
  deleteRoutingRule,
} from '@/lib/firebase/callRouting';
import { RoutingRule } from '@/types/callCenter';
import { LeadSource, LeadQuality } from '@/types/lead';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { MultiSelect } from '@/components/ui/MultiSelect';
import {
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  Settings2,
  X,
  Save,
} from 'lucide-react';

const SOURCE_OPTIONS = [
  { value: '', label: 'Any' },
  { value: 'google_ads', label: 'Google Ads' },
  { value: 'meta', label: 'Meta' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'event', label: 'Event' },
  { value: 'referral', label: 'Referral' },
  { value: 'customer_portal', label: 'Customer Portal' },
  { value: 'other', label: 'Other' },
];

const QUALITY_OPTIONS = [
  { value: '', label: 'Any' },
  { value: 'hot', label: 'Hot' },
  { value: 'warm', label: 'Warm' },
  { value: 'cold', label: 'Cold' },
];

// Common trades for the dropdown
const TRADE_OPTIONS = [
  { value: '', label: 'Any' },
  { value: 'roofing', label: 'Roofing' },
  { value: 'siding', label: 'Siding' },
  { value: 'windows', label: 'Windows' },
  { value: 'gutters', label: 'Gutters' },
  { value: 'painting', label: 'Painting' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'general', label: 'General' },
];

interface RuleFormData {
  name: string;
  trade: string;
  market: string;
  source: string;
  quality: string;
  targetTeam: string[];
  priority: number;
  active: boolean;
}

const EMPTY_FORM: RuleFormData = {
  name: '',
  trade: '',
  market: '',
  source: '',
  quality: '',
  targetTeam: [],
  priority: 1,
  active: true,
};

// Placeholder team members — in production, fetch from users collection
const TEAM_MEMBER_OPTIONS = [
  { value: 'placeholder', label: 'Load team members from Firestore' },
];

export function SkillsRoutingConfig() {
  const [rules, setRules] = useState<RoutingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [formData, setFormData] = useState<RuleFormData>(EMPTY_FORM);

  // Team members state — loaded dynamically
  const [teamMembers, setTeamMembers] = useState<{ value: string; label: string }[]>([]);

  const fetchRules = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getRoutingRules();
      setRules(data);
    } catch (err) {
      console.error('Error fetching routing rules:', err);
      setError('Failed to load routing rules');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load team members from users collection
  useEffect(() => {
    async function loadTeamMembers() {
      try {
        const { collection, query, where, getDocs } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase/config');
        const q = query(
          collection(db, 'users'),
          where('role', 'in', ['owner', 'admin', 'sales_rep', 'contractor', 'pm'])
        );
        const snapshot = await getDocs(q);
        const members = snapshot.docs.map((doc) => ({
          value: doc.id,
          label: doc.data().displayName || doc.data().email || doc.id,
        }));
        setTeamMembers(members.length > 0 ? members : TEAM_MEMBER_OPTIONS);
      } catch {
        setTeamMembers(TEAM_MEMBER_OPTIONS);
      }
    }
    loadTeamMembers();
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const handleOpenCreate = () => {
    setFormData({
      ...EMPTY_FORM,
      priority: rules.length + 1,
    });
    setEditingRuleId(null);
    setShowForm(true);
  };

  const handleOpenEdit = (rule: RoutingRule) => {
    setFormData({
      name: rule.name,
      trade: rule.conditions.trade || '',
      market: rule.conditions.market || '',
      source: rule.conditions.source || '',
      quality: rule.conditions.quality || '',
      targetTeam: rule.targetTeam,
      priority: rule.priority,
      active: rule.active,
    });
    setEditingRuleId(rule.id);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingRuleId(null);
    setFormData(EMPTY_FORM);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError('Rule name is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const ruleData = {
        name: formData.name.trim(),
        conditions: {
          ...(formData.trade ? { trade: formData.trade } : {}),
          ...(formData.market ? { market: formData.market } : {}),
          ...(formData.source ? { source: formData.source as LeadSource } : {}),
          ...(formData.quality ? { quality: formData.quality as LeadQuality } : {}),
        },
        targetTeam: formData.targetTeam,
        priority: formData.priority,
        active: formData.active,
      };

      if (editingRuleId) {
        await updateRoutingRule(editingRuleId, ruleData);
      } else {
        await createRoutingRule(ruleData);
      }

      await fetchRules();
      handleCloseForm();
    } catch (err) {
      console.error('Error saving routing rule:', err);
      setError('Failed to save routing rule');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this routing rule?')) return;

    try {
      setError(null);
      await deleteRoutingRule(ruleId);
      await fetchRules();
    } catch (err) {
      console.error('Error deleting routing rule:', err);
      setError('Failed to delete routing rule');
    }
  };

  const handleMovePriority = async (rule: RoutingRule, direction: 'up' | 'down') => {
    const currentIndex = rules.findIndex((r) => r.id === rule.id);
    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (swapIndex < 0 || swapIndex >= rules.length) return;

    const otherRule = rules[swapIndex];

    try {
      setError(null);
      await updateRoutingRule(rule.id, { priority: otherRule.priority });
      await updateRoutingRule(otherRule.id, { priority: rule.priority });
      await fetchRules();
    } catch (err) {
      console.error('Error reordering rules:', err);
      setError('Failed to reorder rules');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-300">
            {rules.length} routing rule{rules.length !== 1 ? 's' : ''}
          </span>
        </div>
        <Button variant="primary" size="sm" onClick={handleOpenCreate}>
          <Plus className="w-4 h-4 mr-1.5" />
          Add Rule
        </Button>
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <Card padding="md" className="border-brand-gold/30">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-white font-medium">
              {editingRuleId ? 'Edit Rule' : 'New Routing Rule'}
            </h4>
            <button onClick={handleCloseForm} className="text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Rule Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Hot Roofing Leads"
            />
            <Input
              label="Priority"
              type="number"
              min={1}
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 1 })}
            />
            <Select
              label="Trade"
              options={TRADE_OPTIONS}
              value={formData.trade}
              onChange={(e) => setFormData({ ...formData, trade: e.target.value })}
            />
            <Input
              label="Market"
              value={formData.market}
              onChange={(e) => setFormData({ ...formData, market: e.target.value })}
              placeholder="e.g., Dallas, TX"
            />
            <Select
              label="Lead Source"
              options={SOURCE_OPTIONS}
              value={formData.source}
              onChange={(e) => setFormData({ ...formData, source: e.target.value })}
            />
            <Select
              label="Lead Quality"
              options={QUALITY_OPTIONS}
              value={formData.quality}
              onChange={(e) => setFormData({ ...formData, quality: e.target.value })}
            />
            <div className="sm:col-span-2">
              <MultiSelect
                label="Target Team Members"
                options={teamMembers}
                value={formData.targetTeam}
                onChange={(value) => setFormData({ ...formData, targetTeam: value })}
                placeholder="Select team members..."
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-700 peer-focus:ring-2 peer-focus:ring-brand-gold rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-gold"></div>
              </label>
              <span className="text-sm text-gray-300">Active</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" size="sm" onClick={handleCloseForm}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" loading={saving} onClick={handleSave}>
              <Save className="w-4 h-4 mr-1.5" />
              {editingRuleId ? 'Update Rule' : 'Create Rule'}
            </Button>
          </div>
        </Card>
      )}

      {/* Rules list */}
      {rules.length === 0 && !showForm ? (
        <EmptyState
          icon={Settings2}
          title="No routing rules"
          description="Create routing rules to automatically direct calls to the right team members."
          action={
            <Button variant="primary" size="sm" onClick={handleOpenCreate}>
              <Plus className="w-4 h-4 mr-1.5" />
              Create First Rule
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {rules.map((rule, index) => (
            <Card key={rule.id} padding="sm" className="flex items-center gap-4">
              {/* Priority reorder */}
              <div className="flex flex-col gap-0.5 flex-shrink-0">
                <button
                  onClick={() => handleMovePriority(rule, 'up')}
                  disabled={index === 0}
                  className="text-gray-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleMovePriority(rule, 'down')}
                  disabled={index === rules.length - 1}
                  className="text-gray-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>

              {/* Priority number */}
              <span className="text-sm font-mono text-gray-500 w-6 text-center flex-shrink-0">
                #{rule.priority}
              </span>

              {/* Rule info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white font-medium">{rule.name}</span>
                  {!rule.active && (
                    <Badge variant="default">Inactive</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {rule.conditions.trade && (
                    <Badge variant="info">{rule.conditions.trade}</Badge>
                  )}
                  {rule.conditions.market && (
                    <Badge variant="info">{rule.conditions.market}</Badge>
                  )}
                  {rule.conditions.source && (
                    <Badge variant="default">{rule.conditions.source.replace(/_/g, ' ')}</Badge>
                  )}
                  {rule.conditions.quality && (
                    <Badge
                      variant={
                        rule.conditions.quality === 'hot'
                          ? 'error'
                          : rule.conditions.quality === 'warm'
                          ? 'warning'
                          : 'info'
                      }
                    >
                      {rule.conditions.quality}
                    </Badge>
                  )}
                  <span className="text-xs text-gray-500">
                    {rule.targetTeam.length} team member{rule.targetTeam.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => handleOpenEdit(rule)}
                  className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                  title="Edit"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(rule.id)}
                  className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
