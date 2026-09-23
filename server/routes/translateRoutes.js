const express = require('express');
const router = express.Router();
const { translate, isConfigured } = require('../utils/bhashini');

// POST /api/translate  { texts: string[], target: 'hi' | 'en' | ... }
// -> { translations: string[] }  (same order/length as the input `texts`)
router.post('/', async (req, res) => {
  const { texts, target } = req.body || {};

  if (!Array.isArray(texts) || texts.length === 0) {
    return res.status(400).json({ message: 'texts must be a non-empty array of strings' });
  }
  if (!target || typeof target !== 'string') {
    return res.status(400).json({ message: 'target language code is required' });
  }

  if (!isConfigured()) {
    return res.status(500).json({
      message: 'Bhashini is not configured. Add BHASHINI_USER_ID and BHASHINI_API_KEY to server/.env',
    });
  }

  try {
    const translations = await translate(texts, target);
    res.json({ translations });
  } catch (error) {
    console.error('Bhashini translate route error:', error);
    res.status(502).json({ message: error.message || 'Translation service error' });
  }
});

module.exports = router;
