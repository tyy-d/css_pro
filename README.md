# CSS Pro

A visual design-sharing MVP for people building websites with AI. React, TypeScript, Vite, and Supabase, ready for Cloudflare Pages.

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

1. Create a Supabase project. Keep its service-role key private.
2. Apply `supabase/migrations/202610090001_initial.sql` to a **fresh** project using the SQL editor or Supabase CLI migrations. Do not apply twice.
3. Copy `.env.example` to `.env.local` and set the project URL and public anon key. Restart Vite:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
```

4. Enable Google and GitHub in Authentication → Providers. Configure the provider apps with the callback URL shown by Supabase. Set the Auth site URL to the production origin and add the exact local development origin to allowed redirect URLs. Do not use a wildcard production redirect.
5. Deploy the image-upload function. It explicitly validates the user's token using `auth.getUser()`; gateway JWT verification is disabled for compatibility with current project key formats:

```sh
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase functions deploy upload-image --no-verify-jwt
```

The Edge Function's `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are supplied by Supabase. Never copy the service-role key into the frontend environment.

6. Sign in once to create your profile, then grant your own profile administrator status in the SQL editor:

```sql
update public.profiles set is_admin = true where id = 'YOUR_AUTH_USER_UUID';
```

7. Run the live launch checks below. The local database tests use real PostgreSQL through PGlite but mock Supabase's auth/storage schemas; they do not substitute for hosted OAuth, Storage API, or Edge Function integration testing.

## Deploy to Cloudflare Pages

1. Put this project in a GitHub repository and connect that repository to Cloudflare Pages.
2. Use build command `npm run build`, output directory `dist`, and Node.js 24.
3. Set the two public `VITE_SUPABASE_*` variables in the **production** environment. Leave preview deployments unconfigured for demo mode, or connect a separate staging project. Never use production data for preview tests.
4. Deploy. Use the returned `pages.dev` URL as the Supabase Auth site URL; add a custom domain later if wanted.
5. The public URL is not created by running the local app. No hosting account or live backend has been provisioned by this repository.

Free-tier quotas and inactivity behavior can change. Check the provider dashboards before launch. Supabase may pause inactive free projects. No paid service or domain is required to inspect this MVP locally.

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
- Test deployment rollback using the preceding Cloudflare Pages deployment. Keep database migrations backward-compatible when rolling back frontend code.

## Operations and deliberate MVP boundaries

Search/filtering currently runs over the permitted records loaded by the client. Database full-text/tag indexes are prepared, but moving search/pagination to a database RPC and loading only visible thumbnails is the first scaling task before a large public collection. No arbitrary record cap silently drops designs.

Tags are a controlled list in `src/lib/types.ts` and the SQL allowlist. Editing tags is a versioned code/migration change in this MVP, not an admin tag editor. Account suspension is available through `suspend_creator` for administrators; there is no separate user-management screen yet. Aggregate product analytics are not enabled; provider logs support initial debugging without sending prompt contents to analytics vendors.

Screenshots are user supplied. The app never claims a screenshot is proof of code output. Live previews disable scripts/forms/navigation/network and support only local images. Native buttons/inputs can be displayed, but no form submission or JavaScript runs. Included remote fonts are not supported in submissions.

Run `node scripts/cleanup-assets.mjs` with private `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` environment variables to list orphaned assets older than 24 hours. Review the dry run before passing `--apply`. This removes abandoned or no-longer-referenced uploads and releases quota. Schedule through your own operational runner after testing; no scheduler is provisioned automatically.

Weekly beta review: quota usage, error logs, open reports, feedback, download quality, and backup health. Rate-event rows expire during subsequent actions; reservations expire during subsequent upload attempts. Keep private backups outside this repository.

## Development process

Start with `PROJECT_BRIEF.md`, `ROADMAP.md`, and `AGENTS.md`. Update the brief and acceptance criteria when requirements change. Record verification evidence in the roadmap. Do not label local demo completion as public-beta deployment.

## GitHub Pages demo

The requested demo target is `https://tyy-d.github.io/css_pro/`, with source at `https://github.com/tyy-d/css_pro`. The Pages workflow tests and builds every push to `main`, then deploys the `dist` artifact. It intentionally has no Supabase environment configuration: the public website uses browser-local demo data.

Relative Vite assets and path-aware design/auth links support the `/css_pro/` subpath. The application uses query-string navigation, so direct design links and browser refresh work without a Pages rewrite rule. Cloudflare-specific `_headers` and `_redirects` are ignored by GitHub Pages; preview isolation is enforced in the application iframe and its embedded CSP.
