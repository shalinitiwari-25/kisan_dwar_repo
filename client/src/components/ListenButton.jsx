import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { speak, speakViaServer, stopSpeaking, speechSupported } from '../utils/speech';

// Fixed labels so the button itself never depends on the translation service.
const LISTEN = { en: 'Listen', hi: 'सुनें', pa: 'ਸੁਣੋ', or: 'ଶୁଣନ୍ତୁ', bn: 'শুনুন', mr: 'ऐका', gu: 'સાંભળો' };
const STOP   = { en: 'Stop',   hi: 'रुकें', pa: 'ਰੁਕੋ', or: 'ବନ୍ଦ',    bn: 'থামুন', mr: 'थांबा', gu: 'બંધ કરો' };

// Reads the important parts of the current screen aloud, in the farmer's language.
// Mark elements with  data-speak  to choose what is read (in page order).
// If a page has none, it falls back to the page title and card headings.
// Text of an element as it is typed in the DOM (not CSS-uppercased), with a
// space between separate pieces, e.g. "7" + "Position" -> "7 Position".
function plainText(el) {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const parts = [];
  let n;
  while ((n = walker.nextNode())) {
    const t = n.nodeValue.trim();
    if (t) parts.push(t);
  }
  return parts.join(' ');
}

function collectSpeech() {
  let els = Array.from(document.querySelectorAll('[data-speak]'));
  if (!els.length) {
    els = Array.from(document.querySelectorAll('.page-title, .page-subtitle, .card-title')).slice(0, 6);
  }
  return els
    .map((el) => plainText(el).replace(/[.!?।\s]+$/, ''))   // no trailing full stop; we add our own
    .filter(Boolean)
    .join('. ') + '.';
}

function ListenButton() {
  const { lang } = useLanguage();
  const location = useLocation();
  const [speaking, setSpeaking] = useState(false);
  const [hint, setHint] = useState('');

  // Stop talking when the farmer moves to another screen or changes language.
  useEffect(() => {
    stopSpeaking();
    setSpeaking(false);
    setHint('');
  }, [location.pathname, lang]);

  useEffect(() => () => stopSpeaking(), []);

  if (!speechSupported()) return null;

  const onClick = async () => {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    setHint('');
    const text = collectSpeech();
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

  return (
    <>
      <button
        type="button"
        className={`listen-btn${speaking ? ' listen-btn--on' : ''}`}
        onClick={onClick}
        aria-label={speaking ? 'Stop reading' : 'Read this screen aloud'}
        data-no-translate
      >
        <span className="listen-btn-icon">{speaking ? '⏹️' : '🔊'}</span>
        <span>{speaking ? (STOP[lang] || STOP.en) : (LISTEN[lang] || LISTEN.en)}</span>
      </button>
      {hint && (
        <div className="listen-hint" onClick={() => setHint('')}>{hint}</div>
      )}
    </>
  );
}

export default ListenButton;
