# Development roadmap

Updated: 2026-10-10. Statuses: Backlog → Ready → In progress → Review → Done; Blocked includes reason.

| ID | Milestone / acceptance | Status | Evidence |
|---|---|---|---|
| M0 | Living brief, instructions, task tracking | Done | PROJECT_BRIEF.md, AGENTS.md, README.md, this document |
| M1 | Responsive gallery/detail/submission; original labeled samples | Done | Browser review at desktop and 390px; 12 labeled samples, 6 original illustration directions |
| M2 | Auth, schema, storage, owner/admin access | Review | Supabase adapter, SQL migration, upload Edge Function; PostgreSQL permission tests pass; live OAuth/storage require account setup |
| M3 | Both sharing types, isolated previews, downloads, owner actions | Done locally | Unit tests cover packages/CRUD; browser live iframe works; downloaded prompt ZIP extracted and inspected |
| M4 | URL search/filter/sort/pagination, unique stars, profiles | Done for beta | Search tests and browser filtering/star flow; server uniqueness/privacy tests |
| M5 | Moderation, limits, validation, production deployment | Public demo deployed; backend pending | GitHub Pages live at https://tyy-d.github.io/css_pro/; Supabase not connected |

## Verification evidence
- `npm run build`: TypeScript and production Vite build pass.
- `npm test`: 23 tests across search, preview sanitization/CSP, validation, valid SVG fixtures, ZIP contents/archive generation, local workflows, and PostgreSQL authorization/quotas/moderation.
- PostgreSQL tests execute the migration in PGlite with minimal mocked Supabase auth/storage schemas. These verify real SQL and role policies, not hosted service integration.
- Dependency installation audit: zero known vulnerabilities after upgrading the test runner.
- Browser: desktop and 390px mobile gallery, tag filter (12 → 4 Minimal results), live iframe, account gate, local sign-in, persistent starred collection, incomplete publish validation, and actual prompt ZIP download.
- Download inspected: PROMPT.md, README.md, AI-HANDOFF.md, LICENSE, references/cover.svg.
- Screenshot: preview-desktop.png. Hosted demo: https://tyy-d.github.io/css_pro/.

## Remaining launch gate
1. Configure Supabase project and two public frontend environment values.
2. Apply migration; deploy upload-image function; enable Google/GitHub OAuth and exact redirects.
3. Verify real Storage API/Edge Function, hosted access policies, and multi-account journeys using README checklist.
4. GitHub Pages demo deployed at https://tyy-d.github.io/css_pro/. Connect Supabase only after hosted integration checks.
5. Assign administrator, verify moderation, perform separate-project export/restore drill, and test deployment rollback.

## Explicit MVP simplifications
- Browser-local demo is always labeled; it is not a deployed community backend.
- Client-side search over permitted records; database full-text/tag indexes are present, but query RPC and thumbnail-only loading are the next scaling task.
- Controlled tag changes use code + migration; no admin tag editor.
- Administrator hide/restore UI and suspension RPC exist; no separate account-management UI.
- No product analytics vendor is connected. Use provider error/quota logs and beta feedback initially.
- Source-backed original samples are simplified starters; their illustrations are clearly labeled as references rather than identical renders.

## Next session
Connect the production services, then run the live launch gate. If services are not yet available, review the visual direction with the user and address feedback in PROJECT_BRIEF.md before expanding scope.

## Working log
- 2026-10-09: Empty workspace inspected; approved plan translated into living instructions, application, migration and tests.
- 2026-10-10: Browser QA, dependency audit remediation, ZIP inspection, deployment/operations documentation, and roadmap handoff completed.

## GitHub publication and hosted QA — 2026-10-10
- Public source repository: https://github.com/tyy-d/css_pro (user explicitly approved public visibility).
- Live demo: https://tyy-d.github.io/css_pro/; HTTPS enforced; Actions-based deployment on main.
- Initial deployment workflow passed build, 23 tests, and deployment: https://github.com/tyy-d/css_pro/actions/runs/38023533732.
- Hosted browser checks: mobile gallery and assets, Minimal filter (12 → 4), direct design URL reload, live sandbox preview, demo sign-in, star persistence across reload.
- Hosted code ZIP downloaded and inspected: HTML/CSS, README, MIT license, AI handoff and screenshot reference. Both source URLs retain /css_pro/ correctly.
- Added accessible name to the icon-only mobile Share button during hosted QA.
- GitHub Pages hosts the static application only; real OAuth and shared community persistence remain unconfigured.
