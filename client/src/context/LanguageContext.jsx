import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { translatePage, observePageForTranslation } from '../utils/pageTranslator';

const LanguageContext = createContext(null);

const STORAGE_KEY = 'kd_lang';

// English + 6 Indian languages, translated via the Bhashini API
// (server-side). Codes are ISO 639-1, which is what Bhashini expects.
// Not every language here is guaranteed to be enabled on every Bhashini
// API key — if a language your key doesn't support is picked, the
// picker shows an inline error instead of silently doing nothing.
export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English',  nativeName: 'English' },
  { code: 'hi', name: 'Hindi',    nativeName: 'हिंदी' },
  { code: 'pa', name: 'Punjabi',  nativeName: 'ਪੰਜਾਬੀ' },
  { code: 'or', name: 'Odia',     nativeName: 'ଓଡ଼ିଆ' },
  { code: 'bn', name: 'Bengali',  nativeName: 'বাংলা' },
  { code: 'mr', name: 'Marathi',  nativeName: 'मराठी' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
];

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem(STORAGE_KEY) || 'en');
  const [translateError, setTranslateError] = useState(null);
  const langRef = useRef(lang);
  langRef.current = lang;

  // Keep the DOM in sync with the chosen language, and keep re-translating
  // new content (route changes, data loading in, etc.) automatically.
  useEffect(() => {
    const stopObserving = observePageForTranslation(() => langRef.current);
    return stopObserving;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang;
    setTranslateError(null);
    translatePage(lang, undefined, (message) => setTranslateError(message));
  }, [lang]);

  return (
    <LanguageContext.Provider
      value={{ lang, setLang, languages: SUPPORTED_LANGUAGES, translateError }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
  return ctx;
}
