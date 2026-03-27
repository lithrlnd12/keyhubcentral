'use client';

import { useState, useEffect, useCallback } from 'react';
import { Trash2, Plus, Copy, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/lib/hooks';
import {
  createApiKey,
  getApiKeys,
  deleteApiKey,
} from '@/lib/firebase/apiKeys';
import { ApiKey } from '@/types/webhook';

export function ApiKeyManagement() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [keyName, setKeyName] = useState('');

  // Newly created key (show full key once)
  const [newFullKey, setNewFullKey] = useState<string | null>(null);

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchKeys = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getApiKeys();
      setKeys(data);
    } catch {
      showToast('Failed to load API keys', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleCreate = async () => {
    if (!keyName.trim()) {
      showToast('Please enter a name for the API key', 'error');
      return;
    }
    if (!user?.uid) return;

    try {
      setSaving(true);
      const { apiKey, fullKey } = await createApiKey(keyName.trim(), user.uid);
      setKeys((prev) => [apiKey, ...prev]);
      setNewFullKey(fullKey);
      setShowForm(false);
      setKeyName('');
      showToast('API key generated', 'success');
    } catch {
      showToast('Failed to generate API key', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteApiKey(id);
      setKeys((prev) => prev.filter((k) => k.id !== id));
      setDeletingId(null);
      showToast('API key deleted', 'success');
    } catch {
      showToast('Failed to delete API key', 'error');
    }
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
          <h2 className="text-lg font-semibold text-white">API Keys</h2>
          <p className="text-sm text-gray-400 mt-1">
            Manage API keys for programmatic access
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} size="sm">
          <Plus size={16} className="mr-1" />
          Generate New Key
        </Button>
      </div>

      {/* Create Form */}
      {showForm && (
        <Card>
          <CardTitle>Generate API Key</CardTitle>
          <div className="mt-4 space-y-4">
            <Input
              label="Key Name"
              placeholder="e.g. Production API"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowForm(false);
                  setKeyName('');
                }}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={handleCreate} loading={saving}>
                Generate Key
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Newly generated key — show once */}
      {newFullKey && (
        <Card className="border-brand-gold/50">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-brand-gold shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-brand-gold">
                Save this key — it will not be shown again
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Store it securely. You will not be able to retrieve it after dismissing this message.
              </p>
              <div className="mt-2 flex items-center gap-2">
                <code className="flex-1 text-sm text-white bg-black/30 px-3 py-2 rounded-md break-all">
                  {newFullKey}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(newFullKey)}
                >
                  <Copy size={14} />
                </Button>
              </div>
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setNewFullKey(null)}
            >
              Dismiss
            </Button>
          </div>
        </Card>
      )}

      {/* Keys List */}
      {keys.length === 0 && !showForm ? (
        <Card>
          <p className="text-center text-gray-400 py-8">
            No API keys yet. Click &quot;Generate New Key&quot; to create one.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {keys.map((apiKey) => (
            <Card key={apiKey.id} padding="sm">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">{apiKey.name}</span>
                    <Badge variant="default">
                      <code className="text-xs">{apiKey.keyPrefix}</code>
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span>
                      Created{' '}
                      {apiKey.createdAt?.toDate
                        ? apiKey.createdAt.toDate().toLocaleDateString()
                        : '—'}
                    </span>
                    <span>
                      Last used{' '}
                      {apiKey.lastUsedAt?.toDate
                        ? apiKey.lastUsedAt.toDate().toLocaleDateString()
                        : 'Never'}
                    </span>
                  </div>
                </div>
                <div className="shrink-0">
                  {deletingId === apiKey.id ? (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(apiKey.id)}
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
                      onClick={() => setDeletingId(apiKey.id)}
                      className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                      title="Delete API key"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
