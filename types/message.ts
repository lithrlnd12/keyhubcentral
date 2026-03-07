import { Timestamp } from 'firebase/firestore';

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: Timestamp;
  readBy: string[];
  reactions?: Record<string, string[]>; // emoji -> array of userIds
}

export interface Conversation {
  id: string;
  type: '1:1' | 'group';
  participants: string[];
  participantNames: Record<string, string>;
  groupName?: string;
  jobId?: string | null;
  requestId?: string | null;
  requestType?: 'labor' | 'service' | null;
  lastMessage: {
    text: string;
    senderId: string;
    senderName: string;
    timestamp: Timestamp;
  } | null;
  unreadCount: Record<string, number>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  archivedBy?: string[];
}
