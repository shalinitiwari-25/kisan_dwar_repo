import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

// First-launch language chooser: big buttons in each language's OWN script,
// so a farmer can recognise their language without reading English.
const CHOSEN_KEY = 'kd_lang_chosen';

const HEADINGS = [
  'Choose your language',
  'अपनी भाषा चुनें',
  'ਆਪਣੀ ਭਾਸ਼ਾ ਚੁਣੋ',
  'ଆପଣଙ୍କ ଭାଷା ବାଛନ୍ତୁ',
  'আপনার ভাষা বেছে নিন',
  'तुमची भाषा निवडा',
  'તમારી ભાષા પસંદ કરો',
];

function LanguageWelcome() {
  const { setLang, languages } = useLanguage();
  const [visible, setVisible] = useState(() => {
    try {
      // Already picked a language before (this flag, or the older kd_lang key)? Don't ask again.
      return !localStorage.getItem(CHOSEN_KEY) && !localStorage.getItem('kd_lang');
    } catch { return false; }
  });

  if (!visible) return null;

  const choose = (code) => {
    try { localStorage.setItem(CHOSEN_KEY, '1'); } catch { /* ignore */ }
    setLang(code);
    setVisible(false);
  };

  return (
    <div className="lang-welcome" data-no-translate role="dialog" aria-modal="true">
      <div className="lang-welcome-inner">
        <div className="lang-welcome-logo">🌾</div>
        <div className="lang-welcome-heads">
          {HEADINGS.map((h) => <div key={h}>{h}</div>)}
        </div>
        <div className="lang-welcome-grid">
          {languages.map((l) => (
            <button key={l.code} type="button" className="lang-welcome-btn" onClick={() => choose(l.code)}>
              {l.nativeName}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default LanguageWelcome;
