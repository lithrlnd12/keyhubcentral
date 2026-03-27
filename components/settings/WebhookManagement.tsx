'use client';

import { useState, useEffect, useCallback } from 'react';
import { Trash2, Plus, Send, ChevronDown, ChevronUp, Copy, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/lib/hooks';
import {
  createWebhookEndpoint,
  getWebhookEndpoints,
  updateWebhookEndpoint,
  deleteWebhookEndpoint,
  getWebhookDeliveries,
} from '@/lib/firebase/webhooks';
import { WebhookEndpoint, WebhookDelivery, WebhookEvent } from '@/types/webhook';

const ALL_EVENTS: { value: WebhookEvent; label: string }[] = [
  { value: 'job.created', label: 'Job Created' },
  { value: 'job.status_changed', label: 'Job Status Changed' },
  { value: 'lead.created', label: 'Lead Created' },
  { value: 'lead.assigned', label: 'Lead Assigned' },
  { value: 'lead.converted', label: 'Lead Converted' },
  { value: 'invoice.created', label: 'Invoice Created' },
  { value: 'invoice.paid', label: 'Invoice Paid' },
  { value: 'appointment.scheduled', label: 'Appointment Scheduled' },
  { value: 'contractor.status_changed', label: 'Contractor Status Changed' },
];

export function WebhookManagement() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formEvents, setFormEvents] = useState<WebhookEvent[]>([]);

  // Newly created secret (show once)
  const [newSecret, setNewSecret] = useState<{ id: string; secret: string } | null>(null);

  // Expanded endpoint (delivery log)
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [loadingDeliveries, setLoadingDeliveries] = useState(false);

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Testing
  const [testingId, setTestingId] = useState<string | null>(null);

  const fetchEndpoints = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getWebhookEndpoints();
      setEndpoints(data);
    } catch (error) {
      showToast('Failed to load webhook endpoints', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchEndpoints();
  }, [fetchEndpoints]);

  const handleCreate = async () => {
    if (!formName.trim() || !formUrl.trim() || formEvents.length === 0) {
      showToast('Please fill in all fields and select at least one event', 'error');
      return;
    }

    if (!user?.uid) return;

    try {
      setSaving(true);
      const { endpoint, secret } = await createWebhookEndpoint({
        name: formName.trim(),
        url: formUrl.trim(),
        events: formEvents,
        createdBy: user.uid,
      });
      setEndpoints((prev) => [endpoint, ...prev]);
      setNewSecret({ id: endpoint.id, secret });
      setShowForm(false);
      setFormName('');
      setFormUrl('');
      setFormEvents([]);
      showToast('Webhook endpoint created', 'success');
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Failed to create webhook',
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (endpoint: WebhookEndpoint) => {
    try {
      await updateWebhookEndpoint(endpoint.id, { active: !endpoint.active });
      setEndpoints((prev) =>
        prev.map((ep) =>
          ep.id === endpoint.id ? { ...ep, active: !ep.active } : ep
        )
      );
      showToast(
        `Webhook ${!endpoint.active ? 'enabled' : 'disabled'}`,
        'success'
      );
    } catch {
      showToast('Failed to update webhook', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteWebhookEndpoint(id);
      setEndpoints((prev) => prev.filter((ep) => ep.id !== id));
      setDeletingId(null);
      showToast('Webhook endpoint deleted', 'success');
    } catch {
      showToast('Failed to delete webhook', 'error');
    }
  };

  const handleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    setLoadingDeliveries(true);
    try {
      const data = await getWebhookDeliveries(id, 20);
      setDeliveries(data);
    } catch {
      showToast('Failed to load delivery log', 'error');
    } finally {
      setLoadingDeliveries(false);
    }
  };

  const handleTest = async (endpointId: string) => {
    setTestingId(endpointId);
    try {
      const res = await fetch('/api/webhooks/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpointId }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Test delivered — ${data.status} (${data.responseCode ?? 'N/A'})`, 'success');
      } else {
        showToast(data.error || 'Test failed', 'error');
      }
    } catch {
      showToast('Failed to send test webhook', 'error');
    } finally {
      setTestingId(null);
    }
  };

  const toggleEvent = (event: WebhookEvent) => {
    setFormEvents((prev) =>
      prev.includes(event)
        ? prev.filter((e) => e !== event)
        : [...prev, event]
    );
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('Copied to clipboard', 'info');
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Webhook Endpoints</h2>
          <p className="text-sm text-gray-400 mt-1">
            Send real-time event notifications to external services
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} size="sm">
          <Plus size={16} className="mr-1" />
          Add Webhook
        </Button>
      </div>

      {/* Create Form */}
      {showForm && (
        <Card>
          <CardTitle>New Webhook Endpoint</CardTitle>
          <div className="mt-4 space-y-4">
            <Input
              label="Name"
              placeholder="e.g. CRM Integration"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
            />
            <Input
              label="URL"
              placeholder="https://example.com/webhooks"
              value={formUrl}
              onChange={(e) => setFormUrl(e.target.value)}
            />
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Events
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ALL_EVENTS.map(({ value, label }) => (
                  <label
                    key={value}
                    className="flex items-center gap-2 cursor-pointer text-sm text-gray-300 hover:text-white"
                  >
                    <input
                      type="checkbox"
                      checked={formEvents.includes(value)}
                      onChange={() => toggleEvent(value)}
                      className="rounded border-gray-600 bg-brand-charcoal text-brand-gold focus:ring-brand-gold"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowForm(false);
                  setFormName('');
                  setFormUrl('');
                  setFormEvents([]);
                }}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={handleCreate} loading={saving}>
                Create Endpoint
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Secret display (show once) */}
      {newSecret && (
        <Card className="border-brand-gold/50">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-brand-gold">Signing Secret</p>
              <p className="text-xs text-gray-400 mt-1">
                Save this secret — it will not be shown again. Use it to verify webhook signatures.
              </p>
              <code className="block mt-2 text-sm text-white bg-black/30 px-3 py-2 rounded-md break-all">
                {newSecret.secret}
              </code>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(newSecret.secret)}
            >
              <Copy size={14} />
            </Button>
          </div>
          <div className="mt-3 flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setNewSecret(null)}
            >
              Dismiss
            </Button>
          </div>
        </Card>
      )}

      {/* Endpoints List */}
      {endpoints.length === 0 && !showForm ? (
        <Card>
          <p className="text-center text-gray-400 py-8">
            No webhook endpoints configured yet. Click &quot;Add Webhook&quot; to get started.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {endpoints.map((endpoint) => (
            <Card key={endpoint.id} padding="none">
              <div className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium truncate">
                        {endpoint.name}
                      </span>
                      <Badge variant={endpoint.active ? 'success' : 'default'}>
                        {endpoint.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 truncate">
                      {endpoint.url}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {endpoint.events.map((ev) => (
                        <Badge key={ev} variant="info">
                          {ev}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Toggle */}
                    <button
                      onClick={() => handleToggleActive(endpoint)}
                      className="p-2 text-gray-400 hover:text-white transition-colors"
                      title={endpoint.active ? 'Disable' : 'Enable'}
                    >
                      {endpoint.active ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    {/* Test */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTest(endpoint.id)}
                      loading={testingId === endpoint.id}
                      disabled={!endpoint.active}
                    >
                      <Send size={14} />
                    </Button>
                    {/* Expand deliveries */}
                    <button
                      onClick={() => handleExpand(endpoint.id)}
                      className="p-2 text-gray-400 hover:text-white transition-colors"
                      title="View delivery log"
                    >
                      {expandedId === endpoint.id ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      )}
                    </button>
                    {/* Delete */}
                    {deletingId === endpoint.id ? (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDelete(endpoint.id)}
                        >
                          Confirm
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingId(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeletingId(endpoint.id)}
                        className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Delivery log (expanded) */}
              {expandedId === endpoint.id && (
                <div className="border-t border-gray-800 p-4">
                  <h4 className="text-sm font-medium text-gray-300 mb-3">
                    Recent Deliveries
                  </h4>
                  {loadingDeliveries ? (
                    <div className="flex justify-center py-4">
                      <Spinner size="sm" />
                    </div>
                  ) : deliveries.length === 0 ? (
                    <p className="text-xs text-gray-500 text-center py-4">
                      No deliveries yet
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {deliveries.map((d) => (
                        <div
                          key={d.id}
                          className="flex items-center justify-between text-xs bg-black/20 rounded-md px-3 py-2"
                        >
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                d.status === 'success'
                                  ? 'success'
                                  : d.status === 'failed'
                                  ? 'error'
                                  : 'warning'
                              }
                            >
                              {d.status}
                            </Badge>
                            <span className="text-gray-300">{d.event}</span>
                          </div>
                          <div className="flex items-center gap-3 text-gray-500">
                            {d.responseCode && (
                              <span>HTTP {d.responseCode}</span>
                            )}
                            <span>
                              {d.createdAt?.toDate
                                ? d.createdAt.toDate().toLocaleString()
                                : '—'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
