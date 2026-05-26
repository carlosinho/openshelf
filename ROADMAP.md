# Development

## Status

- v0.3.0 - initial post-pivot version - stand-alone web app meant to be self hosted for single user and let them manage their links of things to read later - with persistant database in SQLite
- v0.4.0 - cleaner UI for daily use
- v0.5.0 - new branding
- v0.6.0 - code refactor
- v0.7.0 - read/archived controls, mobile improvements, shelves
- v0.8.0 - better imports and welcome features

> OpenShelf has pivoted from a browser-only CSV processor into a self-hosted, single-user read-later manager. The current build now has a Bun + Hono backend, SQLite persistence, password protection, CSV import, shelves, filtering, cleanup, manual add-link flow, CSV export, and raw database backup download. Current focus should move to hardening, UX cleanup, and product-shape improvements on top of the new persistent foundation.

## Roadmap

Versions prior to v0.3.0 considered legacy.

### v0.3.0 - Self-hosted backend pivot
- [x] Optional local persistence - resolved in favor of a self-hosted SQLite-backed app
- [x] Bun runtime adopted for app server and local-first deployment
- [x] Hono API added for auth, items, import, export, and backup routes
- [x] SQLite persistence added at `data/pocketzen.db` - changed to `data/openshelf.db` in later versions
- [x] Single-password auth added with signed session cookies
- [x] Frontend switched from ephemeral in-memory mutations to API-backed persistence
- [x] Docker and bare-metal Bun startup paths documented

### v0.4.0 - UX cleanup and product-shape
- [x] Import UI should be present in the main library view so users can merge more CSV exports after the first setup flow. Right now, the CSV import is only visible if the user hasn't ever imported anything.
- [x] Adding links improvements. The add-link panel now submits on Enter and focuses the URL field immediately after opening.
- [x] Update to how all/unread/archive filtering is done.
    - Display two nice looking checkboxes in the header section of the design (like in the screenshot). Those two checkboxes should align to center of head row.
    - They should behave like checkboxes - meaning the user can select one, or both, or none.
    - Default view should be unread, not all. 
    - Remove the all/unread/boxes from the main filter section. 
    - Also picking the specific list - all, unread, archive - shouldn't be shown in filter counter next to the filter dropdown button.
- [x] Better handling of links from specific platforms: Twitter, Reddit, GitHub.
    - Add a new section in the filters like in the screenshot. When clicked only links from these platforms should appear.
    - Display the platform's icon next to the item in the main list - minimal black and white icon. Icon to the left of title.
- [x] Move those platform icons - Twitter, Reddit, GitHub - that are on the main list to be in the status column instead.

### v0.5.0 - Name change
- [x] Rebrand with a new name.
    - The new name is OpenShelf.
    - Change all visible references of PocketZen to OpenShelf.
    - Change the logo. The new logo file is in public - nookio-side.png

### v0.6.0 - Refactor
- [x] Refactor DataDisplay.tsx - it's too big.
    - Refactor the file but don't change any of the features
    - See if we can break off parts of it to other files
- [x] Improve Twitter and Reddit link fetches.
    - The app couldn't get titles for tweets and Reddit pages.

### v0.7.0 - Read/archived controls, mobile, shelves
- [x] Do some actual controls for marking items read (aka. adding them to archive).
- [x] Improve mobile.
- [x] Shelves
    - Thematic shelves where the user can add individual reading links or entire domains.
    - User can create shelves, name them whatever they wish, like "work" or "funny" or "important"
    - They can do basic admin tasks to the shelves - rename, delete (if a shelf deleted, no items should be deleted)
    - Any link can be added to any shelf. 
    - There should also be an option to add the entire domain to a shelf. If that happens then all links from that same domain are automatically added to that shelf, and all future links from that domain end on that shelf as well.
    - Adding to the shelf should be done by a button next to where the archive buttons for links are now. When clicked, the user gets to pick a shelf and decide whether to add just the link or the entire domain. 
    - Adding to shelf should also be possible when selecting multiple items from the list - from that selection box that appears which now lets the user to export, archive, delete.
    - Shelf selection should be added to the filters menu, below "Platforms".

