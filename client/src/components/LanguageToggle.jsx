import { useLanguage } from '../context/LanguageContext';

// Still named/exported as "LanguageToggle" since that's what's imported
// elsewhere in the app, even though it's now a picker across all
// supported languages rather than a two-way en/hi toggle.
function LanguageToggle({ style }) {
  const { lang, setLang, languages, translateError } = useLanguage();

  return (
    <div className="lang-select-container" style={style}>
      <div className="lang-select-wrap" data-no-translate>
        <span className="lang-select-icon" aria-hidden="true">🌐</span>
        <select
          className="lang-select"
          value={lang}
          onChange={(e) => setLang(e.target.value)}
          title="Choose language"
          aria-label="Choose language"
        >
          {languages.map((l) => (
            <option key={l.code} value={l.code}>
              {l.nativeName}
            </option>
          ))}
        </select>
      </div>
      {translateError && (
        <div className="lang-select-error" data-no-translate>
          Translation unavailable for this language right now.
        </div>
      )}
    </div>
  );
}

export default LanguageToggle;
