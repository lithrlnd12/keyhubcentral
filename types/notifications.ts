import { Timestamp } from 'firebase/firestore';

// Notification categories
export type NotificationCategory =
  | 'compliance'
  | 'jobs'
  | 'leads'
  | 'financial'
  | 'admin';

// Notification priority levels
export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

// All notification types
export type NotificationType =
  // Compliance
  | 'insurance_expiring_30'
  | 'insurance_expiring_7'
  | 'insurance_expired'
  | 'license_expiring'
  | 'w9_needed'
  | 'background_check_complete'
  | 'background_check_flagged'
  // Jobs
  | 'job_assigned'
  | 'job_schedule_changed'
  | 'job_starting_tomorrow'
  | 'job_status_updated'
  | 'job_completed'
  | 'service_ticket_created'
  // Leads
  | 'lead_assigned'
  | 'lead_hot'
  | 'lead_not_contacted'
  | 'lead_replacement_ready'
  // Financial
  | 'payment_received'
  | 'commission_earned'
  | 'invoice_overdue'
  | 'subscription_renewal'
  | 'subscription_payment_failed'
  // Admin
  | 'user_pending_approval'
  | 'new_applicant'
  | 'system_alert'
  // Partner
  | 'partner_labor_request_new'
  | 'partner_labor_request_status_changed'
  | 'partner_ticket_new'
  | 'partner_ticket_status_changed';

// Map notification types to categories
export const NOTIFICATION_CATEGORIES: Record<NotificationType, NotificationCategory> = {
  // Compliance
  insurance_expiring_30: 'compliance',
  insurance_expiring_7: 'compliance',
  insurance_expired: 'compliance',
  license_expiring: 'compliance',
  w9_needed: 'compliance',
  background_check_complete: 'compliance',
  background_check_flagged: 'compliance',
  // Jobs
  job_assigned: 'jobs',
  job_schedule_changed: 'jobs',
  job_starting_tomorrow: 'jobs',
  job_status_updated: 'jobs',
  job_completed: 'jobs',
  service_ticket_created: 'jobs',
  // Leads
  lead_assigned: 'leads',
  lead_hot: 'leads',
  lead_not_contacted: 'leads',
  lead_replacement_ready: 'leads',
  // Financial
  payment_received: 'financial',
  commission_earned: 'financial',
  invoice_overdue: 'financial',
  subscription_renewal: 'financial',
  subscription_payment_failed: 'financial',
  // Admin
  user_pending_approval: 'admin',
  new_applicant: 'admin',
  system_alert: 'admin',
  // Partner
  partner_labor_request_new: 'admin',
  partner_labor_request_status_changed: 'admin',
  partner_ticket_new: 'admin',
  partner_ticket_status_changed: 'admin',
};

// Map notification types to priorities
export const NOTIFICATION_PRIORITIES: Record<NotificationType, NotificationPriority> = {
  // Compliance
  insurance_expiring_30: 'medium',
  insurance_expiring_7: 'high',
  insurance_expired: 'urgent',
  license_expiring: 'medium',
  w9_needed: 'medium',
  background_check_complete: 'medium',
  background_check_flagged: 'high',
  // Jobs
  job_assigned: 'high',
  job_schedule_changed: 'high',
  job_starting_tomorrow: 'medium',
  job_status_updated: 'low',
  job_completed: 'medium',
  service_ticket_created: 'high',
  // Leads
  lead_assigned: 'high',
  lead_hot: 'urgent',
  lead_not_contacted: 'medium',
  lead_replacement_ready: 'medium',
  // Financial
  payment_received: 'medium',
  commission_earned: 'medium',
  invoice_overdue: 'high',
  subscription_renewal: 'medium',
  subscription_payment_failed: 'urgent',
  // Admin
  user_pending_approval: 'high',
  new_applicant: 'medium',
  system_alert: 'medium',
  // Partner
  partner_labor_request_new: 'high',
  partner_labor_request_status_changed: 'medium',
  partner_ticket_new: 'high',
  partner_ticket_status_changed: 'medium',
};

