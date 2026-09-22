import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { translatePage, observePageForTranslation } from '../utils/pageTranslator';

const LanguageContext = createContext(null);

const STORAGE_KEY = 'kd_lang';

// English + Hindi, translated via the Bhashini API (server-side).
export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi',   nativeName: 'हिंदी' },
];

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem(STORAGE_KEY) || 'en');
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
    translatePage(lang);
  }, [lang]);

  const toggleLang = () => setLang((prev) => (prev === 'en' ? 'hi' : 'en'));

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, languages: SUPPORTED_LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
  return ctx;
}
