import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18nManager } from 'react-native';
import en from '@nabta/i18n/en.json';
import ar from '@nabta/i18n/ar.json';

type AppLocale = 'en' | 'ar';

function initialLocale(): AppLocale {
  return 'en';
}

const locale = initialLocale();

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ar: { translation: ar },
  },
  lng: locale,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

I18nManager.allowRTL(true);
I18nManager.forceRTL(locale === 'ar');

export default i18n;