// Quiet hours configuration
export interface QuietHours {
  enabled: boolean;
  start: string; // HH:mm format, e.g., "21:00"
  end: string;   // HH:mm format, e.g., "07:00"
}

// Notification preferences by category
export interface CompliancePreferences {
  insuranceExpiring: boolean;
  licenseExpiring: boolean;
  w9Reminders: boolean;
  backgroundCheckUpdates: boolean;
}

export interface JobsPreferences {
  newAssignments: boolean;
  scheduleChanges: boolean;
  dayBeforeReminders: boolean;
  statusUpdates: boolean;
}

export interface LeadsPreferences {
  newLeads: boolean;
  hotLeadsOnly: boolean;
  inactivityReminders: boolean;
  leadReplacements: boolean;
}

export interface FinancialPreferences {
  paymentsReceived: boolean;
  commissionsEarned: boolean;
  invoiceOverdue: boolean;
  subscriptionReminders: boolean;
}

export interface AdminPreferences {
  userApprovals: boolean;
  newApplicants: boolean;
  systemAlerts: boolean;
  partnerRequests: boolean;
}

// Complete notification preferences
export interface NotificationPreferences {
  // Master controls
  pushEnabled: boolean;
  emailDigest: 'none' | 'daily' | 'weekly';

  // Quiet hours
  quietHours: QuietHours;

  // Category preferences
  compliance: CompliancePreferences;
  jobs: JobsPreferences;
  leads: LeadsPreferences;
  financial: FinancialPreferences;
  admin: AdminPreferences;
}

// FCM token info
export interface FCMToken {
  token: string;
  device: 'desktop' | 'mobile';
  browser: string;
  createdAt: Timestamp;
  lastUsedAt: Timestamp;
}

// Notification record (stored in Firestore)
export interface NotificationRecord {
  id: string;
  userId: string;

  // Content
  type: NotificationType;
  category: NotificationCategory;
  priority: NotificationPriority;
  title: string;
  body: string;
  actionUrl: string;

  // Related entity
  relatedEntity?: {
    type: 'job' | 'lead' | 'contractor' | 'invoice' | 'user' | 'applicant';
    id: string;
  };

  // Delivery status
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'read';
  sentAt?: Timestamp;
  deliveredAt?: Timestamp;
  readAt?: Timestamp;

  // Delivery results
  channels: {
    push: { sent: boolean; error?: string };
    email: { sent: boolean; error?: string };
  };

  createdAt: Timestamp;
}

