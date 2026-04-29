'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { loginSchema, type LoginSchema } from '@/schema/auth.schema';
import { login } from '@/API/auth.api';
import { useAuthStore } from '@/store/auth.store';
import { TOKEN_KEY } from '@/lib/constants';
import { FormField } from '@/components/auth/form-field';

export default function LoginPage() {
  const router = useRouter();
  const { setUser, setToken } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema as any),
    defaultValues: { rememberMe: false },
  });

  const onSubmit = async (values: LoginSchema) => {
    const result = await login(values);
    if (result.success) {
      setUser(result.response.user);
      setToken(result.response.token);
      localStorage.setItem(TOKEN_KEY, result.response.token);
      toast.success('Welcome back!');
      router.push('/');
    } else {
      toast.error(result.response as string);
    }
  };

  return (
    <div className="rounded-2xl border border-pink-100 bg-white p-8 shadow-xl shadow-pink-100/40">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-linear-to-br from-brand-primary to-brand-secondary shadow-md shadow-brand-primary/20">
          <span className="text-lg font-bold text-white">L</span>
        </div>
        <h1 className="text-[22px] font-semibold text-gray-900">Welcome back</h1>
        <p className="mt-1 text-sm text-gray-400">Sign in to continue to Ligma</p>
      </div>


      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <FormField
          label="Email"
          type="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register('email')}
        />

        {/* Password with inline forgot link */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-[13px] font-medium tracking-wide text-gray-600">
              Password
            </label>
            <Link href="#" className="text-[12px] text-gray-400 transition-colors hover:text-brand-primary">
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            type="password"
            placeholder="••••••••"
            aria-invalid={!!errors.password}
            className={[
              'h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-900',
              'placeholder:text-gray-400 outline-none transition-all duration-200',
              'focus:border-brand-primary/50 focus:ring-2 focus:ring-brand-primary/15',
              errors.password ? 'border-red-400/60 focus:border-red-400/60 focus:ring-red-400/15' : '',
            ].join(' ')}
            {...register('password')}
          />
          {errors.password && (
            <p className="flex items-center gap-1.5 text-xs text-red-500">
              <span className="inline-block size-1 shrink-0 rounded-full bg-red-500" />
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Remember me */}
        <label className="flex cursor-pointer items-center gap-2.5 select-none">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 bg-white accent-brand-primary"
            {...register('rememberMe')}
          />
          <span className="text-sm text-gray-500">Remember me for 30 days</span>
        </label>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-brand-primary to-brand-secondary text-sm font-semibold text-white shadow-md shadow-brand-primary/25 transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-55"
        >
          {isSubmitting && <Loader2 className="size-4 animate-spin" />}
          {isSubmitting ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      {/* Footer */}
      <p className="mt-6 text-center text-[13px] text-gray-400">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="font-medium text-gray-600 transition-colors hover:text-brand-primary">
          Create one
        </Link>
      </p>
    </div >
  );
}