### v0.8.0 - Better imports and welcome features
- [x] URL normalization during import.
    - CSV import now uses the same basic URL normalization as manual link adding before dedupe/import.
    - This does not remove tracking parameters or resolve redirect-equivalent URLs.
- [x] Scaffolding for multiple import sources.
    - Right now we only handle imports from Pocket, we need more: Matter, Raindrop, Instapaper.
    - This step is only meant to start doing required UI changes to handle multiple different import types vs what we have now. 
    - Move imports to a separate pop-up - similar to how "manage shelves" works, instead of having the import panel appear in the main app.
- [x] Import logic for Instapaper.
    - Make it possible to import from Instapaper.
    - Use the existing scaffolding UI for this.
- [x] Import logic for Matter.
    - Make it possible to import from Matter.
    - Use the existing scaffolding UI for this.
- [x] Import logic for Raindrop.
    - Make it possible to import from Raindrop.
    - Use the existing scaffolding UI for this.
- [x] A stronger server-side checker for URL validation (the "check URLs" feature)
    - URL validation now runs through a server-side batched checker instead of the old browser iframe workaround.
    - It still only classifies links as `valid` or `problem`, but it is more reliable for normal dead-link checks and persists completed batches as they finish.
    - Obvious Cloudflare challenge `403` responses are treated as non-problematic so challenge pages are less likely to be mistaken for dead URLs.
    - Added a built-in filter view for `problem URLs`.
- [x] Date filter presets.
    - New filter views for `added this week`, `1-6 months old`, `older than 1 year`.

### v0.8.6 - Bug squashing
- [x] Possible bug: there's no timeout for link title fetching. Can the entire app stall if some title fetching takes a minute?
- [x] Central API error handler.
    - `server/index.ts` now has a central Hono `onError` fallback for uncaught API failures.
    - Expected route-level validation/auth/not-found responses stay local, while unexpected API errors return a generic JSON `500` and are logged server-side.
- [x] Simplified install and release recommendations.
    - The recommended server install is now the published Docker Hub image run directly with `docker run`.
    - The docs now treat Docker as the explicit production path and show persistence through the named volume mounted at `/app/data`.
    - The image now includes a healthcheck, and the repository now includes a GitHub Actions workflow that publishes Docker images only for version tags such as `v0.1.0`.
    - `latest` now tracks the most recently published tagged release instead of every push to `main`.

### v0.8.8 - Better welcome
- [x] Improve welcome screen.
    - Removed the dedicated empty-library "Get Started" screen.
    - First login now opens the normal app interface right away, even when the library is empty.
    - Empty libraries now show a small green welcome notice with a single link to the OpenShelf setup guide.

### v0.9.0 - API, selfbrand
- [x] Add API access to make it possible to add links to the user's list remotely from other tools - like Raycast, Alfred, or other web calls.
    - The scope of this task is to create working endpoints that the user can call to add links to their list.
    - A user should be able to generate an API key (also revoke and regenerate it).
    - Authentication when doing the API call should be done with the API key.
    - Right now, only one action should be available - adding a link to unread.
- [x] iOS sharing.
    - Uses the existing `POST /api/v1/items` API key flow via an iOS Shortcuts Share Sheet setup.
    - No native app; distribution is in-app instructions only for now.
- [x] App logs.
    - Log all significant actions being taken in the app.
    - This should include: all actions being done on links - adding, archiving, unarchiving, deleting, shelf creation, adding/removing from shelf, import being done (with numbers of imported), export, remote API calls done.
    - Don't document anything that deals just with interacting with the UI - like using filters, search, checking URLs.
    - Let's keep the logs in the database, make it viewable in the actions menu, with an option to wipe, or to "delete entries older than 6 months".
- [ ] Make it possible for users to make their own instance of OpenShelf fit their brand.
    - Option to upload their own logo / delete / replace.
    - Change the name in the header next to the logo (but keep a small "by OpenShelf" next to it). Change the SEO title too. Do not change any of the file names, routes, db names, etc. This is just for changing the visible title and header - it's all needed for some minimal self-branding.
    - Expand the app_settings db table to use it for what makes sense here.

