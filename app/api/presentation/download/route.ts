import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseAuth, hasRole } from '@/lib/auth/verifyRequest';
import { ReportConfig, ReportResult } from '@/types/report';
import type { PresentationSlideContent } from '@/app/api/ai/presentation/route';
import { buildPresentationPptx } from '@/lib/utils/pptxExport';

// ============================================================
// POST /api/presentation/build
// Server-side pptx generation — runs pptxgenjs in Node.js
// ============================================================

export async function POST(request: NextRequest) {
  const auth = await verifyFirebaseAuth(request);
  if (!auth.authenticated || !hasRole(auth.role, ['owner', 'admin', 'pm', 'sales_rep'])) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { config: ReportConfig; result: ReportResult; slideContent: PresentationSlideContent };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { config, result, slideContent } = body;
  if (!config || !result || !slideContent) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    const blob = await buildPresentationPptx(config, result, slideContent);
    const buffer = Buffer.from(await blob.arrayBuffer());
    const filename = `${(config.name || 'presentation').replace(/[^a-z0-9]/gi, '_')}.pptx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (err) {
    console.error('PPTX build failed:', err);
    return NextResponse.json({ error: 'Failed to build presentation' }, { status: 500 });
  }
}
