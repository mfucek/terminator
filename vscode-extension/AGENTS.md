# Agent Conventions

## Rules That Apply to EVERY Task

1. **Search before creating** — Before making any new component, hook, or utility, search existing code. Check `apps/desktop/src/components/`, `apps/desktop/src/modules/*/components/`, and `packages/shared/`. Don't reinvent what already exists.
2. **Conformance on touch** — When you modify any file, fix ALL violations: (a) max 500 lines, (b) extract complex logic into hooks, (c) named exports only.
3. **Never push without asking** — Never push to `main` or `develop` without explicit user approval for EACH push.
4. **Use bun, not npm/yarn** — Package manager is `bun`. Only `bun.lock` should be committed.

---

## Monorepo Packages

- use workspaces for different apps and shared code
- e.g. `apps/desktop/` for an Electron app, `apps/backend/` for the API server, `packages/shared/` for shared types and utilities

---

## Directory Conventions

### `deps/` — Third-Party Dependency Wrappers

Client initialization and configuration for external libraries lives in `apps/desktop/src/deps/<library-name>/`:

| Dependency  | Path                                                | Exports                    |
| ----------- | --------------------------------------------------- | -------------------------- |
| tRPC        | `deps/trpc/client.ts`                               | `trpc`, `createTRPCClient` |
| better-auth | `deps/better-auth/auth-client.ts`                   | `authClient`               |
| Electron    | `deps/electron/main.ts`, `deps/electron/preload.ts` | Electron main/preload      |

- **Never put dependency setup in `lib/`** — `lib/` is for internal utilities only (e.g. `cn.ts`)
- Each dependency gets its own directory under `deps/`
- Keep wrappers thin: initialize the client, export it, nothing more

### `lib/` — Internal Utilities

Small, dependency-free helpers: `cn.ts`, `format-date.ts`, etc. shadcn/ui components live at `lib/shadcn/ui/`.

---

## Coding Style

### Files & Directories

- **kebab-case** for all files and directories
- Examples: `use-auth-form.ts`, `login-page.tsx`, `user-profile/`

### Exports

- **Named exports only** — no default exports
- Export name matches file name (PascalCase for components, camelCase for functions)

```tsx
// login-page.tsx
export const LoginPage = () => { ... };

// use-auth-form.ts
export const useAuthForm = () => { ... };

// format-duration.ts
export const formatDuration = () => { ... };
```

### No Barrel Exports

Always import directly from the source file:

```tsx
// GOOD
import { TimerStrip } from '@/modules/timer/components/timer-strip';

// BAD
import { TimerStrip } from '@/modules/timer';
```

### Import Order

Separate groups with blank lines:

```tsx
// 1. Third-party
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

// 2. Shared package
import { TimeEntry } from '@shared/types';

// 3. Internal (modules, components, utils)
import { useTimer } from '@/modules/timer/hooks/use-timer';
import { Button } from '@/components/ui/button';
```

### Indentation

Use tab indentation.

---

## File Granularity

- **One component/hook/utility per file**
- **Max 500 lines per file** — split if exceeded (see decomposition table below)
- **Separate logic from markup** — component files contain JSX, hooks contain behavior

```
modules/timer/components/timer-strip/
├── timer-strip.tsx          # Main component (markup)
├── use-timer-strip.ts       # Hook (state + logic)
├── timer-start-dropdown.tsx  # Sub-component
└── timer-stop-form.tsx       # Sub-component
```

### Decomposition Strategies

When a file exceeds 500 lines:

| File Type              | Strategy                                                        |
| ---------------------- | --------------------------------------------------------------- |
| Components             | Extract sub-components into sibling files in the same directory |
| Hooks                  | Split by concern into focused hooks                             |
| API handlers / routers | Extract handler logic into helpers; keep the route file thin    |
| Helpers / services     | Split by domain responsibility                                  |
| Store / context        | Group actions into slices or separate files                     |

Aim for **100–300 lines** per file. Don't split so small that files lose coherence.

---

## TypeScript

- Strict mode enabled
- Prefer `unknown` over `any`
- Prefer type inference where obvious
- **Infer types from Zod schemas** — use `z.infer<typeof schema>` instead of separate type definitions
- Validate at boundaries: form submissions, API inputs, external data

---

## Tailwind CSS

- Use `className` with Tailwind utilities
- Use `cn()` to merge/override Tailwind classes:

```tsx
import { cn } from '@/utils/cn';

cn('px-4 py-2', 'px-6'); // => "py-2 px-6"
cn('base', isActive && 'active-class'); // conditional
cn('rounded-lg', variant === 'primary' && 'bg-black text-white', className);
```

