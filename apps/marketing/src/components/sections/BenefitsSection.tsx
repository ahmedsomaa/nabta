import type { LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card } from '@heroui/react';
import { Globe, Languages, LayoutGrid, Layers, Lock, MessageCircle, School, Sprout } from 'lucide-react';
import { Section } from '@/components/PageContainer';

const iconByKey: Record<string, LucideIcon> = {
  structure: Layers,
  bilingual: Languages,
  portals: LayoutGrid,
  rollout: Sprout,
  i18n: Languages,
  assessment: LayoutGrid,
  egypt: School,
  curriculum: Layers,
  isolation: Lock,
  fit: School,
  noLockIn: Layers,
  demoFirst: MessageCircle,
  trust: Lock,
  noHardSell: MessageCircle,
  region: Globe,
};

export function BenefitsSection({
  prefix,
  keys,
  id,
}: {
  prefix: string;
  keys: readonly string[];
  id?: string;
}) {
  const { t } = useTranslation();
  return (
    <Section id={id}>
      <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">{t(`${prefix}.benefitsTitle`)}</h2>
      <p className="mt-2 max-w-2xl text-muted">{t(`${prefix}.benefitsSubtitle`)}</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {keys.map((key) => {
          const Icon = iconByKey[key] ?? Sprout;
          return (
            <Card key={key} className="p-5">
              <Card.Header>
                <span className="mb-2 flex size-9 items-center justify-center rounded-lg bg-accent/15 text-accent">
                  <Icon className="size-4" aria-hidden />
                </span>
                <Card.Title>{t(`${prefix}.benefits.${key}.title`)}</Card.Title>
                <Card.Description>{t(`${prefix}.benefits.${key}.body`)}</Card.Description>
              </Card.Header>
            </Card>
          );
        })}
      </div>
    </Section>
  );
}
