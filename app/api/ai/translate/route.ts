import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { verifyFirebaseAuth } from '@/lib/auth/verifyRequest';
import { getAdminDb } from '@/lib/firebase/admin';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  es: 'Spanish',
  pt: 'Brazilian Portuguese',
};

/**
 * POST /api/ai/translate
 * Translates UI strings or content via Claude API with Firestore caching.
 *
 * Body:
 *   - strings: string[]       — array of English strings to translate
 *   - targetLang: string      — target language code ('en' | 'es' | 'pt')
 *   - type: 'ui' | 'content'  — ui strings get cached globally, content gets cached per-id
 *   - contentIds?: string[]   — required for type 'content', maps 1:1 with strings array
 */
export async function POST(request: NextRequest) {
  const auth = await verifyFirebaseAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { strings, targetLang, type = 'ui', contentIds, sourceLang } = body;

    if (!strings || !Array.isArray(strings)) {
      return NextResponse.json({ error: 'strings array is required' }, { status: 400 });
    }

    // Empty strings array — return empty translations (used for cache warming)
    if (strings.length === 0) {
      return NextResponse.json({ translations: {} });
    }

    if (!targetLang || !LANGUAGE_NAMES[targetLang]) {
      return NextResponse.json({ error: 'Invalid targetLang. Supported: en, es, pt' }, { status: 400 });
    }

    if (type === 'content' && (!contentIds || contentIds.length !== strings.length)) {
      return NextResponse.json({ error: 'contentIds must match strings length for content type' }, { status: 400 });
    }

    const langName = LANGUAGE_NAMES[targetLang];
    const adminDb = getAdminDb();

    // For UI strings, check cache first and only translate misses
    let stringsToTranslate = strings;
    let cachedTranslations: Record<string, string> = {};

    if (type === 'ui') {
      const cacheDoc = await adminDb.collection('translations').doc(targetLang).get();
      const cachedStrings = cacheDoc.exists ? (cacheDoc.data()?.strings || {}) : {};

      cachedTranslations = {};
      stringsToTranslate = [];

      for (const s of strings) {
        if (cachedStrings[s]) {
          cachedTranslations[s] = cachedStrings[s];
        } else {
          stringsToTranslate.push(s);
        }
      }

      // All cached — return immediately
      if (stringsToTranslate.length === 0) {
        return NextResponse.json({ translations: cachedTranslations });
      }
    }

    // Build numbered list for Claude
    const numberedStrings = stringsToTranslate
      .map((s, i) => `${i + 1}. ${s}`)
      .join('\n');

    // For content translation, detect or use provided source language
    const sourceLanguage = sourceLang ? LANGUAGE_NAMES[sourceLang] : null;
    const fromClause = type === 'content' && sourceLanguage
      ? `from ${sourceLanguage} `
      : '';

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: `You are a professional translator for a home renovation and contractor management app. Translate the following text ${fromClause}to ${langName}.

Rules:
- Use industry-standard terminology for construction, plumbing, HVAC, electrical, and home renovation trades
- Keep translations natural and conversational, not overly formal
- Preserve any technical terms that are commonly used in English (e.g., "W-9", "ACH")
- For UI labels, keep translations concise — similar length to the original
${type === 'content' ? '- These are chat messages or notes between coworkers — preserve the tone and intent\n- If the text is already in the target language, return it unchanged' : ''}
- Return ONLY a JSON object mapping each original string to its ${langName} translation
- Do not add explanations or notes`,
      messages: [{
        role: 'user',
        content: `Translate these strings to ${langName}:\n\n${numberedStrings}\n\nReturn as JSON: {"original text": "translated text", ...}`,
      }],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

    // Parse JSON from response (strip markdown fences if present)
    const cleaned = responseText.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim();
    let newTranslations: Record<string, string>;

    try {
      newTranslations = JSON.parse(cleaned);
    } catch {
      console.error('Failed to parse translation response:', cleaned);
      return NextResponse.json({ error: 'Translation parsing failed' }, { status: 500 });
    }

    // Cache the results
    if (type === 'ui') {
      // Merge into the translations/{lang} doc
      const cacheRef = adminDb.collection('translations').doc(targetLang);
      const existing = (await cacheRef.get()).data()?.strings || {};
      await cacheRef.set({ strings: { ...existing, ...newTranslations } }, { merge: true });

      // Return all translations (cached + new)
      return NextResponse.json({
        translations: { ...cachedTranslations, ...newTranslations },
      });
    } else {
      // Content translations — match by position since Claude may alter keys
      const translationValues = Object.values(newTranslations);
      const resultByContentId: Record<string, string> = {};

      const batch = adminDb.batch();
      for (let i = 0; i < stringsToTranslate.length; i++) {
        const original = stringsToTranslate[i];
        // Try exact key match first, then fall back to positional match
        const translated = newTranslations[original] || translationValues[i];
        const contentId = contentIds[i];

        if (translated && contentId) {
          resultByContentId[contentId] = translated;
          const ref = adminDb.collection('contentTranslations').doc(contentId);
          batch.set(ref, { [targetLang]: translated, originalLang: sourceLang || 'en' }, { merge: true });
        }
      }
      await batch.commit();

      // Return keyed by content ID so the hook can match reliably
      return NextResponse.json({ translations: resultByContentId, byContentId: true });
    }
  } catch (err) {
    console.error('Translation error:', err);
    return NextResponse.json({ error: 'Translation failed' }, { status: 500 });
  }
}
