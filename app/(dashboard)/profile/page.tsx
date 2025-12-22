'use client';

import { useAuth } from '@/lib/hooks';
import { Button } from '@/components/ui';
import { NotificationSettings } from '@/components/notifications';
import { User, Mail, Phone, Shield, Calendar } from 'lucide-react';

export default function ProfilePage() {
  const { user, signOut } = useAuth();

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
        </div>
      </div>

      {/* Notification Settings */}
      <NotificationSettings />

      <Button variant="outline" onClick={signOut}>
        Sign out
      </Button>
    </div>
  );
}
