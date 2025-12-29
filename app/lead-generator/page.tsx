'use client';

import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Image from 'next/image';

export default function LeadGeneratorFullscreenPage() {
  const [captureUrl, setCaptureUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCaptureUrl(`${window.location.origin}/capture`);
    }
  }, []);

  return (
    <div className="min-h-screen bg-brand-black flex flex-col items-center justify-center p-8">
      {/* Logo and Company Name */}
      <div className="flex items-center gap-6 mb-8">
        <Image
          src="/icon-512x512.png"
          alt="Key Renovations"
          width={100}
          height={100}
          className="rounded-2xl"
        />
        <h1 className="text-5xl font-bold text-white">Key Renovations</h1>
      </div>

      {/* Call to Action */}
      <div className="text-center mb-10">
        <h2 className="text-6xl font-bold text-white mb-4">
          Scan to Get Started!
        </h2>
        <p className="text-3xl text-gray-400">
          Get a free quote for your next project
        </p>
      </div>

      {/* QR Code */}
      {captureUrl && (
        <div className="bg-white p-8 rounded-3xl shadow-2xl mb-10">
          <QRCodeSVG
            value={captureUrl}
            size={400}
            level="H"
            includeMargin={false}
          />
        </div>
      )}

      {/* URL Display */}
      <p className="text-2xl text-gray-500">
        Or visit: <span className="text-brand-gold font-semibold">{captureUrl.replace('https://', '')}</span>
      </p>
    </div>
  );
}