// Default preferences by role
export function getDefaultPreferences(role: string): NotificationPreferences {
  const basePreferences: NotificationPreferences = {
    pushEnabled: true,
    emailDigest: 'none',
    quietHours: {
      enabled: true,
      start: '21:00',
      end: '07:00',
    },
    compliance: {
      insuranceExpiring: true,
      licenseExpiring: true,
      w9Reminders: true,
      backgroundCheckUpdates: false,
    },
    jobs: {
      newAssignments: true,
      scheduleChanges: true,
      dayBeforeReminders: true,
      statusUpdates: false,
    },
    leads: {
      newLeads: true,
      hotLeadsOnly: false,
      inactivityReminders: true,
      leadReplacements: true,
    },
    financial: {
      paymentsReceived: true,
      commissionsEarned: true,
      invoiceOverdue: false,
      subscriptionReminders: true,
    },
    admin: {
      userApprovals: false,
      newApplicants: false,
      systemAlerts: false,
      partnerRequests: false,
    },
  };

  // Customize based on role
  switch (role) {
    case 'owner':
    case 'admin':
      return {
        ...basePreferences,
        compliance: {
          ...basePreferences.compliance,
          backgroundCheckUpdates: true,
        },
        financial: {
          ...basePreferences.financial,
          invoiceOverdue: true,
        },
        admin: {
          userApprovals: true,
          newApplicants: true,
          systemAlerts: true,
          partnerRequests: true,
        },
      };

    case 'contractor':
      return {
        ...basePreferences,
        leads: {
          newLeads: false,
          hotLeadsOnly: false,
          inactivityReminders: false,
          leadReplacements: false,
        },
      };

    case 'sales_rep':
      return {
        ...basePreferences,
        jobs: {
          ...basePreferences.jobs,
          newAssignments: false, // Sales reps get leads, not jobs
          dayBeforeReminders: false,
        },
      };

    case 'pm':
      return {
        ...basePreferences,
        leads: {
          newLeads: false,
          hotLeadsOnly: false,
          inactivityReminders: false,
          leadReplacements: false,
        },
      };

    case 'subscriber':
      return {
        ...basePreferences,
        compliance: {
          insuranceExpiring: false,
          licenseExpiring: false,
          w9Reminders: false,
          backgroundCheckUpdates: false,
        },
        jobs: {
          newAssignments: false,
          scheduleChanges: false,
          dayBeforeReminders: false,
          statusUpdates: false,
        },
      };

    case 'partner':
      return {
        ...basePreferences,
        pushEnabled: true,
        compliance: {
          insuranceExpiring: false,
          licenseExpiring: false,
          w9Reminders: false,
          backgroundCheckUpdates: false,
        },
        jobs: {
          newAssignments: false,
          scheduleChanges: false,
          dayBeforeReminders: false,
          statusUpdates: true, // Partners want status updates on their requests
        },
        leads: {
          newLeads: false,
          hotLeadsOnly: false,
          inactivityReminders: false,
          leadReplacements: false,
        },
      };

    default:
      return basePreferences;
  }
}

// Notification templates
export interface NotificationTemplate {
  title: string;
  body: string;
  actionUrl: string;
}

