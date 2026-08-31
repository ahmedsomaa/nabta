import { useTranslation } from 'react-i18next';
import { Button } from '@heroui/react';
import { scrollToId } from '@/lib/scroll';

export function CtaBand({ prefix }: { prefix: string }) {
  const { t } = useTranslation();
  return (
    <section className="w-full bg-accent px-4 py-16 text-accent-foreground">
      <div className="mx-auto flex max-w-5xl flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
        <div className="max-w-xl space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">{t(`${prefix}.ctaTitle`)}</h2>
          <p className="text-accent-foreground/85">{t(`${prefix}.ctaBody`)}</p>
        </div>
        <Button variant="secondary" onPress={() => scrollToId('contact')}>
          {t(`${prefix}.ctaDemo`)}
        </Button>
      </div>
    </section>
  );
}
