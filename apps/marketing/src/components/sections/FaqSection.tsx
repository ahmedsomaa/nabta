import { useTranslation } from 'react-i18next';
import { Accordion } from '@heroui/react';
import { ChevronDown } from 'lucide-react';
import { Section } from '@/components/PageContainer';

export function FaqSection({ prefix, keys }: { prefix: string; keys: readonly string[] }) {
  const { t } = useTranslation();
  return (
    <Section>
      <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">{t(`${prefix}.faqTitle`)}</h2>
      <Accordion className="mt-6 w-full" variant="surface">
        {keys.map((key) => (
          <Accordion.Item key={key} id={`${prefix}-${key}`}>
            <Accordion.Heading>
              <Accordion.Trigger>
                {t(`${prefix}.faq.${key}.q`)}
                <Accordion.Indicator>
                  <ChevronDown className="size-4" />
                </Accordion.Indicator>
              </Accordion.Trigger>
            </Accordion.Heading>
            <Accordion.Panel>
              <Accordion.Body>{t(`${prefix}.faq.${key}.a`)}</Accordion.Body>
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion>
    </Section>
  );
}
