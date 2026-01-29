// Chat context types for AI assistant

export interface ChatContext {
  user: {
    name: string;
    role: string;
  };
  timestamp: string; // Current date/time ISO string

  // Role-dependent sections
  jobs?: {
    total: number;
    byStatus: Record<string, number>;
    revenueThisMonth: number;
    revenueMTD: number;
    recentJobs: Array<{
      jobNumber: string;
      customer: string;
      status: string;
      value: number;
      type: string;
    }>;
  };

  leads?: {
    total: number;
    byStatus: Record<string, number>;
    thisMonth: number;
    conversionRate: number;
    recentLeads: Array<{
      name: string;
      source: string;
      status: string;
      quality: string;
    }>;
  };

  invoices?: {
    outstanding: number;
    overdueCount: number;
    overdueAmount: number;
    paidThisMonth: number;
    recentInvoices: Array<{
      number: string;
      amount: number;
      status: string;
      dueDate: string;
    }>;
  };

  contractors?: {
    active: number;
    pending: number;
    byTrade: Record<string, number>;
  };

  campaigns?: {
    active: number;
    totalSpend: number;
    leadsGenerated: number;
    avgCPL: number;
  };

  commissions?: {
    pendingAmount: number;
    paidThisMonth: number;
    pendingCount: number;
  };

  // For contractor role
  myJobs?: {
    assigned: number;
    inProgress: number;
    completedThisMonth: number;
    upcomingJobs: Array<{
      jobNumber: string;
      customer: string;
      scheduledDate: string | null;
      type: string;
    }>;
  };

  myInvoices?: {
    pending: number;
    pendingAmount: number;
    paidThisMonth: number;
  };
}
