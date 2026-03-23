'use client';

import { useState, useEffect } from 'react';
import { X, AlertTriangle, Loader2, Send } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { getContractors } from '@/lib/firebase/contractors';
import { createConversation, sendMessage } from '@/lib/firebase/messages';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { InboundCall } from '@/types/inboundCall';
import { Contractor } from '@/types/contractor';

interface NotifyContractorModalProps {
  call: InboundCall;
  onClose: () => void;
  onSent: () => void;
}

export function NotifyContractorModal({ call, onClose, onSent }: NotifyContractorModalProps) {
  const { user } = useAuth();
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loadingContractors, setLoadingContractors] = useState(true);
  const [selectedContractorId, setSelectedContractorId] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const callerName = call.caller.name || call.caller.phone;
  const defaultMessage = `⚠️ Complaint Alert\n\nWe received a complaint call from ${callerName}.\n\n${call.summary ? `Summary: ${call.summary}` : 'Please review this call and follow up with the customer.'}\n\nPlease reach out to address their concerns as soon as possible.`;

  useEffect(() => {
    getContractors({ status: 'active' })
      .then(setContractors)
      .finally(() => setLoadingContractors(false));
  }, []);

  useEffect(() => {
    setMessage(defaultMessage);
  }, [call.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSend = async () => {
    if (!selectedContractorId || !message.trim() || !user) return;

    const contractor = contractors.find(c => c.id === selectedContractorId);
    if (!contractor?.userId) {
      setError('Contractor account not found.');
      return;
    }

    setSending(true);
    setError('');

    try {
      const adminName = user.displayName || user.email || 'Admin';
      const contractorName = contractor.businessName || contractor.userId;

      // Create or reuse 1:1 conversation
      const conversationId = await createConversation(
        '1:1',
        [user.uid, contractor.userId],
        { [user.uid]: adminName, [contractor.userId]: contractorName },
        user.uid
      );

      // Tag it as a complaint conversation
      await updateDoc(doc(db, 'conversations', conversationId), {
        complaintCallId: call.id,
      });

      // Send the message
      await sendMessage(
        conversationId,
        user.uid,
        adminName,
        message.trim(),
        [user.uid, contractor.userId]
      );

      onSent();
    } catch (err) {
      console.error('Failed to send complaint notification:', err);
      setError('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <h3 className="text-white font-semibold">Notify Contractor</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Complaint context */}
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-sm text-red-400 font-medium">Complaint from: {callerName}</p>
            {call.analysis.notes && (
              <p className="text-xs text-gray-400 mt-1">{call.analysis.notes}</p>
            )}
          </div>

          {/* Contractor selector */}
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Select Contractor</label>
            {loadingContractors ? (
              <div className="flex items-center gap-2 text-gray-500 text-sm py-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading contractors...
              </div>
            ) : (
              <select
                value={selectedContractorId}
                onChange={e => setSelectedContractorId(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-brand-gold"
              >
                <option value="">— Choose a contractor —</option>
                {contractors.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.businessName || c.userId}
                    {c.trades?.length ? ` · ${c.trades.join(', ')}` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Message</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={6}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-brand-gold resize-none"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 py-4 border-t border-gray-800">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg bg-gray-800 text-gray-300 text-sm font-medium hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={!selectedContractorId || !message.trim() || sending}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {sending ? 'Sending...' : 'Send Notification'}
          </button>
        </div>
      </div>
    </div>
  );
}
