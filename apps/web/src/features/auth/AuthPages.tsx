import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Card, Input, Label, TextField } from '@heroui/react';
import { apiFetch } from '@/lib/api';
import { BrandMark } from '@/components/shared/BrandMark';
import { LocaleThemeControls } from '@/components/shared/LocaleThemeControls';
import { roleHome, useAuth } from '@/features/auth/AuthProvider';

export function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const user = await login(email, password);
      navigate(roleHome(user.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.generic'));
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthFrame title={t('auth.loginTitle')}>
      <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
        <TextField name="email" type="email" isRequired className="w-full" value={email} onChange={setEmail}>
          <Label>{t('auth.email')}</Label>
          <Input />
        </TextField>
        <TextField name="password" type="password" isRequired className="w-full" value={password} onChange={setPassword}>
          <Label>{t('auth.password')}</Label>
          <Input />
        </TextField>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <Button type="submit" variant="primary" className="w-full" isPending={pending}>
          {t('auth.login')}
        </Button>
      </form>
      <div className="mt-4 space-y-2 text-sm">
        <Link to="/forgot-password">{t('auth.forgotPassword')}</Link>
        <p>
          {t('auth.noAccount')} <Link to="/register">{t('auth.register')}</Link>
        </p>
      </div>
    </AuthFrame>
  );
}

export function RegisterPage() {
  const { t } = useTranslation();
  const { register } = useAuth();
  const navigate = useNavigate();
  const [schoolName, setSchoolName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const user = await register(schoolName, email, password);
      navigate(roleHome(user.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.generic'));
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthFrame title={t('auth.registerTitle')}>
      <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
        <TextField name="schoolName" isRequired className="w-full" value={schoolName} onChange={setSchoolName}>
          <Label>{t('auth.schoolName')}</Label>
          <Input />
        </TextField>
        <TextField name="email" type="email" isRequired className="w-full" value={email} onChange={setEmail}>
          <Label>{t('auth.email')}</Label>
          <Input />
        </TextField>
        <TextField name="password" type="password" isRequired className="w-full" value={password} onChange={setPassword}>
          <Label>{t('auth.password')}</Label>
          <Input />
        </TextField>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <Button type="submit" variant="primary" className="w-full" isPending={pending}>
          {t('auth.register')}
        </Button>
      </form>
      <p className="mt-4 text-sm">
        {t('auth.hasAccount')} <Link to="/login">{t('auth.login')}</Link>
      </p>
    </AuthFrame>
  );
}

export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      await apiFetch('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.generic'));
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthFrame title={t('auth.forgotTitle')}>
      {done ? (
        <p>{t('auth.resetSent')}</p>
      ) : (
        <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
          <TextField name="email" type="email" isRequired className="w-full" value={email} onChange={setEmail}>
            <Label>{t('auth.email')}</Label>
            <Input />
          </TextField>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="submit" variant="primary" className="w-full" isPending={pending}>
            {t('auth.sendResetLink')}
          </Button>
        </form>
      )}
      <p className="mt-4 text-sm">
        <Link to="/login">{t('auth.login')}</Link>
      </p>
    </AuthFrame>
  );
}

export function ResetPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const token = new URLSearchParams(window.location.search).get('token') ?? '';
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      await apiFetch('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      });
      navigate('/login', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.generic'));
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthFrame title={t('auth.resetTitle')}>
      <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
        <TextField name="password" type="password" isRequired className="w-full" value={password} onChange={setPassword}>
          <Label>{t('auth.newPassword')}</Label>
          <Input />
        </TextField>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <Button type="submit" variant="primary" className="w-full" isPending={pending}>
          {t('auth.resetPassword')}
        </Button>
      </form>
    </AuthFrame>
  );
}

function AuthFrame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-4">
      <div className="flex w-full max-w-md items-center justify-between">
        <BrandMark to="/login" />
        <LocaleThemeControls />
      </div>
      <Card className="w-full max-w-md">
        <Card.Header>
          <Card.Title>{title}</Card.Title>
        </Card.Header>
        <Card.Content>{children}</Card.Content>
      </Card>
    </div>
  );
}
