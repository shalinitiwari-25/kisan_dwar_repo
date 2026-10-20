/**
 * bhashini.js — shared client for the Bhashini (Digital India / NLTM)
 * translation API. Used by:
 *   - routes/translateRoutes.js  (translating on-screen UI text)
 *   - utils/notify.js            (translating SMS / alert text for farmers)
 *
 * Two-step flow:
 *   1. getModelsPipeline — tell it source+target language, it returns
 *      which model (serviceId) handles that pair, plus a compute
 *      endpoint + inference key to call that model with.
 *   2. compute endpoint — send the actual text(s) to translate.
 *
 * Step 1's result is cached in memory per target language so it's only
 * called once per language, not on every translation request.
 */

const SOURCE_LANG = 'en';

// Translated-text cache so the same string is never sent out twice while
// the server is running. Key: "<target>::<text>".
const translationCache = new Map();

// Caches the {computeUrl, header, serviceId} needed to call the actual
// translation model for a given target language.
const pipelineCache = new Map(); // target -> config

// Public "translation" pipeline ID used across Bhashini's own examples —
// override with BHASHINI_PIPELINE_ID in .env if your Bhashini dashboard
// issues you a different one.
const DEFAULT_PIPELINE_ID = '64392f96daac500b55c543cd';

function isConfigured() {
  return !!(process.env.BHASHINI_USER_ID && process.env.BHASHINI_API_KEY);
}

async function getBhashiniPipeline(target) {
  if (pipelineCache.has(target)) return pipelineCache.get(target);

  const response = await fetch('https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      userID: process.env.BHASHINI_USER_ID,
      ulcaApiKey: process.env.BHASHINI_API_KEY,
    },
    body: JSON.stringify({
      pipelineTasks: [
        { taskType: 'translation', config: { language: { sourceLanguage: SOURCE_LANG, targetLanguage: target } } },
      ],
      pipelineRequestConfig: { pipelineId: process.env.BHASHINI_PIPELINE_ID || DEFAULT_PIPELINE_ID },
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.message || `Bhashini pipeline lookup failed (${response.status})`);
  }

  const serviceId = data?.pipelineResponseConfig?.[0]?.config?.[0]?.serviceId;
  const computeUrl = data?.pipelineInferenceAPIEndPoint?.callbackUrl;
  const inferenceKey = data?.pipelineInferenceAPIEndPoint?.inferenceApiKey;

  if (!serviceId || !computeUrl || !inferenceKey?.name || !inferenceKey?.value) {
    throw new Error('Unexpected response shape from Bhashini getModelsPipeline');
  }

  const config = { computeUrl, headerName: inferenceKey.name, headerValue: inferenceKey.value, serviceId };
  pipelineCache.set(target, config);
  return config;
}

