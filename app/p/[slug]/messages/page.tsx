'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTenant } from '@/lib/contexts/TenantContext';
import { useAuth } from '@/lib/hooks';
import { useCustomerJobs } from '@/lib/hooks/useCustomerPortal';
import { TenantHeader } from '@/components/portal-wl/TenantHeader';
import { JobCommunication } from '@/types/job';
import {
  subscribeToCommunications,
  addCommunication,
} from '@/lib/firebase/communications';
import {
  ArrowLeft,
  Briefcase,
  MessageCircle,
  Send,
} from 'lucide-react';

export default function TenantMessages() {
  const router = useRouter();
  const { tenant } = useTenant();
  const { user, loading: authLoading, signOut } = useAuth();
  const { jobs, loading: jobsLoading } = useCustomerJobs(
    user?.email || null,
    tenant.ownerId
  );

  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [messages, setMessages] = useState<JobCommunication[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const primaryColor = tenant.branding.primaryColor;

  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/p/${tenant.slug}`);
    }
  }, [user, authLoading, router, tenant.slug]);

  // Auto-select first job
  useEffect(() => {
    if (jobs.length > 0 && !selectedJobId) {
      setSelectedJobId(jobs[0].id);
    }
  }, [jobs, selectedJobId]);

  // Subscribe to messages for selected job
  useEffect(() => {
    if (!selectedJobId) return;

    const unsubscribe = subscribeToCommunications(
      selectedJobId,
      (comms) => {
        // Reverse to show oldest first
        setMessages([...comms].reverse());
      },
      100
    );

    return unsubscribe;
  }, [selectedJobId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSignOut = async () => {
    await signOut();
    router.push(`/p/${tenant.slug}`);
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedJobId || !user) return;

    setSending(true);
    try {
      await addCommunication(selectedJobId, {
        type: 'note',
        userId: user.uid,
        content: newMessage.trim(),
      });
      setNewMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setSending(false);
    }
  };

  if (authLoading || !user) return null;

  const selectedJob = jobs.find((j) => j.id === selectedJobId);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: tenant.branding.backgroundColor || '#1A1A1A' }}>
      <TenantHeader tenant={tenant} customerName={user.displayName} onSignOut={handleSignOut} />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6 flex flex-col">
        <button
          onClick={() => router.push(`/p/${tenant.slug}/dashboard`)}
          className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors mb-4 text-sm"
        >
          <ArrowLeft size={16} />
          Dashboard
        </button>

        <h1 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
          <MessageCircle size={22} style={{ color: primaryColor }} />
          Messages
        </h1>

        {jobs.length === 0 ? (
          <div className="bg-[#2D2D2D] rounded-xl p-8 text-center flex-1 flex items-center justify-center">
            <div>
              <MessageCircle size={40} className="mx-auto mb-3 text-gray-600" />
              <p className="text-gray-400">No active projects to message about.</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row gap-4 flex-1 min-h-0">
            {/* Job selector (sidebar on desktop, top bar on mobile) */}
            <div className="md:w-64 flex-shrink-0">
              <p className="text-gray-400 text-xs uppercase tracking-wider mb-2 font-medium">Project</p>
              <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0">
                {jobs.map((job) => (
                  <button
                    key={job.id}
                    onClick={() => setSelectedJobId(job.id)}
                    className="flex-shrink-0 px-3 py-2 rounded-lg text-left text-sm transition-colors border"
                    style={{
                      backgroundColor: selectedJobId === job.id ? `${primaryColor}15` : '#2D2D2D',
                      borderColor: selectedJobId === job.id ? primaryColor : '#374151',
                      color: selectedJobId === job.id ? primaryColor : '#9CA3AF',
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Briefcase size={14} />
                      <span className="capitalize whitespace-nowrap">{job.type}</span>
                      <span className="text-gray-500 text-xs">#{job.jobNumber}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Chat area */}
            <div className="flex-1 flex flex-col bg-[#2D2D2D] rounded-xl border border-gray-700/50 min-h-[400px]">
              {/* Chat header */}
              {selectedJob && (
                <div className="px-4 py-3 border-b border-gray-700/50">
                  <p className="text-white font-medium text-sm capitalize">
                    {selectedJob.type} Project #{selectedJob.jobNumber}
                  </p>
                  <p className="text-gray-500 text-xs">{selectedJob.statusLabel}</p>
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 text-sm py-8">
                    <MessageCircle size={24} className="mx-auto mb-2 opacity-50" />
                    <p>No messages yet. Send a message to get started.</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isCustomer = msg.userId === user.uid;
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isCustomer ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className="max-w-[80%] px-4 py-2.5 rounded-2xl text-sm"
                          style={{
                            backgroundColor: isCustomer ? primaryColor : '#374151',
                            color: '#fff',
                            borderBottomRightRadius: isCustomer ? '4px' : '16px',
                            borderBottomLeftRadius: isCustomer ? '16px' : '4px',
                          }}
                        >
                          <p>{msg.content}</p>
                          <p className="text-[10px] mt-1 opacity-60">
                            {msg.createdAt?.toDate?.()?.toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            }) || ''}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-3 border-t border-gray-700/50">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2.5 bg-[#1A1A1A] border border-gray-700 rounded-full text-white text-sm placeholder-gray-500 focus:outline-none focus:border-gray-500"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!newMessage.trim() || sending}
                    className="w-10 h-10 rounded-full flex items-center justify-center transition-opacity disabled:opacity-30"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <Send size={16} className="text-white" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
