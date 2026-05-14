# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Stack notes

- **Next.js 16.2 + React 19.2 + Tailwind v4** — this is NOT the Next.js in your training data. Before using routing, caching, server actions, `next/*` imports, or config, read the relevant guide in `node_modules/next/dist/docs/` and heed deprecation notices.
- Tailwind v4 uses CSS-first config via `@theme` / `@import "tailwindcss"` in `src/app/globals.css` — there is no `tailwind.config.*`. Design tokens are oklch CSS variables consumed through `--color-*` / `var(--…)`.
- ESLint v9 flat config (`eslint.config.mjs`); run `npm run lint` (the script is bare `eslint`, no args).

## Commands

```bash
npm run dev      # Next dev server, http://localhost:3000
npm run build    # production build
npm run start    # run the built app
npm run lint     # eslint (flat config)
```

No test runner is configured.

## Architecture

This is a **client-rendered admin SPA** sitting on top of Next.js App Router. Almost every page is `"use client"` and talks to an external backend at `NEXT_PUBLIC_API_URL` (default `http://localhost:4021/v1`). There is no server-side data fetching, no Server Actions, no route handlers — Next.js is used here essentially as a build + routing shell.

### Route groups ([src/app/](src/app/))

- `(auth)/login` — public route, wrapped by [src/app/(auth)/layout.tsx](src/app/(auth)/layout.tsx).
- `(dashboard)/*` — all admin pages wrapped by [src/app/(dashboard)/layout.tsx](src/app/(dashboard)/layout.tsx), which mounts `AuthGuard` + `Sidebar` + `Header`. A page appearing outside `(dashboard)` will bypass auth.
- [src/app/page.tsx](src/app/page.tsx) is the root landing/redirect.

### Auth flow

1. `login/page.tsx` calls `authApi` → receives `{ accessToken, refreshToken, user }` → stores them via `useAuth.setAuth(...)`.
2. [src/lib/api.ts](src/lib/api.ts) `tokenStore` persists tokens in `localStorage` under `fc_admin_access_token` / `fc_admin_refresh_token`; [src/stores/auth.store.ts](src/stores/auth.store.ts) persists the user via zustand `persist` under `fc_admin_user`.
3. Axios request interceptor attaches `Authorization: Bearer <access>`. On any `401`, the response interceptor runs `doRefresh()` (single-flight via the `refreshing` promise), retries the original request, and redirects to `/login` if refresh fails.
4. [src/components/auth-guard.tsx](src/components/auth-guard.tsx) waits for zustand hydration (`useAuth.persist.onFinishHydration`) before deciding — do not short-circuit this, pre-hydration `user === null` is not the same as "logged out".

### Data layer

- **One axios client** in [src/lib/api.ts](src/lib/api.ts) with `apiGet` / `apiPost` / `apiPatch` / `apiDelete` wrappers. All of them call `unwrap()` which strips the backend's `{ status_code, data }` envelope when present — do **not** double-unwrap in feature APIs.
- **Feature-per-folder** under [src/features/](src/features/). Each folder exports a `<name>Api` object of thin functions (e.g. [src/features/lessons/lessons.api.ts](src/features/lessons/lessons.api.ts)). Admin-only endpoints use the `/admin/...` prefix; read endpoints often use the public path. Follow the existing split when adding endpoints.
- **TanStack Query v5** is the cache layer. `makeQueryClient()` in [src/lib/query.ts](src/lib/query.ts) sets `staleTime: 30_000`, `refetchOnWindowFocus: false`, `retry: 1`, mutations `retry: 0`. The `QueryClient` is created per-mount in [src/components/providers.tsx](src/components/providers.tsx).
- **Shared DTOs** live in [src/lib/api-types.ts](src/lib/api-types.ts) and mirror the backend's Prisma models. Every titled/named entity is bilingual (`titleUz` / `titleRu`, `contentUz` / `contentRu`, etc.) — keep both fields in sync in every form.
- **File uploads** go through [src/features/uploads/upload.api.ts](src/features/uploads/upload.api.ts), which POSTs multipart to `/admin/uploads/file?folder=videos|images|books` (R2-backed). Returns `{ url, key?, size?, mimeType? }`.
- **Error messages**: use `apiErrorMessage(e)` — it walks `error.response.data.error.message` → `.message` → `e.message`.

### UI conventions

- Radix primitives + local wrappers in [src/components/ui/](src/components/ui/) (shadcn-style). Prefer extending these over new primitives.
- Toasts via `sonner` (`<Toaster richColors position="top-right" />` in Providers).
- Forms: `react-hook-form` + `zod` via `@hookform/resolvers`.
- Every entity's UI has a bilingual (Uz/Ru) text pair. [src/components/translate-button.tsx](src/components/translate-button.tsx) + [src/lib/translate.ts](src/lib/translate.ts) provide one-click **uz→ru** translation (MyMemory with a Google gtx fallback) — wire it next to the Russian field, not the Uzbek one.
- `html lang="uz"` is set in the root layout; user-facing strings are Uzbek (see [src/components/shell/sidebar-nav.ts](src/components/shell/sidebar-nav.ts) for the canonical labels and groups).
- Path alias `@/*` → `src/*` (tsconfig).

### Backend contract gotchas

- Backend wraps most responses as `{ status_code, data: ... }`; a few return raw objects. `unwrap()` handles both — don't assume either shape in callers.
- Admin-mutating routes are under `/admin/...`; public read routes are not. When adding a new resource, check whether list vs. create live on different prefixes (see `lessonsApi` for the pattern).
- IDs are numeric (`number`), not strings.
