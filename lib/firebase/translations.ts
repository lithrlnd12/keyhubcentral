import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './config';

const COLLECTION = 'translations';
const CONTENT_COLLECTION = 'contentTranslations';

/**
 * Get cached UI string translations for a language.
 * Returns a map of original → translated for any keys that exist in cache.
 */
export async function getCachedTranslations(
  lang: string,
  keys: string[]
): Promise<Record<string, string>> {
  if (!lang || lang === 'en' || keys.length === 0) return {};

  const docRef = doc(db, COLLECTION, lang);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return {};

  const strings = docSnap.data().strings as Record<string, string> || {};
  const result: Record<string, string> = {};

  for (const key of keys) {
    if (strings[key]) {
      result[key] = strings[key];
    }
  }

  return result;
}

/**
 * Save translated UI strings to the cache for a language.
 * Merges with existing translations (doesn't overwrite).
 */
export async function setCachedTranslations(
  lang: string,
  translations: Record<string, string>
): Promise<void> {
  if (!lang || lang === 'en' || Object.keys(translations).length === 0) return;

  const docRef = doc(db, COLLECTION, lang);

  // Merge new translations into existing strings map
  const prefixed: Record<string, string> = {};
  for (const [key, value] of Object.entries(translations)) {
    prefixed[`strings.${key}`] = value;
  }

  await setDoc(docRef, { strings: translations }, { merge: true });
}

/**
 * Get a cached content translation (chat message, job note, etc.)
 */
export async function getCachedContentTranslation(
  contentId: string,
  targetLang: string
): Promise<string | null> {
  if (!contentId || !targetLang || targetLang === 'en') return null;

  const docRef = doc(db, CONTENT_COLLECTION, contentId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return null;

  return docSnap.data()[targetLang] || null;
}

/**
 * Save a content translation to cache.
 */
export async function setCachedContentTranslation(
  contentId: string,
  targetLang: string,
  text: string,
  originalLang?: string
): Promise<void> {
  if (!contentId || !targetLang) return;

  const docRef = doc(db, CONTENT_COLLECTION, contentId);
  await setDoc(docRef, {
    [targetLang]: text,
    ...(originalLang ? { originalLang } : {}),
  }, { merge: true });
}

/**
 * Batch get content translations for multiple content IDs.
 */
export async function getBatchContentTranslations(
  contentIds: string[],
  targetLang: string
): Promise<Record<string, string>> {
  if (!targetLang || targetLang === 'en' || contentIds.length === 0) return {};

  const results: Record<string, string> = {};

  // Firestore doesn't support batch getDoc, so we parallelize
  const promises = contentIds.map(async (id) => {
    const translation = await getCachedContentTranslation(id, targetLang);
    if (translation) {
      results[id] = translation;
    }
  });

  await Promise.all(promises);
  return results;
}
