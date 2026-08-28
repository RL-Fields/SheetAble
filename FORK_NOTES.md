# Rachel's SheetAble fork - session notes

What's done, what's next, and why. Written so future-me (or you, six months
from now) can pick this back up without re-reading all the source.

## Fixed this session

### Thumbnails not loading

**Root cause:** `backend/api/utils/pdfToImage.go` had the pdf2png
microservice URL hardcoded to `https://pdf2png.sheetable.net/createthumbnail`
- the upstream maintainer's own hosted instance, not something a self-hosted
install can (or should) use. Every upload's thumbnail request failed
against that host, the failure `panic`'d, gin's recovery middleware turned
that into a bare 500 with no response body, and the thumbnail PNG never got
written to disk - so `/api/sheet/thumbnail/:name` 404s forever after.

**Fix:** the URL is now `PDF2PNG_URL` in config (env var), defaulting to
`http://pdf2png:5000/createthumbnail` - the bundled pdf2png container's
address on the docker-compose network. A thumbnail failure also no longer
panics or crashes the request; it's logged and the sheet upload still
succeeds (you just don't get a thumbnail for that one sheet, and can see why
in the server logs).

### Server crash on delete

Found while building bulk delete: `models.Sheet.DeleteSheet` called
`log.Fatal()` (== `os.Exit(1)`) if the thumbnail or PDF file was missing on
disk when deleting a sheet. Given the thumbnail bug above, you likely have
sheets in your library with no thumbnail file already - deleting **any** of
those would have taken the entire backend process down for every user, not
just failed that one request. Now it logs a warning and continues; only the
DB row removal can still fail the request.

## Added this session

- **Bulk upload** - `POST /api/bulk-upload`, multipart with repeated
  `uploadFile` fields, one shared composer/tags/release date/info text.
  Sheet names come from filenames. Partial failures don't abort the batch -
  you get a per-file result back.
- **Bulk delete** - `POST /api/sheets/bulk-delete` (also `DELETE
  /api/sheets/bulk`), JSON body `{"sheet_names": [...]}`.
- **Bulk tag add/remove** - `POST /api/tag/bulk` and `POST
  /api/tag/bulk/delete` (also `DELETE /api/tag/bulk`), JSON body
  `{"sheet_names": [...], "tag_value": "..."}`.
- Frontend: a **Bulk Upload** modal (sidebar, next to the existing single
  Upload) and a new **Manage Sheets** page (`/manage`) - tick sheets across
  your whole library, then delete or tag the selection in one action.
- `docker-compose.yml` + `.env.example` at the repo root, and a reworked
  `backend/Dockerfile` that now actually builds the React frontend and runs
  `rice embed-go` as part of `docker build`, instead of relying on a
  pre-built `rice-box.go` being committed to git (previously: a frontend
  change had **no effect** on a fresh Docker build unless someone manually
  ran `npm run build` + `rice embed-go` and committed the regenerated file).

## Known constraint: tags need Postgres

`Sheet.Tags` is stored as `pq.StringArray` with `gorm:"type:text[]"` - that's
a **Postgres-specific** column type. On SQLite or MySQL, tagging (including
the new bulk-tag endpoints, and eventually instrument/category assignment if
it's built on the same field) is unreliable or broken. The compose file
defaults to Postgres for this reason - which your homelab already runs, so
this isn't a new dependency for you.

## Verification done this session

- `gofmt` clean on every changed/new Go file (valid syntax).
- Frontend: `npm install` + `npm run build` completed successfully with all
  the new components wired in.
- Could **not** run a full `go build` in this session's sandbox - its network
  egress blocks `golang.org/x/*`, `gopkg.in/*` and `google.golang.org/*`
  module hosts (pre-existing transitive deps, unrelated to what changed
  here). Run `cd backend && go build ./...` once on your own machine or the
  homelab before deploying - if anything doesn't compile, send it back and
  I'll fix it immediately.

## Not built yet (by your choice, as follow-ups)

- **Instrument type + customisable categories.** No schema work done yet.
  The existing `Tags` field (`[]string` on each sheet) is the natural
  starting point - either treat "instrument" as a reserved/structured tag,
  or add a proper `Instrument` column plus a `Categories` join table for
  free-form grouping. Worth deciding once you've used tags/bulk-tag for a
  bit and see what you actually want to filter/group by.

- **Annotate on PDFs.** You picked full freehand markup (pen/highlighter) on
  the sheet itself, PDF.js-based. Good news: `pdfjs-dist` and `react-pdf` are
  *already* in `frontend/package.json` (unused right now, or used minimally
  in the sheet viewer) - so the rendering groundwork is already there. This
  is a real feature to build (a canvas overlay per PDF page, a save/load
  format for strokes, deciding whether annotations are per-user or shared)
  - worth its own session.

- **Authentik login.** You asked for the trade-offs before picking a
  direction - see below.

## Authentik: the two real options

Your homelab already runs Authentik (192.168.1.185:9001) behind Nginx Proxy
Manager, used as OAuth2/OIDC for Audiobookshelf and LDAP for Jellyfin.
SheetAble has its own built-in login (email/password + JWT) with no
pluggable auth provider today. Two ways to bring Authentik in:

### Option A - Forward-auth via Nginx Proxy Manager

Add SheetAble as a new proxy host in NPM, and turn on Authentik's
forward-auth (the same mechanism you'd use for any app that has no native
SSO support - NPM asks Authentik "is this person allowed in?" before every
request reaches SheetAble).

- **Effort:** low - almost no code change. Mostly NPM + Authentik config,
  the kind of thing you've already done for other services.
- **What you get:** a login gate in front of the whole app. Nobody reaches
  SheetAble without an Authentik session.
- **What you don't get:** SheetAble still doesn't know *who* is logged in.
  Everyone behind the gate shares SheetAble's own accounts (or you keep
  using the single built-in admin account for everyone). "Create accounts
  for family members to upload their own sheets" - a feature the upstream
  README already advertises - stops working meaningfully, because
  SheetAble's per-user permissions and Authentik's identity are two
  separate, unlinked systems.
- **Good fit if:** you mainly want to stop random people on the internet (or
  even your LAN) from opening SheetAble at all, and you're fine with
  everyone who does get through sharing one SheetAble identity.

### Option B - Native OIDC login inside SheetAther

Build real OIDC support into the Go backend (a new `/api/auth/oidc/callback`
flow next to the existing JWT login) and add an "Log in with Authentik"
button to the React login page - closer to how Audiobookshelf does it.

- **Effort:** real backend work - an OIDC client (there are Go libraries for
  this), mapping an Authentik user to a SheetAble `User` row (create on
  first login, or require pre-provisioning), deciding what happens to the
  existing email/password login (keep both side by side is simplest and
  safest).
- **What you get:** SheetAble actually knows who's who. Per-user
  permissions, "who uploaded this sheet," family members each with their
  own account via Authentik - all real and enforced by SheetAble itself, not
  just gated at the proxy.
- **What you don't get immediately:** it's a bigger, separate piece of work
  from what shipped this session, and touches the auth code path directly
  (this is a fork of an early-stage project - I'd want to test this
  thoroughly rather than rush it).
- **Good fit if:** you actually want multiple real accounts with distinct
  permissions/history, not just a locked door.

**My default recommendation:** start with Option A now (it's nearly free
given your existing NPM+Authentik setup, and gets you a locked-down
instance today), and treat Option B as a later session if per-user identity
inside SheetAble turns out to matter to you in practice. Happy to build
either - just say which.
