'use client';

// PDF.js is loaded dynamically to avoid SSR issues
let pdfjsLib: typeof import('pdfjs-dist') | null = null;

async function getPdfJs() {
  if (typeof window === 'undefined') {
    throw new Error('PDF parsing is only available in the browser');
  }

  if (!pdfjsLib) {
    pdfjsLib = await import('pdfjs-dist');
    // Use jsDelivr CDN which has all npm versions
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  }

  return pdfjsLib;
}

export interface ExtractedText {
  fullText: string;
  pages: string[];
}

/**
 * Extract text content from a PDF file
 * Runs entirely client-side - no data sent to external services
 */
export async function extractTextFromPDF(file: File): Promise<ExtractedText> {
  const pdfjs = await getPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

  const pages: string[] = [];
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();

    const pageText = textContent.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ');

    pages.push(pageText);
    fullText += pageText + '\n';
  }

  return { fullText, pages };
}

export interface W9ParsedData {
  name: string | null;
  businessName: string | null;
  taxClassification: string | null;
  address: {
    street: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
  };
  // Note: We intentionally do NOT extract TIN/SSN/EIN for privacy
}

/**
 * Parse W-9 form text to extract basic business information
 * Does NOT extract SSN/EIN - only non-sensitive data
 */
export function parseW9(text: string): W9ParsedData {
  const result: W9ParsedData = {
    name: null,
    businessName: null,
    taxClassification: null,
    address: {
      street: null,
      city: null,
      state: null,
      zip: null,
    },
  };

  // Clean up text
  const cleanText = text.replace(/\s+/g, ' ').trim();

  // W-9 form patterns
  // Line 1: Name (as shown on your income tax return)
  const nameMatch = cleanText.match(
    /Name\s*\(as shown on your income tax return\)[.\s]*Name is required[.\s]*([A-Za-z\s\-'.,]+?)(?=Business name|2\s|$)/i
  );
  if (nameMatch) {
    result.name = nameMatch[1].trim();
  }

  // Line 2: Business name/disregarded entity name
  const businessMatch = cleanText.match(
    /Business name\/disregarded entity name[,.\s]*if different from above[.\s]*([A-Za-z0-9\s\-'.,&]+?)(?=Check appropriate box|3\s|$)/i
  );
  if (businessMatch) {
    const biz = businessMatch[1].trim();
    if (biz && biz.length > 2) {
      result.businessName = biz;
    }
  }

  // Tax classification
  if (/Individual\/sole proprietor/i.test(cleanText)) {
    result.taxClassification = 'Individual/Sole Proprietor';
  } else if (/C Corporation/i.test(cleanText) && !/S Corporation/i.test(cleanText)) {
    result.taxClassification = 'C Corporation';
  } else if (/S Corporation/i.test(cleanText)) {
    result.taxClassification = 'S Corporation';
  } else if (/Partnership/i.test(cleanText)) {
    result.taxClassification = 'Partnership';
  } else if (/Limited liability company/i.test(cleanText) || /LLC/i.test(cleanText)) {
    result.taxClassification = 'LLC';
  }

  // Address patterns - look for common address formats
  // Street address
  const streetMatch = cleanText.match(
    /Address\s*\(number,\s*street,\s*and\s*apt\.?\s*or\s*suite\s*no\.?\)[.\s]*(?:See instructions\.?)?[.\s]*(\d+[A-Za-z0-9\s\-.,#]+?)(?=City|Requester|$)/i
  );
  if (streetMatch) {
    result.address.street = streetMatch[1].trim().replace(/\s+/g, ' ');
  }

  // City, State, ZIP
  const cityStateZipMatch = cleanText.match(
    /City\s*(?:or\s*town)?[,.\s]*state[,.\s]*(?:and)?[.\s]*ZIP\s*code[.\s]*([A-Za-z\s\-']+)[,.\s]*([A-Z]{2})[,.\s]*(\d{5}(?:-\d{4})?)/i
  );
  if (cityStateZipMatch) {
    result.address.city = cityStateZipMatch[1].trim();
    result.address.state = cityStateZipMatch[2].trim();
    result.address.zip = cityStateZipMatch[3].trim();
  }

  // Alternative: Try to find address in a more general format
  if (!result.address.street) {
    const generalAddressMatch = cleanText.match(
      /(\d+\s+[A-Za-z0-9\s\-.,#]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Way|Boulevard|Blvd|Court|Ct)[.,]?\s*(?:#?\s*\d+)?)/i
    );
    if (generalAddressMatch) {
      result.address.street = generalAddressMatch[1].trim();
    }
  }

  // Alternative city/state/zip pattern
  if (!result.address.city) {
    const altCityStateZip = cleanText.match(
      /([A-Za-z\s\-']+),?\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)/
    );
    if (altCityStateZip) {
      result.address.city = altCityStateZip[1].trim();
      result.address.state = altCityStateZip[2].trim();
      result.address.zip = altCityStateZip[3].trim();
    }
  }

  return result;
}

export interface InsuranceParsedData {
  insuredName: string | null;
  insuredAddress: {
    street: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
  };
  carrier: string | null;
  policyNumber: string | null;
  effectiveDate: string | null;
  expirationDate: string | null;
  generalLiabilityLimit: string | null;
  autoLiabilityLimit: string | null;
  workersCompLimit: string | null;
}

/**
 * Parse Certificate of Insurance (COI) to extract policy information
 */
export function parseInsuranceCertificate(text: string): InsuranceParsedData {
  const result: InsuranceParsedData = {
    insuredName: null,
    insuredAddress: {
      street: null,
      city: null,
      state: null,
      zip: null,
    },
    carrier: null,
    policyNumber: null,
    effectiveDate: null,
    expirationDate: null,
    generalLiabilityLimit: null,
    autoLiabilityLimit: null,
    workersCompLimit: null,
  };

  const cleanText = text.replace(/\s+/g, ' ').trim();

  // Insured name - often near "INSURED" label
  const insuredMatch = cleanText.match(
    /INSURED[:\s]*([A-Za-z0-9\s\-'.,&]+?)(?=\d|ADDRESS|PRODUCER|INSURER|$)/i
  );
  if (insuredMatch) {
    result.insuredName = insuredMatch[1].trim();
  }

  // Insurance carrier/company
  const carrierPatterns = [
    /INSURER\s*[A-Z]?[:\s]*([A-Za-z\s\-'.,&]+Insurance[A-Za-z\s\-'.,&]*)/i,
    /(?:Insurance|Ins)\s*(?:Company|Co)[:\s]*([A-Za-z\s\-'.,&]+)/i,
    /([A-Za-z\s\-'.,&]+(?:Insurance|Ins)(?:\s*(?:Company|Co))?)/i,
  ];

  for (const pattern of carrierPatterns) {
    const match = cleanText.match(pattern);
    if (match && match[1].trim().length > 3) {
      result.carrier = match[1].trim();
      break;
    }
  }

  // Policy number patterns
  const policyPatterns = [
    /POLICY\s*(?:NUMBER|NO|#)[:\s]*([A-Z0-9\-]+)/i,
    /POL(?:ICY)?\s*#?[:\s]*([A-Z0-9\-]+)/i,
  ];

  for (const pattern of policyPatterns) {
    const match = cleanText.match(pattern);
    if (match) {
      result.policyNumber = match[1].trim();
      break;
    }
  }

  // Date patterns (MM/DD/YYYY or MM-DD-YYYY)
  const datePattern = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/g;
  const dates = cleanText.match(datePattern);

  if (dates && dates.length >= 2) {
    // Usually effective date comes before expiration
    result.effectiveDate = dates[0];
    result.expirationDate = dates[1];
  }

  // Liability limits - look for dollar amounts
  const liabilityMatch = cleanText.match(
    /GENERAL\s*LIABILITY[^$]*\$\s*([\d,]+)/i
  );
  if (liabilityMatch) {
    result.generalLiabilityLimit = '$' + liabilityMatch[1];
  }

  const autoMatch = cleanText.match(
    /AUTO(?:MOBILE)?\s*LIABILITY[^$]*\$\s*([\d,]+)/i
  );
  if (autoMatch) {
    result.autoLiabilityLimit = '$' + autoMatch[1];
  }

  const wcMatch = cleanText.match(
    /WORKERS?\s*COMP(?:ENSATION)?[^$]*\$\s*([\d,]+)/i
  );
  if (wcMatch) {
    result.workersCompLimit = '$' + wcMatch[1];
  }

  // Address extraction
  const addressMatch = cleanText.match(
    /(\d+\s+[A-Za-z0-9\s\-.,#]+)[,.\s]+([A-Za-z\s\-']+),?\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)/
  );
  if (addressMatch) {
    result.insuredAddress.street = addressMatch[1].trim();
    result.insuredAddress.city = addressMatch[2].trim();
    result.insuredAddress.state = addressMatch[3].trim();
    result.insuredAddress.zip = addressMatch[4].trim();
  }

  return result;
}
