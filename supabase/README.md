# Community backend operations

## Environments

Development: `npx supabase start`, then `npx supabase functions serve upload-image`.
Run `npm run test:integration` against this disposable localhost stack. The script refuses remote URLs and deletes its temporary accounts and assets. `npm test` also runs SQL policy/revision tests in PGlite.

Frontend development and preview builds default to `VITE_DATA_MODE=demo`. To exercise local services, put localhost URL and a browser-safe local publishable key in ignored `.env.local`, explicitly set `VITE_DATA_MODE=supabase`, and restart Vite. Never put administrative credentials into VITE variables.

The main-only Pages workflow reads repository variables `CSS_PRO_DATA_MODE`, `SUPABASE_URL`, and `SUPABASE_PUBLISHABLE_KEY`. Leave mode `demo` until all launch checks pass. Missing configuration in Supabase mode renders an actionable maintenance/error screen. There is no backend-outage fallback to demo.

## Hosted setup

1. Create free `css-pro` in the confirmed `tyy-d's` organization, US East Northern Virginia.
2. Apply all migrations in filename order; deploy `upload-image`, including `_shared/image.ts`. The function authenticates the bearer token using Auth before accepting content; enable gateway JWT validation when compatible with the project's JWT signing configuration.
3. In Auth URL configuration set site URL `https://tyy-d.github.io/css_pro/`. Allow exactly that URL plus `http://127.0.0.1:5173/` and `http://127.0.0.1:4173/`. Callback state lives in same-tab sessionStorage and is consumed after login.
4. Enable Google and GitHub providers. Register each provider's callback as `https://PROJECT_REF.supabase.co/auth/v1/callback`. Enter provider client secrets only in provider/Supabase configuration interfaces. Google web client authorized origin is the Pages origin, `https://tyy-d.github.io`.
5. Sign in as the intended administrator, verify the Auth user ID, then explicitly update that profile's `is_admin` in the SQL editor. Never infer the admin from first registration. Test with two separate ordinary accounts too.
6. Populate six verified original starter submissions through the owner account after matching each screenshot to its supplied code/result. Existing browser-local samples are not imported.

## Asset maintenance

`node scripts/cleanup-assets.mjs` is a dry run. It retains assets referenced by either public designs or private working drafts. Review the candidate list before `--apply`. Run during a maintenance window: the scan and object deletion are not a single database transaction; concurrent draft saves can add references after the scan. Orphans less than 24 hours old are retained.

## Backup and restore gate

Before opening beta, export schema/roles/data with the Supabase CLI database dump commands into private encrypted storage, and export every object from the private `design-assets` bucket preserving paths. Database dumps alone do not back up image bytes. Record the project ref, migration list and export time without exposing passwords or service keys.

Restore into a separate disposable project. Apply schema/migrations, restore data and Auth identities using the supported Supabase migration process, recreate the private bucket and copy object bytes. Verify owner IDs, profiles, drafts, manifests, stars, reports and a full ZIP download with owner/anonymous/other-user accounts. Record evidence in ROADMAP.md; documentation alone is not a completed restore drill.

## Rollback

Keep database content and additive migrations. Roll back frontend code to a known compatible build using the same Supabase project, or deploy a maintenance build that disables community access. Do not set demo mode to hide a production outage. Retain exports and logs, investigate Auth/Edge/Postgres errors, and repeat the affected launch checks before resuming publication. Free-tier inactivity and quota limits require operational attention.

References: [Supabase redirect configuration](https://supabase.com/docs/guides/auth/redirect-urls), [API key guidance](https://supabase.com/docs/guides/getting-started/api-keys), [current free-tier limits](https://supabase.com/pricing).

Provisioned project: `qujticcgxmlpzkxkznrh` (CSS Pro, us-east-1), https://qujticcgxmlpzkxkznrh.supabase.co . GitHub provider configured; consult ROADMAP.md for current launch blockers.

## Hosted migration history

The provisioning connector assigned execution timestamps instead of repository filename versions. These migrations are already applied; do not blindly run `supabase db push` against this project or replay them.

| Repository version | Hosted history version | Name |
|---|---|---|
| 202610090001 | 20261012201335 | initial |
| 202610120001 | 20261012201550 | community |
| 202610120002 | 20261012201656 | dashboard_rls_helper |

Before adopting CLI-based production migrations, review this mapping and explicitly authorize reconciliation using the supported migration-history procedure. Direct catalog rewriting was rejected by automatic approval review and was not performed. Local disposable stacks continue using repository migrations normally.
