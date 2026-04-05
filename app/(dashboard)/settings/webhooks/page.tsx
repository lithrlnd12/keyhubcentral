'use client';

import { useAuth } from '@/lib/hooks';
import { redirect } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { WebhookManagement } from '@/components/settings/WebhookManagement';
import { ApiKeyManagement } from '@/components/settings/ApiKeyManagement';

export default function WebhooksSettingsPage() {
  const { user } = useAuth();

  // Owner/admin only
  if (user && user.role && !['owner', 'admin'].includes(user.role)) {
    redirect('/settings');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Webhooks &amp; API</h1>
        <p className="text-gray-400 mt-1">
          Configure outbound webhooks and manage API keys for external integrations
        </p>
      </div>

      <Tabs defaultValue="webhooks">
        <TabsList>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
        </TabsList>

        <TabsContent value="webhooks">
          <WebhookManagement />
        </TabsContent>

        <TabsContent value="api-keys">
          <ApiKeyManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}
