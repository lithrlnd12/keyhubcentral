'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { tenant } from '@/lib/config/tenant';

interface SessionInfo {
  contractId: string;
  jobId: string;
  recipientName: string;
  status: string;
}

type PageState = 'loading' | 'ready' | 'signing' | 'success' | 'error';

export default function RemoteSignPage({ params }: { params: { token: string } }) {
  const { token } = params;
  const [pageState, setPageState] = useState<PageState>('loading');
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Form state
  const [consentChecked, setConsentChecked] = useState(false);
  const [fullName, setFullName] = useState('');
  const [hasSignature, setHasSignature] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Canvas refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  // Verify token on mount
  useEffect(() => {
    async function verify() {
      try {
        const res = await fetch(`/api/contracts/remote-sign/verify?token=${token}`);
        if (!res.ok) {
          const data = await res.json();
          setErrorMessage(data.error || 'This signing link is invalid or has expired.');
          setPageState('error');
          return;
        }
        const data: SessionInfo = await res.json();
        setSessionInfo(data);
        setPageState('ready');
      } catch {
        setErrorMessage('Unable to verify signing link. Please try again later.');
        setPageState('error');
      }
    }
    verify();
  }, [token]);

  // Canvas drawing helpers
  const getCanvasPoint = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      if ('touches' in e) {
        const touch = e.touches[0];
        return {
          x: (touch.clientX - rect.left) * scaleX,
          y: (touch.clientY - rect.top) * scaleY,
        };
      }
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    },
    []
  );

  const startDrawing = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      isDrawingRef.current = true;
      const point = getCanvasPoint(e);
      if (point) {
        lastPointRef.current = point;
      }
    },
    [getCanvasPoint]
  );

  const draw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      if (!isDrawingRef.current) return;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;

      const point = getCanvasPoint(e);
      if (!point || !lastPointRef.current) return;

      ctx.beginPath();
      ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
      ctx.lineTo(point.x, point.y);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();

      lastPointRef.current = point;
      if (!hasSignature) setHasSignature(true);
    },
    [getCanvasPoint, hasSignature]
  );

  const stopDrawing = useCallback(() => {
    isDrawingRef.current = false;
    lastPointRef.current = null;
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  }, []);

  // Submit signature
  const handleSubmit = async () => {
    if (!canvasRef.current || submitting) return;
    setSubmitting(true);

    try {
      const signatureDataUrl = canvasRef.current.toDataURL('image/png');
      const res = await fetch('/api/contracts/remote-sign/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          signatureDataUrl,
          consentTimestamp: new Date().toISOString(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit signature');
      }

      setPageState('success');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to submit signature');
      setPageState('error');
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = consentChecked && hasSignature && fullName.trim().length > 0 && !submitting;

  // --- RENDER ---

  // Loading state
  if (pageState === 'loading') {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.header}>
            <h1 style={{ ...styles.headerTitle, color: tenant.colors.primary }}>
              {tenant.appName}
            </h1>
          </div>
          <div style={styles.card}>
            <div style={styles.loadingContainer}>
              <div style={styles.spinner} />
              <p style={styles.loadingText}>Verifying signing link...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (pageState === 'error') {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.header}>
            <h1 style={{ ...styles.headerTitle, color: tenant.colors.primary }}>
              {tenant.appName}
            </h1>
          </div>
          <div style={styles.card}>
            <div style={styles.errorIcon}>!</div>
            <h2 style={styles.cardTitle}>Unable to Sign</h2>
            <p style={styles.errorText}>{errorMessage}</p>
            <p style={styles.helpText}>
              If you believe this is an error, please contact the sender to request a new signing link.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (pageState === 'success') {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.header}>
            <h1 style={{ ...styles.headerTitle, color: tenant.colors.primary }}>
              {tenant.appName}
            </h1>
          </div>
          <div style={styles.card}>
            <div style={styles.successIcon}>&#10003;</div>
            <h2 style={styles.cardTitle}>Contract Signed Successfully</h2>
            <p style={styles.successText}>
              Thank you, {sessionInfo?.recipientName}. Your signature has been recorded.
              You may close this page.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Ready / Signing state
  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <h1 style={{ ...styles.headerTitle, color: tenant.colors.primary }}>
            {tenant.appName}
          </h1>
        </div>

        {/* Contract Summary */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Contract Signing</h2>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Recipient:</span>
            <span style={styles.infoValue}>{sessionInfo?.recipientName}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Contract Ref:</span>
            <span style={styles.infoValue}>{sessionInfo?.contractId}</span>
          </div>
        </div>

        {/* Electronic Consent */}
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Electronic Signature Consent</h3>
          <div style={styles.legalBox}>
            <p style={styles.legalText}>
              By checking the box below, you agree to sign this document electronically.
              Electronic signatures are legally binding under the Electronic Signatures in
              Global and National Commerce Act (ESIGN Act) and the Uniform Electronic
              Transactions Act (UETA).
            </p>
          </div>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={consentChecked}
              onChange={(e) => setConsentChecked(e.target.checked)}
              style={styles.checkbox}
            />
            <span>
              I agree to sign this document electronically and understand that my electronic
              signature will be legally binding.
            </span>
          </label>
        </div>

        {/* Signature Pad */}
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Draw Your Signature</h3>
          <p style={styles.instructionText}>
            Use your finger or mouse to sign in the box below.
          </p>
          <div style={styles.canvasWrapper}>
            <canvas
              ref={canvasRef}
              width={600}
              height={200}
              style={styles.canvas}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
            <div style={styles.signatureLine} />
          </div>
          <button
            type="button"
            onClick={clearCanvas}
            style={styles.clearButton}
          >
            Clear Signature
          </button>
        </div>

        {/* Typed Name Confirmation */}
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Type Your Full Name</h3>
          <p style={styles.instructionText}>
            Please type your full legal name to confirm your signature.
          </p>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Full Legal Name"
            style={styles.textInput}
          />
        </div>

        {/* Submit */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          style={{
            ...styles.submitButton,
            backgroundColor: canSubmit ? tenant.colors.primary : '#ccc',
            cursor: canSubmit ? 'pointer' : 'not-allowed',
          }}
        >
          {submitting ? 'Submitting...' : 'Sign Contract'}
        </button>

        {/* Footer */}
        <div style={styles.footer}>
          <p style={styles.footerText}>
            {tenant.appName} &middot; {tenant.serviceArea}
          </p>
        </div>
      </div>
    </div>
  );
}

// Inline styles for a standalone, light-themed, mobile-optimized page
const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    fontFamily: 'Arial, sans-serif',
    color: '#333',
    padding: '16px',
  },
  container: {
    maxWidth: '600px',
    margin: '0 auto',
  },
  header: {
    textAlign: 'center' as const,
    padding: '24px 0 16px',
  },
  headerTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    margin: 0,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  cardTitle: {
    fontSize: '20px',
    fontWeight: '600',
    marginTop: 0,
    marginBottom: '16px',
    color: '#111',
  },
  sectionTitle: {
    fontSize: '17px',
    fontWeight: '600',
    marginTop: 0,
    marginBottom: '12px',
    color: '#111',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid #eee',
  },
  infoLabel: {
    fontWeight: '600',
    color: '#666',
    fontSize: '14px',
  },
  infoValue: {
    color: '#333',
    fontSize: '14px',
  },
  legalBox: {
    backgroundColor: '#f0f4ff',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '16px',
    borderLeft: '4px solid #4a7cf7',
  },
  legalText: {
    fontSize: '13px',
    color: '#555',
    margin: 0,
    lineHeight: '1.5',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    cursor: 'pointer',
    fontSize: '14px',
    lineHeight: '1.5',
    color: '#333',
  },
  checkbox: {
    width: '22px',
    height: '22px',
    marginTop: '2px',
    flexShrink: 0,
    accentColor: '#D4A84B',
  },
  instructionText: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '12px',
    marginTop: 0,
  },
  canvasWrapper: {
    position: 'relative' as const,
    border: '2px solid #ddd',
    borderRadius: '8px',
    overflow: 'hidden',
    backgroundColor: '#fff',
    touchAction: 'none',
  },
  canvas: {
    display: 'block',
    width: '100%',
    height: 'auto',
    cursor: 'crosshair',
    touchAction: 'none',
  },
  signatureLine: {
    position: 'absolute' as const,
    bottom: '40px',
    left: '20px',
    right: '20px',
    height: '1px',
    backgroundColor: '#ccc',
    pointerEvents: 'none' as const,
  },
  clearButton: {
    marginTop: '8px',
    padding: '8px 16px',
    fontSize: '14px',
    color: '#666',
    backgroundColor: '#f0f0f0',
    border: '1px solid #ddd',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  textInput: {
    width: '100%',
    padding: '14px 16px',
    fontSize: '16px',
    border: '2px solid #ddd',
    borderRadius: '8px',
    boxSizing: 'border-box' as const,
    outline: 'none',
  },
  submitButton: {
    width: '100%',
    padding: '18px',
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#1A1A1A',
    border: 'none',
    borderRadius: '12px',
    marginBottom: '16px',
  },
  footer: {
    textAlign: 'center' as const,
    padding: '16px 0 32px',
  },
  footerText: {
    fontSize: '13px',
    color: '#999',
    margin: 0,
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    padding: '40px 0',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #eee',
    borderTop: '4px solid #D4A84B',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    marginTop: '16px',
    color: '#666',
    fontSize: '15px',
  },
  errorIcon: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '32px',
    fontWeight: 'bold',
    margin: '0 auto 16px',
  },
  errorText: {
    color: '#dc2626',
    fontSize: '15px',
    textAlign: 'center' as const,
    marginBottom: '8px',
  },
  helpText: {
    color: '#888',
    fontSize: '14px',
    textAlign: 'center' as const,
  },
  successIcon: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    backgroundColor: '#dcfce7',
    color: '#16a34a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '32px',
    fontWeight: 'bold',
    margin: '0 auto 16px',
  },
  successText: {
    color: '#333',
    fontSize: '15px',
    textAlign: 'center' as const,
  },
};
