# Architecture

This document describes the architecture that exists in the repository now. It is not a product wishlist. The current implementation: one Bun server, one SQLite database, one React SPA, one shared password, and one library.

## System Shape

```text
browser
  React SPA
    |
    | /api/* with cookie auth
    v
Bun + Hono server
    |
    +--> SQLite database: data/openshelf.db
    +--> static frontend assets from dist/ outside development mode
```

Absent by design right now:

- No SSR.
- No background jobs.
- No worker queue.
- No external database.
- No third-party auth provider.
- No multi-user partitioning.

## Design Philosophy

- Keep the product single-user and self-hosted.
- Keep persistence local and portable: SQLite plus CSV import/export plus raw DB backup.
- Keep the server thin. It handles auth, persistence, import/export, and a small set of mutations.
- Keep library exploration fast to build and easy to reason about by loading the dataset once and filtering in the browser.
- Avoid external services. The only server-side outbound network requests are best-effort title fetching when a link is added manually and best-effort URL checks triggered explicitly by the operator.

## Key Invariants And Rules

- `data/openshelf.db` is the only persistent store.
- Every saved link is an `items` row.
- Shelves are separate entities that group items through explicit memberships and root-domain rules.
- `items.url` is globally unique inside one OpenShelf instance.
- Auth is instance-wide. There are no users, roles, or per-item ownership rules.
- All `/api/*` routes require auth except `/api/health` and `/api/auth/login`.
- The browser normally loads the full library with `GET /api/items` and then applies status selection, search, platform filters, shelf filters, custom date filters, built-in date filter presets, homepage-only and problem-only filters, sorting, pagination, and browser-side CSV export locally.
- The main list view defaults to unread-only. Two header checkboxes control status selection: unread, archive, both, or neither.
- Status selection is treated as the current list scope rather than as a counted filter badge inside the filter drawer.
- The built-in CSV upload UI is shown on first run and remains available from the main library view for later merge imports.
- Manual add and CSV import both normalize URLs before dedupe checks.
- The shared `PocketItem` type defines validation states `pending`, `checking`, `valid`, and `problem`, but the current implementation only persists final `valid` or `problem` values.

## Shared Domain Model

The main cross-layer contract is `PocketItem` in `src/types/pocket.ts`. The server imports this client-side type file directly from `server/db.ts`, so the frontend and backend currently share one definition rather than maintaining separate API schemas.

Fields in the shared model:

- `id`: database primary key.
- `title`: display title.
- `url`: canonical stored URL string.
- `time_added`: Unix timestamp used for sorting and date filters.
- `tags`: Pocket-style comma-separated tag string.
- `status`: `unread` or `archive`.
- `archived_at`: when the item was most recently moved to `archive`.
- `shelf_ids`: resolved shelf memberships for the item, combining explicit shelf links and matching domain rules.
- `validation_status`: optional URL-check result.
- `validation_checked_at`: when URL validation last completed.

There is also a shared `Shelf` type used by both the client and server:

- `id`: shelf primary key.
- `name`: user-defined shelf label.
- `domains`: saved root-domain rules for that shelf.
- `created_at`: Unix timestamp when the shelf was created.
- `updated_at`: Unix timestamp when the shelf was most recently renamed.

## Persistence Model

### Database File

- Path: `data/openshelf.db`
- Creation: automatic at process startup
- Engine: `bun:sqlite`
- Journal mode: `WAL`
- Backup mechanism: `db.serialize()` via `GET /api/backup`
- Migration system: none; schema is created inline in `server/db.ts`

### `items` Table

| Column | Type | Why it exists |
| --- | --- | --- |
| `id` | `INTEGER PRIMARY KEY AUTOINCREMENT` | Stable row identity for API mutations and UI selection. |
| `url` | `TEXT UNIQUE NOT NULL` | Primary dedupe key and destination URL. |
| `title` | `TEXT NOT NULL` | Main UI label, imported from CSV or fetched on manual add. |
| `time_added` | `INTEGER NOT NULL` | Preserves Pocket timestamps and drives sorting/filtering. |
| `tags` | `TEXT DEFAULT ''` | Keeps Pocket tag data in display/searchable form. |
| `status` | `TEXT CHECK(status IN ('unread', 'archive')) DEFAULT 'unread'` | Main lifecycle flag. |
| `archived_at` | `INTEGER` | Stores when an item was most recently marked archived in OpenShelf. |
| `validation_status` | `TEXT` | Stores the latest persisted URL validation outcome. |
| `validation_checked_at` | `INTEGER` | Timestamp of the most recent validation write-back. |

