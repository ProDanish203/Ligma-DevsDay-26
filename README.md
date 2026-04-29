# LIGMA

[LOOM VIDEO LINK](https://www.loom.com/share/7d8cc5ad89504f578594fc411e3e2a1a)

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Module Breakdown](#2-module-breakdown)
3. [Challenge 01 — Conflict Resolution with Yjs CRDT](#3-challenge-01--conflict-resolution-with-yjs-crdt)
4. [Challenge 02 — Node-Level RBAC](#4-challenge-02--node-level-rbac)
5. [Challenge 03 — Intent-Aware Task Extraction](#5-challenge-03--intent-aware-task-extraction)
6. [Challenge 04 — Append-Only Event Log](#6-challenge-04--append-only-event-log)
7. [Challenge 05 — Real-Time WebSocket Management](#7-challenge-05--real-time-websocket-management)
8. [Challenge 06 — Deployment on Render](#8-challenge-06--deployment-on-render)
9. [Data Model](#9-data-model)
10. [Auth Flow](#10-auth-flow)
11. [API Reference](#11-api-reference)
12. [Local Development](#12-local-development)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                   NestJS App                    │
│                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │   Auth   │  │ Project  │  │  Task Board  │  │
│  └──────────┘  └──────────┘  └──────────────┘  │
│                                                 │
│  ┌────────────────────────────────────────────┐ │
│  │           Canvas Module                    │ │
│  │  Gateway (Socket.IO)  +  Service  +  AI    │ │
│  └────────────────────────────────────────────┘ │
│                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │   Logs   │  │  Redis   │  │   Prisma     │  │
│  └──────────┘  └──────────┘  └──────────────┘  │
└─────────────────────────────────────────────────┘
         │                         │
    Socket.IO              PostgreSQL
   (namespace /canvas)
```

**Tech stack:**
- **NestJS** — backend framework
- **Socket.IO** — WebSocket transport on namespace `/canvas`
- **Yjs** — CRDT library for conflict-free text merging
- **Redis** — Yjs state persistence + Socket.IO pub/sub adapter for horizontal scaling
- **PostgreSQL + Prisma** — primary datastore with soft deletes (`deletedAt`)
- **JWT** — stateless auth via cookie and response body

**Conventions:**
- Every service method returns `ApiResponse<T> { message, success, data? }`
- All DB selects use `const xSelect = {} satisfies Prisma.XSelect` to avoid over-fetching
- Logs are always fire-and-forget — they must never block a response

---

## 2. Module Breakdown

```
src/
├── auth/                    JWT login, register, Google OAuth2
├── user/                    User profile
├── project/                 Project CRUD, member RBAC, dashboard stats
├── project-invitations/     Email-based invite flow
├── canvas/                  WebSocket gateway, node/edge CRUD, Yjs, AI classification
│   ├── canvas.gateway.ts    Socket.IO event handlers
│   ├── canvas.service.ts    Business logic + permission checks
│   ├── canvas.dto.ts        WS message shapes
│   ├── queries/             Prisma select objects
│   └── types/               CanvasUser, CursorPosition, CanvasNodeData
├── task-board/              Task CRUD, board lazy-creation per project
├── logs/                    Append-only log writes + access-gated reads
├── ai/                      Intent classification (GitHub Models / Gemini)
│   ├── ai.service.ts
│   ├── prompts/             System prompt for classification
│   └── schema/              Zod output schema
└── common/
    ├── guards/              AuthGuard (cookie + Bearer)
    ├── decorators/          @CurrentUser(), @Roles()
    ├── services/            PrismaService, RedisService
    └── utils/               throwError(), hashPassword(), verifyPassword()
```

---

## 3. Challenge 01 — Conflict Resolution with Yjs CRDT

Each canvas room shares one `Y.Doc`. Sticky note text is stored as `Y.Text` — a CRDT sequence type where every character carries a logical clock. Concurrent edits from any number of clients always merge deterministically without a coordination round-trip.

**Update flow:**

```
Client A types "hello"           Client B types "world"
       │                                │
       ▼                                ▼
 Y.Doc produces binary update    Y.Doc produces binary update
       │                                │
       └──────────► Gateway ◄───────────┘
                      │
              canvas:yjs-update handler
                      │
         1. Convert payload to Buffer
         2. Load existing snapshot from Redis (key: canvas:yjs:{projectId})
         3. Y.mergeUpdates([existing, incoming])
         4. Store merged snapshot back to Redis
         5. Relay raw binary to all other clients in room
```

The gateway never parses the Yjs binary payload — it treats it as an opaque blob. This keeps the server lean and correct.

```ts
const existing = await redis.getBuffer(redisKey);
const merged =
  existing && existing.length > 0
    ? Buffer.from(Y.mergeUpdates([new Uint8Array(existing), new Uint8Array(updateBuf)]))
    : updateBuf;
await redis.set(redisKey, merged);
client.to(projectId).emit('canvas:yjs-update', { update: updateBuf });
```

On reconnect, `handleJoin` sends the full merged Yjs snapshot alongside the canvas state. The client applies it to a fresh `Y.Doc` before marking initial load as done, preventing any double-init race.

**Why CRDT over OT:** OT requires a central server to serialize and transform operations in order. CRDT guarantees convergence regardless of operation arrival order, which fits our horizontally scaled architecture.

---

## 4. Challenge 02 — Node-Level RBAC

**Data model:**

```
UserAccess {
  userId
  entityId      ← projectId OR nodeId
  entityType    ← PROJECT | NODE
  accessLevel   ← VIEWER | COMMENTATOR | EDITOR | LEAD
}
```

One table handles both project-level and node-level grants, keeping the schema flat.

**Permission hierarchy (`canUserMutateNode`):**

```
OWNER  >  LEAD  >  node creator  >  project EDITOR  >  explicit NODE ACL
```

Checked in order — first match wins. This check runs server-side inside every mutating WebSocket handler. Client-side checks are UI affordances only — a raw WebSocket message bypassing the frontend still hits the same guard.

```ts
const allowed = await this.canvasService.canUserMutateNode(
  user.id, dto.nodeId, dto.projectId, 'update'
);
if (!allowed) {
  client.emit('canvas:error', { message: 'Permission denied: cannot edit this node' });
  return;
}
```

Node ACLs are sent as part of `canvas:state` on join and re-broadcast via `canvas:node-access-updated` after any grant or revoke — no polling required.

---

## 5. Challenge 03 — Intent-Aware Task Extraction

**Classification pipeline:**

```
User updates sticky note label
          │
          ▼
classificationStickyNode()
          │
          ▼
ai.service.ts → classifyIntent(text)
  ├── LLM call (GitHub Models or Gemini)
  ├── Structured output validated via Zod
  └── Returns { intent, confidence, title?, description? }
          │
          ▼
  If intent === ACTION_ITEM && confidence >= 0.5:
    → taskBoardService.createTask({ title, description, canvasNodeId })
    → gateway emits canvas:ai-task-created
  Else:
    → gateway emits canvas:ai-done
```

| Intent | Meaning |
|---|---|
| `ACTION_ITEM` | Triggers automatic task creation |
| `DECISION` | A conclusion the team reached |
| `OPEN_QUESTION` | Something unresolved |
| `REFERENCE` | A link or resource, no action needed |
| `UNCLASSIFIED` | Too short or ambiguous |

Classification is async and non-blocking. The node update response goes out immediately; the AI result arrives as a separate event. Classification failure is gracefully swallowed — the node update always succeeds.

The `AI_PROVIDER` env var switches between GitHub Models and Gemini. Both are free-tier.

Tasks carry `canvasNodeId` as a foreign key back to the originating node. No content is duplicated — the task is a thin pointer into the canvas. Clicking a task in the Task Board scrolls the canvas to that node.

---

## 6. Challenge 04 — Append-Only Event Log

The `Log` table has no `deletedAt` column — rows are never soft-deleted or overwritten. Logs are written after the state change, not transactionally with it, so a failed log write never rolls back a successful mutation. All writes go through `logsService.createLog()` which is always called fire-and-forget.

```ts
async createLog(dto: CreateLogDto): Promise<LogSelect | null> {
  try {
    return await this.prisma.log.create({ data: { ... }, select: logSelect });
  } catch {
    return null;
  }
}
```

**What gets logged:**

| Action | Trigger |
|---|---|
| `NODE_ADDED` / `NODE_UPDATED` / `NODE_DELETED` | Node mutations (position moves excluded to avoid log spam) |
| `EDGE_ADDED` / `EDGE_DELETED` | Edge mutations |
| `NODE_ACCESS_GRANTED` / `NODE_ACCESS_REVOKED` | ACL changes |
| `PROJECT_CREATED` / `PROJECT_UPDATED` | Project changes |
| `PROJECT_MEMBER_*` | Member added / removed / updated |

Each entry carries `actorUserId`, `targetUserId`, `metadata` (JSON), and `createdAt`. The gateway broadcasts `canvas:log-added` to the room after each write so the activity sidebar updates in real time.

Log reads are scoped by `entityType` — project members read project logs, users with node access read node logs.

---

## 7. Challenge 05 — Real-Time WebSocket Management

**Namespace and transport:**

```ts
@WebSocketGateway({
  namespace: '/canvas',
  pingTimeout: 30000,
  pingInterval: 25000,
})
```

**Authentication handshake:**

Token is read from `client.handshake.auth.token` or `Authorization: Bearer` on connection. After JWT verification, the gateway emits `canvas:authenticated`. The client must wait for this before emitting `canvas:join` to prevent a race where `handleJoin` runs before `client.data.user` is attached.

**Connection lifecycle:**

```
connect
  └─ verify JWT → attach user → emit canvas:authenticated
                                        │
                                 client emits canvas:join
                                        │
                                 1. verify project membership
                                 2. clean stale room entries
                                 3. load nodes + edges + ACLs + Yjs snapshot
                                 4. emit canvas:state  (joiner only)
                                 5. emit canvas:user-joined  (rest of room)

disconnect
  └─ remove socket from room maps → emit canvas:user-left → delete empty rooms
```

**Delta broadcasting:** Node and edge events carry only the changed object. Yjs updates carry only the binary delta. Cursor moves are ephemeral and never persisted. Bandwidth scales with change size, not room size.

**Reconnect handling:** On `canvas:join`, the gateway removes the socket from any room it already appears in before re-adding it. The rejoining client receives `canvas:state` with the current merged Yjs snapshot — applying it to a fresh `Y.Doc` incorporates all updates missed during the disconnect with no replay queue needed.

**Horizontal scaling:**

```ts
ioServer.adapter(createAdapter(this.redisPubClient, this.redisSubClient));
```

If Redis is unavailable, the gateway falls back to single-instance mode — the service stays up, just without cross-instance broadcast.

---

## 8. Challenge 06 — Deployment


The app is containerised via `Dockerfile` and `docker-compose.yml` and deployed on AWS ec2.

---

## 9. Data Model

```
User ──< Project (owner)
User ──< UserAccess ──> Project      (entityType=PROJECT)
User ──< UserAccess ──> CanvasNode   (entityType=NODE)

Project ──< CanvasNode
Project ──< CanvasEdge
Project ──1 TaskBoard ──< Task

Task ──> CanvasNode   (canvasNodeId — task to canvas link)

Project ──< Log       (entityType=PROJECT)
CanvasNode ──< Log    (entityType=NODE)
```

All tables use UUID primary keys with `createdAt`, `updatedAt`, and `deletedAt`. The `Log` table intentionally omits `deletedAt` — rows are immutable.

---

## 10. Auth Flow

1. `POST /api/v1/auth/register` or `POST /api/v1/auth/login`
2. Server signs a JWT `{ id, email, role }` with 15-day expiry
3. Token is set as a `sameSite: none` cookie and returned in the response body
4. Frontend stores the token in `localStorage`
5. WebSocket clients pass `token` in `socket.handshake.auth`; HTTP clients send `Authorization: Bearer <token>` or let the cookie ride

Google OAuth follows the standard Passport redirect flow and appends the token to the frontend redirect URL as a query param.

---

## 11. API Reference

Swagger UI is available at `http://localhost:8000/docs` when running locally.

**Global prefix:** `api/v1`

| Module | Key endpoints |
|---|---|
| Auth | `POST /auth/register`, `POST /auth/login`, `GET /auth/google` |
| User | `GET /user/me`, `PATCH /user/update` |
| Project | `POST /project`, `GET /project`, `GET /project/:id`, `PATCH /project/:id`, `DELETE /project/:id` |
| Project members | `GET /project/:id/members`, `PATCH /project/:id/member/:userId`, `DELETE /project/:id/member/:userId` |
| Canvas nodes | `GET /canvas/nodes/:projectId`, `DELETE /canvas/node/:nodeId` |
| Canvas edges | `GET /canvas/edges/:projectId` |
| Node access | `GET /canvas/node/:nodeId/access` |
| Task board | `GET /task-board/:projectId`, `POST /task-board/:projectId/task`, `PATCH /task-board/task/:taskId`, `DELETE /task-board/task/:taskId` |
| Logs | `GET /logs/:entityType/:entityId` |

**WebSocket events (namespace `/canvas`):**

| Client → Server | Server → Room |
|---|---|
| `canvas:join` | `canvas:state` (joiner only) |
| `canvas:leave` | `canvas:user-joined` / `canvas:user-left` |
| `canvas:cursor-move` | `canvas:cursor-moved` |
| `canvas:node-add` | `canvas:node-added` |
| `canvas:node-update` | `canvas:node-updated`, `canvas:ai-classifying`, `canvas:ai-task-created` / `canvas:ai-done` |
| `canvas:node-delete` | `canvas:node-deleted` |
| `canvas:edge-add` | `canvas:edge-added` |
| `canvas:edge-delete` | `canvas:edge-deleted` |
| `canvas:yjs-update` | `canvas:yjs-update` (other clients only) |
| `canvas:node-access-grant` | `canvas:node-access-updated` |
| `canvas:node-access-revoke` | `canvas:node-access-updated` |
| | `canvas:log-added` |

---

## 12. Local Development

```bash
cp .env.example .env
pnpm install
pnpm prisma migrate dev
pnpm start:dev
```

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `PORT` | Server port (default `8000`) |
| `CORS_ORIGINS` | Comma-separated allowed origins |
| `JWT_SECRET` / `JWT_EXPIRY` | JWT config |
| `REDIS_HOST` / `REDIS_PORT` | Redis connection |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OAuth2 credentials |
| `GOOGLE_REDIRECT_URL` | Backend OAuth callback |
| `GOOGLE_REDIRECT_URL_CLIENT_REACT` | Frontend redirect after Google login |
| `BASE_DOMAIN` | Frontend base URL |
| `AI_PROVIDER` | `github` or `gemini` |
| `GITHUB_TOKEN` | GitHub Models token (if `AI_PROVIDER=github`) |
| `GEMINI_API_KEY` | Gemini API key (if `AI_PROVIDER=gemini`) |