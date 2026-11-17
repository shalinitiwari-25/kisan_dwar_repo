import { useEffect, useState } from 'react';
import { speak, speakViaServer, stopSpeaking } from '../utils/speech';

// Text of an element as it is typed in the DOM (not CSS-uppercased), with a
// space between separate pieces, e.g. "7" + "Position" -> "7 Position".
// Reading the DOM (not React state) means we read the TRANSLATED text the
// farmer actually sees on screen.
export function plainText(el) {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const parts = [];
  let n;
  while ((n = walker.nextNode())) {
    const t = n.nodeValue.trim();
    if (t) parts.push(t);
  }
  return parts.join(' ');
}

// Shared "read this aloud" logic used by the Listen button and by KisanBot.
export function useSpeaker(lang) {
  const [speaking, setSpeaking] = useState(false);
  const [hint, setHint] = useState('');

  useEffect(() => () => stopSpeaking(), []);

  const stop = () => {
    stopSpeaking();
    setSpeaking(false);
  };

  const say = async (text) => {
    if (!text) return;
    setHint('');
    setSpeaking(true);
    let res;
    try {
      res = await speak(text, lang, () => setSpeaking(false));
      // No voice for this language on the phone -> use the Bhashini voice from our server.
      if (!res.ok && res.reason === 'no-voice') {
        res = await speakViaServer(text, lang, () => setSpeaking(false));
      }
    } catch {
      res = { ok: false, reason: 'error' };
    }
    if (!res.ok) {
      setSpeaking(false);
      setHint(
        navigator.onLine
          ? 'The voice could not be loaded right now. Please try again in a moment, or ask the Mandi officer for help.'
          : 'No internet. The voice for this language needs internet on this phone. Please connect and try again, or ask the Mandi officer for help.'
      );
    }
  };

  return { speaking, hint, setHint, say, stop };
}
