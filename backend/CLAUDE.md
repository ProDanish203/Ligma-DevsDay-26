# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm install          # install dependencies
pnpm start:dev        # dev server with hot-reload (port 8000)
pnpm build            # compile to dist/
pnpm start:prod       # run compiled output
pnpm lint             # ESLint --fix
pnpm test             # unit tests (Jest)
pnpm test:e2e         # e2e tests

# Prisma
pnpm prisma migrate dev   # run pending migrations + regenerate client
pnpm prisma generate      # regenerate client only (after schema edits)
```

Copy `.env.example` to `.env` and fill in values before running.

## Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `PORT` | Server port (default `8000`) |
| `CORS_ORIGINS` | Comma-separated allowed origins |
| `JWT_SECRET` / `JWT_EXPIRY` | JWT signing config |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OAuth2 credentials |
| `GOOGLE_REDIRECT_URL` | Backend OAuth callback URL |
| `GOOGLE_REDIRECT_URL_CLIENT_REACT` | Frontend redirect after Google login |
| `BASE_DOMAIN` | Frontend base URL |

## Architecture

### Module structure
NestJS feature modules under `src/`:
- `auth` — register, login, logout, Google OAuth2 (Passport strategy)
- `user` — user profile
- `project` — project CRUD + member access management
- `project-invitations` — invite flow
- `logs` — activity log writes/reads
- `common` — shared infrastructure (see below)

### Common module (`src/common/`)
- `guards/auth.guard.ts` — JWT guard; reads token from `Authorization: Bearer` header **or** `token` cookie. Also enforces `@Roles()` when present.
- `decorators/current-user.decorator.ts` — `@CurrentUser()` param decorator, injects the full user object (or a single field if a key is passed).
- `decorators/roles.decorator.ts` — `@Roles(UserRole.ADMIN)` for role-gating.
- `filters/http-client-exception.filter.ts` — global exception filter applied in `main.ts`.
- `services/prisma.service.ts` — singleton `PrismaService`, injected wherever DB access is needed.
- `utils/helpers.ts` — `throwError(message, status)` creates and throws an `HttpException` (use this instead of throwing raw errors in services).
- `utils/hash.ts` — bcrypt `hashPassword` / `verifyPassword`.
- `types/type.ts` — shared interfaces: `ApiResponse<T>`, `QueryParams`, `PaginationInfo`.

### Prisma
- Schema: `prisma/schema.prisma`. Client is generated to `prisma/generated/prisma` (CJS format).
- Import the client as `import { ... } from '@db'` (tsconfig path alias).
- All entities use **soft deletes** via `deletedAt DateTime?`. Always filter `where: { deletedAt: null }`.

### Response shape
Every service method returns `ApiResponse<T>`:
```ts
{ message: string; success: boolean; data?: T }
```
Controllers return this directly; the global exception filter handles error responses.

### Consistent Prisma select pattern
Define a `const fooSelect = { ... } satisfies Prisma.FooSelect` object alongside a `type FooSelect = Prisma.FooGetPayload<{ select: typeof fooSelect }>`. See `src/project/queries/index.ts` for reference. Use this pattern for all new entities to keep selects consistent and avoid over-fetching.

### RBAC
Project-level roles: `OWNER` (project creator) and `UserAccessLevel` enum (`VIEWER | COMMENTATOR | EDITOR | LEAD`) stored in `UserAccess` rows. `ProjectService` exposes `userCanManageProject` and `userCanViewProject` helpers — use these instead of writing inline access checks.

### Auth token flow
JWT is both set as an `httpOnly` cookie **and** returned in the response body. The frontend reads it from the body and stores it in `localStorage`. The `AuthGuard` accepts either the cookie or the `Authorization: Bearer` header.

### Logging
Call `this.logsService.createLog({ action, message, entityType, entityId, actorUserId, metadata })` fire-and-forget (no `await`) after any state-changing operation.

### API
- Global prefix: `api/v1`
- Swagger UI: `http://localhost:8000/docs`
