# Development

## Status

- v0.30 - initial post-pivot version - stand-alone web app meant to be self hosted for single user and let them manage their links of things to read later - with persistant database in SQLite
- v0.40 - cleaner UI for daily use
- v0.50 - new branding

> OpenShelf has pivoted from a browser-only CSV processor into a self-hosted, single-user read-later manager. The current build now has a Bun + Hono backend, SQLite persistence, password protection, CSV import, filtering, cleanup, manual add-link flow, CSV export, and raw database backup download. Current focus should move to hardening, UX cleanup, and product-shape improvements on top of the new persistent foundation.

## Roadmap

Versions prior to v0.30 considered legacy.

### v0.30 - Self-hosted backend pivot
- [x] Optional local persistence - resolved in favor of a self-hosted SQLite-backed app
- [x] Bun runtime adopted for app server and local-first deployment
- [x] Hono API added for auth, items, import, export, and backup routes
- [x] SQLite persistence added at `data/pocketzen.db` - changed to `data/openshelf.db` in later versions
- [x] Single-password auth added with signed session cookies
- [x] Frontend switched from ephemeral in-memory mutations to API-backed persistence
- [x] Docker and bare-metal Bun startup paths documented

### v0.40 - UX cleanup and product-shape
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

### v0.50 - Name change
- [x] Rebrand with a new name.
    - The new name is OpenShelf.
    - Change all visible references of PocketZen to OpenShelf.
    - Change the logo. The new logo file is in public - nookio-side.png

### v0.60 - Refactor
- [ ] Refactor DataDisplay.tsx - it's too big.
    - Refactor the file but don't change any of the features
    - See if we can break off parts of it to other files

### v0.70 - Unread/archive controls, mobile
- [ ] Do some actual controls for marking items read (aka. adding them to archive).
    - Add a new field to db - timestamp when item marked archived - prepare migration script if needed to make the current version not break
- [ ] Title editing for items on the list.
- [ ] Improve mobile

### v0.80 - API
- [ ] Add API access to make it possible to add links to the user's list remotely from other tools - like Raycast, Alfred, or other web calls.

### v0.90 - Selfbrand
- [ ] The idea is to make it available for users to make their own instance of this fit their brand
    - Option to upload their own logo.
    - Change the name in the header next to the logo (but keep a small "by OpenShelf" next to it). Change the SEO title too. Do not change any of the file names, routes, db names, etc. This is just for changing the visible title and header.

### Backlog / Future
- [ ] Filter connectors
    - Right now, the built in filters include platforms like Twitter, GitHub, Reddit. The user should be able to add their own filters for other platforms if they way to.
    - This will let users have filters for sites they actually store content from the most often.
    - Pick the best way of making it possible: (a) just a form to enter platform URL, path to logo, or maybe (b) a json file with definition, or maybe (c) something else that's better.
- [ ] Performance validation and optimization - verify behavior with very large Pocket exports and only optimize where real bottlenecks show up
- [ ] Bulk status migration - add a safe way to flip all `unread` items to `archive` and all `archive` items to `unread`
- [ ] Saved search history/tree UI. Saved search functionality with exact title/URL matching; using Origin UI tree elements; 1. Add saved search functionality to store each search query used. 2. Create search history UI in the search controls area; use the Origin UI tree element for this. 3. Integrate with existing search state management
- [ ] Nested searches built on top of the saved-search tree. Basically, if someone looks for "WordPress" and then "plugins", they will see one tree node for "WordPress" and the other for "plugins" that's inside WordPress. So if they click into that, they will see results that have both "WordPress" and "plugins" in them.

## Known Issues / Tech Debt

- URL validation is a browser-side iframe workaround, so it can only classify links as `valid` or `problem` and will never be fully reliable; building a more reliable method that actually detects everything correctly has proven hard since calls from user browsers like that to get HTTP headers are usually blocked - the iframe method was used as a workaround; alternatively we could use some external API for the checks but that would send the list to a 3rd party service
- The app is now persistent, but still single-user and intentionally simple - there is no account system, no sync layer, and no multi-user support
- The nominal 50MB upload limit exists in code, but the README explicitly notes that real-world limits have not been verified yet
- Large-list behavior above roughly 50k items is still an open performance question
- `DataDisplay.tsx` still owns a large amount of app state and workflow logic, so future changes there will get harder without refactoring
- Manual title fetching for added links is now best-effort server-side, and many sites will still block or degrade fetches
- Docker is the recommended distribution path; Bun-only setup works well for developers but is less familiar for some users

## Decisions Pending

- Should URL validation remain a browser-only heuristic, or should the project eventually move to a stronger server-side checker? Like for instance making actual http requests - likely yes.
- Is in-memory rendering/filtering sufficient for the target dataset sizes, or do we need heavier performance work such as virtualization or off-main-thread processing?
- If saved searches are added, what is the canonical data model for the search tree and nested-query behavior?
- Should OpenShelf stay a strictly self-hosted single-user tool, or eventually grow an optional sync or sharing story?
