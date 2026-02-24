'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Download, Share, Plus, MoreVertical } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type DeviceType = 'ios' | 'android' | 'desktop-chrome' | 'desktop-edge' | 'desktop-other' | 'unknown';

export function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [deviceType, setDeviceType] = useState<DeviceType>('unknown');
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as Navigator & { standalone?: boolean }).standalone
      || document.referrer.includes('android-app://');

    setIsStandalone(standalone);

    if (standalone) {
      return; // Don't show prompt if already installed
    }

    // Check if user has dismissed the prompt before
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    const dismissedTime = dismissed ? parseInt(dismissed, 10) : 0;
    const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);

    // Show again after 7 days
    if (dismissed && daysSinceDismissed < 7) {
      return;
    }

    // Detect device type
    const userAgent = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isAndroid = /android/.test(userAgent);
    const isChrome = /chrome/.test(userAgent) && !/edge|edg/.test(userAgent);
    const isEdge = /edge|edg/.test(userAgent);

    if (isIOS) {
      setDeviceType('ios');
      setTimeout(() => setShowPrompt(true), 2000);
    } else if (isAndroid) {
      setDeviceType('android');
    } else if (isChrome) {
      setDeviceType('desktop-chrome');
    } else if (isEdge) {
      setDeviceType('desktop-edge');
    } else {
      setDeviceType('desktop-other');
    }

    // Listen for the beforeinstallprompt event (Chrome, Edge, Android)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      deferredPromptRef.current = promptEvent;
      setDeferredPrompt(promptEvent);
      setTimeout(() => setShowPrompt(true), 2000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // For browsers that don't fire beforeinstallprompt, show manual instructions
    // Use ref so the timeout closure always sees the latest value
    if (!isIOS) {
      const timeout = setTimeout(() => {
        if (!deferredPromptRef.current) {
          setShowPrompt(true);
        }
      }, 3000);
      return () => {
        clearTimeout(timeout);
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      };
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []); // Run once only — ref keeps fallback timeout in sync

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  if (!showPrompt || isStandalone) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center p-4 pb-6">
      <div className="w-full max-w-md bg-dark-200 rounded-2xl shadow-2xl border border-dark-100 overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-brand-gold/20 to-brand-gold/5 p-6 pb-4">
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white hover:bg-dark-100 rounded-full transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-dark-300 rounded-2xl flex items-center justify-center border border-brand-gold/30">
              {/* eslint-disable-next-line @next/next/no-img-element -- SVG logo with fixed dimensions */}
              <img src="/logo.svg" alt="KeyHub Central" className="w-10 h-10" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Install KeyHub Central</h2>
              <p className="text-gray-400 text-sm">Add to your home screen for quick access</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Native install button (Chrome/Edge/Android) */}
          {deferredPrompt && (
            <div className="space-y-4">
              <p className="text-gray-300 text-sm">
                Install KeyHub Central for a faster, app-like experience with offline support and push notifications.
              </p>
              <button
                onClick={handleInstallClick}
                className="w-full flex items-center justify-center gap-2 bg-brand-gold text-dark-300 font-semibold py-3 px-6 rounded-xl hover:bg-brand-gold/90 transition-colors"
              >
                <Download size={20} />
                Install App
              </button>
            </div>
          )}

          {/* iOS Instructions */}
          {deviceType === 'ios' && !deferredPrompt && (
            <div className="space-y-4">
              <p className="text-gray-300 text-sm">
                Install KeyHub Central on your iPhone for quick access from your home screen.
              </p>

              <div className="space-y-3 bg-dark-300 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-brand-gold/20 rounded-full text-brand-gold font-bold text-sm shrink-0">
                    1
                  </div>
                  <div className="flex items-center gap-2 text-gray-300">
                    <span>Tap the</span>
                    <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-500 rounded-lg">
                      <Share size={16} className="text-white" />
                    </span>
                    <span>Share button</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-brand-gold/20 rounded-full text-brand-gold font-bold text-sm shrink-0">
                    2
                  </div>
                  <div className="flex items-center gap-2 text-gray-300">
                    <span>Scroll and tap</span>
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-dark-100 rounded text-white text-sm">
                      <Plus size={14} />
                      Add to Home Screen
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-brand-gold/20 rounded-full text-brand-gold font-bold text-sm shrink-0">
                    3
                  </div>
                  <div className="text-gray-300">
                    Tap <span className="text-white font-medium">Add</span> in the top right
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Android Manual Instructions (fallback) */}
          {deviceType === 'android' && !deferredPrompt && (
            <div className="space-y-4">
              <p className="text-gray-300 text-sm">
                Install KeyHub Central on your Android device for quick access.
              </p>

              <div className="space-y-3 bg-dark-300 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-brand-gold/20 rounded-full text-brand-gold font-bold text-sm shrink-0">
                    1
                  </div>
                  <div className="flex items-center gap-2 text-gray-300">
                    <span>Tap the</span>
                    <span className="inline-flex items-center justify-center w-8 h-8 bg-dark-100 rounded-lg">
                      <MoreVertical size={16} className="text-white" />
                    </span>
                    <span>menu button</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-brand-gold/20 rounded-full text-brand-gold font-bold text-sm shrink-0">
                    2
                  </div>
                  <div className="text-gray-300">
                    Tap <span className="text-white font-medium">&quot;Install app&quot;</span> or <span className="text-white font-medium">&quot;Add to Home screen&quot;</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-brand-gold/20 rounded-full text-brand-gold font-bold text-sm shrink-0">
                    3
                  </div>
                  <div className="text-gray-300">
                    Tap <span className="text-white font-medium">Install</span> to confirm
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Desktop Chrome Instructions */}
          {deviceType === 'desktop-chrome' && !deferredPrompt && (
            <div className="space-y-4">
              <p className="text-gray-300 text-sm">
                Install KeyHub Central as a desktop app for quick access.
              </p>

              <div className="space-y-3 bg-dark-300 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-brand-gold/20 rounded-full text-brand-gold font-bold text-sm shrink-0">
                    1
                  </div>
                  <div className="text-gray-300">
                    Click the <span className="inline-flex items-center justify-center w-6 h-6 bg-dark-100 rounded text-white"><Download size={14} /></span> install icon in the address bar
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-brand-gold/20 rounded-full text-brand-gold font-bold text-sm shrink-0">
                    2
                  </div>
                  <div className="text-gray-300">
                    Click <span className="text-white font-medium">Install</span> in the popup
                  </div>
                </div>
              </div>

              <p className="text-gray-500 text-xs">
                Don&apos;t see the install icon? Try the menu (⋮) → &quot;Install KeyHub Central&quot;
              </p>
            </div>
          )}

          {/* Desktop Edge Instructions */}
          {deviceType === 'desktop-edge' && !deferredPrompt && (
            <div className="space-y-4">
              <p className="text-gray-300 text-sm">
                Install KeyHub Central as a desktop app for quick access.
              </p>

              <div className="space-y-3 bg-dark-300 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-brand-gold/20 rounded-full text-brand-gold font-bold text-sm shrink-0">
                    1
                  </div>
                  <div className="text-gray-300">
                    Click the <span className="inline-flex items-center justify-center w-6 h-6 bg-dark-100 rounded text-white"><Plus size={14} /></span> icon in the address bar
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-brand-gold/20 rounded-full text-brand-gold font-bold text-sm shrink-0">
                    2
                  </div>
                  <div className="text-gray-300">
                    Click <span className="text-white font-medium">Install</span> to add the app
                  </div>
                </div>
              </div>

              <p className="text-gray-500 text-xs">
                Or use the menu (⋯) → Apps → Install KeyHub Central
              </p>
            </div>
          )}

          {/* Other browsers */}
          {deviceType === 'desktop-other' && !deferredPrompt && (
            <div className="space-y-4">
              <p className="text-gray-300 text-sm">
                For the best experience, use Chrome or Edge to install KeyHub Central as a desktop app.
              </p>

              <div className="bg-dark-300 rounded-xl p-4 text-gray-400 text-sm">
                <p>Your current browser may not support app installation. Try opening this site in:</p>
                <ul className="mt-2 space-y-1">
                  <li>• Google Chrome</li>
                  <li>• Microsoft Edge</li>
                  <li>• Safari (on Mac/iOS)</li>
                </ul>
              </div>
            </div>
          )}

          {/* Benefits */}
          <div className="mt-6 pt-4 border-t border-dark-100">
            <p className="text-gray-500 text-xs mb-2">Why install?</p>
            <div className="flex flex-wrap gap-2">
              <span className="px-2 py-1 bg-dark-300 rounded text-gray-400 text-xs">Faster loading</span>
              <span className="px-2 py-1 bg-dark-300 rounded text-gray-400 text-xs">Works offline</span>
              <span className="px-2 py-1 bg-dark-300 rounded text-gray-400 text-xs">Push notifications</span>
              <span className="px-2 py-1 bg-dark-300 rounded text-gray-400 text-xs">Home screen access</span>
            </div>
          </div>

          {/* Dismiss link */}
          <button
            onClick={handleDismiss}
            className="mt-4 w-full text-center text-gray-500 text-sm hover:text-gray-400 transition-colors"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
