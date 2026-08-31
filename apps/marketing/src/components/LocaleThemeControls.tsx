import { useTranslation } from 'react-i18next';
import { Button, Tooltip } from '@heroui/react';
import { Languages, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/features/theme/ThemeProvider';

export function LocaleThemeControls() {
  const { t, i18n } = useTranslation();
  const { resolved, setTheme } = useTheme();

  const isArabic = i18n.language === 'ar' || i18n.language.startsWith('ar');
  const localeLabel = isArabic ? t('locale.switchToEnglish') : t('locale.switchToArabic');
  const themeLabel = resolved === 'dark' ? t('theme.switchToLight') : t('theme.switchToDark');

  const toggleLocale = () => {
    const next = isArabic ? 'en' : 'ar';
    void i18n.changeLanguage(next);
    localStorage.setItem('nabta.locale', next);
    document.documentElement.lang = next;
    document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr';
  };

  return (
    <div className="inline-flex items-center gap-0.5">
      <Tooltip delay={400}>
        <Button isIconOnly size="sm" variant="ghost" aria-label={localeLabel} onPress={toggleLocale}>
          <Languages className="size-4" aria-hidden />
        </Button>
        <Tooltip.Content>
          <Tooltip.Arrow />
          {localeLabel}
        </Tooltip.Content>
      </Tooltip>
      <Tooltip delay={400}>
        <Button
          isIconOnly
          size="sm"
          variant="ghost"
          aria-label={themeLabel}
          onPress={() => setTheme(resolved === 'dark' ? 'light' : 'dark')}
        >
          {resolved === 'dark' ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />}
        </Button>
        <Tooltip.Content>
          <Tooltip.Arrow />
          {themeLabel}
        </Tooltip.Content>
      </Tooltip>
    </div>
  );
}
