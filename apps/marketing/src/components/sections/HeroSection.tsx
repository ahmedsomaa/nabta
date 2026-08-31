import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@heroui/react';
import { Section } from '@/components/PageContainer';
import { scrollToId } from '@/lib/scroll';

const proofs = ['one', 'two', 'three'] as const;

function DefaultVisual({ prefix }: { prefix: string }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm" aria-hidden>
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">
        {t(`${prefix}.heroVisualLabel`)}
      </p>
      <div className="space-y-2 font-mono text-sm">
        <div className="rounded-lg bg-accent/15 px-3 py-2 font-medium text-accent">Egyptian International School</div>
        <div className="ms-4 rounded-lg border border-border bg-background px-3 py-2">2026/2027</div>
        <div className="ms-8 rounded-lg border border-border bg-background px-3 py-2">Grade 10</div>
        <div className="ms-12 rounded-lg border border-border bg-background px-3 py-2">10A · Mathematics</div>
      </div>
    </div>
  );
}

export function HeroSection({
  prefix,
  secondaryTo,
  showCtas = true,
  visual,
  id = 'top',
}: {
  prefix: string;
  secondaryTo?: string;
  showCtas?: boolean;
  visual?: ReactNode;
  id?: string;
}) {
  const { t } = useTranslation();

  const go = (to: string) => {
    if (to.startsWith('#')) {
      scrollToId(to.slice(1));
      return;
    }
    window.location.assign(to);
  };

  return (
    <Section id={id} className="pt-10 md:pt-16">
      <div className="grid items-center gap-10 md:grid-cols-2">
        <div className="space-y-5 text-center md:text-start">
          <p className="text-sm font-medium text-accent">{t('app.tagline')}</p>
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">{t(`${prefix}.heroTitle`)}</h1>
          <p className="mx-auto max-w-xl text-lg text-muted md:mx-0">{t(`${prefix}.heroBody`)}</p>
          {showCtas ? (
            <div className="flex flex-wrap justify-center gap-3 md:justify-start">
              <Button variant="primary" onPress={() => go('#contact')}>
                {t(`${prefix}.ctaDemo`)}
              </Button>
              {secondaryTo ? (
                <Button variant="secondary" onPress={() => go(secondaryTo)}>
                  {t(`${prefix}.ctaSecondary`)}
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
        {visual ?? <DefaultVisual prefix={prefix} />}
      </div>
      <div className="mt-12 border-t border-border pt-8">
        <p className="mb-4 text-center text-sm text-muted">{t(`${prefix}.socialProof`)}</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {proofs.map((key) => (
            <span
              key={key}
              className="rounded-full border border-border bg-surface px-4 py-1.5 text-sm text-muted"
            >
              {t(`${prefix}.proof.${key}`)}
            </span>
          ))}
        </div>
      </div>
    </Section>
  );
}
