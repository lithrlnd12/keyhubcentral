'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/hooks';
import { useRouter } from 'next/navigation';
import { TenantPortalConfig } from '@/types/tenant-portal';
import { getTenantByOwner, createTenant, updateTenant } from '@/lib/firebase/tenants';
import { ADMIN_ROLES } from '@/types/user';
import {
  ExternalLink,
  Globe,
  Palette,
  Save,
  Check,
  Copy,
  Settings,
  Eye,
} from 'lucide-react';

export default function PortalAdminPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [tenant, setTenant] = useState<TenantPortalConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form state
  const [companyName, setCompanyName] = useState('');
  const [slug, setSlug] = useState('');
  const [tagline, setTagline] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#2563EB');
  const [backgroundColor, setBackgroundColor] = useState('#0F172A');
  const [logoUrl, setLogoUrl] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactWebsite, setContactWebsite] = useState('');

  useEffect(() => {
    if (!authLoading && user) {
      if (!ADMIN_ROLES.includes(user.role) && user.role !== 'contractor') {
        router.push('/overview');
        return;
      }
      loadTenant();
    }
  }, [user, authLoading]);

  async function loadTenant() {
    if (!user) return;
    try {
      const existing = await getTenantByOwner(user.uid);
      if (existing) {
        setTenant(existing);
        setCompanyName(existing.companyName);
        setSlug(existing.slug);
        setTagline(existing.tagline || '');
        setPrimaryColor(existing.branding.primaryColor);
        setBackgroundColor(existing.branding.backgroundColor || '#0F172A');
        setLogoUrl(existing.branding.logoUrl || '');
        setContactEmail(existing.contact.email || '');
        setContactPhone(existing.contact.phone || '');
        setContactWebsite(existing.contact.website || '');
      }
    } catch (err) {
      console.error('Error loading tenant:', err);
    } finally {
      setLoading(false);
    }
  }

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleSave = async () => {
    if (!user || !companyName || !slug) return;

    setSaving(true);
    try {
      const data = {
        slug,
        companyName,
        tagline,
        branding: {
          logoUrl,
          faviconUrl: '',
          primaryColor,
          accentColor: primaryColor,
          backgroundColor,
          textColor: '#FFFFFF',
        },
        contact: {
          email: contactEmail,
          phone: contactPhone,
          website: contactWebsite,
        },
        ownerId: user.uid,
        ownerEmail: user.email,
        features: {
          jobTracking: true,
          invoices: true,
          messaging: true,
          documents: true,
          photos: true,
          scheduling: true,
        },
        status: 'active' as const,
      };

      if (tenant) {
        await updateTenant(tenant.id, data);
      } else {
        const id = await createTenant(data);
        setTenant({ ...data, id } as TenantPortalConfig);
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Error saving tenant:', err);
    } finally {
      setSaving(false);
    }
  };

  const portalUrl = slug ? `${window.location.origin}/p/${slug}` : '';

  const copyUrl = () => {
    navigator.clipboard.writeText(portalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-brand-black flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-gold border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Globe size={24} className="text-gold" />
            Customer Portal
          </h1>
          <p className="text-gray-400 mt-1">
            Set up a branded portal for your customers to track their projects.
          </p>
        </div>
        {tenant && (
          <a
            href={portalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-brand-charcoal rounded-lg text-gold hover:bg-dark-300 transition-colors text-sm"
          >
            <Eye size={16} />
            Preview
          </a>
        )}
      </div>

      {/* Portal URL */}
      {tenant && portalUrl && (
        <div className="bg-brand-charcoal rounded-xl p-4 border border-gray-700/50">
          <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
            <ExternalLink size={12} />
            Your Portal URL
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-gold text-sm bg-dark-400 px-3 py-2 rounded-lg overflow-x-auto">
              {portalUrl}
            </code>
            <button
              onClick={copyUrl}
              className="p-2 bg-dark-400 rounded-lg text-gray-400 hover:text-white transition-colors"
            >
              {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
            </button>
          </div>
        </div>
      )}

      {/* Company Info */}
      <div className="bg-brand-charcoal rounded-xl p-6 border border-gray-700/50">
        <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Settings size={18} className="text-gold" />
          Company Info
        </h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 block mb-1">Company Name *</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => {
                setCompanyName(e.target.value);
                if (!tenant) setSlug(generateSlug(e.target.value));
              }}
              placeholder="Acme Home Renovations"
              className="w-full px-4 py-2.5 bg-dark-400 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold"
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-1">Portal URL Slug *</label>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-sm">/p/</span>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(generateSlug(e.target.value))}
                placeholder="acme-renovations"
                className="flex-1 px-4 py-2.5 bg-dark-400 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold"
              />
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-1">Tagline</label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="Quality craftsmanship, every time."
              className="w-full px-4 py-2.5 bg-dark-400 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold"
            />
          </div>
        </div>
      </div>

      {/* Branding */}
      <div className="bg-brand-charcoal rounded-xl p-6 border border-gray-700/50">
        <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Palette size={18} className="text-gold" />
          Branding
        </h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 block mb-1">Logo URL</label>
            <input
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://example.com/logo.png"
              className="w-full px-4 py-2.5 bg-dark-400 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-400 block mb-1">Primary Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-10 w-14 rounded-lg border border-gray-700 cursor-pointer bg-transparent"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="flex-1 px-3 py-2.5 bg-dark-400 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-gold"
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-1">Background Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="h-10 w-14 rounded-lg border border-gray-700 cursor-pointer bg-transparent"
                />
                <input
                  type="text"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="flex-1 px-3 py-2.5 bg-dark-400 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-gold"
                />
              </div>
            </div>
          </div>

          {/* Live preview */}
          <div>
            <p className="text-xs text-gray-400 mb-2">Preview</p>
            <div
              className="rounded-xl p-4 border border-gray-700/50"
              style={{ backgroundColor }}
            >
              <div className="flex items-center gap-3 mb-3">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="h-8 w-auto" />
                ) : (
                  <div
                    className="h-8 w-8 rounded-lg flex items-center justify-center font-bold text-white text-sm"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {companyName?.charAt(0)?.toUpperCase() || 'A'}
                  </div>
                )}
                <span className="text-white font-semibold">{companyName || 'Your Company'}</span>
              </div>
              <div
                className="h-2 rounded-full w-2/3"
                style={{ backgroundColor: primaryColor }}
              />
              <div className="h-2 rounded-full w-1/3 mt-2 bg-gray-700" />
            </div>
          </div>
        </div>
      </div>

      {/* Contact Info */}
      <div className="bg-brand-charcoal rounded-xl p-6 border border-gray-700/50">
        <h2 className="text-white font-semibold mb-4">Contact Info</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm text-gray-400 block mb-1">Email</label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="info@company.com"
              className="w-full px-4 py-2.5 bg-dark-400 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold"
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-1">Phone</label>
            <input
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="(405) 555-0123"
              className="w-full px-4 py-2.5 bg-dark-400 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold"
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-1">Website</label>
            <input
              type="text"
              value={contactWebsite}
              onChange={(e) => setContactWebsite(e.target.value)}
              placeholder="yourcompany.com"
              className="w-full px-4 py-2.5 bg-dark-400 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold"
            />
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving || !companyName || !slug}
          className="flex items-center gap-2 px-6 py-3 bg-gold text-brand-black font-semibold rounded-lg hover:bg-gold-light transition-colors disabled:opacity-50"
        >
          {saving ? (
            <div className="animate-spin h-4 w-4 border-2 border-brand-black border-t-transparent rounded-full" />
          ) : saved ? (
            <Check size={18} />
          ) : (
            <Save size={18} />
          )}
          {saved ? 'Saved!' : tenant ? 'Update Portal' : 'Create Portal'}
        </button>
      </div>
    </div>
  );
}
