'use client';

import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Users } from 'lucide-react';
import Image from 'next/image';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export default function LeadGeneratorFullscreenPage() {
  const [captureUrl, setCaptureUrl] = useState('');
  const [todayLeadsCount, setTodayLeadsCount] = useState(0);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCaptureUrl(`${window.location.origin}/capture`);
    }
  }, []);

  // Subscribe to today's event leads
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const q = query(
      collection(db, 'leads'),
      where('source', '==', 'event')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const todayLeads = snapshot.docs.filter((doc) => {
        const data = doc.data();
        const createdAt = data.createdAt?.toDate?.();
        if (!createdAt) return false;
        return createdAt >= today;
      });
      setTodayLeadsCount(todayLeads.length);
    });

    return () => unsubscribe();
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
      <p className="text-2xl text-gray-500 mb-8">
        Or visit: <span className="text-brand-gold font-semibold">{captureUrl.replace('https://', '')}</span>
      </p>

      {/* Live Counter */}
      <div className="flex items-center gap-4 bg-brand-gold/10 border border-brand-gold/30 rounded-full px-8 py-4">
        <Users className="w-8 h-8 text-brand-gold" />
        <span className="text-2xl text-white font-semibold">
          {todayLeadsCount} leads today
        </span>
        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
      </div>
    </div>
  );
}
