'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Clock, FolderOpen, Loader2, Plus, Share2, Sparkles, Users, Zap } from 'lucide-react';
import Avatar from 'boring-avatars';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth.store';
import { BRAND_AVATAR_PALETTE } from '@/lib/constants';
import { getDashboardStats } from '@/API/project.api';
import { formatRelativeTime } from '@/lib/format-relative';

const PROJECT_GRADIENTS = [
  'from-[#F43F7A] to-[#FDA4C4]',
  'from-[#818CF8] to-[#C4B5FD]',
  'from-[#F43F7A] to-[#FB923C]',
  'from-[#38BDF8] to-[#818CF8]',
];

const TEMPLATES = [
  { name: 'Blank Canvas', icon: '◻', description: 'Start from scratch' },
  { name: 'UI Mockup', icon: '⬡', description: 'Website & app screens' },
  { name: 'Flowchart', icon: '⬦', description: 'Process & logic flows' },
  { name: 'Wireframe', icon: '▣', description: 'Low-fidelity layouts' },
];

interface DashboardStats {
  totalProjects: number;
  totalMembers: number;
  sharedWithMe: number;
  thisMonth: number;
  recentProjects: {
    id: string;
    name: string;
    updatedAt: string;
    collaborators: string[];
  }[];
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const firstName = user?.name?.split(' ')[0] ?? 'there';

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardStats().then((result) => {
      setLoading(false);
      if (result.success && result.response) {
        setStats(result.response as DashboardStats);
      } else {
        toast.error(result.response as string);
      }
    });
  }, []);

  const statCards = stats
    ? [
        {
          label: 'Total Projects',
          value: String(stats.totalProjects),
          icon: FolderOpen,
          bg: 'bg-pink-50',
          color: 'text-brand-primary',
        },
        {
          label: 'Team Members',
          value: String(stats.totalMembers),
          icon: Users,
          bg: 'bg-purple-50',
          color: 'text-purple-500',
        },
        {
          label: 'Shared With Me',
          value: String(stats.sharedWithMe),
          icon: Share2,
          bg: 'bg-sky-50',
          color: 'text-sky-500',
        },
        {
          label: 'This Month',
          value: String(stats.thisMonth),
          icon: Sparkles,
          bg: 'bg-amber-50',
          color: 'text-amber-500',
        },
      ]
    : [];

  return (
    <div className="p-6 pb-12">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">
          {greeting()},{' '}
          <span className="bg-linear-to-r from-brand-primary to-brand-secondary bg-clip-text text-transparent">
            {firstName}
          </span>{' '}
          👋
        </h1>
        <p className="mt-1 text-sm text-gray-400">Here&apos;s what&apos;s happening in your workspace.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="size-10 animate-spin text-gray-300" />
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {statCards.map((stat) => (
              <div
                key={stat.label}
                className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
              >
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${stat.bg}`}>
                  <stat.icon className={`size-4 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-400">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Recent projects */}
          {stats && stats.recentProjects.length > 0 && (
            <div className="mb-8">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold text-gray-800">Recent projects</h2>
                <Link href="/projects" className="text-xs text-gray-400 transition-colors hover:text-brand-primary">
                  View all →
                </Link>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {stats.recentProjects.map((project, i) => (
                  <Link
                    key={project.id}
                    href="/projects"
                    className="group cursor-pointer overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition-all duration-200 hover:border-pink-200 hover:shadow-md hover:shadow-pink-50"
                  >
                    <div className={`relative h-28 bg-linear-to-br ${PROJECT_GRADIENTS[i % PROJECT_GRADIENTS.length]}`}>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="grid grid-cols-3 gap-1.5 opacity-15">
                          {Array.from({ length: 6 }).map((_, j) => (
                            <div key={j} className="h-6 w-10 rounded bg-white" />
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="truncate text-sm font-medium text-gray-800">{project.name}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-1 text-[11px] text-gray-400">
                          <Clock className="size-3" />
                          {formatRelativeTime(project.updatedAt)}
                        </div>
                        <div className="flex -space-x-1">
                          {project.collaborators.slice(0, 3).map((name) => (
                            <div key={name} className="rounded-full ring-1 ring-white">
                              <Avatar size={18} name={name} variant="beam" colors={BRAND_AVATAR_PALETTE} />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Templates */}
          <div>
            <h2 className="mb-4 font-semibold text-gray-800">Start from a template</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {TEMPLATES.map((t) => (
                <button
                  key={t.name}
                  className="flex flex-col items-center gap-2.5 rounded-xl border border-gray-100 bg-white p-5 text-center shadow-sm transition-all hover:border-pink-200 hover:shadow-md hover:shadow-pink-50"
                >
                  <span className="text-2xl">{t.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-700">{t.name}</p>
                    <p className="mt-0.5 text-[11px] text-gray-400">{t.description}</p>
                  </div>
                </button>
              ))}
              <button className="flex flex-col items-center gap-2.5 rounded-xl border border-dashed border-gray-200 p-5 text-center transition-all hover:border-brand-primary/40 hover:bg-pink-50/50">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                  <Plus className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-500">Custom</p>
                  <p className="mt-0.5 text-[11px] text-gray-400">Your own setup</p>
                </div>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
