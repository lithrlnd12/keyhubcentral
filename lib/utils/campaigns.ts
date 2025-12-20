import { Campaign, CampaignPlatform } from '@/types/lead';

// Platform display labels
export const CAMPAIGN_PLATFORM_LABELS: Record<CampaignPlatform, string> = {
  google_ads: 'Google Ads',
  meta: 'Meta (Facebook/Instagram)',
  tiktok: 'TikTok',
  event: 'Event',
  other: 'Other',
};

// Platform colors
export const CAMPAIGN_PLATFORM_COLORS: Record<CampaignPlatform, { bg: string; text: string }> = {
  google_ads: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  meta: { bg: 'bg-indigo-500/20', text: 'text-indigo-400' },
  tiktok: { bg: 'bg-pink-500/20', text: 'text-pink-400' },
  event: { bg: 'bg-green-500/20', text: 'text-green-400' },
  other: { bg: 'bg-gray-500/20', text: 'text-gray-400' },
};

// Format platform for display
export function formatCampaignPlatform(platform: CampaignPlatform): string {
  return CAMPAIGN_PLATFORM_LABELS[platform] || platform;
}

// Calculate CPL
export function calculateCPL(campaign: Campaign): number {
  if (campaign.leadsGenerated === 0) return 0;
  return campaign.spend / campaign.leadsGenerated;
}

// Check if campaign is active
export function isCampaignActive(campaign: Campaign): boolean {
  const now = new Date();
  const startDate = campaign.startDate.toDate();

  if (now < startDate) return false;

  if (campaign.endDate) {
    const endDate = campaign.endDate.toDate();
    return now <= endDate;
  }

  return true;
}

// Get campaign status label
export function getCampaignStatus(campaign: Campaign): 'upcoming' | 'active' | 'ended' {
  const now = new Date();
  const startDate = campaign.startDate.toDate();

  if (now < startDate) return 'upcoming';

  if (campaign.endDate) {
    const endDate = campaign.endDate.toDate();
    if (now > endDate) return 'ended';
  }

  return 'active';
}

// Campaign status colors
export const CAMPAIGN_STATUS_COLORS = {
  upcoming: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  active: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
  ended: { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/30' },
};

// Get campaign summary stats
export function getCampaignSummary(campaigns: Campaign[]): {
  total: number;
  active: number;
  totalSpend: number;
  totalLeads: number;
  avgCPL: number;
} {
  const active = campaigns.filter(isCampaignActive).length;
  const totalSpend = campaigns.reduce((sum, c) => sum + c.spend, 0);
  const totalLeads = campaigns.reduce((sum, c) => sum + c.leadsGenerated, 0);
  const avgCPL = totalLeads > 0 ? totalSpend / totalLeads : 0;

  return {
    total: campaigns.length,
    active,
    totalSpend,
    totalLeads,
    avgCPL,
  };
}
