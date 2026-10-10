# Development roadmap

Updated: 2026-10-10. Statuses: Backlog → Ready → In progress → Review → Done; Blocked includes reason.

| ID | Milestone / acceptance | Status | Evidence |
|---|---|---|---|
| M0 | Living brief, instructions, task tracking | Done | PROJECT_BRIEF.md, AGENTS.md, README.md, this document |
| M1 | Responsive gallery/detail/submission; original labeled samples | Done | Browser review at desktop and 390px; 12 labeled samples, 6 original illustration directions |
| M2 | Auth, schema, storage, owner/admin access | Review | Supabase adapter, SQL migration, upload Edge Function; PostgreSQL permission tests pass; live OAuth/storage require account setup |
| M3 | Both sharing types, isolated previews, downloads, owner actions | Done locally | Unit tests cover packages/CRUD; browser live iframe works; downloaded prompt ZIP extracted and inspected |
| M4 | URL search/filter/sort/pagination, unique stars, profiles | Done for beta | Search tests and browser filtering/star flow; server uniqueness/privacy tests |
| M5 | Moderation, limits, validation, production deployment | Blocked for deployment | Local tests pass; hosted project credentials/configuration and Cloudflare account not connected |

## Verification evidence
- `npm run build`: TypeScript and production Vite build pass.
- `npm test`: 21 tests across search, preview sanitization/CSP, validation, valid SVG fixtures, ZIP contents/archive generation, local workflows, and PostgreSQL authorization/quotas/moderation.
- PostgreSQL tests execute the migration in PGlite with minimal mocked Supabase auth/storage schemas. These verify real SQL and role policies, not hosted service integration.
- Dependency installation audit: zero known vulnerabilities after upgrading the test runner.
- Browser: desktop and 390px mobile gallery, tag filter (12 → 4 Minimal results), live iframe, account gate, local sign-in, persistent starred collection, incomplete publish validation, and actual prompt ZIP download.
- Download inspected: PROMPT.md, README.md, AI-HANDOFF.md, LICENSE, references/cover.svg.
- Screenshot: preview-desktop.png. Local preview: Vite on http://127.0.0.1:5173/.

## Remaining launch gate
1. Configure Supabase project and two public frontend environment values.
2. Apply migration; deploy upload-image function; enable Google/GitHub OAuth and exact redirects.
3. Verify real Storage API/Edge Function, hosted access policies, and multi-account journeys using README checklist.
4. Connect Cloudflare Pages to a GitHub repository and deploy production.
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
