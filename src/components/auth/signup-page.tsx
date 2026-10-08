import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LineChart, AlertCircle, CheckCircle2, ArrowRight, Mail } from 'lucide-react';
import { signupSchema, type SignupFormData } from '@/src/lib/validation/auth';
import { useAuth } from '@/src/hooks/useAuth';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';

export function SignupPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmationPending, setIsConfirmationPending] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: SignupFormData) => {
    setIsSubmitting(true);
    setAuthError(null);

    try {
      const { error, emailConfirmationRequired } = await signUp(
        data.email,
        data.password,
        data.fullName
      );

      if (error) {
        setAuthError(
          error.message || 'Unable to register account. Please verify your details.'
        );
      } else if (emailConfirmationRequired) {
        setRegisteredEmail(data.email);
        setIsConfirmationPending(true);
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err: unknown) {
      setAuthError('An unexpected registration error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-center items-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-zinc-900 border border-zinc-800 text-emerald-400 mb-4 shadow-sm">
          <LineChart className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-zinc-100 font-sans">
          Create Trader Account
        </h2>
        <p className="mt-1 text-xs text-zinc-400">
          Start journaling trades, analyzing edge, and tracking performance
        </p>
      </div>

      <div className="w-full max-w-md">
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-lg p-6 sm:p-8 backdrop-blur-xs shadow-lg">
          {/* Email Confirmation Screen */}
          {isConfirmationPending ? (
            <div className="text-center space-y-4 py-3">
              <div className="w-12 h-12 rounded-full bg-emerald-950/80 border border-emerald-800/80 flex items-center justify-center text-emerald-400 mx-auto">
                <Mail className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-zinc-100">
                Check Your Inbox
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                We sent a verification link to <strong className="text-zinc-200 font-mono">{registeredEmail}</strong>.
                Click the link in your email to confirm your account, then sign in.
              </p>
              <div className="p-3 rounded bg-zinc-850/60 border border-zinc-800 text-[11px] text-zinc-400 text-left">
                <span className="font-mono text-zinc-300">Tip:</span> If you disabled &quot;Confirm email&quot; in your Supabase Auth dashboard, you can sign in right away.
              </div>
              <Link to="/login" className="block pt-2">
                <Button className="w-full text-xs gap-2">
                  <span>Go to Sign In</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          ) : (
            <>
              {authError && (
                <div className="mb-5 p-3 rounded-md bg-red-950/60 border border-red-800/60 text-xs text-red-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    autoComplete="name"
                    placeholder="Marcus Vance"
                    {...register('fullName')}
                    className={errors.fullName ? 'border-red-800' : ''}
                  />
                  {errors.fullName && (
                    <p className="text-[11px] text-red-400">{errors.fullName.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="marcus@hedgecap.io"
                    {...register('email')}
                    className={errors.email ? 'border-red-800' : ''}
                  />
                  {errors.email && (
                    <p className="text-[11px] text-red-400">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Minimum 6 characters"
                    {...register('password')}
                    className={errors.password ? 'border-red-800' : ''}
                  />
                  {errors.password && (
                    <p className="text-[11px] text-red-400">{errors.password.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Re-enter password"
                    {...register('confirmPassword')}
                    className={errors.confirmPassword ? 'border-red-800' : ''}
                  />
                  {errors.confirmPassword && (
                    <p className="text-[11px] text-red-400">{errors.confirmPassword.message}</p>
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
                      <span>Registering account...</span>
                    </span>
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center text-xs text-zinc-400">
                Already have an account?{' '}
                <Link
                  to="/login"
                  className="font-medium text-zinc-200 hover:text-white underline underline-offset-4"
                >
                  Sign in
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
