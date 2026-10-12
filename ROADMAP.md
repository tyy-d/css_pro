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

## Community backend implementation — 2026-10-12
| ID | Milestone | Status | Gate |
|---|---|---|---|
| S1 | Explicit configuration, corrective migration, upload function, new hosted project | In progress | Local services pass; hosted project reachable |
| S2 | OAuth callbacks, profile, recovery and identity isolation | Ready | Google/GitHub verified on hosted origin |
| S3 | Private revisioned drafts, uploads, explicit atomic publication | Ready | Both content types complete lifecycle with no draft leakage |
| S4 | Paginated search, lazy assets, stars and moderation | Ready | Anonymous/two-user/admin tests pass |
| S5 | Accurate starter designs and public beta rollout | Ready | Provider setup, hosted QA and restore drill pass |

Current branch: codex/supabase-community. Supabase plugin connection requested; production configuration remains untouched.

## Auth and protected-route follow-up — 2026-10-12
- Added loading/sign-in/admin gates for direct `submit`, `mine`, `stars`, and `admin` query routes. Public browsing remains available.
- OAuth uses PKCE and retains the current app path/query; provider-denial callbacks are cleared and shown as a retryable message. Session changes clear rendered private records, reports and editor state; superseded refreshes cannot commit their results.
- Added seven focused auth tests for route roles, session restoration/sign-out gates, subpath return URLs and denied callbacks. Full suite: 30 tests passed.
- Supabase connector discovery found only unrelated inactive `guess-league`; no hosted project was modified. CSS Pro organization selection is pending, followed by required cost confirmation, provider configuration and live OAuth/access tests.
- Concurrent workspace changes were detected in the repository adapter/config/types during this work; existing changes were preserved. Combined `npm run build` passed. Auth work remains in review pending hosted journeys.
- Organization confirmed by user: `tyy-d's` (`vgtnlndndtrcqyzvuipb`). Provisioning attempted on 2026-10-12, but the connector returned UNAVAILABLE for its required `get_cost` operation. Plugin discovery confirms Supabase is installed/enabled. Dashboard fallback is open at sign-in; user login is required before continuing setup. No project created and no deployment/data connection changed.

## Community implementation evidence — 2026-10-12

Feature branch `codex/supabase-community`; main and hosted demo have not been changed.

- S1 local foundation implemented: explicit configuration modes, separate working-draft table, revision-checked save/publish RPCs, published-manifest Storage policies, bounded upload bodies, server image type/dimension checks. Hosted provisioning remains blocked on identifying the new project; connector lists only unrelated inactive `guess-league`. User confirmed organization and reported setup ready; project reference requested to resolve the mismatch. No unrelated project modified.
- S2 local implementation: PKCE callback handling, exact root return URL with same-tab intended actions, private-route guards, display-name editing, sign-out/identity cache clearing, suspended-account messaging. Both real OAuth providers and expired-session browser recovery are launch blockers until hosted verification.
- S3 implementation: private draft saves, explicit publication, upload progress and individual retry, preserved successful assets, cover selection, navigation/reload guards, editor URL recovery, explicit unpublish-before-delete. Full browser lifecycle for both submission types still needs hosted verification.
- S4 implementation: nine summaries/page via database RPC, total counts, filters/creator/private stars, lazy detail assets, optimistic stars, report resolution and hide/restore. Downloads recheck current published visibility. Maintenance now retains working-draft assets.
- Evidence: `npm test` passes **34 tests**, including both SQL migrations, malformed-field rejection, stale revisions, private edit/image isolation, and moderation restore/suspension boundaries. `npm run build` passes. ZIP creation now loads its library on demand (main bundle approximately 556 kB; no chunk-size warning).
- Real local services: `npm run test:integration` passes against Docker Supabase Auth, Storage and Edge Function. Covers two ordinary users plus explicit test admin; invalid uploads/non-owner uploads; unpublished assets; unique concurrent stars; concurrent publication (one winner); profile update; report/hide/restore; unpublish; and denied admin escalation. Temporary users/assets are cleaned up.
- Browser demo evidence: share prompts sign-in and returns to editor; explicit private save succeeds; named draft recovers after reload using its editor URL. Mobile header sign-out retained. This is local browser evidence, not hosted OAuth proof.
- S5 **not complete**: six accurate original starter screenshots and owner publication, provider configuration/logs, hosted anonymous/two-user/admin QA, export/restore drill and rollback verification remain before beta. Existing demo illustrations are not imported or represented as verified starter screenshots.
- Operational setup and remaining launch procedure: `supabase/README.md`; public demo remains operational. Never enable production Supabase mode until these gates are evidenced.

### Starter preparation and review branch
- Draft PR: https://github.com/tyy-d/css_pro/pull/1 (not merged; no deployment).
- Six original source packages prepared in `starter-designs/designs.json`, with JPEGs captured directly from each exact HTML/CSS document at 800 × 640. Covers and text were inspected in the browser. These are clearly labeled static starter designs, not functional applications.
- `scripts/import-starters.mjs` creates owner-authenticated private drafts by default, requires explicit project/owner identity, and only publishes with `--publish`. It has not been run against the hosted project. Owner attribution/publication remain launch blockers.
- Local browser sign-out returned to anonymous gallery and removed private editor/account controls.

- Added pull-request validation workflow: demo-only build/unit tests plus disposable local Supabase integration tests. CI execution evidence is pending its first run; it receives no production variables.
