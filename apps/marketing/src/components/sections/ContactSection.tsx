import { useTranslation } from 'react-i18next';
import { Section } from '@/components/PageContainer';
import { ContactForm } from '@/components/ContactForm';

export function ContactSection() {
  const { t } = useTranslation();
  return (
    <Section id="contact">
      <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">{t('marketing.contact.title')}</h2>
      <p className="mt-2 max-w-2xl text-muted">{t('marketing.contact.heroBody')}</p>
      <div className="mt-8 max-w-xl">
        <ContactForm />
      </div>
    </Section>
  );
}
