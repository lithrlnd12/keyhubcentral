'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmailTemplate, EmailTriggerEvent } from '@/types/emailTemplate';
import {
  getAvailableVariables,
  renderTemplate,
  wrapInBrandedLayout,
  getSampleContext,
} from '@/lib/email/templateEngine';
import {
  createEmailTemplate,
  updateEmailTemplate,
} from '@/lib/firebase/emailTemplates';
import { useAuth } from '@/lib/hooks';
import { ChevronDown, Eye, Save, X } from 'lucide-react';

const TRIGGER_OPTIONS: { value: EmailTriggerEvent | ''; label: string }[] = [
  { value: '', label: 'No trigger (manual only)' },
  { value: 'lead.created', label: 'Lead Created' },
  { value: 'lead.assigned', label: 'Lead Assigned' },
  { value: 'lead.converted', label: 'Lead Converted' },
  { value: 'job.status_changed', label: 'Job Status Changed' },
  { value: 'job.completed', label: 'Job Completed' },
  { value: 'appointment.scheduled', label: 'Appointment Scheduled' },
  { value: 'appointment.reminder', label: 'Appointment Reminder' },
  { value: 'invoice.created', label: 'Invoice Created' },
  { value: 'invoice.overdue', label: 'Invoice Overdue' },
  { value: 'review.request', label: 'Review Request' },
];

interface EmailTemplateEditorProps {
  template?: EmailTemplate | null;
  onSave?: () => void;
  onCancel?: () => void;
}

