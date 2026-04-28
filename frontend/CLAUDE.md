# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
pnpm dev        # start dev server (http://localhost:3000)
pnpm build      # production build
pnpm lint       # ESLint
pnpm format     # Prettier (writes in place)
```

Requires `NEXT_PUBLIC_API_URL` env var pointing to the backend.

## Architecture

### Route groups

- `app/(auth)/` — unauthenticated pages (login, signup, invitations). Layout is a centered card on a pink-tinted background.
- `app/(root)/` — authenticated shell with `Sidebar` + `Topnav`. Contains `projects/` and `settings/` pages.
- Per-route private components live in `_components/` co-located with the page.

### Data layer

- **`API/`** — thin Axios wrappers, one file per domain (`auth.api.ts`, `project.api.ts`, `user.api.ts`, `logs.api.ts`, `project-invitations.api.ts`). All functions return `{ success: boolean, response: data | errorMessage }` — never throw.
- **`API/middleware.ts`** — Axios instance pointing to `NEXT_PUBLIC_API_URL`. Attaches `Authorization: Bearer <token>` from `localStorage` on every request.
- **`store/auth.store.ts`** — Zustand store holding `user` and `token`. Token is also persisted to `localStorage` under the key `TOKEN_KEY` (`"token"`).
- **`providers/react-query.tsx`** — wraps the app in TanStack Query v5 + DevTools.

### Schema & types

`schema/` holds Zod schemas for every entity. TypeScript types are **always** inferred from schemas (`type Foo = z.infer<typeof fooSchema>`). Do not write standalone `interface`/`type` definitions for API shapes — add them to the relevant schema file instead.

### Permissions (RBAC)

- `lib/enums.ts` — `UserAccessLevel` enum: `VIEWER | COMMENTATOR | EDITOR | LEAD`; plus `OWNER` (literal string, not in the enum).
- `lib/project-permissions.ts` — helper functions (`canManageProjectAccess`, `canEditProjectDetails`, `isProjectOwner`, `canChangeMemberRole`, etc.). Use these rather than comparing access levels inline.

### UI conventions

- **Component library**: shadcn/ui with `radix-nova` style (`components/ui/`). All primitives come from the unified `radix-ui` package.
- **Styling**: Tailwind CSS v4 + `clsx`/`tailwind-merge` via `cn()` (`lib/utils.ts`). Brand utilities: `bg-brand-primary` (#F43F7A), `bg-brand-secondary` (#FDA4C4) — raw hex constants are in `lib/constants.ts` for non-Tailwind contexts (e.g. boring-avatars).
- **Icons**: `lucide-react` only.
- **Toasts**: `sonner` — `toast.success()` / `toast.error()`.
- **Forms**: `react-hook-form` + `@hookform/resolvers/zod`.
- Fonts: Poppins (primary) and Roboto (variable `--font-roboto`), loaded via `next/font/google`.
