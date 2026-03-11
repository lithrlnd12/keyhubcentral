import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';

// POST /api/tenants/notify — send tenant-branded notification when job status changes
// Called by Cloud Functions or admin actions when a job status updates
export async function POST(request: NextRequest) {
  try {
    const { jobId, newStatus, tenantId } = await request.json();

    if (!jobId || !newStatus) {
      return NextResponse.json({ error: 'jobId and newStatus required' }, { status: 400 });
    }

    const db = getAdminDb();

    // Get job data
    const jobSnap = await db.collection('jobs').doc(jobId).get();
    if (!jobSnap.exists) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    const job = jobSnap.data()!;
    const customerEmail = job.customer?.email;
    const customerName = job.customer?.name || 'Customer';

    if (!customerEmail) {
      return NextResponse.json({ error: 'No customer email on job' }, { status: 400 });
    }

    // Get tenant branding (if tenantId provided)
    let tenant = null;
    if (tenantId) {
      const tenantSnap = await db.collection('tenants').doc(tenantId).get();
      if (tenantSnap.exists) {
        tenant = tenantSnap.data();
      }
    }

    // Status labels for customer-friendly messaging
    const statusLabels: Record<string, { label: string; message: string }> = {
      sold: { label: 'Project Confirmed', message: 'Your project has been confirmed and is moving forward.' },
      front_end_hold: { label: 'Preparing', message: 'We\'re preparing materials and scheduling for your project.' },
      production: { label: 'In Production', message: 'Materials are being prepared for your project.' },
      scheduled: { label: 'Scheduled', message: 'Your project has been scheduled. Check your portal for dates.' },
      started: { label: 'Work Started', message: 'Work has begun on your project!' },
      complete: { label: 'Project Complete', message: 'Your project is complete! Check your portal for photos and details.' },
      paid_in_full: { label: 'Finalized', message: 'Your project is fully complete and finalized. Thank you!' },
    };

    const statusInfo = statusLabels[newStatus] || { label: newStatus, message: `Your project status has been updated to: ${newStatus}` };

    // Build branded notification
    const companyName = tenant?.companyName || 'KeyHub Central';
    const primaryColor = tenant?.branding?.primaryColor || '#D4A84B';
    const portalSlug = tenant?.slug;
    const portalUrl = portalSlug ? `${process.env.NEXT_PUBLIC_APP_URL || 'https://keyhubcentral.com'}/p/${portalSlug}/dashboard` : null;

    // Store notification in Firestore for in-app display
    await db.collection('notifications').add({
      type: 'job_status_update',
      recipientEmail: customerEmail,
      recipientName: customerName,
      title: `${statusInfo.label} — ${job.type?.charAt(0).toUpperCase() + job.type?.slice(1)} Project #${job.jobNumber}`,
      message: statusInfo.message,
      jobId,
      jobNumber: job.jobNumber,
      tenantId: tenantId || null,
      companyName,
      portalUrl,
      read: false,
      createdAt: new Date(),
    });

    // Build email HTML with tenant branding
    const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <div style="background-color:${primaryColor};padding:24px;border-radius:12px 12px 0 0;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:20px;">${companyName}</h1>
    </div>
    <div style="background-color:#ffffff;padding:32px;border-radius:0 0 12px 12px;">
      <p style="color:#333;font-size:16px;margin-top:0;">Hi ${customerName},</p>
      <div style="background-color:#f8f9fa;border-left:4px solid ${primaryColor};padding:16px;border-radius:0 8px 8px 0;margin:20px 0;">
        <p style="margin:0;font-size:18px;font-weight:600;color:#333;">${statusInfo.label}</p>
        <p style="margin:8px 0 0;color:#666;font-size:14px;">${statusInfo.message}</p>
      </div>
      <p style="color:#666;font-size:14px;">
        <strong>Project:</strong> ${job.type?.charAt(0).toUpperCase() + job.type?.slice(1)} #${job.jobNumber}
      </p>
      ${portalUrl ? `
      <div style="text-align:center;margin-top:24px;">
        <a href="${portalUrl}" style="display:inline-block;background-color:${primaryColor};color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:600;font-size:14px;">
          View in Portal
        </a>
      </div>
      ` : ''}
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
      <p style="color:#999;font-size:12px;text-align:center;margin-bottom:0;">
        ${tenant?.contact?.phone ? `Questions? Call us at ${tenant.contact.phone}` : `Sent by ${companyName}`}
      </p>
    </div>
  </div>
</body>
</html>`;

    // Store email for sending (picked up by email worker/function)
    await db.collection('emailQueue').add({
      to: customerEmail,
      subject: `${statusInfo.label} — Your ${job.type} project with ${companyName}`,
      html: emailHtml,
      tenantId: tenantId || null,
      jobId,
      type: 'job_status_update',
      status: 'pending',
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      notification: 'queued',
      email: 'queued',
      recipient: customerEmail,
    });
  } catch (error: unknown) {
    console.error('Error sending notification:', error);
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    );
  }
}
