'use client';

import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Maximize2, Minimize2, Users, RefreshCw } from 'lucide-react';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useLeads } from '@/lib/hooks';

export default function LeadGeneratorPage() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [captureUrl, setCaptureUrl] = useState('');
  const { leads, loading } = useLeads({
    realtime: true,
    initialFilters: { source: 'event' }
  });

  // Get today's leads count
  const todayLeads = leads.filter((lead) => {
    const createdAt = lead.createdAt?.toDate?.();
    if (!createdAt) return false;
    const today = new Date();
    return (
      createdAt.getDate() === today.getDate() &&
      createdAt.getMonth() === today.getMonth() &&
      createdAt.getFullYear() === today.getFullYear()
    );
  });

  useEffect(() => {
    // Set the capture URL based on current origin
    if (typeof window !== 'undefined') {
      setCaptureUrl(`${window.location.origin}/capture`);
    }
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-brand-black' : ''}`}>
      <div className={`${isFullscreen ? 'h-full flex flex-col items-center justify-center p-8' : 'space-y-6'}`}>
        {/* Header - hidden in fullscreen */}
        {!isFullscreen && (
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Lead Generator</h1>
              <p className="text-gray-400 mt-1">
                Display this screen at events for attendees to scan and submit their info
              </p>
            </div>
            <Button onClick={toggleFullscreen} variant="outline">
              <Maximize2 className="w-4 h-4 mr-2" />
              Fullscreen Mode
            </Button>
          </div>
        )}

        {/* Main Display */}
        <div className={`${isFullscreen ? 'text-center' : ''}`}>
          <Card className={`${isFullscreen ? 'bg-transparent border-0 shadow-none' : ''}`}>
            <CardContent className={`${isFullscreen ? 'p-0' : 'p-8'}`}>
              <div className={`flex flex-col items-center ${isFullscreen ? 'gap-8' : 'gap-6'}`}>
                {/* Logo */}
                <div className="flex items-center gap-4">
                  <Image
                    src="/icon-512x512.png"
                    alt="KeyHub Central"
                    width={isFullscreen ? 80 : 64}
                    height={isFullscreen ? 80 : 64}
                    className="rounded-xl"
                  />
                  {isFullscreen && (
                    <h1 className="text-4xl font-bold text-white">Key Renovations</h1>
                  )}
                </div>

                {/* Call to Action */}
                <div className="text-center">
                  <h2 className={`font-bold text-white ${isFullscreen ? 'text-5xl' : 'text-2xl'}`}>
                    Scan to Get Started!
                  </h2>
                  <p className={`text-gray-400 mt-2 ${isFullscreen ? 'text-2xl' : 'text-lg'}`}>
                    Get a free quote for your next project
                  </p>
                </div>

                {/* QR Code */}
                {captureUrl && (
                  <div className="bg-white p-6 rounded-2xl shadow-lg">
                    <QRCodeSVG
                      value={captureUrl}
                      size={isFullscreen ? 350 : 250}
                      level="H"
                      includeMargin={false}
                    />
                  </div>
                )}

                {/* URL Display */}
                <p className={`text-gray-500 ${isFullscreen ? 'text-xl' : 'text-sm'}`}>
                  Or visit: <span className="text-brand-gold">{captureUrl.replace('https://', '')}</span>
                </p>

                {/* Live Counter */}
                <div className={`flex items-center gap-3 bg-brand-gold/10 rounded-full px-6 py-3 ${isFullscreen ? 'text-xl' : ''}`}>
                  <Users className={`text-brand-gold ${isFullscreen ? 'w-6 h-6' : 'w-5 h-5'}`} />
                  <span className="text-white font-semibold">
                    {loading ? '...' : todayLeads.length} leads today
                  </span>
                  <RefreshCw className={`text-gray-500 animate-spin-slow ${isFullscreen ? 'w-5 h-5' : 'w-4 h-4'}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Fullscreen Exit Button */}
        {isFullscreen && (
          <button
            onClick={toggleFullscreen}
            className="absolute top-4 right-4 p-3 bg-gray-800/50 hover:bg-gray-800 rounded-full transition-colors"
          >
            <Minimize2 className="w-6 h-6 text-white" />
          </button>
        )}

        {/* Instructions - hidden in fullscreen */}
        {!isFullscreen && (
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">How to Use</h3>
              <ol className="space-y-3 text-gray-400">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-brand-gold/20 text-brand-gold rounded-full flex items-center justify-center text-sm font-medium">1</span>
                  <span>Click &quot;Fullscreen Mode&quot; to display the QR code on a large screen</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-brand-gold/20 text-brand-gold rounded-full flex items-center justify-center text-sm font-medium">2</span>
                  <span>Attendees scan the QR code with their phone camera</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-brand-gold/20 text-brand-gold rounded-full flex items-center justify-center text-sm font-medium">3</span>
                  <span>They fill out the quick form with their contact info</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-brand-gold/20 text-brand-gold rounded-full flex items-center justify-center text-sm font-medium">4</span>
                  <span>Leads appear instantly in your <a href="/kd/leads" className="text-brand-gold hover:underline">Leads dashboard</a></span>
                </li>
              </ol>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
