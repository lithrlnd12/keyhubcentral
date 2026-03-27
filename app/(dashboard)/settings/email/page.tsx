'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/hooks';
import { redirect } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { EmailTemplateEditor } from '@/components/email/EmailTemplateEditor';
import { EmailAutomationRules } from '@/components/email/EmailAutomationRules';
import { EmailQueueViewer } from '@/components/email/EmailQueueViewer';
import { EmailTemplate, EmailTriggerEvent } from '@/types/emailTemplate';
import {
  getEmailTemplates,
  createEmailTemplate,
  deleteEmailTemplate,
} from '@/lib/firebase/emailTemplates';
import { Mail, Plus, Pencil, Trash2, Zap } from 'lucide-react';

// Seed template definitions for the Quick Start feature
const SEED_TEMPLATES: {
  name: string;
  subject: string;
  bodyHtml: string;
  trigger: EmailTriggerEvent;
  delayMinutes?: number;
  triggerConditions?: Record<string, string>;
}[] = [
  {
    name: 'Lead Confirmation',
    subject: 'Thanks for reaching out, {{customer.name}}!',
    trigger: 'lead.created',
    bodyHtml: `<h2 style="color: #333; margin-top: 0;">Thank You for Your Interest!</h2>
<p>Hi {{customer.name}},</p>
<p>Thank you for reaching out to {{company.name}}. We received your inquiry and one of our specialists will be in touch shortly.</p>
<div style="background: #f9f9f9; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #D4A84B;">
  <p style="margin: 0;"><strong>What happens next?</strong><br>A member of our team will contact you to discuss your project and schedule a free consultation.</p>
</div>
<p>In the meantime, feel free to think about what areas of your home you'd like to update.</p>
<p>Best regards,<br><strong>The {{company.name}} Team</strong></p>`,
  },
  {
    name: 'Appointment Reminder',
    subject: 'Reminder: Your appointment with {{company.name}} is coming up!',
    trigger: 'appointment.reminder',
    delayMinutes: 1440,
    bodyHtml: `<h2 style="color: #333; margin-top: 0;">Appointment Reminder</h2>
<p>Hi {{customer.name}},</p>
<p>This is a friendly reminder that you have an upcoming appointment with {{company.name}}.</p>
<div style="background: #f9f9f9; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #D4A84B;">
  <p style="margin: 0;"><strong>Please have ready:</strong></p>
  <ul style="margin: 8px 0 0 0;">
    <li>Any inspiration photos or ideas</li>
    <li>Questions about materials or timeline</li>
    <li>Access to the areas being renovated</li>
  </ul>
</div>
<p>If you need to reschedule, please contact us at {{company.phone}}.</p>
<p>See you soon!<br><strong>The {{company.name}} Team</strong></p>`,
  },
  {
    name: 'Job Completed + Review Request',
    subject: 'Your project is complete!',
    trigger: 'job.completed',
    bodyHtml: `<h2 style="color: #333; margin-top: 0;">Your Project is Complete!</h2>
<p>Hi {{customer.name}},</p>
<p>Great news! Your {{job.type}} project ({{job.number}}) has been completed.</p>
<p>We hope you love the results! Our team worked hard to deliver quality craftsmanship and we'd love to hear your feedback.</p>
<div style="background: #f9f9f9; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #D4A84B;">
  <p style="margin: 0;"><strong>Would you leave us a review?</strong><br>Your feedback helps other homeowners find quality renovation services. It only takes a minute!</p>
</div>
<p>If you have any questions about your warranty or need anything else, don't hesitate to reach out at {{company.phone}}.</p>
<p>Thank you for choosing {{company.name}}!<br><strong>The {{company.name}} Team</strong></p>`,
  },
  {
    name: 'Invoice Sent',
    subject: 'Invoice for your {{job.type}} project - {{company.name}}',
    trigger: 'invoice.created',
    bodyHtml: `<h2 style="color: #333; margin-top: 0;">Invoice Notification</h2>
<p>Hi {{customer.name}},</p>
<p>An invoice has been created for your {{job.type}} project ({{job.number}}) at {{job.address}}.</p>
<p>Please review the details and contact us at {{company.phone}} or {{company.email}} if you have any questions.</p>
<p>Thank you for your business!</p>
<p>Best regards,<br><strong>The {{company.name}} Team</strong></p>`,
  },
  {
    name: '7-Day Follow-Up',
    subject: 'Still interested in your renovation project?',
    trigger: 'lead.created',
    delayMinutes: 10080,
    bodyHtml: `<h2 style="color: #333; margin-top: 0;">Just Checking In</h2>
<p>Hi {{customer.name}},</p>
<p>We reached out about a week ago regarding your renovation inquiry. We wanted to follow up and see if you still have questions or if you're ready to take the next step.</p>
<div style="background: #f9f9f9; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #D4A84B;">
  <p style="margin: 0;"><strong>Why choose {{company.name}}?</strong></p>
  <ul style="margin: 8px 0 0 0;">
    <li>Free in-home consultations</li>
    <li>Licensed and insured professionals</li>
    <li>Quality workmanship guaranteed</li>
  </ul>
</div>
<p>Give us a call at {{company.phone}} or simply reply to this email. We'd love to help transform your space!</p>
<p>Best regards,<br><strong>The {{company.name}} Team</strong></p>`,
  },
];