async function translateWithBhashini(texts, target) {
  const { computeUrl, headerName, headerValue, serviceId } = await getBhashiniPipeline(target);

  const response = await fetch(computeUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', [headerName]: headerValue },
    body: JSON.stringify({
      pipelineTasks: [
        {
          taskType: 'translation',
          config: { language: { sourceLanguage: SOURCE_LANG, targetLanguage: target }, serviceId },
        },
      ],
      inputData: { input: texts.map((source) => ({ source })) },
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.message || `Bhashini translation request failed (${response.status})`);
  }

  const output = data?.pipelineResponse?.[0]?.output;
  if (!Array.isArray(output)) throw new Error('Unexpected response shape from Bhashini compute API');

  return output.map((o, i) => o?.target || texts[i]);
}

// translate() with the same per-string cache used by the /api/translate
// route, so a phrase already translated once (e.g. from page text) is
// reused instead of billed/fetched again.
async function translate(texts, target) {
  if (target === SOURCE_LANG) return texts;

  const results = new Array(texts.length);
  const toFetch = [];
  const toFetchIdx = [];

  texts.forEach((t, i) => {
    const key = `${target}::${t}`;
    if (translationCache.has(key)) {
      results[i] = translationCache.get(key);
    } else {
      toFetch.push(t);
      toFetchIdx.push(i);
    }
  });

  if (toFetch.length > 0) {
    const translated = await translateWithBhashini(toFetch, target);
    toFetch.forEach((t, j) => {
      results[toFetchIdx[j]] = translated[j];
      translationCache.set(`${target}::${t}`, translated[j]);
    });
  }

  return results;
}

// ─────────────────────────────────────────────────────────────
// Text-to-speech (Bhashini "tts" task) — used by /api/tts so the
// 🔊 Listen button works even when the phone has no voice installed
// for a language (Punjabi, Odia, etc).
// Same two-step flow as translation: look up the model, then call it.
// ─────────────────────────────────────────────────────────────
const ttsPipelineCache = new Map(); // lang -> config
const ttsAudioCache = new Map();    // "<lang>::<text>" -> base64 audio
const TTS_GENDER = 'female';

async function getTtsPipeline(lang, { fresh = false } = {}) {
  if (!fresh && ttsPipelineCache.has(lang)) return ttsPipelineCache.get(lang);

  const response = await fetch('https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      userID: process.env.BHASHINI_USER_ID,
      ulcaApiKey: process.env.BHASHINI_API_KEY,
    },
    body: JSON.stringify({
      pipelineTasks: [
        { taskType: 'tts', config: { language: { sourceLanguage: lang }, gender: TTS_GENDER } },
      ],
      pipelineRequestConfig: { pipelineId: process.env.BHASHINI_PIPELINE_ID || DEFAULT_PIPELINE_ID },
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.message || `Bhashini TTS pipeline lookup failed (${response.status})`);
  }

  const serviceId = data?.pipelineResponseConfig?.[0]?.config?.[0]?.serviceId;
  const computeUrl = data?.pipelineInferenceAPIEndPoint?.callbackUrl;
  const inferenceKey = data?.pipelineInferenceAPIEndPoint?.inferenceApiKey;
  if (!serviceId || !computeUrl || !inferenceKey?.name || !inferenceKey?.value) {
    throw new Error(`Bhashini has no text-to-speech model for "${lang}" on this API key`);
  }

  const config = { computeUrl, headerName: inferenceKey.name, headerValue: inferenceKey.value, serviceId };
  ttsPipelineCache.set(lang, config);
  return config;
}

async function callTts(texts, lang, cfg) {
  const response = await fetch(cfg.computeUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', [cfg.headerName]: cfg.headerValue },
    body: JSON.stringify({
      pipelineTasks: [
        {
          taskType: 'tts',
          config: { language: { sourceLanguage: lang }, serviceId: cfg.serviceId, gender: TTS_GENDER, samplingRate: 8000 },
        },
      ],
      inputData: { input: texts.map((source) => ({ source })) },
    }),
  });
  const data = await response.json();
  if (!response.ok) {
    const err = new Error(data?.message || `Bhashini TTS request failed (${response.status})`);
    err.status = response.status;
    throw err;
  }
  const audio = data?.pipelineResponse?.[0]?.audio;
  if (!Array.isArray(audio) || audio.length === 0) throw new Error('Unexpected response shape from Bhashini TTS');
  return audio.map((a) => a?.audioContent || '');
}

// Returns base64 audio strings (usually one per input text, in order).
async function textToSpeech(texts, lang) {
  const keys = texts.map((t) => `${lang}::${t}`);
  if (keys.every((k) => ttsAudioCache.has(k))) return keys.map((k) => ttsAudioCache.get(k));

  let cfg = await getTtsPipeline(lang);
  let audio;
  try {
    audio = await callTts(texts, lang, cfg);
  } catch (err) {
    // The inference key can expire — look the model up again once and retry.
    cfg = await getTtsPipeline(lang, { fresh: true });
    audio = await callTts(texts, lang, cfg);
  }

  if (audio.length === texts.length) {
    texts.forEach((t, i) => { if (audio[i]) ttsAudioCache.set(keys[i], audio[i]); });
  }
  return audio;
}

module.exports = { translate, translateWithBhashini, getBhashiniPipeline, isConfigured, getTtsPipeline, textToSpeech };

