'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';
import { useFeatureFlags } from './useFeatureFlags';
import { cache } from '@/lib/utils/cache';

const BATCH_DELAY_MS = 150;
const MAX_BATCH_SIZE = 50;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in-memory

// Module-level state shared across all hook instances
const pendingStrings: Set<string> = new Set();
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let flushPromise: Promise<void> | null = null;
const listeners: Set<() => void> = new Set();
// Track strings currently being fetched to avoid duplicate API calls
const inflight: Set<string> = new Set();

function getCacheKey(lang: string) {
  return `translations:${lang}`;
}

function getTranslationCache(lang: string): Record<string, string> {
  return cache.get<Record<string, string>>(getCacheKey(lang)) || {};
}

function setTranslationCache(lang: string, translations: Record<string, string>) {
  const existing = getTranslationCache(lang);
  cache.set(getCacheKey(lang), { ...existing, ...translations }, CACHE_TTL);
}

async function flushTranslations(lang: string, getToken: () => Promise<string | null>) {
  if (pendingStrings.size === 0) return;

  const batch = Array.from(pendingStrings).slice(0, MAX_BATCH_SIZE);
  // Move to inflight so other instances don't re-request
  batch.forEach((s) => {
    pendingStrings.delete(s);
    inflight.add(s);
  });

  try {
    const token = await getToken();
    if (!token) return;

    const res = await fetch('/api/ai/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        strings: batch,
        targetLang: lang,
        type: 'ui',
      }),
    });

    if (!res.ok) {
      console.error('Translation API error:', res.status);
      return;
    }

    const data = await res.json();
    if (data.translations) {
      setTranslationCache(lang, data.translations);
      // Notify all hook instances to re-render
      listeners.forEach((cb) => cb());
    }
  } catch (err) {
    console.error('Translation fetch error:', err);
  } finally {
    batch.forEach((s) => inflight.delete(s));
  }
}

function scheduleFlush(lang: string, getToken: () => Promise<string | null>) {
  if (flushTimer) clearTimeout(flushTimer);

  if (pendingStrings.size >= MAX_BATCH_SIZE) {
    flushPromise = flushTranslations(lang, getToken);
    return;
  }

  flushTimer = setTimeout(() => {
    flushPromise = flushTranslations(lang, getToken);
  }, BATCH_DELAY_MS);
}

/**
 * Translation hook for UI strings.
 *
 * Usage:
 *   const { t } = useTranslation();
 *   <h1>{t('Job Package')}</h1>
 *
 * English users: zero overhead, returns original string.
 * Non-English users: returns cached translation or original while loading.
 */