### `shelves` Table

| Column | Type | Why it exists |
| --- | --- | --- |
| `id` | `INTEGER PRIMARY KEY AUTOINCREMENT` | Stable shelf identity for CRUD and item membership. |
| `name` | `TEXT UNIQUE NOT NULL` | User-visible shelf label such as `work` or `important`. |
| `created_at` | `INTEGER NOT NULL` | Shelf creation timestamp. |
| `updated_at` | `INTEGER NOT NULL` | Shelf rename/update timestamp. |

### `shelf_items` Table

| Column | Type | Why it exists |
| --- | --- | --- |
| `shelf_id` | `INTEGER NOT NULL` | Links the membership row to a shelf. |
| `item_id` | `INTEGER NOT NULL` | Links the membership row to an item. |
| `created_at` | `INTEGER NOT NULL` | Tracks when the explicit membership was created. |

### `shelf_domain_rules` Table

| Column | Type | Why it exists |
| --- | --- | --- |
| `shelf_id` | `INTEGER NOT NULL` | Links the rule to a shelf. |
| `domain` | `TEXT NOT NULL` | Root domain such as `example.com` or `example.co.uk`. |
| `created_at` | `INTEGER NOT NULL` | Tracks when the rule was added. |

Why the schema is still small:

- There is no user model because the auth model is one shared password from the environment.
- There is no session table because auth state lives in a signed cookie.
- There is no saved-search, history, or settings table because those features do not exist yet.
- Shelves use join tables and domain-rule tables instead of mutating `items`, because an item can belong to multiple shelves and deleting a shelf must not delete items.

## Main Data Flows

### Auth Bootstrap

1. `App.tsx` starts in `isCheckingSession`.
2. The browser calls `GET /api/auth/check`.
3. If the cookie is valid, the app becomes authenticated and fetches `/api/items`.
4. If the check returns `401`, the app shows `LoginForm`.
5. `POST /api/auth/login` sets a signed cookie named `openshelf_session`.
6. `POST /api/auth/logout` clears that cookie.

Important exception: the signing secret is generated in memory at startup with `crypto.randomUUID()`, so every server restart invalidates all existing sessions.

### CSV Import

1. The empty-library screen renders `FileUpload`, and the main library view can reopen the same import UI later.
2. `useFileUpload` enforces `.csv`, maximum `10` files, and a nominal `50MB` per-file limit in the browser.
3. The browser sends multipart form data to `POST /api/import` under the field name `files`.
4. The server parses each file with Papa Parse, lowercases headers, validates source-specific required columns, normalizes URLs, and validates rows.
5. Multi-file imports are combined. Duplicate normalized URLs within the upload batch are removed before DB insertion.
6. `importItems()` inserts rows with `INSERT OR IGNORE`, so duplicates already in SQLite are skipped at the database layer too.
7. The response reports `imported`, `duplicates`, and `errors`.
8. The frontend refetches the full library.

This flow is intentionally tolerant: valid rows are imported even if other rows fail validation.

### Browse And Mutate Library

1. `GET /api/items` returns all rows ordered by `time_added DESC, id DESC`, with `shelf_ids` resolved from both explicit item memberships and matching root-domain rules.
2. `GET /api/shelves` returns shelf metadata plus saved domain rules.
3. `DataDisplay.tsx` is the stateful library orchestrator and computes header status selection, search, platform, shelf, custom date, built-in date preset, homepage-only, and problem-only filters, sorting, pagination, and selection entirely in memory. Presentational sections of that screen live under `src/components/data-display/`.
4. The default authenticated library view enables only the unread checkbox in the header. Enabling both checkboxes behaves like the old "all" view, while disabling both produces an empty result set.
5. Rows can display a small platform icon for recognized Twitter/X, Reddit, and GitHub links, derived from the stored URL in the browser.
6. Row-level and bulk archive controls use `PATCH /api/items/:id` to flip `status` between `unread` and `archive`.
7. Row-level and bulk shelf controls can add explicit item memberships, while the shelf manager can create, rename, delete shelves, and remove domain rules.
8. Adding a root domain to a shelf backfills all current matching items and causes future matching manual adds or imports to be linked to that shelf automatically.
9. The server sets `archived_at` when an item moves to `archive` and clears it when the item moves back to `unread`.
10. Clear archived deletes every row whose `status` is `archive`.
11. Manual add posts a URL to `POST /api/items`.
12. The server normalizes the URL, rejects duplicates, tries to fetch a page title, and falls back to the normalized URL if title fetch fails.
13. The filter drawer includes the existing custom date filter UI plus a `Date filter presets` section for `Added this week`, `1-6 months old`, and `Older than 1 year`.
14. If the library contains saved problem URLs, the filter drawer shows an `Only problematic` toggle alongside `Only homepages`.
15. After every mutation, the frontend refetches the full library and shelf list rather than patching local state incrementally.

