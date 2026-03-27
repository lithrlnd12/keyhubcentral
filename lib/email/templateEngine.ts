import { TemplateVariable } from '@/types/emailTemplate';
import { tenant } from '@/lib/config/tenant';

/**
 * Returns all available template variables grouped by category.
 */
export function getAvailableVariables(): TemplateVariable[] {
  return [
    // Company variables
    { key: 'company.name', label: 'Company Name', category: 'Company' },
    { key: 'company.phone', label: 'Company Phone', category: 'Company' },
    { key: 'company.email', label: 'Company Email', category: 'Company' },
    { key: 'company.tagline', label: 'Company Tagline', category: 'Company' },

    // Customer variables
    { key: 'customer.name', label: 'Customer Name', category: 'Customer' },
    { key: 'customer.email', label: 'Customer Email', category: 'Customer' },
    { key: 'customer.phone', label: 'Customer Phone', category: 'Customer' },
    { key: 'customer.city', label: 'Customer City', category: 'Customer' },

    // Job variables
    { key: 'job.number', label: 'Job Number', category: 'Job' },
    { key: 'job.status', label: 'Job Status', category: 'Job' },
    { key: 'job.type', label: 'Job Type', category: 'Job' },
    { key: 'job.address', label: 'Job Address', category: 'Job' },

    // Lead variables
    { key: 'lead.source', label: 'Lead Source', category: 'Lead' },
    { key: 'lead.quality', label: 'Lead Quality', category: 'Lead' },
    { key: 'lead.market', label: 'Lead Market', category: 'Lead' },

    // Installer variables
    { key: 'installer.name', label: 'Installer Name', category: 'Installer' },
    { key: 'installer.phone', label: 'Installer Phone', category: 'Installer' },
    { key: 'installer.rating', label: 'Installer Rating', category: 'Installer' },
  ];
}

/**
 * Escape HTML special characters to prevent XSS in interpolated values.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Resolve a dotted path (e.g., "customer.name") from a nested context object.
 */
function resolvePath(obj: Record<string, unknown>, path: string): string {
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return '';
    }
    current = (current as Record<string, unknown>)[part];
  }

  if (current === null || current === undefined) {
    return '';
  }

  return String(current);
}

/**
 * Replace all {{path.to.value}} placeholders with actual values from a nested context object.
 * Interpolated values are HTML-escaped to prevent XSS.
 * Unmatched variables are replaced with an empty string.
 */
export function renderTemplate(bodyHtml: string, context: Record<string, unknown>): string {
  return bodyHtml.replace(/\{\{([^}]+)\}\}/g, (_match, path: string) => {
    const trimmedPath = path.trim();
    const value = resolvePath(context, trimmedPath);
    return escapeHtml(value);
  });
}

/**
 * Wraps email content in a branded HTML email layout using tenant config.
 * Uses table-based layout for maximum email client compatibility.
 */
export function wrapInBrandedLayout(bodyHtml: string): string {
  const { colors, appName, phone, supportEmail, serviceArea } = tenant;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(appName)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, Helvetica, sans-serif; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f4f4;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; width: 100%;">
          <!-- Header -->
          <tr>
            <td style="background-color: ${colors.background}; padding: 30px 40px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: ${colors.primary}; margin: 0; font-size: 28px; font-weight: bold;">${escapeHtml(appName)}</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background-color: #ffffff; padding: 30px 40px; border-left: 1px solid #e0e0e0; border-right: 1px solid #e0e0e0;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="color: #333333; font-size: 16px; line-height: 1.6;">
                    ${bodyHtml}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: ${colors.background}; padding: 20px 40px; text-align: center; border-radius: 0 0 8px 8px;">
              <p style="color: #999999; margin: 0 0 8px 0; font-size: 14px;">
                ${escapeHtml(appName)}
              </p>
              <p style="color: #777777; margin: 0 0 4px 0; font-size: 12px;">
                ${escapeHtml(phone)} &bull; ${escapeHtml(supportEmail)}
              </p>
              <p style="color: #777777; margin: 0; font-size: 12px;">
                ${escapeHtml(serviceArea)}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Returns sample data for template preview rendering.
 */
export function getSampleContext(): Record<string, unknown> {
  return {
    company: {
      name: tenant.appName,
      phone: tenant.phone,
      email: tenant.supportEmail,
      tagline: tenant.tagline,
    },
    customer: {
      name: 'Jane Smith',
      email: 'jane@example.com',
      phone: '(555) 123-4567',
      city: 'Oklahoma City',
    },
    job: {
      number: 'JOB-2026-001',
      status: 'complete',
      type: 'bathroom',
      address: '123 Main St, Oklahoma City, OK 73101',
    },
    lead: {
      source: 'google_ads',
      quality: 'hot',
      market: 'Oklahoma City',
    },
    installer: {
      name: 'Mike Johnson',
      phone: '(555) 987-6543',
      rating: '4.8',
    },
  };
}
