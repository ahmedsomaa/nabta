import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Input, InputGroup, Label, TextField } from '@heroui/react';
import { Eye, EyeOff, Sprout } from 'lucide-react';
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
    <AuthFrame title={t('auth.loginTitle')} subtitle={t('auth.loginSubtitle')}>
      <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
        <TextField name="email" type="email" isRequired className="w-full" value={email} onChange={setEmail}>
          <Label>{t('auth.email')}</Label>
          <Input />
        </TextField>
        <PasswordField
          name="password"
          label={t('auth.password')}
          value={password}
          onChange={setPassword}
        />
        {error ? <AuthError message={error} /> : null}
        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-sm text-muted no-underline hover:text-accent">
            {t('auth.forgotPassword')}
          </Link>
        </div>
        <Button type="submit" variant="primary" className="w-full" isPending={pending}>
          {t('auth.login')}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        {t('auth.noAccount')}{' '}
        <Link to="/register" className="font-medium text-accent no-underline hover:underline">
          {t('auth.register')}
        </Link>
      </p>
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
    <AuthFrame title={t('auth.registerTitle')} subtitle={t('auth.registerSubtitle')}>
      <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
        <TextField name="schoolName" isRequired className="w-full" value={schoolName} onChange={setSchoolName}>
          <Label>{t('auth.schoolName')}</Label>
          <Input />
        </TextField>
        <TextField name="email" type="email" isRequired className="w-full" value={email} onChange={setEmail}>
          <Label>{t('auth.email')}</Label>
          <Input />
        </TextField>
        <PasswordField
          name="password"
          label={t('auth.password')}
          value={password}
          onChange={setPassword}
        />
        {error ? <AuthError message={error} /> : null}
        <Button type="submit" variant="primary" className="w-full" isPending={pending}>
          {t('auth.register')}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        {t('auth.hasAccount')}{' '}
        <Link to="/login" className="font-medium text-accent no-underline hover:underline">
          {t('auth.login')}
        </Link>
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
    <AuthFrame title={t('auth.forgotTitle')} subtitle={t('auth.forgotSubtitle')}>
      {done ? (
        <Alert status="success">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>{t('auth.resetSent')}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : (
        <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
          <TextField name="email" type="email" isRequired className="w-full" value={email} onChange={setEmail}>
            <Label>{t('auth.email')}</Label>
            <Input />
          </TextField>
          {error ? <AuthError message={error} /> : null}
          <Button type="submit" variant="primary" className="w-full" isPending={pending}>
            {t('auth.sendResetLink')}
          </Button>
        </form>
      )}
      <p className="mt-6 text-center text-sm">
        <Link to="/login" className="font-medium text-accent no-underline hover:underline">
          {t('auth.login')}
        </Link>
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
    <AuthFrame title={t('auth.resetTitle')} subtitle={t('auth.resetSubtitle')}>
      <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
        <PasswordField
          name="password"
          label={t('auth.newPassword')}
          value={password}
          onChange={setPassword}
        />
        {error ? <AuthError message={error} /> : null}
        <Button type="submit" variant="primary" className="w-full" isPending={pending}>
          {t('auth.resetPassword')}
        </Button>
      </form>
    </AuthFrame>
  );
}

function AuthError({ message }: { message: string }) {
  return (
    <Alert status="danger">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Description>{message}</Alert.Description>
      </Alert.Content>
    </Alert>
  );
}

function PasswordField({
  name,
  label,
  value,
  onChange,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const toggleLabel = visible ? t('auth.hidePassword') : t('auth.showPassword');

  return (
    <TextField name={name} type={visible ? 'text' : 'password'} isRequired className="w-full" value={value} onChange={onChange}>
      <Label>{label}</Label>
      <InputGroup className="w-full">
        <InputGroup.Input />
        <InputGroup.Suffix className="pe-1">
          <Button
            type="button"
            isIconOnly
            size="sm"
            variant="ghost"
            aria-label={toggleLabel}
            onPress={() => setVisible((v) => !v)}
          >
            {visible ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
          </Button>
        </InputGroup.Suffix>
      </InputGroup>
    </TextField>
  );
}

function AuthFrame({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="relative hidden w-[44%] shrink-0 flex-col justify-between overflow-hidden bg-accent px-10 py-12 text-accent-foreground lg:flex">
        <div className="absolute inset-0 opacity-[0.08]" aria-hidden>
          <div className="absolute -start-16 top-24 size-72 rounded-full bg-white" />
          <div className="absolute -end-10 bottom-10 size-56 rounded-full bg-white" />
        </div>
        <BrandMark to="/login" inverted />
        <div className="relative z-10 max-w-md space-y-4">
          <div className="inline-flex size-14 items-center justify-center rounded-2xl bg-white/15">
            <Sprout className="size-8" aria-hidden />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">{t('app.name')}</h1>
          <p className="text-lg text-accent-foreground/90">{t('app.tagline')}</p>
        </div>
        <p className="relative z-10 text-xs text-accent-foreground/60">
          {t('app.copyright', { year: new Date().getFullYear(), name: t('app.name') })}
        </p>
      </aside>

      <div className="relative flex flex-1 flex-col">
        <div className="absolute end-4 top-4 z-10 sm:end-6 sm:top-6">
          <LocaleThemeControls />
        </div>

        <div className="flex flex-1 flex-col justify-center px-4 py-16 sm:px-8">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-8 space-y-3 lg:hidden">
              <BrandMark to="/login" />
              <p className="text-sm text-muted">{t('app.tagline')}</p>
            </div>

            <header className="mb-8 space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{title}</h2>
              <p className="text-sm leading-relaxed text-muted sm:text-base">{subtitle}</p>
            </header>

            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
