import { translateTexts } from '../services/api';

// localStorage-backed cache: { [targetLangCode]: { [englishText]: translatedText } }
// Avoids re-calling the API for text we've already translated in this browser.
const CACHE_KEY = 'kd_translate_cache_v1';
let cache = null;

function loadCache() {
  if (cache) return cache;
  try {
    cache = JSON.parse(localStorage.getItem(CACHE_KEY)) || {};
  } catch {
    cache = {};
  }
  return cache;
}

function saveCache() {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // storage full or unavailable — fine, just means no persistence
  }
}

// Keep track of which live DOM nodes we've translated, and what their
// ORIGINAL ENGLISH text was — this is the source of truth we always
// translate from, so switching directly between two non-English
// languages (e.g. Hindi -> Tamil) re-translates from English rather
// than from whatever script happens to be on screen right now.
const originalTextMap = new WeakMap(); // Node -> original English string
const translatedNodes = new Set();     // Nodes we've mutated at least once

function hasTranslatableChars(str) {
  return /[a-zA-Z]/.test(str) && str.trim().length > 0;
}

function collectTextNodes(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      const tag = parent.tagName;
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') return NodeFilter.FILTER_REJECT;
      if (parent.closest('[data-no-translate]')) return NodeFilter.FILTER_REJECT;
      // Accept plain English text nodes, AND nodes we've already
      // translated before (their current text may be in Hindi/Tamil/etc,
      // with no Latin characters left, but we still need to consider
      // them so they can be re-translated into a newly-picked language).
      if (!hasTranslatableChars(node.nodeValue) && !translatedNodes.has(node)) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const nodes = [];
  let n;
  while ((n = walker.nextNode())) nodes.push(n);
  return nodes;
}

function collectPlaceholderEls(root) {
  const els = root.querySelectorAll ? root.querySelectorAll('input[placeholder], textarea[placeholder]') : [];
  return Array.from(els).filter((el) => {
    if (el.closest('[data-no-translate]')) return false;
    return hasTranslatableChars(el.placeholder) || el.dataset.origPlaceholder;
  });
}

async function resolveTranslations(texts, target, onError) {
  const store = loadCache();
  const targetStore = store[target] || (store[target] = {});
  const uniqueToFetch = [...new Set(texts.filter((t) => !(t in targetStore)))];

  if (uniqueToFetch.length > 0) {
    try {
      const res = await translateTexts(uniqueToFetch, target);
      const translations = res.data.translations;
      uniqueToFetch.forEach((t, i) => {
        targetStore[t] = translations[i] || t;
      });
      saveCache();
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Translation request failed';
      console.warn('Translation request failed:', message);
      // Fall back to original text so the UI doesn't break...
      uniqueToFetch.forEach((t) => {
        targetStore[t] = t;
      });
      // ...but still let the caller know, so it can show something to
      // the user instead of the page just silently staying in English.
      if (onError) onError(message);
    }
  }
  return targetStore;
}

let applyingMutation = false;

export function isApplyingTranslation() {
  return applyingMutation;
}

// Translate everything currently rendered under `root` into `target`
// (e.g. 'hi', 'ta', 'bn', ...), or restore original English if target
// is 'en'. Safe to call directly from any language to any other
// language — it always translates from the stored original English
// text, never from whatever is currently on screen.
export async function translatePage(target, root = document.getElementById('root') || document.body, onError) {
  if (!root) return;

  if (target === 'en') {
    restoreOriginal();
    return;
  }

  const textNodes = collectTextNodes(root);
  const placeholderEls = collectPlaceholderEls(root);

  // Always resolve the true original English source text, falling back
  // to the node's current text only the first time we ever see it.
  const nodeTexts = textNodes.map((n) => originalTextMap.get(n) || n.nodeValue);
  const placeholderTexts = placeholderEls.map((el) => el.dataset.origPlaceholder || el.placeholder);

  const store = await resolveTranslations([...nodeTexts, ...placeholderTexts], target, onError);

  applyingMutation = true;
  try {
    textNodes.forEach((node, i) => {
      const original = nodeTexts[i];
      if (!originalTextMap.has(node)) originalTextMap.set(node, original);
      const translated = store[original];
      if (translated && translated !== node.nodeValue) {
        node.nodeValue = translated;
      }
      translatedNodes.add(node);
    });

    placeholderEls.forEach((el, i) => {
      const original = placeholderTexts[i];
      if (!el.dataset.origPlaceholder) el.dataset.origPlaceholder = original;
      const translated = store[original];
      if (translated && translated !== el.placeholder) {
        el.placeholder = translated;
      }
    });
  } finally {
    applyingMutation = false;
  }
}

function restoreOriginal() {
  applyingMutation = true;
  try {
    for (const node of translatedNodes) {
      if (node.isConnected && originalTextMap.has(node)) {
        node.nodeValue = originalTextMap.get(node);
      }
    }
    translatedNodes.clear();

    document.querySelectorAll('[data-orig-placeholder]').forEach((el) => {
      el.placeholder = el.dataset.origPlaceholder;
      delete el.dataset.origPlaceholder;
    });
  } finally {
    applyingMutation = false;
  }
}

// Watches for DOM changes (route changes, live data loading, etc.) and
// re-translates any newly-rendered English text automatically, as long
// as the current language isn't English.
export function observePageForTranslation(getCurrentLang, root = document.getElementById('root') || document.body) {
  if (!root) return () => {};

  let debounceTimer = null;
  const observer = new MutationObserver(() => {
    if (applyingMutation) return;
    const lang = getCurrentLang();
    if (lang === 'en') return;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      translatePage(lang, root);
    }, 250);
  });

  observer.observe(root, { childList: true, subtree: true, characterData: true });

  return () => {
    clearTimeout(debounceTimer);
    observer.disconnect();
  };
}