export function EmailTemplateEditor({
  template,
  onSave,
  onCancel,
}: EmailTemplateEditorProps) {
  const { user } = useAuth();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [name, setName] = useState(template?.name || '');
  const [subject, setSubject] = useState(template?.subject || '');
  const [bodyHtml, setBodyHtml] = useState(template?.bodyHtml || '');
  const [trigger, setTrigger] = useState<EmailTriggerEvent | ''>(template?.trigger || '');
  const [triggerConditions, setTriggerConditions] = useState(
    template?.triggerConditions ? JSON.stringify(template.triggerConditions) : ''
  );
  const [delayMinutes, setDelayMinutes] = useState(
    template?.delayMinutes?.toString() || ''
  );
  const [enabled, setEnabled] = useState(template?.enabled ?? true);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [variableDropdownOpen, setVariableDropdownOpen] = useState(false);

  const variables = getAvailableVariables();
  const grouped = variables.reduce<Record<string, typeof variables>>((acc, v) => {
    if (!acc[v.category]) acc[v.category] = [];
    acc[v.category].push(v);
    return acc;
  }, {});

  const insertVariable = useCallback(
    (key: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const tag = `{{${key}}}`;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = bodyHtml.slice(0, start) + tag + bodyHtml.slice(end);
      setBodyHtml(newValue);
      setVariableDropdownOpen(false);

      // Restore cursor position after React re-render
      requestAnimationFrame(() => {
        textarea.focus();
        const newPos = start + tag.length;
        textarea.setSelectionRange(newPos, newPos);
      });
    },
    [bodyHtml]
  );

  const getPreviewHtml = useCallback(() => {
    const ctx = getSampleContext();
    const rendered = renderTemplate(bodyHtml, ctx);
    return wrapInBrandedLayout(rendered);
  }, [bodyHtml]);

  const handleSave = async () => {
    if (!name.trim() || !subject.trim()) {
      setError('Name and subject are required.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      let parsedConditions: Record<string, string> | undefined;
      if (triggerConditions.trim()) {
        try {
          parsedConditions = JSON.parse(triggerConditions);
        } catch {
          setError('Trigger conditions must be valid JSON (e.g., {"job.status": "complete"}).');
          setSaving(false);
          return;
        }
      }

      const data = {
        name: name.trim(),
        subject: subject.trim(),
        bodyHtml,
        trigger: trigger || undefined,
        triggerConditions: parsedConditions,
        delayMinutes: delayMinutes ? parseInt(delayMinutes, 10) : undefined,
        enabled,
        createdBy: user?.uid || '',
      };

      if (template?.id) {
        await updateEmailTemplate(template.id, data);
      } else {
        await createEmailTemplate(data);
      }

      onSave?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template.');
    } finally {
      setSaving(false);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!variableDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-variable-dropdown]')) {
        setVariableDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [variableDropdownOpen]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">
          {template?.id ? 'Edit Template' : 'New Template'}
        </h2>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="w-4 h-4 mr-1" /> Cancel
          </Button>
          <Button size="sm" loading={saving} onClick={handleSave}>
            <Save className="w-4 h-4 mr-1" /> Save Template
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Name & Enable toggle */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-end">
        <Input
          label="Template Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Lead Confirmation Email"
        />
        <label className="flex items-center gap-2 cursor-pointer pb-1">
          <div
            className={`relative w-11 h-6 rounded-full transition-colors ${
              enabled ? 'bg-brand-gold' : 'bg-gray-700'
            }`}
            onClick={() => setEnabled(!enabled)}
          >
            <div
              className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                enabled ? 'translate-x-[22px]' : 'translate-x-0.5'
              }`}
            />
          </div>
          <span className="text-sm text-gray-300">Enabled</span>
        </label>
      </div>

      {/* Subject */}
      <Input
        label="Subject Line"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder="e.g., Thanks for reaching out, {{customer.name}}!"
      />

      {/* Body editor with variable toolbar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-300">
            Email Body (HTML)
          </label>
          <div className="flex items-center gap-2">
            {/* Variable insertion dropdown */}
            <div className="relative" data-variable-dropdown>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setVariableDropdownOpen(!variableDropdownOpen)}
              >
                Insert Variable <ChevronDown className="w-3 h-3 ml-1" />
              </Button>
              {variableDropdownOpen && (
                <div className="absolute right-0 top-full mt-1 w-72 bg-brand-charcoal border border-gray-700 rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto">
                  {Object.entries(grouped).map(([category, vars]) => (
                    <div key={category}>
                      <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-900/50 sticky top-0">
                        {category}
                      </div>
                      {vars.map((v) => (
                        <button
                          key={v.key}
                          className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white flex items-center justify-between"
                          onClick={() => insertVariable(v.key)}
                        >
                          <span>{v.label}</span>
                          <code className="text-xs text-gray-500">
                            {`{{${v.key}}}`}
                          </code>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button
              variant={showPreview ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
            >
              <Eye className="w-4 h-4 mr-1" /> Preview
            </Button>
          </div>
        </div>

        {showPreview ? (
          <Card className="overflow-hidden">
            <div className="bg-white rounded-lg">
              <iframe
                srcDoc={getPreviewHtml()}
                title="Email Preview"
                className="w-full border-0 rounded-lg"
                style={{ minHeight: '500px' }}
                sandbox="allow-same-origin"
              />
            </div>
          </Card>
        ) : (
          <textarea
            ref={textareaRef}
            value={bodyHtml}
            onChange={(e) => setBodyHtml(e.target.value)}
            placeholder="<p>Hi {{customer.name}},</p>&#10;&#10;<p>Thank you for reaching out to {{company.name}}!</p>"
            rows={16}
            className="w-full px-3 py-2 bg-brand-charcoal border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent font-mono text-sm resize-y"
          />
        )}
      </div>

      {/* Trigger configuration */}
      <Card>
        <h3 className="text-sm font-semibold text-white mb-4">Automation Trigger</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select
            label="Trigger Event"
            options={TRIGGER_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            value={trigger}
            onChange={(e) => setTrigger(e.target.value as EmailTriggerEvent | '')}
          />
          <Input
            label="Delay (minutes)"
            type="number"
            value={delayMinutes}
            onChange={(e) => setDelayMinutes(e.target.value)}
            placeholder="0 = send immediately"
          />
          <Input
            label="Conditions (JSON)"
            value={triggerConditions}
            onChange={(e) => setTriggerConditions(e.target.value)}
            placeholder='{"job.status": "complete"}'
          />
        </div>
        {trigger && (
          <div className="mt-3 flex items-center gap-2">
            <Badge variant="info">{trigger}</Badge>
            {delayMinutes && parseInt(delayMinutes) > 0 && (
              <Badge variant="warning">
                {parseInt(delayMinutes) >= 1440
                  ? `${Math.round(parseInt(delayMinutes) / 1440)}d delay`
                  : parseInt(delayMinutes) >= 60
                    ? `${Math.round(parseInt(delayMinutes) / 60)}h delay`
                    : `${delayMinutes}m delay`}
              </Badge>
            )}
            <Badge variant={enabled ? 'success' : 'default'}>
              {enabled ? 'Active' : 'Disabled'}
            </Badge>
          </div>
        )}
      </Card>
    </div>
  );
}
