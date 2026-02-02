'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/hooks';
import { Button } from '@/components/ui';
import { NotificationSettings } from '@/components/notifications';
import { User, Mail, Phone, Shield, Calendar, MapPin, Loader2 } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const [baseZipCode, setBaseZipCode] = useState(user?.baseZipCode || '');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const isSalesRep = user?.role === 'sales_rep';

  const handleSaveZipCode = async () => {
    if (!user?.uid) return;

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      // Basic zip code validation (5 digits)
      if (!/^\d{5}$/.test(baseZipCode)) {
        setSaveError('Please enter a valid 5-digit zip code');
        setSaving(false);
        return;
      }

      // Geocode the zip code to get coordinates
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${baseZipCode}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();

      let baseCoordinates = null;
      if (data.results && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        baseCoordinates = { lat: location.lat, lng: location.lng };
      }

      // Update user profile
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        baseZipCode,
        baseCoordinates,
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save zip code:', err);
      setSaveError('Failed to save zip code. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-xl font-bold text-white">Profile</h2>
        <p className="text-gray-400 mt-1">Your account information</p>
      </div>

      <div className="bg-brand-charcoal rounded-xl border border-gray-800 p-6">
        {/* Avatar */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-brand-gold/10 rounded-full flex items-center justify-center">
            <span className="text-2xl font-bold text-brand-gold">
              {user?.displayName?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-white">{user?.displayName}</h3>
            <p className="text-gray-400 capitalize">{user?.role?.replace('_', ' ')}</p>
          </div>
        </div>

        {/* Info */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-gray-300">
            <Mail className="w-5 h-5 text-gray-500" />
            <span>{user?.email}</span>
          </div>

          {user?.phone && (
            <div className="flex items-center gap-3 text-gray-300">
              <Phone className="w-5 h-5 text-gray-500" />
              <span>{user.phone}</span>
            </div>
          )}

          <div className="flex items-center gap-3 text-gray-300">
            <Shield className="w-5 h-5 text-gray-500" />
            <span className="capitalize">{user?.status}</span>
          </div>

          <div className="flex items-center gap-3 text-gray-300">
            <Calendar className="w-5 h-5 text-gray-500" />
            <span>
              Joined{' '}
              {user?.createdAt?.toDate
                ? user.createdAt.toDate().toLocaleDateString()
                : 'Unknown'}
            </span>
          </div>

          {/* Base Zip Code - only show for sales reps */}
          {isSalesRep && (
            <div className="flex items-center gap-3 text-gray-300">
              <MapPin className="w-5 h-5 text-gray-500" />
              <span>Base: {user?.baseZipCode || 'Not set'}</span>
              {user?.baseCoordinates && (
                <span className="text-xs text-green-400">(geocoded)</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Base Zip Code Editor - only for sales reps */}
      {isSalesRep && (
        <div className="bg-brand-charcoal rounded-xl border border-gray-800 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Service Area</h3>
          <p className="text-gray-400 text-sm mb-4">
            Set your base zip code to see nearby leads within 50 miles.
          </p>

          <div className="flex gap-3">
            <input
              type="text"
              value={baseZipCode}
              onChange={(e) => setBaseZipCode(e.target.value)}
              placeholder="Enter 5-digit zip code"
              maxLength={5}
              className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold"
            />
            <Button onClick={handleSaveZipCode} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
          </div>

          {saveError && (
            <p className="mt-2 text-sm text-red-400">{saveError}</p>
          )}
          {saveSuccess && (
            <p className="mt-2 text-sm text-green-400">Zip code saved successfully!</p>
          )}
        </div>
      )}

      {/* Notification Settings */}
      <NotificationSettings />

      <Button variant="outline" onClick={signOut}>
        Sign out
      </Button>
    </div>
  );
}
