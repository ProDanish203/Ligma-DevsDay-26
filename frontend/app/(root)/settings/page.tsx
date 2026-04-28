'use client';

import Avatar from 'boring-avatars';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { updateCurrentUser } from '@/API/user.api';
import { useAuthStore } from '@/store/auth.store';
import { BRAND_AVATAR_PALETTE } from '@/lib/constants';
import { updateUserSchema, type UpdateUserSchema, type UserSchema } from '@/schema/user.schema';

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="font-semibold text-gray-900">{title}</h2>
        {description && <p className="mt-1 text-sm text-gray-400">{description}</p>}
      </div>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const { user, setUser } = useAuthStore();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UpdateUserSchema>({
    resolver: zodResolver(updateUserSchema as any),
    defaultValues: { name: user?.name ?? '' },
    values: { name: user?.name ?? '' },
  });

  const displayName = user?.name ?? 'User';

  const onSaveProfile = async (values: UpdateUserSchema) => {
    const result = await updateCurrentUser(values);
    if (result.success) {
      setUser(result.response as UserSchema);
      toast.success('Profile updated');
    } else {
      toast.error(result.response as string);
    }
  };

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-400">Manage your account and preferences</p>
      </div>

      <div className="flex flex-col gap-4">
        {/* Profile */}
        <SectionCard title="Profile" description="Your public display information">
          <form onSubmit={handleSubmit(onSaveProfile)} className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar size={56} name={displayName} variant="beam" colors={BRAND_AVATAR_PALETTE} />
                <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-primary text-[10px] text-white shadow-sm pointer-events-none">
                  ✎
                </span>
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <label htmlFor="settings-name" className="mb-1 block text-[13px] text-gray-500">
                    Full name
                  </label>
                  <input
                    id="settings-name"
                    autoComplete="name"
                    disabled={!user}
                    className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none shadow-sm transition-colors focus:border-brand-primary/40 focus:ring-2 focus:ring-brand-primary/10 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
                    {...register('name')}
                  />
                  {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
                </div>
                <div>
                  <label htmlFor="settings-email" className="mb-1 block text-[13px] text-gray-500">
                    Email
                  </label>
                  <input
                    id="settings-email"
                    value={user?.email ?? ''}
                    readOnly
                    tabIndex={-1}
                    className="h-9 w-full rounded-lg border border-gray-100 bg-gray-50 px-3 text-sm text-gray-400 outline-none cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting || !user}
                className="flex h-8 items-center gap-2 rounded-lg bg-linear-to-r from-brand-primary to-brand-secondary px-4 text-xs font-semibold text-white shadow-sm shadow-brand-primary/20 hover:opacity-90 transition-opacity disabled:pointer-events-none disabled:opacity-50"
              >
                {isSubmitting && <Loader2 className="size-3.5 animate-spin" />}
                {isSubmitting ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        </SectionCard>

        {/* Appearance */}
        <SectionCard title="Appearance" description="Customize the look of the app">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-700">Theme</p>
              <p className="text-xs text-gray-400">Currently using light mode</p>
            </div>
            <div className="flex gap-2">
              {['Light', 'Dark', 'System'].map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    t === 'Light'
                      ? 'border-brand-primary/30 bg-pink-50 text-brand-primary'
                      : 'border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </SectionCard>

        {/* Danger zone */}
        <SectionCard title="Danger zone">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-700">Delete account</p>
              <p className="text-xs text-gray-400">Permanently delete your account and all data</p>
            </div>
            <button
              type="button"
              className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-50"
            >
              Delete account
            </button>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