export default function EmailSettingsPage() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null | 'new'>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [creatingSeed, setCreatingSeed] = useState<string | null>(null);

  // Owner/admin only
  if (user && user.role && !['owner', 'admin'].includes(user.role)) {
    redirect('/settings');
  }

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const all = await getEmailTemplates();
      setTemplates(all);
    } catch (err) {
      console.error('Failed to load templates:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleCreateSeedTemplate = async (seed: (typeof SEED_TEMPLATES)[number]) => {
    setCreatingSeed(seed.name);
    try {
      await createEmailTemplate({
        name: seed.name,
        subject: seed.subject,
        bodyHtml: seed.bodyHtml,
        trigger: seed.trigger,
        delayMinutes: seed.delayMinutes,
        triggerConditions: seed.triggerConditions,
        enabled: true,
        createdBy: user?.uid || '',
      });
      await loadTemplates();
    } catch (err) {
      console.error('Failed to create seed template:', err);
    } finally {
      setCreatingSeed(null);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      await deleteEmailTemplate(id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      setDeleteConfirmId(null);
    } catch (err) {
      console.error('Failed to delete template:', err);
    }
  };

  // If editing a template, show the editor full-screen
  if (editingTemplate) {
    return (
      <div className="space-y-6">
        <EmailTemplateEditor
          template={editingTemplate === 'new' ? null : editingTemplate}
          onSave={() => {
            setEditingTemplate(null);
            loadTemplates();
          }}
          onCancel={() => setEditingTemplate(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Email Settings</h1>
        <p className="text-gray-400 mt-1">
          Manage email templates, automation rules, and monitor the sending queue
        </p>
      </div>

      <Tabs defaultValue="templates">
        <TabsList>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="automations">Automations</TabsTrigger>
          <TabsTrigger value="queue">Queue</TabsTrigger>
        </TabsList>

        {/* Templates Tab */}
        <TabsContent value="templates">
          <div className="space-y-6">
            {/* Create button */}
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setEditingTemplate('new')}>
                <Plus className="w-4 h-4 mr-1" /> New Template
              </Button>
            </div>

            {/* Template list */}
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-16 bg-brand-charcoal rounded-xl animate-pulse"
                  />
                ))}
              </div>
            ) : templates.length === 0 ? (
              <div className="space-y-8">
                <EmptyState
                  icon={Mail}
                  title="No Email Templates"
                  description="Create your first template or use a quick-start template below."
                  action={
                    <Button size="sm" onClick={() => setEditingTemplate('new')}>
                      <Plus className="w-4 h-4 mr-1" /> Create Template
                    </Button>
                  }
                />

                {/* Quick Start templates */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-brand-gold" />
                    Quick Start Templates
                  </h3>
                  <p className="text-sm text-gray-400 mb-4">
                    Get started quickly with these pre-built email templates. Click to
                    create any template with one click.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {SEED_TEMPLATES.map((seed) => (
                      <Card key={seed.name} padding="sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-white">
                              {seed.name}
                            </h4>
                            <p className="text-xs text-gray-500 mt-0.5 truncate">
                              {seed.subject}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="info">{seed.trigger}</Badge>
                              {seed.delayMinutes && seed.delayMinutes > 0 && (
                                <Badge variant="warning">
                                  {seed.delayMinutes >= 1440
                                    ? `${Math.round(seed.delayMinutes / 1440)}d delay`
                                    : `${Math.round(seed.delayMinutes / 60)}h delay`}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            loading={creatingSeed === seed.name}
                            onClick={() => handleCreateSeedTemplate(seed)}
                          >
                            <Plus className="w-3 h-3 mr-1" /> Create
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {templates.map((template) => (
                  <Card key={template.id} padding="sm">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-medium text-white truncate">
                            {template.name}
                          </h4>
                          <Badge
                            variant={template.enabled ? 'success' : 'default'}
                          >
                            {template.enabled ? 'Active' : 'Disabled'}
                          </Badge>
                          {template.trigger && (
                            <Badge variant="info">{template.trigger}</Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">
                          Subject: {template.subject}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
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
                              onClick={() => handleDeleteTemplate(template.id)}
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

                {/* Show Quick Start section even when templates exist, if fewer than 5 */}
                {templates.length < 5 && (
                  <div className="mt-8">
                    <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-brand-gold" />
                      Quick Start Templates
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {SEED_TEMPLATES.filter(
                        (seed) => !templates.some((t) => t.name === seed.name)
                      ).map((seed) => (
                        <Card key={seed.name} padding="sm">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <span className="text-sm text-gray-300">
                                {seed.name}
                              </span>
                              <div className="flex items-center gap-1 mt-1">
                                <Badge variant="info">{seed.trigger}</Badge>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              loading={creatingSeed === seed.name}
                              onClick={() => handleCreateSeedTemplate(seed)}
                            >
                              <Plus className="w-3 h-3 mr-1" /> Add
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Automations Tab */}
        <TabsContent value="automations">
          <EmailAutomationRules />
        </TabsContent>

        {/* Queue Tab */}
        <TabsContent value="queue">
          <EmailQueueViewer />
        </TabsContent>
      </Tabs>
    </div>
  );
}