export function getNotificationTemplate(
  type: NotificationType,
  data: Record<string, string>
): NotificationTemplate {
  const templates: Record<NotificationType, NotificationTemplate> = {
    // Compliance
    insurance_expiring_30: {
      title: 'Insurance Expires in 30 Days',
      body: `Your insurance policy expires on ${data.expirationDate}. Upload a new certificate to stay compliant.`,
      actionUrl: '/portal/documents',
    },
    insurance_expiring_7: {
      title: 'Insurance Expires in 7 Days',
      body: `Your insurance expires ${data.expirationDate}. Upload new certificate now to avoid work interruption.`,
      actionUrl: '/portal/documents',
    },
    insurance_expired: {
      title: 'Insurance Expired - Action Required',
      body: 'Your insurance has expired. You cannot be assigned jobs until updated.',
      actionUrl: '/portal/documents',
    },
    license_expiring: {
      title: 'License Expiring Soon',
      body: `Your ${data.licenseType} license expires on ${data.expirationDate}. Update your documents.`,
      actionUrl: '/portal/documents',
    },
    w9_needed: {
      title: 'W-9 Form Needed',
      body: `Please submit your W-9 form for tax year ${data.taxYear}.`,
      actionUrl: '/portal/documents',
    },
    background_check_complete: {
      title: 'Background Check Complete',
      body: `Background check for ${data.applicantName} has been completed.`,
      actionUrl: data.applicantId ? `/recruiting/applicants/${data.applicantId}` : '/admin',
    },
    background_check_flagged: {
      title: 'Background Check Needs Review',
      body: `${data.applicantName}'s background check returned "consider" status. Review required.`,
      actionUrl: data.applicantId ? `/recruiting/applicants/${data.applicantId}` : '/admin',
    },

    // Jobs
    job_assigned: {
      title: 'New Job Assignment',
      body: `You've been assigned to ${data.jobType} at ${data.address}. Scheduled for ${data.date}.`,
      actionUrl: data.jobId ? `/kr/${data.jobId}` : '/kr',
    },
    job_schedule_changed: {
      title: 'Job Schedule Changed',
      body: `${data.jobType} at ${data.address} has been rescheduled to ${data.newDate}.`,
      actionUrl: data.jobId ? `/kr/${data.jobId}` : '/kr',
    },
    job_starting_tomorrow: {
      title: 'Job Starting Tomorrow',
      body: `Reminder: ${data.jobType} at ${data.address} starts tomorrow.`,
      actionUrl: data.jobId ? `/kr/${data.jobId}` : '/kr',
    },
    job_status_updated: {
      title: 'Job Status Updated',
      body: `Job ${data.jobNumber} status changed to ${data.status}.`,
      actionUrl: data.jobId ? `/kr/${data.jobId}` : '/kr',
    },
    job_completed: {
      title: 'Job Completed',
      body: `Job ${data.jobNumber} at ${data.address} has been marked complete.`,
      actionUrl: data.jobId ? `/kr/${data.jobId}` : '/kr',
    },
    service_ticket_created: {
      title: 'New Service Ticket',
      body: `Service ticket created for ${data.address}: ${data.issue}.`,
      actionUrl: data.ticketId ? `/kr/service/${data.ticketId}` : '/kr',
    },

    // Leads
    lead_assigned: {
      title: `New Lead: ${data.customerName}`,
      body: `${data.tradeType} lead in ${data.city}. Quality: ${data.quality}. Contact within 1 hour.`,
      actionUrl: data.leadId ? `/kd/leads/${data.leadId}` : '/kd',
    },
    lead_hot: {
      title: `Hot Lead: ${data.customerName}`,
      body: `High-intent ${data.tradeType} lead in ${data.city}. Call now!`,
      actionUrl: data.leadId ? `/kd/leads/${data.leadId}` : '/kd',
    },
    lead_not_contacted: {
      title: 'Lead Needs Attention',
      body: `${data.customerName} hasn't been contacted in 24 hours. Follow up now.`,
      actionUrl: data.leadId ? `/kd/leads/${data.leadId}` : '/kd',
    },
    lead_replacement_ready: {
      title: 'Replacement Lead Ready',
      body: `Your replacement lead for ${data.originalLeadName} is now available.`,
      actionUrl: data.leadId ? `/kd/leads/${data.leadId}` : '/kd',
    },

    // Financial
    payment_received: {
      title: 'Payment Received',
      body: `$${data.amount} deposited for ${data.description}. View details in your earnings.`,
      actionUrl: '/financials/earnings',
    },
    commission_earned: {
      title: 'Commission Earned',
      body: `You earned $${data.amount} commission on job ${data.jobNumber}.`,
      actionUrl: '/financials/earnings',
    },
    invoice_overdue: {
      title: 'Invoice Overdue',
      body: `Invoice ${data.invoiceNumber} for $${data.amount} is now overdue.`,
      actionUrl: data.invoiceId ? `/financials/invoices/${data.invoiceId}` : '/financials/invoices',
    },
    subscription_renewal: {
      title: 'Subscription Renewal',
      body: `Your subscription renews in ${data.daysUntil} days. Amount: $${data.amount}.`,
      actionUrl: '/subscriber/subscription',
    },
    subscription_payment_failed: {
      title: 'Payment Failed',
      body: 'Your subscription payment failed. Please update your payment method.',
      actionUrl: '/subscriber/subscription',
    },

    // Admin
    user_pending_approval: {
      title: 'New User Awaiting Approval',
      body: `${data.userName} (${data.email}) signed up as ${data.requestedRole}. Review their application.`,
      actionUrl: '/admin',
    },
    new_applicant: {
      title: 'New Job Applicant',
      body: `${data.applicantName} applied for ${data.positionTitle}.`,
      actionUrl: data.applicantId ? `/recruiting/applicants/${data.applicantId}` : '/recruiting',
    },
    system_alert: {
      title: data.title || 'System Alert',
      body: data.body || 'A system event requires your attention.',
      actionUrl: data.actionUrl || '/overview',
    },

    // Partner
    partner_labor_request_new: {
      title: 'New Labor Request',
      body: `${data.partnerName} submitted a ${data.workType} labor request for ${data.crewSize} crew member(s).`,
      actionUrl: data.requestId ? `/admin/partner-requests/labor/${data.requestId}` : '/admin/partner-requests',
    },
    partner_labor_request_status_changed: {
      title: 'Labor Request Updated',
      body: `Your labor request ${data.requestNumber} status changed to ${data.status}.`,
      actionUrl: data.requestId ? `/partner/labor-requests/${data.requestId}` : '/partner/labor-requests',
    },
    partner_ticket_new: {
      title: 'New Partner Service Ticket',
      body: `${data.partnerName} submitted a ${data.urgency} priority service ticket: ${data.issue}.`,
      actionUrl: data.ticketId ? `/admin/partner-requests/tickets/${data.ticketId}` : '/admin/partner-requests',
    },
    partner_ticket_status_changed: {
      title: 'Service Ticket Updated',
      body: `Your service ticket ${data.ticketNumber} status changed to ${data.status}.`,
      actionUrl: data.ticketId ? `/partner/service-tickets/${data.ticketId}` : '/partner/service-tickets',
    },
  };

  return templates[type];
}

