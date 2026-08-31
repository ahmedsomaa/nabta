import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Card, Input, Label, TextField } from '@heroui/react';
import { Sprout } from 'lucide-react';
import { LocaleThemeControls } from '@/components/LocaleThemeControls';
import { useAuth } from '@/features/auth/AuthProvider';

export function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('system@nabta.local');
  const [password, setPassword] = useState('Password123!');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      await login(email, password);
      navigate('/');
    } catch {
      setError(t('errors.forbidden'));
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <div className="flex justify-end p-4">
        <LocaleThemeControls />
      </div>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 pb-16">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <Sprout className="size-5" aria-hidden />
          </span>
          <div>
            <h1 className="text-xl font-semibold">{t('platform.loginTitle')}</h1>
            <p className="text-sm text-muted">{t('platform.loginSubtitle')}</p>
          </div>
        </div>
        <Card className="p-6">
          <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
            {error ? <Alert status="danger">{error}</Alert> : null}
            <TextField name="email" type="email" isRequired value={email} onChange={setEmail}>
              <Label>{t('auth.email')}</Label>
              <Input />
            </TextField>
            <TextField name="password" type="password" isRequired value={password} onChange={setPassword}>
              <Label>{t('auth.password')}</Label>
              <Input />
            </TextField>
            <Button type="submit" variant="primary" className="w-full" isDisabled={pending}>
              {t('auth.login')}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
