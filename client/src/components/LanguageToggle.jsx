import { useLanguage } from '../context/LanguageContext';

function LanguageToggle({ style }) {
  const { lang, toggleLang } = useLanguage();

  return (
    <button
      type="button"
      data-no-translate
      className={`lang-btn ${lang === 'en' ? 'active' : ''}`}
      onClick={toggleLang}
      title="Toggle Language"
      style={style}
    >
      {lang === 'en' ? '🇮🇳 हिंदी' : '🇬🇧 English'}
    </button>
  );
}

export default LanguageToggle;
