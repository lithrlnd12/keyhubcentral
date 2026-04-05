'use client';

import { useState } from 'react';
import { getMessaging, getToken } from 'firebase/messaging';
import { app } from '@/lib/firebase/config';

/**
 * Diagnostic page for push notifications.
 * Tests each step independently and reports exactly where it fails.
 * Access at /test-notifications
 */
export default function TestNotificationsPage() {
  const [log, setLog] = useState<string[]>([]);

  const addLog = (msg: string) => {
    setLog((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const runDiagnostics = async () => {
    setLog([]);

    // Step 1: Check browser support
    addLog('--- Step 1: Browser Support ---');
    const hasNotification = 'Notification' in window;
    const hasSW = 'serviceWorker' in navigator;
    const hasPush = 'PushManager' in window;
    addLog(`Notification API: ${hasNotification}`);
    addLog(`Service Worker: ${hasSW}`);
    addLog(`PushManager: ${hasPush}`);
    if (!hasNotification || !hasSW || !hasPush) {
      addLog('FAIL: Browser does not support push notifications');
      return;
    }

    // Step 2: Check permission
    addLog('--- Step 2: Permission ---');
    addLog(`Current permission: ${Notification.permission}`);
    if (Notification.permission === 'denied') {
      addLog('FAIL: Notifications are blocked. Reset in browser settings.');
      return;
    }
    if (Notification.permission === 'default') {
      addLog('Requesting permission...');
      const result = await Notification.requestPermission();
      addLog(`Permission result: ${result}`);
      if (result !== 'granted') {
        addLog('FAIL: Permission not granted');
        return;
      }
    }
    addLog('OK: Permission granted');

    // Step 3: Check env vars
    addLog('--- Step 3: Environment Variables ---');
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    const senderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    addLog(`VAPID key: ${vapidKey ? `${vapidKey.substring(0, 10)}... (${vapidKey.length} chars)` : 'MISSING'}`);
    addLog(`Sender ID: ${senderId || 'MISSING'}`);
    addLog(`Project ID: ${projectId || 'MISSING'}`);
    if (!vapidKey) {
      addLog('FAIL: NEXT_PUBLIC_FIREBASE_VAPID_KEY is not set');
      return;
    }

    // Step 4: Check service worker file accessibility
    addLog('--- Step 4: Service Worker File ---');
    try {
      const swRes = await fetch('/firebase-messaging-sw.js');
      addLog(`/firebase-messaging-sw.js status: ${swRes.status}`);
      if (!swRes.ok) {
        addLog('FAIL: firebase-messaging-sw.js not accessible');
        return;
      }
      const swText = await swRes.text();
      addLog(`SW file size: ${swText.length} bytes`);
      addLog('OK: SW file accessible');
    } catch (err) {
      addLog(`FAIL: Could not fetch SW file: ${err}`);
      return;
    }

    // Step 5: Register service worker
    addLog('--- Step 5: Service Worker Registration ---');
    let swReg;
    try {
      swReg = await navigator.serviceWorker.register(
        '/firebase-messaging-sw.js',
        { scope: '/firebase-cloud-messaging-push-scope' }
      );
      addLog(`SW state: ${swReg.active?.state || swReg.installing?.state || swReg.waiting?.state || 'unknown'}`);
      addLog(`SW scope: ${swReg.scope}`);

      // Wait for activation if installing
      if (!swReg.active) {
        addLog('Waiting for SW to activate...');
        await navigator.serviceWorker.ready;
        // Re-get the registration
        swReg = await navigator.serviceWorker.getRegistration('/firebase-cloud-messaging-push-scope');
        if (!swReg) {
          addLog('FAIL: SW registration lost after ready');
          return;
        }
        addLog(`SW now: ${swReg.active?.state || 'still not active'}`);
      }
      addLog('OK: SW registered');
    } catch (err) {
      addLog(`FAIL: SW registration error: ${err}`);
      return;
    }

    // Step 6: Initialize Firebase Messaging
    addLog('--- Step 6: Firebase Messaging ---');
    let messaging;
    try {
      messaging = getMessaging(app);
      addLog('OK: Firebase Messaging initialized');
    } catch (err) {
      addLog(`FAIL: Could not initialize messaging: ${err}`);
      return;
    }

    // Step 7: Get FCM token
    addLog('--- Step 7: Get FCM Token ---');
    addLog('Calling getToken() with VAPID key and SW registration...');
    addLog('(This may take a few seconds...)');

    try {
      // Race between getToken and a timeout
      const tokenPromise = getToken(messaging, {
        vapidKey: vapidKey,
        serviceWorkerRegistration: swReg,
      });

      const timeoutPromise = new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error('getToken() timed out after 15 seconds')), 15000)
      );

      const token = await Promise.race([tokenPromise, timeoutPromise]);

      if (token) {
        addLog(`SUCCESS! Token: ${token.substring(0, 30)}...`);
        addLog(`Token length: ${token.length}`);
        addLog('');
        addLog('Push notifications are working. This token can receive pushes.');
      } else {
        addLog('FAIL: getToken() returned null/empty');
      }
    } catch (err: unknown) {
      const error = err as Error;
      addLog(`FAIL: getToken() error: ${error.message}`);
      if (error.message.includes('timed out')) {
        addLog('The SW registration may be in a bad state.');
        addLog('Try: Clear site data in browser settings, then retry.');
      }
    }

    // Step 8: Test local notification
    addLog('--- Step 8: Local Notification Test ---');
    try {
      new Notification('KeyHub Test', {
        body: 'If you see this popup, local notifications work!',
        icon: '/logo.svg',
      });
      addLog('Local notification sent — did you see it?');
    } catch (err) {
      addLog(`Local notification failed: ${err}`);
    }
  };

  return (
    <div className="min-h-screen bg-brand-black p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-2">Push Notification Diagnostics</h1>
        <p className="text-gray-400 mb-6">Tests each step of the notification pipeline.</p>

        <button
          onClick={runDiagnostics}
          className="bg-brand-gold text-black font-semibold px-6 py-3 rounded-lg mb-6"
        >
          Run Diagnostics
        </button>

        <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm space-y-1 min-h-[200px]">
          {log.length === 0 ? (
            <p className="text-gray-500">Click &quot;Run Diagnostics&quot; to start...</p>
          ) : (
            log.map((line, i) => (
              <p
                key={i}
                className={
                  line.includes('FAIL') ? 'text-red-400' :
                  line.includes('SUCCESS') ? 'text-green-400' :
                  line.includes('OK:') ? 'text-green-300' :
                  line.startsWith('[') ? 'text-gray-300' :
                  'text-gray-400'
                }
              >
                {line}
              </p>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
