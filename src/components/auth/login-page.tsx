import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LineChart, AlertCircle, ArrowRight, ShieldCheck, KeyRound } from 'lucide-react';
import { loginSchema, type LoginFormData } from '@/src/lib/validation/auth';
import { useAuth } from '@/src/hooks/useAuth';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';

export function LoginPage() {
  const { signIn, enterDemoMode, isConfigured } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true);
    setAuthError(null);

    try {
      const { error } = await signIn(data.email, data.password);
      if (error) {
        setAuthError(
          error.message || 'Invalid email or password. Please verify your credentials.'
        );
      } else {
        navigate(from, { replace: true });
      }
    } catch (err: unknown) {
      setAuthError('An unexpected authentication error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = () => {
    enterDemoMode();
    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-center items-center px-4 py-12 sm:px-6 lg:px-8">
      {/* Brand Icon & Heading */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-zinc-900 border border-zinc-800 text-emerald-400 mb-4 shadow-sm">
          <LineChart className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-zinc-100 font-sans">
          Sign in to TradeJournal
        </h2>
        <p className="mt-1 text-xs text-zinc-400">
          Professional trading analytics &amp; performance journaling
        </p>
      </div>

      <div className="w-full max-w-md">
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-lg p-6 sm:p-8 backdrop-blur-xs shadow-lg">
          {/* Supabase status banner */}
          {!isConfigured && (
            <div className="mb-6 p-3 rounded-md bg-zinc-850/80 border border-zinc-750 text-xs text-zinc-300 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium text-zinc-200">Supabase Setup Mode Active</p>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Configure <code className="text-zinc-200 font-mono">NEXT_PUBLIC_SUPABASE_URL</code> in <code className="text-zinc-200 font-mono">.env</code> to connect your project. You can sign in below or click <strong>Instant Demo Access</strong>.
                </p>
              </div>
            </div>
          )}

          {/* Form Error Banner */}
          {authError && (
            <div className="mb-5 p-3 rounded-md bg-red-950/60 border border-red-800/60 text-xs text-red-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="trader@domain.com"
                {...register('email')}
                className={errors.email ? 'border-red-800' : ''}
              />
              {errors.email && (
                <p className="text-[11px] text-red-400">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
              </div>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                {...register('password')}
                className={errors.password ? 'border-red-800' : ''}
              />
              {errors.password && (
                <p className="text-[11px] text-red-400">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full mt-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
                  <span>Signing in...</span>
                </span>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          {/* Instant demo access button */}
          <div className="mt-5 pt-4 border-t border-zinc-800/80">
            <Button
              type="button"
              variant="outline"
              onClick={handleDemoLogin}
              className="w-full text-xs text-zinc-300 gap-2 border-zinc-750 hover:bg-zinc-850"
            >
              <KeyRound className="w-3.5 h-3.5 text-zinc-400" />
              <span>Instant Demo Access (Alex Trader)</span>
            </Button>
          </div>

          <div className="mt-6 text-center text-xs text-zinc-400">
            Don&apos;t have an account?{' '}
            <Link
              to="/signup"
              className="font-medium text-zinc-200 hover:text-white underline underline-offset-4"
            >
              Create account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