export function useTranslation() {
  const { user, getIdToken } = useAuth();
  const { flags } = useFeatureFlags();
  const [, forceUpdate] = useState(0);
  const langRef = useRef(user?.preferredLanguage || 'en');

  const lang = user?.preferredLanguage || 'en';
  const isEnabled = flags.multiLanguage && lang !== 'en';
  langRef.current = lang;

  // Subscribe to translation cache updates
  useEffect(() => {
    if (!isEnabled) return;

    const listener = () => forceUpdate((n) => n + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, [isEnabled]);

  // Load full translation cache from Firestore on mount for non-English users
  useEffect(() => {
    if (!isEnabled) return;

    const loadCache = async () => {
      try {
        const token = await getIdToken();
        if (!token) return;

        // Warm the in-memory cache from Firestore on first load
        const res = await fetch('/api/ai/translate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            strings: [],
            targetLang: lang,
            type: 'ui',
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.translations && Object.keys(data.translations).length > 0) {
            setTranslationCache(lang, data.translations);
            listeners.forEach((cb) => cb());
          }
        }
      } catch {
        // Non-fatal — translations load on demand via t()
      }
    };

    // Only load if we don't have anything in memory cache
    const existing = getTranslationCache(lang);
    if (Object.keys(existing).length === 0) {
      loadCache();
    }
  }, [isEnabled, lang, getIdToken]);

  /**
   * Translate a UI string.
   * Returns the translated string if cached, or the original while translation is pending.
   */
  const t = useCallback(
    (key: string): string => {
      if (!isEnabled || !key) return key;

      // Check in-memory cache first
      const cached = getTranslationCache(langRef.current);
      if (cached[key]) return cached[key];

      // Queue for batch translation (if not already queued or inflight)
      if (!pendingStrings.has(key) && !inflight.has(key)) {
        pendingStrings.add(key);
        scheduleFlush(langRef.current, getIdToken);
      }

      // Return original while translation is pending
      return key;
    },
    [isEnabled, getIdToken]
  );

  return { t, lang, isEnabled };
}

// ── Global content translation state (shared across all hook instances) ──
const contentCacheMap: Record<string, Record<string, string>> = {}; // lang -> { contentId -> translated }
const pendingContentMap: Map<string, { text: string; originalLang?: string }> = new Map();
let contentFlushTimer: ReturnType<typeof setTimeout> | null = null;
const contentListeners: Set<() => void> = new Set();
const inflightContent: Set<string> = new Set();

function getContentCache(lang: string): Record<string, string> {
  return contentCacheMap[lang] || {};
}

function setContentCacheEntry(lang: string, entries: Record<string, string>) {
  if (!contentCacheMap[lang]) contentCacheMap[lang] = {};
  Object.assign(contentCacheMap[lang], entries);
}

async function flushContentBatch(lang: string, getToken: () => Promise<string | null>) {
  if (pendingContentMap.size === 0) return;

  const entries = Array.from(pendingContentMap.entries());
  pendingContentMap.clear();

  const strings = entries.map(([, { text }]) => text);
  const contentIds = entries.map(([id]) => id);

  entries.forEach(([id]) => inflightContent.add(id));

  try {
    const token = await getToken();
    if (!token) return;

    const res = await fetch('/api/ai/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        strings,
        targetLang: lang,
        type: 'content',
        contentIds,
        // Pass source language so Claude knows what language the text is in
        sourceLang: entries[0]?.[1]?.originalLang || undefined,
      }),
    });

    if (!res.ok) {
      console.error('Content translation API error:', res.status);
      return;
    }

    const data = await res.json();
    if (data.translations) {
      let newEntries: Record<string, string>;

      if (data.byContentId) {
        // API returned translations keyed by content ID — use directly
        newEntries = data.translations;
      } else {
        // Fallback: match by original text
        newEntries = {};
        entries.forEach(([id, { text }]) => {
          if (data.translations[text]) {
            newEntries[id] = data.translations[text];
          }
        });
      }

      if (Object.keys(newEntries).length > 0) {
        setContentCacheEntry(lang, newEntries);
        contentListeners.forEach((cb) => cb());
      }
    }
  } catch (err) {
    console.error('Content translation error:', err);
  } finally {
    entries.forEach(([id]) => inflightContent.delete(id));
  }
}

function scheduleContentFlush(lang: string, getToken: () => Promise<string | null>) {
  if (contentFlushTimer) clearTimeout(contentFlushTimer);
  contentFlushTimer = setTimeout(() => {
    flushContentBatch(lang, getToken);
  }, BATCH_DELAY_MS);
}

/**
 * Content translation hook for chat messages, job notes, etc.
 * Uses global state so all MessageBubble instances share one batch queue and cache.
 *
 * Usage:
 *   const { translateContent } = useContentTranslation();
 *   const translated = translateContent(messageId, message.text, message.originalLanguage);
 */
export function useContentTranslation() {
  const { user, getIdToken } = useAuth();
  const { flags } = useFeatureFlags();
  const [, forceUpdate] = useState(0);

  const lang = user?.preferredLanguage || 'en';
  // Content translation must work for ALL users (including English readers
  // who need to read Spanish/Portuguese messages)
  const isEnabled = !!flags.multiLanguage;

  // Subscribe to global content cache updates
  useEffect(() => {
    if (!isEnabled) return;
    const listener = () => forceUpdate((n) => n + 1);
    contentListeners.add(listener);
    return () => { contentListeners.delete(listener); };
  }, [isEnabled]);

  const translateContent = useCallback(
    (contentId: string, text: string, originalLang?: string): string => {
      if (!isEnabled || !text || !contentId) return text;

      // If the content is already in the reader's language, no translation needed
      if (originalLang === lang) return text;
      // If original language is unknown, assume English — skip if reader is English
      if (!originalLang && lang === 'en') return text;

      // Check global cache
      const cached = getContentCache(lang);
      if (cached[contentId]) return cached[contentId];

      // Queue for batch translation (if not already queued or inflight)
      if (!pendingContentMap.has(contentId) && !inflightContent.has(contentId)) {
        pendingContentMap.set(contentId, { text, originalLang });
        scheduleContentFlush(lang, getIdToken);
      }

      return text;
    },
    [isEnabled, lang, getIdToken]
  );

  return { translateContent, lang, isEnabled };
}
