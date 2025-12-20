'use client';

import { useState } from 'react';
import { JobCommunication, CommunicationType } from '@/types/job';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { useCommunications } from '@/lib/hooks/useCommunications';
import { formatDistanceToNow } from '@/lib/utils/formatters';
import {
  MessageSquare,
  Phone,
  Mail,
  FileText,
  RefreshCw,
  Plus,
  Trash2,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface CommunicationFeedProps {
  jobId: string;
  userId: string;
  canEdit?: boolean;
}

const TYPE_CONFIG: Record<
  CommunicationType,
  { icon: typeof MessageSquare; label: string; color: string }
> = {
  call: { icon: Phone, label: 'Call', color: 'text-green-400' },
  email: { icon: Mail, label: 'Email', color: 'text-blue-400' },
  text: { icon: MessageSquare, label: 'Text', color: 'text-purple-400' },
  note: { icon: FileText, label: 'Note', color: 'text-yellow-400' },
  status_update: { icon: RefreshCw, label: 'Status Update', color: 'text-brand-gold' },
};

export function CommunicationFeed({
  jobId,
  userId,
  canEdit = false,
}: CommunicationFeedProps) {
  const { communications, loading, error, addEntry, deleteEntry } =
    useCommunications(jobId, userId);

  const [showForm, setShowForm] = useState(false);
  const [newType, setNewType] = useState<CommunicationType>('note');
  const [newContent, setNewContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!newContent.trim()) return;

    setSubmitting(true);
    try {
      await addEntry(newType, newContent.trim());
      setNewContent('');
      setShowForm(false);
    } catch (err) {
      // Error handled in hook
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this entry?')) return;
    try {
      await deleteEntry(id);
    } catch (err) {
      // Error handled in hook
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-brand-gold" />
          Communication Log ({communications.length})
        </CardTitle>
        {canEdit && (
          <Button
            size="sm"
            variant={showForm ? 'ghost' : 'outline'}
            onClick={() => setShowForm(!showForm)}
          >
            <Plus className="w-4 h-4 mr-1" />
            {showForm ? 'Cancel' : 'Add Entry'}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {/* Add form */}
        {showForm && (
          <div className="mb-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Type</label>
                <div className="flex gap-2 flex-wrap">
                  {(['call', 'email', 'text', 'note'] as CommunicationType[]).map(
                    (type) => {
                      const config = TYPE_CONFIG[type];
                      const Icon = config.icon;
                      return (
                        <button
                          key={type}
                          onClick={() => setNewType(type)}
                          className={cn(
                            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors text-sm',
                            newType === type
                              ? 'bg-brand-gold/20 border-brand-gold/50 text-brand-gold'
                              : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-gray-500'
                          )}
                        >
                          <Icon className="w-4 h-4" />
                          {config.label}
                        </button>
                      );
                    }
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Content
                </label>
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold/50 resize-none"
                  placeholder="Enter your note..."
                />
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={handleSubmit}
                  disabled={!newContent.trim() || submitting}
                >
                  {submitting ? 'Adding...' : 'Add Entry'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Spinner />
          </div>
        )}

        {/* Error state */}
        {error && <p className="text-red-400 text-center py-4">{error}</p>}

        {/* Empty state */}
        {!loading && communications.length === 0 && (
          <div className="text-center py-8">
            <MessageSquare className="w-10 h-10 text-gray-600 mx-auto mb-2" />
            <p className="text-gray-400">No communications yet</p>
          </div>
        )}

        {/* Communication list */}
        {!loading && communications.length > 0 && (
          <div className="space-y-4">
            {communications.map((comm) => {
              const config = TYPE_CONFIG[comm.type];
              const Icon = config.icon;

              return (
                <div
                  key={comm.id}
                  className="flex gap-3 p-3 bg-gray-800/30 rounded-lg"
                >
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                      'bg-gray-700'
                    )}
                  >
                    <Icon className={cn('w-4 h-4', config.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={cn(
                          'text-xs font-medium px-2 py-0.5 rounded-full',
                          'bg-gray-700 text-gray-300'
                        )}
                      >
                        {config.label}
                      </span>
                      <span className="text-xs text-gray-500">
                        {comm.createdAt
                          ? formatDistanceToNow(comm.createdAt.toDate())
                          : 'Just now'}
                      </span>
                    </div>
                    <p className="text-white whitespace-pre-wrap">
                      {comm.content}
                    </p>
                  </div>
                  {canEdit && comm.type !== 'status_update' && (
                    <button
                      onClick={() => handleDelete(comm.id)}
                      className="text-gray-500 hover:text-red-400 transition-colors p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
