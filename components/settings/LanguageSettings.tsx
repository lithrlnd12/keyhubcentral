'use client';

import { useState } from 'react';
import { Globe, Check } from 'lucide-react';
import { Card, CardTitle, CardDescription } from '@/components/ui/Card';
import { useAuth } from '@/lib/hooks';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

const LANGUAGES = [
  { value: 'en', label: 'English', nativeLabel: 'English' },
  { value: 'es', label: 'Spanish', nativeLabel: 'Español' },
  { value: 'pt', label: 'Portuguese', nativeLabel: 'Português' },
];

export function LanguageSettings() {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const currentLang = user?.preferredLanguage || 'en';

  const handleChange = async (lang: string) => {
    if (!user?.uid || lang === currentLang) return;

    setSaving(true);
    setSaved(false);

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        preferredLanguage: lang,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Failed to update language:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <div className="flex items-center gap-3 mb-4">
        <Globe className="w-5 h-5 text-brand-gold" />
        <div>
          <CardTitle>Preferred Language</CardTitle>
          <CardDescription>
            The app will display in your chosen language
          </CardDescription>
        </div>
      </div>

      <div className="space-y-2">
        {LANGUAGES.map((lang) => (
          <button
            key={lang.value}
            type="button"
            onClick={() => handleChange(lang.value)}
            disabled={saving}
            className={`
              w-full flex items-center justify-between px-4 py-3 rounded-lg border
              transition-colors text-left
              ${currentLang === lang.value
                ? 'border-brand-gold bg-brand-gold/10 text-white'
                : 'border-gray-700 bg-gray-800/50 text-gray-300 hover:border-gray-600'
              }
              ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <div>
              <p className="font-medium">{lang.nativeLabel}</p>
              <p className="text-sm text-gray-400">{lang.label}</p>
            </div>
            {currentLang === lang.value && (
              <Check className="w-5 h-5 text-brand-gold" />
            )}
          </button>
        ))}
      </div>

      {saved && (
        <div className="flex items-center gap-2 text-green-400 mt-3">
          <Check className="w-4 h-4" />
          <span className="text-sm">Language updated</span>
        </div>
      )}
    </Card>
  );
}
