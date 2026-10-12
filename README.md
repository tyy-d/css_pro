# CSS Pro

A visual design-sharing MVP for people building websites with AI. React, TypeScript, Vite, and Supabase, hosted on GitHub Pages.

## Run locally

Requires Node.js 22.12+ (tested with Node 24).

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. With no environment variables, the app runs a **clearly labeled browser-local demo**. Click Sign in → Enter local demo to try stars, drafts, submissions, and moderation. Demo accounts are not production identities; data is stored in this browser only. Demo assets share browser storage limits, which can be lower than the production 10 MB upload allowance.

```sh
npm test
npm run build
npm run preview
```

The production build is emitted to `dist/`. `_redirects` supports client navigation on Cloudflare Pages. No backend secrets belong in this directory or in `VITE_*` variables.

## What is implemented

- Responsive editorial gallery, URL-persisted search, multi-tag filters, content/format filters, sorting, pagination, and creator collections.
- Code designs and prompt recipes, guided submission, screenshot and asset uploads, draft/edit/publish/unpublish/delete flows.
- Sandboxed HTML/CSS previews with mobile/desktop widths, screenshots, source inspection, prompt copying, and AI handoff copying.
- ZIP downloads with code or prompt, screenshot references, uploaded assets, README, MIT license, attribution, and AI handoff.
- Account-gated unique stars, private saved lists, owner library, reports, administrator hide/restore, and server-side account suspension RPC.
- Supabase migration with row-level permissions, validated mutation functions, rate limits, storage access, and upload reservations.
- Upload Edge Function validating identity, ownership, MIME/file signatures, and per-design byte quota.

Original sample illustrations are labeled. The supplied sample HTML/CSS is a simplified starting point and is not a pixel-identical reconstruction of those illustrations. The production backend begins empty; it does not pretend samples are community posts.

## Connect Supabase

Follow [backend setup and operations](supabase/README.md). Apply both migrations in filename order to a fresh project, deploy the upload function, configure Google/GitHub providers, and explicitly assign the verified administrator account. Provider secrets stay in configuration interfaces.

For disposable local integration tests:

```sh
npx supabase start
npx supabase functions serve upload-image
# In another terminal:
npm run test:integration
```

The integration suite creates and cleans up temporary local users/assets. It tests actual Auth, Storage and Edge Function behavior; hosted OAuth must still be verified separately.

For the browser to use local services, explicitly set `VITE_DATA_MODE=supabase` and the local `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` in ignored `.env.local`. Preview builds use `VITE_DATA_MODE=demo`. Never connect development tests to production data.

The main-only GitHub Pages workflow reads `CSS_PRO_DATA_MODE` (defaults to demo), `SUPABASE_URL`, and `SUPABASE_PUBLISHABLE_KEY` repository variables. Production remains demo until launch checks pass. Missing configuration in Supabase mode fails visibly instead of falling back to demo.

## Live launch checklist

- Anonymous user can browse/download only published designs.
- Owner can save/upload/edit/publish/unpublish/delete both types; another account cannot access drafts or alter ownership/admin status.
- Google/GitHub redirect correctly on production; sign-out clears private views.
- Draft/hidden assets cannot be fetched by another user or anonymous clients. Already downloaded content cannot be recalled.
- Upload Edge Function rejects wrong MIME/signatures, non-owner paths, oversized totals, and concurrent quota overflow.
- Direct Storage uploads are denied; only the validated Edge Function writes assets.
- Repeated stars stay unique; reports reach the admin queue; hidden content cannot be republished by its owner.
- Test downloads with uploaded images and confirm referenced file paths work offline.
- Test mobile keyboard flow and visible errors. Verify the provider logs for unexpected failures.
- Export database plus storage assets and exercise a restore in a separate project before inviting public users.
- Test deployment rollback using the preceding compatible GitHub Pages build. Keep database migrations backward-compatible when rolling back frontend code.

## Operations and deliberate MVP boundaries

Supabase discovery returns nine summaries and a total count per page. Search includes title, description, tags and creator; filters use OR within tags and AND between groups. Full source and additional assets load on opening a design. Working drafts are separate from published records, with explicit revision-checked publication. Public Storage reads require an asset to be present in the published manifest.

Tags are a controlled list in `src/lib/types.ts` and the SQL allowlist. Editing tags is a versioned code/migration change in this MVP, not an admin tag editor. Account suspension is available through `suspend_creator` for administrators; there is no separate user-management screen yet. Aggregate product analytics are not enabled; provider logs support initial debugging without sending prompt contents to analytics vendors.

Screenshots are user supplied. The app never claims a screenshot is proof of code output. Live previews disable scripts/forms/navigation/network and support only local images. Native buttons/inputs can be displayed, but no form submission or JavaScript runs. Included remote fonts are not supported in submissions.

Run `node scripts/cleanup-assets.mjs` with private `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` environment variables to list orphaned assets older than 24 hours. Review the dry run before passing `--apply`. This removes abandoned or no-longer-referenced uploads and releases quota. Schedule through your own operational runner after testing; no scheduler is provisioned automatically.

Weekly beta review: quota usage, error logs, open reports, feedback, download quality, and backup health. Rate-event rows expire during subsequent actions; reservations expire during subsequent upload attempts. Keep private backups outside this repository.

## Development process

Start with `PROJECT_BRIEF.md`, `ROADMAP.md`, and `AGENTS.md`. Update the brief and acceptance criteria when requirements change. Record verification evidence in the roadmap. Do not label local demo completion as public-beta deployment.

## GitHub Pages demo

The requested demo target is `https://tyy-d.github.io/css_pro/`, with source at `https://github.com/tyy-d/css_pro`. The Pages workflow tests and builds every push to `main`, then deploys the `dist` artifact. Production repository variables remain unset: the public website uses browser-local demo data until the connected beta launch gate passes.

Relative Vite assets and path-aware design/auth links support the `/css_pro/` subpath. The application uses query-string navigation, so direct design links and browser refresh work without a Pages rewrite rule. Cloudflare-specific `_headers` and `_redirects` are ignored by GitHub Pages; preview isolation is enforced in the application iframe and its embedded CSP.
