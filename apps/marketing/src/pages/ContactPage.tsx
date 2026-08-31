import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Card, Input, Label, TextArea, TextField } from '@heroui/react';

export function ContactPage() {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Bootstrap: log payload; wire to API in a later slice
    console.info('[marketing contact]', { name, email, message });
    setSent(true);
  };

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-3xl font-semibold">{t('marketing.contact.title')}</h1>
      <p className="text-muted">{t('marketing.contact.subtitle')}</p>
      {sent ? (
        <Alert status="success">{t('marketing.contact.success')}</Alert>
      ) : (
        <Card className="p-6">
          <form className="space-y-4" onSubmit={onSubmit}>
            <TextField name="name" isRequired value={name} onChange={setName}>
              <Label>{t('marketing.contact.name')}</Label>
              <Input />
            </TextField>
            <TextField name="email" type="email" isRequired value={email} onChange={setEmail}>
              <Label>{t('marketing.contact.email')}</Label>
              <Input />
            </TextField>
            <TextField name="message" isRequired value={message} onChange={setMessage}>
              <Label>{t('marketing.contact.message')}</Label>
              <TextArea rows={4} />
            </TextField>
            <Button type="submit" variant="primary">
              {t('marketing.contact.submit')}
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
