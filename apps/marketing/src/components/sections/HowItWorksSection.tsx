import { useTranslation } from 'react-i18next';
import { Section } from '@/components/PageContainer';

const defaultSteps = ['one', 'two', 'three'] as const;

export function HowItWorksSection({
  prefix,
  keys = defaultSteps,
  id,
}: {
  prefix: string;
  keys?: readonly string[];
  id?: string;
}) {
  const { t } = useTranslation();
  return (
    <Section id={id}>
      <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">{t(`${prefix}.howTitle`)}</h2>
      <p className="mt-2 max-w-2xl text-muted">{t(`${prefix}.howSubtitle`)}</p>
      <ol className="mt-8 space-y-6">
        {keys.map((key, index) => (
          <li key={key} className="flex gap-4">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
              {index + 1}
            </span>
            <div>
              <h3 className="font-semibold">{t(`${prefix}.steps.${key}.title`)}</h3>
              <p className="mt-1 text-muted">{t(`${prefix}.steps.${key}.body`)}</p>
            </div>
          </li>
        ))}
      </ol>
    </Section>
  );
}