// Check if a notification type is enabled for a user
export function isNotificationEnabled(
  preferences: NotificationPreferences,
  type: NotificationType
): boolean {
  if (!preferences.pushEnabled) return false;

  const category = NOTIFICATION_CATEGORIES[type];

  switch (category) {
    case 'compliance':
      switch (type) {
        case 'insurance_expiring_30':
        case 'insurance_expiring_7':
        case 'insurance_expired':
          return preferences.compliance.insuranceExpiring;
        case 'license_expiring':
          return preferences.compliance.licenseExpiring;
        case 'w9_needed':
          return preferences.compliance.w9Reminders;
        case 'background_check_complete':
        case 'background_check_flagged':
          return preferences.compliance.backgroundCheckUpdates;
      }
      break;

    case 'jobs':
      switch (type) {
        case 'job_assigned':
          return preferences.jobs.newAssignments;
        case 'job_schedule_changed':
          return preferences.jobs.scheduleChanges;
        case 'job_starting_tomorrow':
          return preferences.jobs.dayBeforeReminders;
        case 'job_status_updated':
        case 'job_completed':
        case 'service_ticket_created':
          return preferences.jobs.statusUpdates;
      }
      break;

    case 'leads':
      switch (type) {
        case 'lead_assigned':
          return preferences.leads.hotLeadsOnly ? false : preferences.leads.newLeads;
        case 'lead_hot':
          return preferences.leads.newLeads || preferences.leads.hotLeadsOnly;
        case 'lead_not_contacted':
          return preferences.leads.inactivityReminders;
        case 'lead_replacement_ready':
          return preferences.leads.leadReplacements;
      }
      break;

    case 'financial':
      switch (type) {
        case 'payment_received':
          return preferences.financial.paymentsReceived;
        case 'commission_earned':
          return preferences.financial.commissionsEarned;
        case 'invoice_overdue':
          return preferences.financial.invoiceOverdue;
        case 'subscription_renewal':
        case 'subscription_payment_failed':
          return preferences.financial.subscriptionReminders;
      }
      break;

    case 'admin':
      switch (type) {
        case 'user_pending_approval':
          return preferences.admin.userApprovals;
        case 'new_applicant':
          return preferences.admin.newApplicants;
        case 'system_alert':
          return preferences.admin.systemAlerts;
        case 'partner_labor_request_new':
        case 'partner_labor_request_status_changed':
        case 'partner_ticket_new':
        case 'partner_ticket_status_changed':
          return preferences.admin.partnerRequests;
      }
      break;
  }

  return false;
}

// Check if currently in quiet hours
export function isInQuietHours(quietHours: QuietHours): boolean {
  if (!quietHours.enabled) return false;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [startHour, startMin] = quietHours.start.split(':').map(Number);
  const [endHour, endMin] = quietHours.end.split(':').map(Number);

  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  // Handle overnight quiet hours (e.g., 21:00 to 07:00)
  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }

  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}
