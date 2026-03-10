// Tool Registry — imports all tool modules to trigger their registerTool() side effects.
// Import this file once (e.g., in the webhook handler) to make all tools available.

// Utility
import './getCurrentDateTime';

// Phase 1: Warm Transfer
import './createLeadFromCall';
import './lookupAvailableRep';
import './requestTransfer';

// Phase 2: Smart Scheduling
import './checkAvailability';
import './bookAppointment';

// Phase 3: AI Dispatch
import './acceptJob';
import './declineJob';

// Phase 4: Quote Follow-Up
import './getJobDetails';

// Phase 5: Voice Job Updates
import './identifyCaller';
import './lookupJob';
import './updateJobStatus';
import './addJobNote';
import './flagScopeChange';

// Phase 6: Completion Verification
import './recordSatisfaction';
import './createServiceTicketFromCall';
import './confirmCompletion';

// Phase 7: Compliance Reminders
import './checkDocumentStatus';
import './sendUploadLink';

// Phase 8: Multi-Entity Triage
import './routeToEntity';

// Phase 9: Partner Intake
import './lookupPartnerInfo';
import './createPartnerServiceTicket';
