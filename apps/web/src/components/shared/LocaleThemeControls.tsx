import { useTranslation } from 'react-i18next';
import { Button } from '@heroui/react';
import { useTheme } from '@/features/theme/ThemeProvider';

export function LocaleThemeControls() {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();

  const toggleLocale = () => {
    const next = i18n.language === 'ar' ? 'en' : 'ar';
    void i18n.changeLanguage(next);
    localStorage.setItem('nabta.locale', next);
    document.documentElement.lang = next;
    document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr';
  };

  const cycleTheme = () => {
    const order = ['system', 'light', 'dark'] as const;
    const idx = order.indexOf(theme);
    setTheme(order[(idx + 1) % order.length]!);
  };

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="secondary" onPress={toggleLocale}>
        {i18n.language === 'ar' ? t('locale.en') : t('locale.ar')}
      </Button>
      <Button size="sm" variant="secondary" onPress={cycleTheme}>
        {t(`theme.${theme}`)}
      </Button>
    </div>
  );
}
