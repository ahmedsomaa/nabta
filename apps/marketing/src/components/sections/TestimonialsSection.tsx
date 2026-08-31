import { useTranslation } from 'react-i18next';
import { Card, Chip } from '@heroui/react';
import { Section } from '@/components/PageContainer';

const defaultItems = ['one', 'two'] as const;

export function TestimonialsSection({
  prefix,
  keys = defaultItems,
}: {
  prefix: string;
  keys?: readonly string[];
}) {
  const { t } = useTranslation();
  return (
    <Section>
      <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
        {t(`${prefix}.testimonialsTitle`)}
      </h2>
      <p className="mt-2 max-w-2xl text-muted">{t(`${prefix}.testimonialsSubtitle`)}</p>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {keys.map((key) => (
          <Card key={key} className="p-5">
            <Card.Header>
              <Chip size="sm" color="accent">
                {t(`${prefix}.placeholderBadge`)}
              </Chip>
              <Card.Description className="mt-3 text-base text-foreground">
                “{t(`${prefix}.testimonials.${key}.quote`)}”
              </Card.Description>
              <Card.Title className="mt-3 text-sm">{t(`${prefix}.testimonials.${key}.name`)}</Card.Title>
              <p className="text-sm text-muted">{t(`${prefix}.testimonials.${key}.org`)}</p>
            </Card.Header>
          </Card>
        ))}
      </div>
    </Section>
  );
}
