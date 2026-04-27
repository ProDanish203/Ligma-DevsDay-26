'use client';

import Avatar from 'boring-avatars';
import { useAuthStore } from '@/store/auth.store';
import { BRAND_AVATAR_PALETTE } from '@/lib/constants';

function SectionCard({ title, description, children }: {
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
  const { user } = useAuthStore();
  const displayName = user?.name ?? 'User';

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-400">Manage your account and preferences</p>
      </div>

      <div className="flex flex-col gap-4">
        {/* Profile */}
        <SectionCard title="Profile" description="Your public display information">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar size={56} name={displayName} variant="beam" colors={BRAND_AVATAR_PALETTE} />
              <button className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-primary text-[10px] text-white shadow-sm">
                ✎
              </button>
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <label className="mb-1 block text-[13px] text-gray-500">Full name</label>
                <input
                  defaultValue={displayName}
                  className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none shadow-sm transition-colors focus:border-brand-primary/40 focus:ring-2 focus:ring-brand-primary/10"
                />
              </div>
              <div>
                <label className="mb-1 block text-[13px] text-gray-500">Email</label>
                <input
                  defaultValue={user?.email ?? ''}
                  disabled
                  className="h-9 w-full rounded-lg border border-gray-100 bg-gray-50 px-3 text-sm text-gray-400 outline-none cursor-not-allowed"
                />
              </div>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button className="flex h-8 items-center rounded-lg bg-linear-to-r from-brand-primary to-brand-secondary px-4 text-xs font-semibold text-white shadow-sm shadow-brand-primary/20 hover:opacity-90 transition-opacity">
              Save changes
            </button>
          </div>
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
            <button className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-50">
              Delete account
            </button>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
