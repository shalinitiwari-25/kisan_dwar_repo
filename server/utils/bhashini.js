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

module.exports = { translate, translateWithBhashini, getBhashiniPipeline, isConfigured };
