import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import ja from './locales/ja.json';

// Get saved language from localStorage or default to Japanese
const savedLanguage = localStorage.getItem('language') || 'ja';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ja: { translation: ja },
  },
  lng: savedLanguage,
  fallbackLng: 'ja',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
