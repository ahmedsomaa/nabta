import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Card, Input, Label, TextArea, TextField } from '@heroui/react';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export function ContactForm() {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(false);
  const [pending, setPending] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(false);
    setPending(true);
    try {
      const response = await fetch(`${API_URL}/api/v1/marketing/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      });
      if (!response.ok) throw new Error('request failed');
      setSent(true);
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  };

  if (sent) {
    return <Alert status="success">{t('marketing.contact.success')}</Alert>;
  }

  return (
    <Card className="p-6">
      <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
        {error ? <Alert status="danger">{t('marketing.contact.error')}</Alert> : null}
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
        <Button type="submit" variant="primary" isDisabled={pending}>
          {t('marketing.contact.submit')}
        </Button>
      </form>
    </Card>
  );
}
