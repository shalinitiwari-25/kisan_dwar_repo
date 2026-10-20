// Text-to-speech helpers (browser SpeechSynthesis — free, no server, works on
// Android Chrome using the phone's installed voices).

export const VOICE_LANG = {
  en: 'en-IN', hi: 'hi-IN', pa: 'pa-IN', or: 'or-IN', bn: 'bn-IN', mr: 'mr-IN', gu: 'gu-IN',
};

export function speechSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}

// Voices load asynchronously on Chrome — wait briefly for them.
function getVoicesAsync() {
  return new Promise((resolve) => {
    const synth = window.speechSynthesis;
    const now = synth.getVoices();
    if (now.length) return resolve(now);
    const done = () => { synth.removeEventListener('voiceschanged', done); resolve(synth.getVoices()); };
    synth.addEventListener('voiceschanged', done);
    setTimeout(done, 1200);
  });
}

function findVoice(voices, tag) {
  const base = tag.split('-')[0].toLowerCase();
  return (
    voices.find((v) => v.lang.replace('_', '-').toLowerCase() === tag.toLowerCase()) ||
    voices.find((v) => v.lang.toLowerCase().startsWith(base))
  );
}

// Indian-language scripts: Devanagari … Odia/Malayalam block range.
const hasIndicScript = (t) => /[\u0900-\u0D7F]/.test(t);

// Make text friendlier for a speech engine.
export function cleanForSpeech(text) {
  return text
    .replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, '')        // emojis would be read out by name
    .replace(/\bKD-0*(\d+)\b/gi, 'K D, $1')                           // token KD-00028 -> "K D, 28"
    .replace(/#\s*(\d+)/g, '$1')
    .replace(/[~·•|]/g, ', ')
    .replace(/\s*\n+\s*/g, '. ')
    .replace(/\s+,/g, ',')
    .replace(/\.{2,}/g, '.')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function splitSentences(text) {
  // Long utterances get cut off by Chrome, so speak sentence by sentence.
  return text.split(/(?<=[.!?।])\s+/).map((s) => s.trim()).filter(Boolean);
}

export function stopSpeaking() {
  if (speechSupported()) window.speechSynthesis.cancel();
}

/**
 * Speak `text` in language `langCode` ('hi', 'pa', …).
 * Returns { ok: boolean, reason?: 'unsupported' | 'no-voice' | 'empty' }.
 * onEnd is called when speech finishes or is cancelled.
 */
export async function speak(text, langCode, onEnd = () => {}) {
  if (!speechSupported()) return { ok: false, reason: 'unsupported' };
  const clean = cleanForSpeech(text);
  if (!clean) return { ok: false, reason: 'empty' };

  const synth = window.speechSynthesis;
  const voices = await getVoicesAsync();
  const wantTag = VOICE_LANG[langCode] || 'en-IN';

  // If we have voices at all, but none for this language, don't mumble
  // Indian script in an English voice — tell the caller instead.
  const wantsIndic = langCode !== 'en' && hasIndicScript(clean);
  if (wantsIndic && voices.length > 0 && !findVoice(voices, wantTag)) {
    return { ok: false, reason: 'no-voice' };
  }

  synth.cancel();
  const chunks = splitSentences(clean);
  chunks.forEach((chunk, i) => {
    const u = new SpeechSynthesisUtterance(chunk);
    // Text that is still English (translation not loaded) is read with an English voice.
    const tag = hasIndicScript(chunk) ? wantTag : 'en-IN';
    const voice = findVoice(voices, tag);
    if (voice) u.voice = voice;
    u.lang = voice ? voice.lang : tag;
    u.rate = 0.9;   // a little slower — easier to follow
    u.pitch = 1;
    if (i === chunks.length - 1) {
      u.onend = onEnd;
      u.onerror = onEnd;
    }
    synth.speak(u);
  });
  return { ok: true };
}
