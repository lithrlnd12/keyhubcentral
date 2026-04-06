'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { EmailTemplate } from '@/types/emailTemplate';
import {
  getEmailTemplates,
  updateEmailTemplate,
  deleteEmailTemplate,
} from '@/lib/firebase/emailTemplates';
import { EmailTemplateEditor } from './EmailTemplateEditor';
import { Zap, Pencil, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';

const TRIGGER_LABELS: Record<string, string> = {
  'lead.created': 'Lead Created',
  'lead.assigned': 'Lead Assigned',
  'lead.converted': 'Lead Converted',
  'job.status_changed': 'Job Status Changed',
  'job.completed': 'Job Completed',
  'appointment.scheduled': 'Appointment Scheduled',
  'appointment.reminder': 'Appointment Reminder',
  'invoice.created': 'Invoice Created',
  'invoice.overdue': 'Invoice Overdue',
  'review.request': 'Review Request',
};

function formatDelay(minutes: number): string {
  if (minutes >= 1440) return `${Math.round(minutes / 1440)} day(s)`;
  if (minutes >= 60) return `${Math.round(minutes / 60)} hour(s)`;
  return `${minutes} min`;
}

export function EmailAutomationRules() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const all = await getEmailTemplates();
      // Only show templates with a trigger configured
      setTemplates(all.filter((t) => !!t.trigger));
    } catch (err) {
      console.error('Failed to load automation rules:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleToggle = async (template: EmailTemplate) => {
    try {
      await updateEmailTemplate(template.id, { enabled: !template.enabled });
      setTemplates((prev) =>
        prev.map((t) => (t.id === template.id ? { ...t, enabled: !t.enabled } : t))
      );
    } catch (err) {
      console.error('Failed to toggle template:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteEmailTemplate(id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      setDeleteConfirmId(null);
    } catch (err) {
      console.error('Failed to delete template:', err);
    }
  };

  if (editingTemplate) {
    return (
      <EmailTemplateEditor
        template={editingTemplate}
        onSave={() => {
          setEditingTemplate(null);
          loadTemplates();
        }}
        onCancel={() => setEditingTemplate(null)}
      />
    );
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-brand-charcoal rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <EmptyState
        icon={Zap}
        title="No Automation Rules"
        description="Create a template with a trigger event to set up email automations."
      />
    );
  }

  return (
    <div className="space-y-3">
      {templates.map((template) => (
        <Card key={template.id} padding="sm">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="text-sm font-medium text-white truncate">
                  {template.name}
                </h4>
                <Badge variant={template.enabled ? 'success' : 'default'}>
                  {template.enabled ? 'Active' : 'Disabled'}
                </Badge>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {template.trigger && (
                  <Badge variant="info">
                    {TRIGGER_LABELS[template.trigger] || template.trigger}
                  </Badge>
                )}
                {template.delayMinutes && template.delayMinutes > 0 && (
                  <Badge variant="warning">
                    {formatDelay(template.delayMinutes)} delay
                  </Badge>
                )}
                {template.triggerConditions && (
                  <span className="text-xs text-gray-500">
                    Conditions: {JSON.stringify(template.triggerConditions)}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => handleToggle(template)}
                className="p-2 text-gray-400 hover:text-white transition-colors"
                title={template.enabled ? 'Disable' : 'Enable'}
              >
                {template.enabled ? (
                  <ToggleRight className="w-5 h-5 text-green-500" />
                ) : (
                  <ToggleLeft className="w-5 h-5" />
                )}
              </button>
              <button
                onClick={() => setEditingTemplate(template)}
                className="p-2 text-gray-400 hover:text-white transition-colors"
                title="Edit"
              >
                <Pencil className="w-4 h-4" />
              </button>
              {deleteConfirmId === template.id ? (
                <div className="flex items-center gap-1">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(template.id)}
                  >
                    Confirm
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteConfirmId(null)}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <button
                  onClick={() => setDeleteConfirmId(template.id)}
                  className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
