<h1 align="center">OpenShelf</h1>

<table>
  <tr>
    <td width="240" align="center" valign="top">
      <img src="public/nookio-side.png" alt="OpenShelf logo" width="220" />
    </td>
    <td valign="middle">
      <strong>OpenShelf</strong> is a self-hosted, single-user read-later manager built for people who want full control over their links.
      <br /><br />
      It runs as a private web app on your own machine or server, stores everything in a local SQLite database, and gives you a simple workflow for adding links, filtering your library, archiving what you’ve read, cleaning up old URLs, exporting CSVs, and downloading raw database backups.
      <br /><br />
      It can also import compatible CSV exports, including old Pocket exports, if you already have a link archive you want to bring with you.
    </td>
  </tr>
</table>

<p align="center">
  <img src="public/OpenShelf-scrn.png" alt="OpenShelf app screenshot" width="900" />
</p>

## Why It Exists

OpenShelf exists because saved links deserve a better home than browser bookmark chaos or another hosted tool like Pocket (RIP).

It is intentionally small: one operator, one private library, one SQLite database, and a workflow built around saving, filtering, archiving, cleaning up, exporting, and backing up links.

It is not a hosted sync service, social bookmarking platform, or team knowledge base. It is a local-first personal link shelf you can run yourself.

## Who OpenShelf Is For

OpenShelf is for people who want a private, self-hosted place to manage saved links.

It is a good fit if you:

- Prefer self-hosted tools.
- You were really fed up when Pocket went offline!
- Want your links stored in a local database.
- Want a simple read/archive workflow.
- Want CSV export and raw database backups.
- Want to clean up a large backlog of saved links.
- Are comfortable running a small Dockerized web app.

## Not For / Not Yet

OpenShelf is intentionally simple today.

It does not currently provide:

- Hosted sync.
- Multi-user accounts.
- Team libraries.
- Browser extensions.
- Mobile apps.
- Third-party auth.
- Background workers.
- Server-side search/querying.
- Guaranteed performance for very large libraries.

If you want one private link library that you run yourself, OpenShelf should fit. If you want a polished hosted read-later platform, it probably is not the right tool yet.

## What Exists Now

- Add links manually.
- Import compatible CSV link archives for initial setup or later merges.
- Persist links in `data/openshelf.db`.
- Protect the instance with one password and signed session cookies.
- Browse the full library with unread/archive status selection, search, platform filters, date filters, homepage-only filtering, sorting, pagination, and row selection.
- Archive, unarchive, bulk delete, or clear archived items.
- Export all items, filtered views, or selected rows to CSV.
- Download a raw SQLite backup.
- Run browser-side URL checks against the current filtered unread set.

## Main User Flows

### First Login

1. Install and start the app on your machine or server.
2. Open the app in the browser and log in with the instance password from `OPENSHELF_PASSWORD`.
3. Add links manually, or import a compatible CSV if you already have a link archive.
4. OpenShelf stores everything in `data/openshelf.db` and shows the main library view.

### Daily Use

1. Log in.
2. The app loads all items from `/api/items`.
3. Use the header unread/archive checkboxes to choose the current list view. The default view is unread-only; selecting both shows the full library and selecting neither shows an empty view. Search, filter, sort, paginate, archive or unarchive items from the list or selected-items bar, export, and delete from the browser UI, including platform-specific filtering for Twitter/X, Reddit, and GitHub links.
4. Optionally import more Pocket CSV exports, add one URL manually, or run URL checks on the current filtered unread set.

### Export And Backup

- CSV export is generated in the browser from the currently loaded dataset.
- A raw SQLite snapshot is downloaded from `/api/backup`.

## Tech Stack

| Layer | Implementation |
| --- | --- |
| Runtime | Bun |
| API server | Hono |
| Database | SQLite via `bun:sqlite` |
| Frontend | React 18 + TypeScript |
| Build tooling | Webpack |
| Styling | Tailwind CSS |
| CSV parsing/export | Papa Parse |
| Auth | One env-configured password + signed HTTP-only cookie |

## Environment

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `OPENSHELF_PASSWORD` | Yes | none | Instance password. The server refuses to start without it. |
| `PORT` | No | `3000` | Bun server port. |
| `NODE_ENV` | No | unset | `development` enables split frontend/backend dev behavior. `production` marks cookies `Secure` and enables production messaging/static behavior. |

If you set `NODE_ENV=production`, use HTTPS. The auth cookie becomes `Secure`, so plain HTTP logins will not stick.

## Install And Run

### Docker Compose

For a real server install, put OpenShelf in a persistent directory such as `/opt/openshelf` so the checked-out app files, `.env`, and `./data` survive restarts and upgrades.

```bash
git clone <your-repo-url> /opt/openshelf
cd /opt/openshelf
cp .env.example .env
# edit .env and set OPENSHELF_PASSWORD to a real password
mkdir -p data
docker compose up -d --build
```

Then open `http://YOUR_SERVER_IP:3000`.

For local-only use on the same machine, you can run the same steps in any project directory and then open `http://localhost:3000`.

Persistence:

