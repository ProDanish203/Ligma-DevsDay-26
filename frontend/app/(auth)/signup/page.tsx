'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { registerSchema, type RegisterSchema } from '@/schema/auth.schema';
import { register as registerUser } from '@/API/auth.api';
import { useAuthStore } from '@/store/auth.store';
import { TOKEN_KEY } from '@/lib/constants';
import { FormField } from '@/components/auth/form-field';
import { GoogleButton } from '@/components/auth/google-button';

export default function SignupPage() {
  const router = useRouter();
  const { setUser, setToken } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterSchema>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (values: RegisterSchema) => {
    const result = await registerUser(values);
    if (result.success) {
      const { user, token } = result.response as { user: any; token: string };
      setUser(user);
      setToken(token);
      localStorage.setItem(TOKEN_KEY, token);
      toast.success('Account created! Welcome to Ligma.');
      router.push('/projects');
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
        <h1 className="text-[22px] font-semibold text-gray-900">Create an account</h1>
        <p className="mt-1 text-sm text-gray-400">Join Ligma today — it&apos;s free</p>
      </div>

      {/* Google OAuth */}
      <GoogleButton className="mb-5" />

      {/* Divider */}
      <div className="mb-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-gray-100" />
        <span className="text-xs text-gray-400">or continue with email</span>
        <div className="h-px flex-1 bg-gray-100" />
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <FormField
          label="Full name"
          type="text"
          placeholder="Ali Osaid"
          error={errors.name?.message}
          {...register('name')}
        />
        <FormField
          label="Email"
          type="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register('email')}
        />
        <FormField
          label="Password"
          type="password"
          placeholder="••••••••"
          error={errors.password?.message}
          {...register('password')}
        />
        <FormField
          label="Confirm password"
          type="password"
          placeholder="••••••••"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-brand-primary to-brand-secondary text-sm font-semibold text-white shadow-md shadow-brand-primary/25 transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-55"
        >
          {isSubmitting && <Loader2 className="size-4 animate-spin" />}
          {isSubmitting ? 'Creating account...' : 'Create account'}
        </button>
      </form>

      {/* Footer */}
      <p className="mt-6 text-center text-[13px] text-gray-400">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-gray-600 transition-colors hover:text-brand-primary">
          Sign in
        </Link>
      </p>
    </div>
  );
}
