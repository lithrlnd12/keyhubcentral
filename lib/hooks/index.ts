export { AuthProvider, useAuth } from './useAuth';
export { useContractors } from './useContractors';
export { useContractor, useContractorByUserId } from './useContractor';
export { useFileUpload } from './useFileUpload';
export { useAvailability } from './useAvailability';
export { useJobs } from './useJobs';
export { useJob } from './useJob';
export { useCommunications } from './useCommunications';
export { useServiceTickets } from './useServiceTickets';
export { useLeads } from './useLeads';
export { useLead } from './useLead';
export { useCampaigns } from './useCampaigns';
export { useCampaign } from './useCampaign';
export { useSubscriptions } from './useSubscriptions';
export { useSubscription } from './useSubscription';
export { useInvoices } from './useInvoices';
export { useInvoice } from './useInvoice';
export { useNotifications } from './useNotifications';
export { usePartners, usePartner } from './usePartners';
export { useLaborRequests, useLaborRequest } from './useLaborRequests';
export { usePartnerTickets, usePartnerTicket } from './usePartnerTickets';

// Inventory hooks
export {
  useInventoryItems,
  useInventoryItem,
  useInventoryMutations,
} from './useInventory';
export {
  useInventoryStock,
  useLowStockAlerts,
  useLowStockCount,
  useInventoryCounts,
  useSubmitCount,
} from './useInventoryStock';
export {
  useInventoryLocations,
  useInventoryLocation,
  useContractorLocation,
  useWarehouseLocations,
  useTruckLocations,
  useLocationMutations,
} from './useInventoryLocations';
export {
  useReceipts,
  useReceipt,
  useReceiptMutations,
  usePendingReceiptsCount,
  useReceiptsNeedingVerification,
} from './useReceipts';
export { useExpenses, useExpenseMutations } from './useExpenses';

// Contractor-specific hooks
export { useContractorInvoices } from './useContractorInvoices';
export { useContractorJobs } from './useContractorJobs';
export { useContractorExpenses } from './useContractorExpenses';
export { useContractorSchedule } from './useContractorSchedule';

// User hooks
export { useUsersByRole } from './useUsersByRole';

// Inbound calls hooks
export {
  useInboundCalls,
  useInboundCall,
  useNewCallsCount,
  useInboundCallMutations,
} from './useInboundCalls';

// Google Calendar hooks
export {
  useGoogleCalendarEvents,
  getEventsForDate,
} from './useGoogleCalendarEvents';
export type { GoogleCalendarEvent } from './useGoogleCalendarEvents';
