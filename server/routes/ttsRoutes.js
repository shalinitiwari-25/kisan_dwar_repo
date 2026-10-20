const express = require('express');
const router = express.Router();
const { textToSpeech, getTtsPipeline, isConfigured } = require('../utils/bhashini');

// Languages the app offers (English is read by the phone's own voice).
const ALLOWED = ['hi', 'pa', 'or', 'bn', 'mr', 'gu'];
const MAX_TEXTS = 10;
const MAX_CHARS = 400;

// POST /api/tts  { texts: string[], target: 'pa' | 'or' | ... }
// -> { audio: string[] }   base64 WAV audio, in the same order as `texts`
router.post('/', async (req, res) => {
  const { texts, target } = req.body || {};

  if (!ALLOWED.includes(target)) {
    return res.status(400).json({ message: `target must be one of: ${ALLOWED.join(', ')}` });
  }
  if (!Array.isArray(texts) || texts.length === 0 || texts.length > MAX_TEXTS ||
      texts.some((t) => typeof t !== 'string' || !t.trim() || t.length > MAX_CHARS)) {
    return res.status(400).json({ message: `texts must be 1-${MAX_TEXTS} non-empty strings of at most ${MAX_CHARS} characters` });
  }
  if (!isConfigured()) {
    return res.status(500).json({ message: 'Bhashini is not configured. Add BHASHINI_USER_ID and BHASHINI_API_KEY to server/.env' });
  }

  try {
    const audio = await textToSpeech(texts.map((t) => t.trim()), target);
    res.json({ audio });
  } catch (error) {
    console.error('Bhashini TTS route error:', error.message);
    res.status(502).json({ message: error.message || 'Text-to-speech service error' });
  }
});

// GET /api/tts/check/:lang — quick way to see whether your Bhashini key has a
// voice for a language, without playing anything. Open it in a browser.
router.get('/check/:lang', async (req, res) => {
  const { lang } = req.params;
  if (!ALLOWED.includes(lang)) return res.status(400).json({ ok: false, message: 'unsupported language' });
  if (!isConfigured()) return res.status(500).json({ ok: false, message: 'Bhashini is not configured' });
  try {
    const cfg = await getTtsPipeline(lang, { fresh: true });
    res.json({ ok: true, lang, serviceId: cfg.serviceId });
  } catch (error) {
    res.status(502).json({ ok: false, lang, message: error.message });
  }
});

module.exports = router;