- Host `./data` is mounted to container `/app/data`.
- The SQLite file is `data/openshelf.db`.
- Keep `./data` and `.env` when updating the app.
- To stop or restart later, run `docker compose stop`, `docker compose start`, or `docker compose up -d`.

### Bun On The Host

```bash
git clone <your-repo-url> /opt/openshelf
cd /opt/openshelf
cp .env.example .env
# edit .env and set OPENSHELF_PASSWORD to a real password
bun install
bun run start
```

Then open `http://YOUR_SERVER_IP:3000`.

`bun run start` rebuilds the frontend and then starts the Bun server.

Notes:

- Keep the project directory persistent because OpenShelf stores its SQLite file in `data/openshelf.db`.
- For a real server deployment, run the Bun process under a service manager such as `systemd`, `pm2`, or another supervisor so it starts again after reboot.

### Development

Run the API server:

```bash
bun install
bun run dev:server
```

Run the frontend dev server in another terminal:

```bash
bun run dev:frontend
```

Development URLs:

- UI: `http://localhost:5173`
- API: `http://localhost:3000`

The webpack dev server proxies `/api/*` to `http://localhost:3000`.

## Deploy

- Production is one Bun process serving both the API and the built SPA.
- The Docker image copies `dist/`, `server/`, `node_modules/`, and `package.json`, exposes port `3000`, and declares `/app/data` as a volume.
- Static files are served from `dist/` whenever `NODE_ENV !== 'development'`.
- If you run behind a reverse proxy and want secure cookies, set `NODE_ENV=production` and terminate TLS properly.
- If `NODE_ENV=production`, logins must happen over HTTPS because the auth cookie becomes `Secure`.
- When updating a server install, pull the new code, rebuild/restart the app, and keep the existing `.env` and `data/openshelf.db`.

## Project Structure

```text
server/
  index.ts            # Bun entry point and route mounting
  auth.ts             # Password auth and signed session cookie handling
  db.ts               # SQLite schema, queries, and backup serialization
  csv.ts              # Pocket CSV validation, parsing, merge, and export helpers
  routes/
    items.ts          # List, create, patch, delete, bulk-delete, clear-archived
    import.ts         # CSV import, server-side CSV export, SQLite backup
src/
  App.tsx             # Session bootstrap and top-level screen switching
  lib/api.ts          # Browser API client
  components/
    FileUpload.tsx    # Reusable CSV import UI for onboarding and later merges
    LoginForm.tsx     # Password unlock screen
    DataDisplay.tsx   # Main library orchestrator for state, derived data, and actions
    data-display/
      ...             # Extracted DataDisplay UI sections and helpers
  types/pocket.ts     # Shared item type used by client and server
data/
  openshelf.db        # Created automatically at runtime
Dockerfile
docker-compose.yml
ROADMAP.md
ARCHITECTURE.md
```

## Key API Endpoints

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/api/health` | Public health check. Returns `ok` and current item count. |
| `POST` | `/api/auth/login` | Log in with `{ "password": "..." }`. |
| `POST` | `/api/auth/logout` | Clear the current session cookie. |
| `GET` | `/api/auth/check` | Verify current session. |
| `GET` | `/api/items` | Return all saved items. |
| `POST` | `/api/items` | Add one URL. Manual adds normalize the URL and default to `unread`. |
| `PATCH` | `/api/items/:id` | Update fields such as `status`, `title`, `tags`, or validation metadata. |
| `DELETE` | `/api/items/:id` | Delete one item. |
| `POST` | `/api/items/bulk-delete` | Delete many items by `ids`. |
| `POST` | `/api/items/clear-archived` | Delete every row with `status = archive`. |
| `POST` | `/api/import` | Multipart CSV import. Field name: `files`. |
| `GET` | `/api/export?scope=all|archive|unread` | Server-side CSV export. |
| `GET` | `/api/backup` | Download a raw SQLite backup. |

The shipped UI currently uses browser-side CSV export and `GET /api/backup`. It does not call `GET /api/export`.

## Troubleshooting

- Startup fails with `OPENSHELF_PASSWORD must be set before starting OpenShelf.`  
  Set `OPENSHELF_PASSWORD` in your environment or `.env`.

- Everyone gets logged out after a restart.  
  This is expected in the current implementation. The session signing secret is generated at process startup, so restarts invalidate old cookies.

- Login works in development but fails behind a production proxy.  
  If `NODE_ENV=production`, the cookie is `Secure`. Use HTTPS end-to-end at the proxy boundary or leave `NODE_ENV` unset for plain local HTTP.

- Import reports errors but some data still appears.  
  Import is partial by design. Valid rows are inserted, bad rows are reported, and duplicates are skipped.

- Duplicate-looking links still appear.  
  Deduplication is based on exact URL strings. Manual adds normalize URLs first; imported CSV rows do not. Two URLs that look equivalent after redirects are not automatically merged unless their stored strings match.

- A manually added link is slow to save or ends up titled as the URL.  
  The server tries to fetch a page title first. If that fetch is blocked or fails, OpenShelf falls back to the normalized URL string.

- Large libraries feel heavy.  
  The current app loads all items into browser memory and applies search, filtering, sorting, pagination, and CSV export client-side.

## License

OpenShelf is available under the MIT License. See `LICENSE`.