- Use `data-active={isActive}` with `data-[active=true]:` for conditional states
- Use `hover:enabled:` for interactive elements
- Leverage v4 features: `group-*`, `peer-*`, `has-*`

---

## State Management

- **No prop drilling** — use React context for shared state, hooks for local logic
- **tRPC hooks** for server state (wraps React Query)
- **Keep local state local** — only lift when truly needed

---

## Error Handling

- **Never swallow errors silently** — always show user feedback via sonner (if available)
- **User-friendly messages** — don't expose technical details
- **Log server-side** with context for debugging

```tsx
import { toast } from 'sonner';

toast.error('Something went wrong');
toast.success('Entry saved');
```

---

## Loading States

| Scenario           | Pattern                                     |
| ------------------ | ------------------------------------------- |
| Initial page load  | Full-page skeleton                          |
| List of items      | Skeleton cards (3–5 items)                  |
| Single item fetch  | Component-level skeleton                    |
| Button action      | Disable button + spinner icon               |
| Form submission    | Disable form + loading indicator            |
| Background refresh | No visible loading (stale-while-revalidate) |

- **Always show loading state for initial loads** — never blank screens
- **Match skeleton to content** — approximate the real dimensions
- Use `animate-pulse` for subtle animation
- Colocate skeleton with component: `timer-strip.tsx` → `timer-strip-skeleton.tsx`

---

## Accessibility

### Checklist for Components

- [ ] Can be operated with keyboard only
- [ ] Has visible focus state (`:focus-visible`)
- [ ] Has appropriate ARIA labels (especially icon-only buttons)
- [ ] Color is not the only indicator of state

### Rules

- Use semantic HTML (`button`, `a`, `input`) over divs with click handlers
- Trap focus in modals/dialogs
- Return focus to trigger element when closing
- Support `Escape` to close overlays

---

## UI Primitives

- All UI primitives use **shadcn/ui** components located at `apps/desktop/src/lib/shadcn/ui/`
- **Inline HTML primitives are forbidden** — never use raw `<button>`, `<input>`, `<select>`, `<textarea>`, etc. in feature code. Always use the corresponding shadcn component (`Button`, `Input`, etc.)
- The only place raw HTML elements may appear is **inside** shadcn component definitions themselves
- Always search for existing shadcn components before creating new ones — reuse is mandatory
- When a Radix UI primitive is needed, wrap it as a shadcn component first, then use the shadcn wrapper

---

## Git

### Commit Message Format

[Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<optional-scope>): <description>
```

Types: `feat`, `fix`, `refactor`, `style`, `chore`, `docs`, `test`

Examples:

```
feat: add timer strip with start/stop flow
fix: prevent scaffold overlap on adjacent entries
refactor: extract billing logic into dedicated hook
chore: update dependencies
```

---

## Forms

- All forms **MUST** use `react-hook-form` with `zodResolver` from `@hookform/resolvers/zod`
- **No manual `useState` per field** — use `useForm` + `register` / `control`
- Zod schemas shared between tRPC `.input()` and form validation
- Domain schemas live in `packages/shared/src/schemas/<domain>.ts`
- UI-only schemas (e.g. time string display) can live in the component file
- Form components live at `modules/**/components/forms/`
- Use shadcn Form primitives from `@/lib/shadcn/ui/form`:

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '@focus/shared';

import {
	Form,
	FormField,
	FormItem,
	FormLabel,
	FormControl,
	FormMessage
} from '@/lib/shadcn/ui/form';

const form = useForm({
	resolver: zodResolver(loginSchema),
	defaultValues: { email: '', password: '' }
});
```

---

## Toast Conventions

- Every tRPC mutation **MUST** show toast feedback (success + error)
- Use `useMutationToastCallbacks` from `@/hooks/use-mutation-with-toast` for standard cases:

```tsx
import { useMutationToastCallbacks } from '@/hooks/use-mutation-with-toast';

const callbacks = useMutationToastCallbacks({
	successMessage: 'Saved',
	errorMessage: 'Failed'
});
const mutation = trpc.project.create.useMutation({
	...callbacks,
	onSuccess: (data) => {
		callbacks.onSuccess(data);
		utils.project.list.invalidate();
	}
});
```

- Import `{ toast } from 'sonner'` for imperative calls
- Import `{ Toaster } from '@/lib/shadcn/ui/sonner'` for the provider (only in `app.tsx`)
