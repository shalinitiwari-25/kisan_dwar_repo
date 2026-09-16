const express = require('express');
const router = express.Router();

const SOURCE_LANG = 'en';

// Translated-text cache so the same string is never sent out twice while
// the server is running. Key: "<target>::<text>".
const cache = new Map();

// MyMemory (https://mymemory.translated.net) — free, keyless translation
// API. No signup, no API key, works immediately. It only accepts one
// string per request (max ~500 chars), so we translate in small parallel
// batches. Anonymous use gets ~5,000 words/day; setting MYMEMORY_EMAIL in
// server/.env (just a contact email, no signup) raises that to ~50,000
// words/day, still free.
async function translateOne(text, target) {
  const params = new URLSearchParams({
    q: text.slice(0, 480), // stay under MyMemory's per-request length limit
    langpair: `${SOURCE_LANG}|${target}`,
  });
  if (process.env.MYMEMORY_EMAIL) {
    params.set('de', process.env.MYMEMORY_EMAIL);
  }

  try {
    const response = await fetch(`https://api.mymemory.translated.net/get?${params.toString()}`);
    const data = await response.json();
    const translated = data?.responseData?.translatedText;

    // MyMemory returns a translated-looking string even when the daily
    // quota is exceeded, but it embeds a warning in the text — fall back
    // to the original text in that case rather than showing the warning.
    if (!translated || /MYMEMORY WARNING/i.test(translated)) {
      return text;
    }
    return translated;
  } catch (err) {
    console.warn('MyMemory translate failed for one string:', err.message);
    return text;
  }
}

// POST /api/translate  { texts: string[], target: 'hi' | 'en' }
// -> { translations: string[] }  (same order/length as the input `texts`)
router.post('/', async (req, res) => {
  const { texts, target } = req.body || {};

  if (!Array.isArray(texts) || texts.length === 0) {
    return res.status(400).json({ message: 'texts must be a non-empty array of strings' });
  }
  if (!target || typeof target !== 'string') {
    return res.status(400).json({ message: 'target language code is required' });
  }

  try {
    const results = new Array(texts.length);
    const toFetch = [];
    const toFetchIdx = [];

    texts.forEach((t, i) => {
      const key = `${target}::${t}`;
      if (cache.has(key)) {
        results[i] = cache.get(key);
      } else {
        toFetch.push(t);
        toFetchIdx.push(i);
      }
    });

    const BATCH_SIZE = 8;
    for (let i = 0; i < toFetch.length; i += BATCH_SIZE) {
      const batchTexts = toFetch.slice(i, i + BATCH_SIZE);
      const batchIdx = toFetchIdx.slice(i, i + BATCH_SIZE);
      const translations = await Promise.all(batchTexts.map((t) => translateOne(t, target)));
      translations.forEach((translated, j) => {
        results[batchIdx[j]] = translated;
        cache.set(`${target}::${batchTexts[j]}`, translated);
      });
    }

    res.json({ translations: results });
  } catch (error) {
    console.error('Translate route error:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
