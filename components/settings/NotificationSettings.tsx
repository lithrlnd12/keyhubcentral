'use client';

import { useState } from 'react';
import { Card, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useNotifications } from '@/lib/hooks';
import { useAuth } from '@/lib/hooks';
import { NotificationPreferences } from '@/types/notifications';

// Toggle switch component
function Toggle({
  enabled,
  onChange,
  disabled = false,
}: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={disabled}
      onClick={() => onChange(!enabled)}
      className={`
        relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full
        border-2 border-transparent transition-colors duration-200 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-2 focus:ring-offset-brand-charcoal
        ${enabled ? 'bg-brand-gold' : 'bg-gray-600'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <span
        className={`
          pointer-events-none inline-block h-5 w-5 transform rounded-full
          bg-white shadow ring-0 transition duration-200 ease-in-out
          ${enabled ? 'translate-x-5' : 'translate-x-0'}
        `}
      />
    </button>
  );
}

// Setting row component
function SettingRow({
  label,
  description,
  enabled,
  onChange,
  disabled = false,
}: {
  label: string;
  description?: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex-1 pr-4">
        <p className="text-white font-medium">{label}</p>
        {description && <p className="text-sm text-gray-400 mt-0.5">{description}</p>}
      </div>
      <Toggle enabled={enabled} onChange={onChange} disabled={disabled} />
    </div>
  );
}

// Time picker component
function TimePicker({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  return (
    <div>
      <label className="block text-sm text-gray-400 mb-1">{label}</label>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="
          bg-gray-800 border border-gray-700 rounded-lg px-3 py-2
          text-white text-sm focus:outline-none focus:ring-2
          focus:ring-brand-gold focus:border-transparent
        "
      />
    </div>
  );
}

export function NotificationSettings() {
  const { user } = useAuth();
  const {
    preferences,
    preferencesLoading,
    permission,
    isSupported,
    requestPermission,
    toggleSetting,
    togglePush,
    setQuietHours,
  } = useNotifications();

  const [saving, setSaving] = useState(false);

  // Handle toggle with loading state
  const handleToggle = async (
    category: keyof NotificationPreferences,
    setting: string,
    value: boolean
  ) => {
    setSaving(true);
    try {
      await toggleSetting(category, setting, value);
    } catch (error) {
      console.error('Error toggling setting:', error);
    } finally {
      setSaving(false);
    }
  };

  // Handle push toggle
  const handlePushToggle = async (enabled: boolean) => {
    setSaving(true);
    try {
      await togglePush(enabled);
    } catch (error) {
      console.error('Error toggling push:', error);
    } finally {
      setSaving(false);
    }
  };

  // Handle quiet hours changes
  const handleQuietHoursToggle = async (enabled: boolean) => {
    setSaving(true);
    try {
      await setQuietHours({ enabled });
    } catch (error) {
      console.error('Error toggling quiet hours:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleQuietHoursTimeChange = async (field: 'start' | 'end', value: string) => {
    setSaving(true);
    try {
      await setQuietHours({ [field]: value });
    } catch (error) {
      console.error('Error updating quiet hours:', error);
    } finally {
      setSaving(false);
    }
  };

  if (preferencesLoading) {
    return (
      <Card>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-700 rounded w-1/3"></div>
          <div className="h-4 bg-gray-700 rounded w-2/3"></div>
          <div className="space-y-3 mt-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  if (!preferences) {
    return null;
  }

  // Determine which sections to show based on role
  const showCompliance = ['owner', 'admin', 'contractor', 'pm', 'sales_rep'].includes(user?.role || '');
  const showJobs = ['owner', 'admin', 'contractor', 'pm'].includes(user?.role || '');
  const showLeads = ['owner', 'admin', 'sales_rep', 'subscriber'].includes(user?.role || '');
  const showFinancial = true; // Everyone can see financial
  const showAdmin = ['owner', 'admin'].includes(user?.role || '');

  return (
    <div className="space-y-6">
      {/* Push Notifications Master Toggle */}
      <Card>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Push Notifications</CardTitle>
            <CardDescription>
              Receive alerts on your device when important events happen
            </CardDescription>
          </div>
          <Toggle
            enabled={preferences.pushEnabled}
            onChange={handlePushToggle}
            disabled={saving}
          />
        </div>

        {!isSupported && (
          <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p className="text-yellow-500 text-sm">
              Push notifications are not supported in this browser.
            </p>
          </div>
        )}

        {isSupported && permission === 'denied' && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-sm">
              Notifications are blocked. Please enable them in your browser settings.
            </p>
          </div>
        )}

        {isSupported && permission === 'default' && preferences.pushEnabled && (
          <div className="mt-4">
            <Button onClick={requestPermission} size="sm">
              Enable Browser Notifications
            </Button>
          </div>
        )}
      </Card>

      {/* Quiet Hours */}
      <Card>
        <div className="flex items-start justify-between mb-4">
          <div>
            <CardTitle>Quiet Hours</CardTitle>
            <CardDescription>
              Pause non-urgent notifications during these hours
            </CardDescription>
          </div>
          <Toggle
            enabled={preferences.quietHours.enabled}
            onChange={handleQuietHoursToggle}
            disabled={saving}
          />
        </div>

        {preferences.quietHours.enabled && (
          <div className="flex items-center gap-4 mt-4">
            <TimePicker
              label="Start"
              value={preferences.quietHours.start}
              onChange={(v) => handleQuietHoursTimeChange('start', v)}
            />
            <span className="text-gray-400 mt-6">to</span>
            <TimePicker
              label="End"
              value={preferences.quietHours.end}
              onChange={(v) => handleQuietHoursTimeChange('end', v)}
            />
          </div>
        )}
      </Card>

      {/* Compliance Alerts */}
      {showCompliance && (
        <Card>
          <CardTitle>Compliance Alerts</CardTitle>
          <CardDescription>
            Stay on top of insurance, licenses, and documents
          </CardDescription>
          <div className="mt-4 divide-y divide-gray-800">
            <SettingRow
              label="Insurance expiring"
              description="Get notified 30 and 7 days before expiration"
              enabled={preferences.compliance.insuranceExpiring}
              onChange={(v) => handleToggle('compliance', 'insuranceExpiring', v)}
              disabled={saving || !preferences.pushEnabled}
            />
            <SettingRow
              label="License expiring"
              description="Alerts when professional licenses are expiring"
              enabled={preferences.compliance.licenseExpiring}
              onChange={(v) => handleToggle('compliance', 'licenseExpiring', v)}
              disabled={saving || !preferences.pushEnabled}
            />
            <SettingRow
              label="W-9 reminders"
              description="Annual reminders to submit tax documents"
              enabled={preferences.compliance.w9Reminders}
              onChange={(v) => handleToggle('compliance', 'w9Reminders', v)}
              disabled={saving || !preferences.pushEnabled}
            />
            {showAdmin && (
              <SettingRow
                label="Background check updates"
                description="Get notified when background checks complete"
                enabled={preferences.compliance.backgroundCheckUpdates}
                onChange={(v) => handleToggle('compliance', 'backgroundCheckUpdates', v)}
                disabled={saving || !preferences.pushEnabled}
              />
            )}
          </div>
        </Card>
      )}

      {/* Job Alerts */}
      {showJobs && (
        <Card>
          <CardTitle>Job Alerts</CardTitle>
          <CardDescription>
            Notifications about job assignments and updates
          </CardDescription>
          <div className="mt-4 divide-y divide-gray-800">
            <SettingRow
              label="New assignments"
              description="When you're assigned to a new job"
              enabled={preferences.jobs.newAssignments}
              onChange={(v) => handleToggle('jobs', 'newAssignments', v)}
              disabled={saving || !preferences.pushEnabled}
            />
            <SettingRow
              label="Schedule changes"
              description="When a job date or time is modified"
              enabled={preferences.jobs.scheduleChanges}
              onChange={(v) => handleToggle('jobs', 'scheduleChanges', v)}
              disabled={saving || !preferences.pushEnabled}
            />
            <SettingRow
              label="Day-before reminders"
              description="Reminder the day before a scheduled job"
              enabled={preferences.jobs.dayBeforeReminders}
              onChange={(v) => handleToggle('jobs', 'dayBeforeReminders', v)}
              disabled={saving || !preferences.pushEnabled}
            />
            <SettingRow
              label="Status updates"
              description="When job status changes (complete, service tickets)"
              enabled={preferences.jobs.statusUpdates}
              onChange={(v) => handleToggle('jobs', 'statusUpdates', v)}
              disabled={saving || !preferences.pushEnabled}
            />
          </div>
        </Card>
      )}

      {/* Lead Alerts */}
      {showLeads && (
        <Card>
          <CardTitle>Lead Alerts</CardTitle>
          <CardDescription>
            Notifications about new and assigned leads
          </CardDescription>
          <div className="mt-4 divide-y divide-gray-800">
            <SettingRow
              label="New leads"
              description="When a new lead is assigned to you"
              enabled={preferences.leads.newLeads}
              onChange={(v) => handleToggle('leads', 'newLeads', v)}
              disabled={saving || !preferences.pushEnabled}
            />
            <SettingRow
              label="Hot leads only"
              description="Only notify for high-intent leads"
              enabled={preferences.leads.hotLeadsOnly}
              onChange={(v) => handleToggle('leads', 'hotLeadsOnly', v)}
              disabled={saving || !preferences.pushEnabled || !preferences.leads.newLeads}
            />
            <SettingRow
              label="Inactivity reminders"
              description="Remind when a lead hasn't been contacted"
              enabled={preferences.leads.inactivityReminders}
              onChange={(v) => handleToggle('leads', 'inactivityReminders', v)}
              disabled={saving || !preferences.pushEnabled}
            />
            <SettingRow
              label="Lead replacements"
              description="When a replacement lead is ready"
              enabled={preferences.leads.leadReplacements}
              onChange={(v) => handleToggle('leads', 'leadReplacements', v)}
              disabled={saving || !preferences.pushEnabled}
            />
          </div>
        </Card>
      )}

      {/* Financial Alerts */}
      {showFinancial && (
        <Card>
          <CardTitle>Financial Alerts</CardTitle>
          <CardDescription>
            Payments, commissions, and billing notifications
          </CardDescription>
          <div className="mt-4 divide-y divide-gray-800">
            <SettingRow
              label="Payments received"
              description="When a payment is deposited"
              enabled={preferences.financial.paymentsReceived}
              onChange={(v) => handleToggle('financial', 'paymentsReceived', v)}
              disabled={saving || !preferences.pushEnabled}
            />
            <SettingRow
              label="Commissions earned"
              description="When you earn a commission on a job"
              enabled={preferences.financial.commissionsEarned}
              onChange={(v) => handleToggle('financial', 'commissionsEarned', v)}
              disabled={saving || !preferences.pushEnabled}
            />
            {showAdmin && (
              <SettingRow
                label="Invoice overdue"
                description="When an invoice becomes overdue"
                enabled={preferences.financial.invoiceOverdue}
                onChange={(v) => handleToggle('financial', 'invoiceOverdue', v)}
                disabled={saving || !preferences.pushEnabled}
              />
            )}
            <SettingRow
              label="Subscription reminders"
              description="Renewal and payment notifications"
              enabled={preferences.financial.subscriptionReminders}
              onChange={(v) => handleToggle('financial', 'subscriptionReminders', v)}
              disabled={saving || !preferences.pushEnabled}
            />
          </div>
        </Card>
      )}

      {/* Admin Alerts */}
      {showAdmin && (
        <Card>
          <CardTitle>Admin Alerts</CardTitle>
          <CardDescription>
            System and administrative notifications
          </CardDescription>
          <div className="mt-4 divide-y divide-gray-800">
            <SettingRow
              label="User approvals"
              description="When new users need approval"
              enabled={preferences.admin.userApprovals}
              onChange={(v) => handleToggle('admin', 'userApprovals', v)}
              disabled={saving || !preferences.pushEnabled}
            />
            <SettingRow
              label="New applicants"
              description="When job applications are received"
              enabled={preferences.admin.newApplicants}
              onChange={(v) => handleToggle('admin', 'newApplicants', v)}
              disabled={saving || !preferences.pushEnabled}
            />
            <SettingRow
              label="System alerts"
              description="Important system notifications"
              enabled={preferences.admin.systemAlerts}
              onChange={(v) => handleToggle('admin', 'systemAlerts', v)}
              disabled={saving || !preferences.pushEnabled}
            />
            <SettingRow
              label="Partner requests"
              description="When partners submit labor requests or service tickets"
              enabled={preferences.admin.partnerRequests}
              onChange={(v) => handleToggle('admin', 'partnerRequests', v)}
              disabled={saving || !preferences.pushEnabled}
            />
          </div>
        </Card>
      )}
    </div>
  );
}
