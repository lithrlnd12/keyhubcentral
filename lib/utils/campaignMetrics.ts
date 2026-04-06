import { Campaign, Lead } from '@/types/lead';
import { Job } from '@/types/job';

export interface CampaignMetrics {
  cpl: number;          // Cost per Lead
  cpa: number;          // Cost per Appointment (leads that reached 'contacted' or beyond)
  cps: number;          // Cost per Sale (leads that became 'converted')
  roi: number | null;   // (revenue - spend) / spend * 100
  totalLeads: number;
  appointmentsGenerated: number;
  salesGenerated: number;
  revenueAttributed: number;
}

// Statuses that count as an "appointment" (contacted or further along the funnel)
const APPOINTMENT_STATUSES = ['contacted', 'qualified', 'converted'];

/**
 * Get total revenue attributed to a campaign through its leads -> jobs chain.
 * Revenue uses job.commission.contractValue if available, otherwise
 * falls back to materialProjected + laborProjected.
 */
export function getRevenueFromJobs(leads: Lead[], jobs: Job[]): number {
  // Build a set of job IDs linked from converted leads
  const linkedJobIds = new Set<string>();
  for (const lead of leads) {
    if (lead.linkedJobId) {
      linkedJobIds.add(lead.linkedJobId);
    }
  }

  let revenue = 0;
  for (const job of jobs) {
    if (linkedJobIds.has(job.id)) {
      if (job.commission?.contractValue != null && job.commission.contractValue > 0) {
        revenue += job.commission.contractValue;
      } else {
        revenue += (job.costs?.materialProjected ?? 0) + (job.costs?.laborProjected ?? 0);
      }
    }
  }

  return revenue;
}

/**
 * Calculate cost per appointment.
 * Appointment = lead with status in ['contacted', 'qualified', 'converted'].
 * Returns 0 if no appointments.
 */
export function calculateCostPerAppointment(spend: number, leads: Lead[]): number {
  const appointments = leads.filter((l) => APPOINTMENT_STATUSES.includes(l.status)).length;
  if (appointments === 0) return 0;
  return spend / appointments;
}

/**
 * Calculate cost per sale.
 * Sale = lead with status 'converted' AND has a linkedJobId.
 * Returns 0 if no sales.
 */
export function calculateCostPerSale(spend: number, leads: Lead[]): number {
  const sales = leads.filter((l) => l.status === 'converted' && l.linkedJobId).length;
  if (sales === 0) return 0;
  return spend / sales;
}

/**
 * Calculate ROI as a percentage.
 * Formula: (revenue - spend) / spend * 100
 * Returns null if spend is 0 (cannot compute ROI with no investment).
 */
export function calculateCampaignROI(spend: number, revenue: number): number | null {
  if (spend === 0) return null;
  return ((revenue - spend) / spend) * 100;
}

/**
 * Calculate full metrics for a campaign given its leads and their linked jobs.
 */
export function calculateFullCampaignMetrics(
  campaign: Campaign,
  leads: Lead[],
  jobs: Job[]
): CampaignMetrics {
  const totalLeads = leads.length;
  const appointmentsGenerated = leads.filter((l) =>
    APPOINTMENT_STATUSES.includes(l.status)
  ).length;
  const salesGenerated = leads.filter(
    (l) => l.status === 'converted' && l.linkedJobId
  ).length;
  const revenueAttributed = getRevenueFromJobs(leads, jobs);

  const spend = campaign.spend;
  const cpl = totalLeads > 0 ? spend / totalLeads : 0;
  const cpa = appointmentsGenerated > 0 ? spend / appointmentsGenerated : 0;
  const cps = salesGenerated > 0 ? spend / salesGenerated : 0;
  const roi = calculateCampaignROI(spend, revenueAttributed);

  return {
    cpl,
    cpa,
    cps,
    roi,
    totalLeads,
    appointmentsGenerated,
    salesGenerated,
    revenueAttributed,
  };
}
