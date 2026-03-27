export interface ParsedLead {
  name: string;
  phone: string;
  email: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  source: string;
  quality: string;
  market: string;
  trade: string;
  notes: string;
}

export interface LeadImportParseResponse {
  leads: ParsedLead[];
  summary: string;
  sourceType: string;
  duplicateWarnings?: string[];
}
