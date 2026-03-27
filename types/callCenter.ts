import { Timestamp } from 'firebase/firestore';
import { LeadSource, LeadQuality } from './lead';

export interface RoutingRule {
  id: string;
  name: string;
  conditions: {
    trade?: string;
    market?: string;
    source?: LeadSource;
    quality?: LeadQuality;
  };
  targetTeam: string[];
  priority: number;
  active: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CallQueueItem {
  leadId: string;
  leadName: string;
  phone: string;
  quality: LeadQuality;
  source: LeadSource;
  scheduledAt?: string;
  priority: number;
}
