'use client';

import { useState } from 'react';
import { Bell, BellOff, Check } from 'lucide-react';
import { Card, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/hooks';
import { useNotifications } from '@/lib/hooks';
import { requestNotificationPermission } from '@/lib/firebase/messaging';
import {
  togglePushNotifications,
  removeFCMToken,
  getFCMTokens,
  toggleNotificationSetting,
  updateQuietHours,
} from '@/lib/firebase/notifications';
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
  const { preferences, preferencesLoading } = useNotifications();
  const [status, setStatus] = useState<'idle' | 'enabling' | 'enabled' | 'disabled' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const isSupported =
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window;

  const browserPermission = typeof window !== 'undefined' && 'Notification' in window
    ? Notification.permission
    : 'default';

  const handleEnable = async () => {
    if (!user?.uid) return;
    setStatus('enabling');
    setErrorMsg('');
    try {
      const token = await requestNotificationPermission(user.uid);
      if (token) {
        await togglePushNotifications(user.uid, true);
        setStatus('enabled');
      } else {
        if (Notification.permission === 'denied') {
          setErrorMsg('Notifications blocked. Check your browser settings.');
        } else {
          setErrorMsg('Could not enable notifications. Try again.');
        }
        setStatus('error');
      }
    } catch {
      setErrorMsg('Something went wrong. Try again.');
      setStatus('error');
    }
  };

  const handleDisable = async () => {
    if (!user?.uid) return;
    try {
      const tokens = await getFCMTokens(user.uid);
      for (const t of tokens) {
        await removeFCMToken(user.uid, t.token);
      }
      await togglePushNotifications(user.uid, false);
    } catch { /* still mark disabled */ }
    setStatus('disabled');
  };

  const handleToggle = async (
    category: keyof NotificationPreferences,
    setting: string,
    value: boolean
  ) => {
    if (!user?.uid) return;
    await toggleNotificationSetting(user.uid, category, setting, value);
  };

  const handleQuietHoursToggle = async (enabled: boolean) => {
    if (!user?.uid) return;
    await updateQuietHours(user.uid, { enabled });
  };

  const handleQuietHoursTime = async (field: 'start' | 'end', value: string) => {
    if (!user?.uid) return;
    await updateQuietHours(user.uid, { [field]: value });
  };

  if (!isSupported) {
    return (
      <Card>
        <div className="flex items-center gap-3">
          <BellOff className="w-5 h-5 text-gray-500" />
          <div>
            <CardTitle>Push Notifications</CardTitle>
            <p className="text-sm text-gray-400 mt-1">
              Not supported in this browser. Try Chrome, Firefox, or Edge.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  const showAsEnabled = status === 'enabled' || (status === 'idle' && browserPermission === 'granted');
  const showAsDenied = browserPermission === 'denied' && status !== 'enabled';
  const showPreferences = showAsEnabled && preferences && !preferencesLoading;

  // Role-based visibility
  const role = user?.role || '';
  const showCompliance = ['owner', 'admin', 'contractor', 'pm', 'sales_rep'].includes(role);
  const showJobs = ['owner', 'admin', 'contractor', 'pm'].includes(role);
  const showLeads = ['owner', 'admin', 'sales_rep', 'subscriber'].includes(role);
  const showAdmin = ['owner', 'admin'].includes(role);

  return (
    <div className="space-y-6">
      {/* Master Enable/Disable */}
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {showAsEnabled ? (
              <Bell className="w-5 h-5 text-brand-gold" />
            ) : (
              <BellOff className="w-5 h-5 text-gray-500" />
            )}
            <div>
              <CardTitle>Push Notifications</CardTitle>
              <CardDescription>
                {showAsEnabled
                  ? 'Notifications are on for this device'
                  : 'Enable to receive real-time alerts on this device'}
              </CardDescription>
            </div>
          </div>

          {showAsDenied ? (
            <p className="text-sm text-red-400 ml-4 text-right">
              Blocked by browser.<br />
              <span className="text-xs text-gray-500">Check browser settings</span>
            </p>
          ) : showAsEnabled ? (
            <Button onClick={handleDisable} size="sm" variant="outline">
              Disable
            </Button>
          ) : (
            <Button
              onClick={handleEnable}
              size="sm"
              variant="primary"
              disabled={status === 'enabling'}
            >
              {status === 'enabling' ? 'Enabling...' : 'Enable'}
            </Button>
          )}
        </div>

        {status === 'enabled' && (
          <div className="flex items-center gap-2 text-green-400 mt-3">
            <Check className="w-4 h-4" />
            <span className="text-sm">Notifications enabled successfully</span>
          </div>
        )}

        {status === 'error' && errorMsg && (
          <p className="text-sm text-red-400 mt-3">{errorMsg}</p>
        )}
      </Card>

      {/* Preferences — only shown when notifications are enabled */}
      {showPreferences && (
        <>
          {/* Quiet Hours */}
          <Card>
            <div className="flex items-start justify-between mb-4">
              <div>
                <CardTitle>Quiet Hours</CardTitle>
                <CardDescription>Pause non-urgent notifications during these hours</CardDescription>
              </div>
              <Toggle
                enabled={preferences.quietHours.enabled}
                onChange={handleQuietHoursToggle}
              />
            </div>
            {preferences.quietHours.enabled && (
              <div className="flex items-center gap-4 mt-4">
                <TimePicker
                  label="Start"
                  value={preferences.quietHours.start}
                  onChange={(v) => handleQuietHoursTime('start', v)}
                />
                <span className="text-gray-400 mt-6">to</span>
                <TimePicker
                  label="End"
                  value={preferences.quietHours.end}
                  onChange={(v) => handleQuietHoursTime('end', v)}
                />
              </div>
            )}
          </Card>

          {/* Messages */}
          <Card>
            <CardTitle>Messages</CardTitle>
            <div className="mt-4 divide-y divide-gray-800">
              <SettingRow
                label="Direct messages"
                description="When someone sends you a 1:1 message"
                enabled={preferences.messages?.directMessages ?? true}
                onChange={(v) => handleToggle('messages', 'directMessages', v)}
              />
              <SettingRow
                label="Group messages"
                description="When someone sends a message in a group chat"
                enabled={preferences.messages?.groupMessages ?? true}
                onChange={(v) => handleToggle('messages', 'groupMessages', v)}
              />
            </div>
          </Card>

          {/* Compliance */}
          {showCompliance && (
            <Card>
              <CardTitle>Compliance Alerts</CardTitle>
              <div className="mt-4 divide-y divide-gray-800">
                <SettingRow
                  label="Insurance expiring"
                  description="30 and 7 days before expiration"
                  enabled={preferences.compliance.insuranceExpiring}
                  onChange={(v) => handleToggle('compliance', 'insuranceExpiring', v)}
                />
                <SettingRow
                  label="License expiring"
                  enabled={preferences.compliance.licenseExpiring}
                  onChange={(v) => handleToggle('compliance', 'licenseExpiring', v)}
                />
                <SettingRow
                  label="W-9 reminders"
                  enabled={preferences.compliance.w9Reminders}
                  onChange={(v) => handleToggle('compliance', 'w9Reminders', v)}
                />
                {showAdmin && (
                  <SettingRow
                    label="Background check updates"
                    enabled={preferences.compliance.backgroundCheckUpdates}
                    onChange={(v) => handleToggle('compliance', 'backgroundCheckUpdates', v)}
                  />
                )}
              </div>
            </Card>
          )}

          {/* Jobs */}
          {showJobs && (
            <Card>
              <CardTitle>Job Alerts</CardTitle>
              <div className="mt-4 divide-y divide-gray-800">
                <SettingRow
                  label="New assignments"
                  enabled={preferences.jobs.newAssignments}
                  onChange={(v) => handleToggle('jobs', 'newAssignments', v)}
                />
                <SettingRow
                  label="Schedule changes"
                  enabled={preferences.jobs.scheduleChanges}
                  onChange={(v) => handleToggle('jobs', 'scheduleChanges', v)}
                />
                <SettingRow
                  label="Day-before reminders"
                  enabled={preferences.jobs.dayBeforeReminders}
                  onChange={(v) => handleToggle('jobs', 'dayBeforeReminders', v)}
                />
                <SettingRow
                  label="Status updates"
                  enabled={preferences.jobs.statusUpdates}
                  onChange={(v) => handleToggle('jobs', 'statusUpdates', v)}
                />
              </div>
            </Card>
          )}

          {/* Leads */}
          {showLeads && (
            <Card>
              <CardTitle>Lead Alerts</CardTitle>
              <div className="mt-4 divide-y divide-gray-800">
                <SettingRow
                  label="New leads"
                  enabled={preferences.leads.newLeads}
                  onChange={(v) => handleToggle('leads', 'newLeads', v)}
                />
                <SettingRow
                  label="Hot leads only"
                  description="Only notify for high-intent leads"
                  enabled={preferences.leads.hotLeadsOnly}
                  onChange={(v) => handleToggle('leads', 'hotLeadsOnly', v)}
                  disabled={!preferences.leads.newLeads}
                />
                <SettingRow
                  label="Inactivity reminders"
                  enabled={preferences.leads.inactivityReminders}
                  onChange={(v) => handleToggle('leads', 'inactivityReminders', v)}
                />
                <SettingRow
                  label="Lead replacements"
                  enabled={preferences.leads.leadReplacements}
                  onChange={(v) => handleToggle('leads', 'leadReplacements', v)}
                />
              </div>
            </Card>
          )}

          {/* Financial */}
          <Card>
            <CardTitle>Financial Alerts</CardTitle>
            <div className="mt-4 divide-y divide-gray-800">
              <SettingRow
                label="Payments received"
                enabled={preferences.financial.paymentsReceived}
                onChange={(v) => handleToggle('financial', 'paymentsReceived', v)}
              />
              <SettingRow
                label="Commissions earned"
                enabled={preferences.financial.commissionsEarned}
                onChange={(v) => handleToggle('financial', 'commissionsEarned', v)}
              />
              {showAdmin && (
                <SettingRow
                  label="Invoice overdue"
                  enabled={preferences.financial.invoiceOverdue}
                  onChange={(v) => handleToggle('financial', 'invoiceOverdue', v)}
                />
              )}
              <SettingRow
                label="Subscription reminders"
                enabled={preferences.financial.subscriptionReminders}
                onChange={(v) => handleToggle('financial', 'subscriptionReminders', v)}
              />
            </div>
          </Card>

          {/* Admin */}
          {showAdmin && (
            <Card>
              <CardTitle>Admin Alerts</CardTitle>
              <div className="mt-4 divide-y divide-gray-800">
                <SettingRow
                  label="User approvals"
                  enabled={preferences.admin.userApprovals}
                  onChange={(v) => handleToggle('admin', 'userApprovals', v)}
                />
                <SettingRow
                  label="New applicants"
                  enabled={preferences.admin.newApplicants}
                  onChange={(v) => handleToggle('admin', 'newApplicants', v)}
                />
                <SettingRow
                  label="System alerts"
                  enabled={preferences.admin.systemAlerts}
                  onChange={(v) => handleToggle('admin', 'systemAlerts', v)}
                />
                <SettingRow
                  label="Partner requests"
                  enabled={preferences.admin.partnerRequests}
                  onChange={(v) => handleToggle('admin', 'partnerRequests', v)}
                />
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