### v1.0.0 - Advanced imports and bulk actions
- [ ] Import mapping wizard for unknown CSVs.
    - This is for importing generic “URL/title/date” CSVs.
    - Let the user map columns like `url`, `title`, `created_at`, `tags`, `status` instead of rejecting the file. This would make OpenShelf usable for random old exports and hand-built spreadsheets.
- [ ] Bulk domain actions.
    - Things like “archive all from this domain”, “delete all from this domain”, “move domain to shelf”.
- [ ] Bring back "archive cleanup".
    - There is an "archive cleanup" feature that's a leftover from a previous iteration of the app. The code for that feature is still there but there is no interface for it now. Let's add a simple interface back. Add a new option under the Actions drop down. Just call it "Wipe archive". Add another confirmation for this one. We don't want users clicking it by accident and having the entire archive deleted.

### Backlog / Future
- [ ] Filter connectors
    - Right now, the built in filters include platforms like Twitter, GitHub, Reddit. The user should be able to add their own filters for other platforms if they way to.
    - This will let users have filters for sites they actually store content from the most often.
    - Pick the best way of making it possible: (a) just a form to enter platform URL, path to logo, or maybe (b) a json file with definition, or maybe (c) something else that's better.
- [ ] Performance validation and optimization - verify behavior with very large datasets and only optimize where real bottlenecks show up
- [ ] Bulk status migration - add a safe way to flip all `unread` items to `archive` and all `archive` items to `unread`
- [ ] Saved search history/tree UI. Saved search functionality with exact title/URL matching; using Origin UI tree elements; 
    - Add saved search functionality to store each search query used. 
    - Create search history UI in the search controls area; use the Origin UI tree element for this. 
    - Integrate with existing search state management
- [ ] Nested searches built on top of the saved-search tree. 
    - Basically, if someone looks for "WordPress" and then "plugins", they will see one tree node for "WordPress" and the other for "plugins" that's inside WordPress. So if they click into that, they will see results that have both "WordPress" and "plugins" in them.
- [ ] Title editing for items on the list. (Not sure how actually useful that would be.)
- [ ] Piles.
    - Basically temporary sub-lists that can be created by the user. The idea is that whenever someone's working on a new idea/research/project, they would create a reading pile for that project only.
    - The pile gets automatically deleted when there are no more unread items in it.
- [ ] Dead-link recovery helpers
    - If URL validation says `problem`, offer “search title on web”, “open Wayback”, or “view domain homepage”. Large archives always contain rot.

## Known Issues / Tech Debt

- The app is now persistent, but still single-user and intentionally simple - there is no account system, no sync layer, and no multi-user support
- The nominal 50MB upload limit exists in code, but the README explicitly notes that real-world limits have not been verified yet
- Large-list behavior above roughly 50k items is still an open performance question
- `DataDisplay.tsx` is now split into smaller UI modules under `src/components/data-display/`, but it still owns the central state and workflow logic for the library screen
- Shelves and shelf filters were added, but `DataDisplay.tsx` still owns the combined list, shelf, and filter orchestration
- Manual title fetching for added links is now best-effort server-side, and many sites will still block or degrade fetches
- Docker is the recommended distribution path; Bun-only setup works well for developers but is less familiar for some users
- Getting reliable titles for Twitter articles - not standard tweets - still doesn't work.

## Decisions Pending

- Is in-memory rendering/filtering sufficient for the target dataset sizes, or do we need heavier performance work such as virtualization or off-main-thread processing?
- Should removing a domain rule from a shelf also remove previously backfilled shelf memberships, or should it only stop future automatic additions?
- If saved searches are added, what is the canonical data model for the search tree and nested-query behavior?
- Should OpenShelf stay a strictly self-hosted single-user tool, or eventually grow an optional sync or sharing story?
- Should we display the archived timestamp anywhere or use it in any other way?
- There was a "clear archived" feature in original PocketZen. Should we bring it in some form in OpenShelf?
