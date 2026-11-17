import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useChatbot } from '../context/ChatbotContext';
import { useSpeaker, plainText } from '../hooks/useSpeaker';
import Icon from './Icon';
import { stopSpeaking, speechSupported } from '../utils/speech';

// Fixed labels so the button itself never depends on the translation service.
export const LISTEN = { en: 'Listen', hi: 'सुनें', pa: 'ਸੁਣੋ', or: 'ଶୁଣନ୍ତୁ', bn: 'শুনুন', mr: 'ऐका', gu: 'સાંભળો' };
export const STOP   = { en: 'Stop',   hi: 'रुकें', pa: 'ਰੁਕੋ', or: 'ବନ୍ଦ',    bn: 'থামুন', mr: 'थांबा', gu: 'બંધ કરો' };

// Reads the important parts of the current screen aloud, in the farmer's language.
// Mark elements with  data-speak  to choose what is read (in page order).
// If a page has none, it falls back to the page title and card headings.
function collectSpeech() {
  let els = Array.from(document.querySelectorAll('[data-speak]'));
  if (!els.length) {
    els = Array.from(document.querySelectorAll('.page-title, .page-subtitle, .card-title')).slice(0, 6);
  }
  const text = els
    .map((el) => plainText(el).replace(/[.!?।\s]+$/, ''))   // no trailing full stop; we add our own
    .filter(Boolean)
    .join('. ');
  return text ? `${text}.` : '';
}

function ListenButton() {
  const { lang } = useLanguage();
  const location = useLocation();
  const { open: chatOpen } = useChatbot();
  const { speaking, hint, setHint, say, stop } = useSpeaker(lang);

  // Stop talking when the farmer moves to another screen or changes language.
  useEffect(() => {
    stop();
    setHint('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, lang]);

  // KisanBot has its own Listen control in its header — silence the page reader.
  useEffect(() => {
    if (chatOpen) { stopSpeaking(); }
  }, [chatOpen]);

  // Hidden while KisanBot is open (its header has the Listen button), so it
  // can never be covered by the chat window.
  if (!speechSupported() || chatOpen) return null;

  const onClick = () => {
    if (speaking) { stop(); return; }
    say(collectSpeech());
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
        <span className="listen-btn-icon"><Icon name={speaking ? 'stop' : 'speaker'} size={22} /></span>
        <span>{speaking ? (STOP[lang] || STOP.en) : (LISTEN[lang] || LISTEN.en)}</span>
      </button>
      {hint && (
        <div className="listen-hint" onClick={() => setHint('')}>{hint}</div>
      )}
    </>
  );
}

export default ListenButton;