### URL Validation

1. The operator clicks `Check URLs`.
2. The target set is the current filtered unread subset only.
3. The browser sends item ids to `POST /api/items/check-urls` in batches of `10`.
4. The server checks each URL with `fetch()`, tries `HEAD` first, falls back to `GET`, waits up to `8` seconds per request, and classifies each item as `valid` or `problem`.
5. The checker treats obvious Cloudflare challenge `403` responses as non-problematic so challenge pages are less likely to be mistaken for dead links, but the result is still heuristic.
6. Each completed batch is persisted to SQLite immediately by updating `validation_status` and `validation_checked_at`.
7. Progress is still shown in the browser while the run is active.
8. Problem rows show an `X` badge, can be filtered with `Only problematic`, and can be bulk deleted.

Important exception: canceling a validation run stops future batches, but already-completed batches remain persisted in SQLite.

### Export And Backup

- Browser CSV export uses the in-memory item list plus `Papa.unparse`. This is how the shipped UI exports data now.
- `GET /api/export?scope=all|archive|unread` also exists server-side, but the current UI does not call it.
- `GET /api/backup` returns a raw SQLite snapshot generated from the live database handle.

## State Transitions

### Session State

- `unknown` -> `authenticated` after a successful `GET /api/auth/check`
- `unknown` -> `unauthenticated` after a `401` from `GET /api/auth/check`
- `authenticated` -> `unauthenticated` after logout
- `authenticated` -> `unauthenticated` after server restart because the signing secret changes

### Library Screen State

- `empty database` -> onboarding/import screen
- `non-empty database` -> main library screen with import, add-link, filter, export, and cleanup controls

### Item State

- Imported items keep the `status` value from CSV.
- Manually added items default to `unread`.
- Items can belong to zero, one, or many shelves.
- Domain shelf rules backfill current matching items and auto-attach future matching manual adds or imports.
- Marking an item archived stores an `archived_at` timestamp; moving it back to unread clears that field.
- Archived items can be deleted in bulk.
- Items can be moved between `unread` and `archive` from the row actions or selected-items bulk actions.

### Validation State

- Stored state starts as absent.
- A validation run produces transient UI progress.
- Successful completion persists `valid` or `problem`.
- Cancel/error leaves already-completed batch writes intact and leaves unchecked items unchanged.

## API Architecture

### Route Composition

- `server/index.ts`: app assembly, health route, auth mount, auth middleware, static serving, and Bun startup
- `server/auth.ts`: password login, logout, auth check, signed-cookie middleware
- `server/routes/items.ts`: list/create/delete/url-check/bulk-delete/clear-archived/patch
- `server/routes/shelves.ts`: shelf CRUD, explicit item membership, and domain-rule routes
- `server/routes/import.ts`: import/export/backup
- `server/db.ts`: schema plus direct query helpers
- `server/csv.ts`: source-specific CSV parsing, validation, dedupe, and export helpers

### Route Groups

- Auth: `/api/auth/login`, `/api/auth/logout`, `/api/auth/check`
- Health: `/api/health`
- Library: `/api/items`, `/api/items/check-urls`, `/api/items/:id`, `/api/items/bulk-delete`, `/api/items/clear-archived`
- Shelves: `/api/shelves`, `/api/shelves/:id`, `/api/shelves/:id/items`, `/api/shelves/:id/domains`
- Import/egress: `/api/import`, `/api/export`, `/api/backup`

### Error Model

- Expected validation/auth/not-found cases usually return JSON with an `error` field and status codes like `400`, `401`, `404`, or `409`.
- There is no central `onError` handler in `server/index.ts`.
- Some invalid inputs rely on TypeScript expectations or SQLite constraints instead of explicit runtime validation. For example, invalid `status` values are not independently checked in the route handlers.

## Auth And Authorization

