import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '@nabta/i18n/en.json';
import ar from '@nabta/i18n/ar.json';

const saved = localStorage.getItem('nabta.locale');
const locale = saved === 'ar' || saved === 'en' ? saved : 'en';

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ar: { translation: ar },
  },
  lng: locale,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

document.documentElement.lang = locale;
document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';

export default i18n;
