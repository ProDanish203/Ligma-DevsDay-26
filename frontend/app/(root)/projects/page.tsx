'use client';

import { useState } from 'react';
import { Clock, Plus, Search, Star } from 'lucide-react';
import Avatar from 'boring-avatars';
import { BRAND_AVATAR_PALETTE } from '@/lib/constants';

const MOCK_PROJECTS = [
  {
    id: '1',
    name: 'Landing Page Redesign',
    updatedAt: '2 hours ago',
    collaborators: ['Ali Osaid', 'Sara M', 'Rami K'],
    gradient: 'from-[#F43F7A] to-[#FDA4C4]',
    starred: true,
  },
  {
    id: '2',
    name: 'Mobile App Flows',
    updatedAt: 'Yesterday',
    collaborators: ['Ali Osaid', 'Omar N'],
    gradient: 'from-[#818CF8] to-[#C4B5FD]',
    starred: false,
  },
  {
    id: '3',
    name: 'Design System v2',
    updatedAt: '3 days ago',
    collaborators: ['Ali Osaid'],
    gradient: 'from-[#F43F7A] to-[#FB923C]',
    starred: true,
  },
  {
    id: '4',
    name: 'Dashboard Prototype',
    updatedAt: 'Last week',
    collaborators: ['Ali Osaid', 'Sara M', 'Khalid J', 'Rami K'],
    gradient: 'from-[#38BDF8] to-[#818CF8]',
    starred: false,
  },
  {
    id: '5',
    name: 'Onboarding Screens',
    updatedAt: '2 weeks ago',
    collaborators: ['Ali Osaid', 'Omar N'],
    gradient: 'from-[#F43F7A] to-[#FDA4C4]',
    starred: false,
  },
  {
    id: '6',
    name: 'Marketing Assets',
    updatedAt: '1 month ago',
    collaborators: ['Ali Osaid', 'Sara M'],
    gradient: 'from-[#34D399] to-[#818CF8]',
    starred: false,
  },
];

export default function ProjectsPage() {
  const [search, setSearch] = useState('');

  const filtered = MOCK_PROJECTS.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Projects</h1>
          <p className="mt-0.5 text-sm text-gray-400">{MOCK_PROJECTS.length} projects total</p>
        </div>
        <button className="flex h-9 items-center gap-2 rounded-xl bg-linear-to-r from-brand-primary to-brand-secondary px-4 text-sm font-semibold text-white shadow-sm shadow-brand-primary/20 transition-opacity hover:opacity-90">
          <Plus className="size-4" />
          New Project
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search projects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-4 text-sm text-gray-900 placeholder:text-gray-400 outline-none shadow-sm transition-colors focus:border-brand-primary/40 focus:ring-2 focus:ring-brand-primary/10"
        />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((project) => (
          <div
            key={project.id}
            className="group cursor-pointer overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition-all duration-200 hover:border-pink-200 hover:shadow-md hover:shadow-pink-50"
          >
            {/* Thumbnail */}
            <div className={`relative h-36 bg-linear-to-br ${project.gradient}`}>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="grid grid-cols-3 gap-2 opacity-15">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="h-8 w-12 rounded bg-white" />
                  ))}
                </div>
              </div>
              <button
                className={`absolute right-3 top-3 rounded-lg p-1.5 transition-colors ${
                  project.starred
                    ? 'text-yellow-400'
                    : 'text-white/0 group-hover:bg-black/10 group-hover:text-white/70'
                }`}
              >
                <Star className="size-4" fill={project.starred ? 'currentColor' : 'none'} />
              </button>
            </div>

            {/* Info */}
            <div className="p-4">
              <p className="truncate font-medium text-gray-800">{project.name}</p>
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <Clock className="size-3.5" />
                  {project.updatedAt}
                </div>
                <div className="flex -space-x-1.5">
                  {project.collaborators.slice(0, 3).map((name) => (
                    <div key={name} className="rounded-full ring-2 ring-white">
                      <Avatar size={20} name={name} variant="beam" colors={BRAND_AVATAR_PALETTE} />
                    </div>
                  ))}
                  {project.collaborators.length > 3 && (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-[10px] font-medium text-gray-500 ring-2 ring-white">
                      +{project.collaborators.length - 3}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