- Password source: `OPENSHELF_PASSWORD`
- Verification: `Bun.password.verify()`
- Cookie name: `openshelf_session`
- Cookie properties: `httpOnly`, `sameSite: 'Lax'`, `path: '/'`, `maxAge: 30 days`
- Cookie `secure` flag: enabled only when `NODE_ENV === 'production'`
- Session secret: random in-memory value generated at startup

Security boundary:

- Anyone with the shared password has full access to the whole instance, including database backup download and destructive delete operations.
- There is no per-user scoping, no rate limiting, no brute-force protection, and no audit trail.

## Performance Decisions

- SQLite runs in WAL mode for simple local durability and concurrency behavior.
- The app fetches the full dataset once and keeps most interaction client-side.
- Shelf filtering stays client-side by using `shelf_ids` from the full `GET /api/items` payload.
- Pagination is a client-side slice of the already filtered/sorted array.
- URL validation only targets filtered unread items, not the full library, to limit operator impact.
- Validation runs in batches of `10` so the browser can keep progress visible and cancellation can stop future work without needing a background job system.
- Favicon fetching was deliberately removed from the table UI to avoid request fan-out on large lists.
- Browser-side export avoids another server round trip for common CSV downloads.

## Failure Handling And Edge Cases

- Import is partial-success by design: valid rows import, invalid rows are reported, duplicates are skipped.
- Batch dedupe uses exact normalized URL strings. It is not a semantic URL canonicalizer.
- Domain shelf rules use root-domain matching via `tldts`, so subdomains like `www.example.com` and `blog.example.com` resolve to the same shelf rule target.
- Manual add rejects invalid URLs and exact duplicates with explicit errors.
- Manual add title fetching is best-effort and swallowed on failure; fallback title is the normalized URL.
- Manual add title fetching has no explicit timeout in `server/routes/items.ts`, so a slow site can delay completion.
- URL validation is still heuristic. Some sites block or challenge server-side fetches differently than a human browser visit, and the checker now special-cases obvious Cloudflare challenge `403` responses so they are less likely to be marked `problem`.
- Single delete returns `404` if the row is missing. Bulk delete returns a deleted count and does not fail if some IDs do not exist.
- `PATCH /api/items/:id` with no recognized fields returns the current row unchanged.
- Server-side CSV export strips `id` and validation fields and only writes the five Pocket CSV columns.
- Production static serving assumes `dist/` exists. The normal `bun run start` path builds it first.

## Security Considerations

- The backup endpoint returns the full SQLite database and should be treated as highly sensitive.
- The `.env` file is gitignored, but secret handling is otherwise simple and local.
- `POST /api/items` makes a server-side `fetch()` to operator-supplied URLs when trying to discover a title. In a single-user trusted deployment this is usually acceptable, but it does mean authenticated users can trigger outbound requests from the server to arbitrary URLs.
- `POST /api/items/check-urls` also makes server-side requests to operator-supplied URLs. The checker is intentionally best-effort and uses simple heuristics, including special handling for obvious Cloudflare challenge pages.
- `sameSite: 'Lax'` helps with cookie scope, but there is no dedicated CSRF token mechanism.
- If `NODE_ENV=production`, auth depends on HTTPS because the cookie becomes `Secure`.

## Scalability Constraints

- The architecture is intentionally scoped to one shared library for one operator.
- All items are loaded into browser memory at once.
- Search, filtering, built-in date presets, sorting, pagination, shelf filtering, selection, and the main export path all scale with the in-memory list coordinated by `DataDisplay.tsx`.
- The main library UI has been split into `src/components/data-display/`, but `DataDisplay.tsx` still owns the central state and workflow orchestration for that screen.
- There is no virtualization, server-side querying, background revalidation queue, or multi-process coordination.
- The roadmap already calls out large-list performance as an open question above roughly `50k` items.

## Testing And Maintenance Notes

- There is no automated test suite or test runner configured in `package.json`.
- There is no lint script in `package.json`.
- TypeScript runs with `strict: true`.
- The frontend and backend share types by direct import, which is simple but couples server code to `src/`.
- Schema creation lives inline in `server/db.ts`; future schema changes will need manual migration work because no migration system exists yet.
- Root-domain parsing depends on `tldts` so shelf domain rules work correctly for registrable domains such as `example.co.uk`.
- The current shipped UI does not exercise every backend capability. Most notably, `/api/export` exists but is not used by the browser UI.
