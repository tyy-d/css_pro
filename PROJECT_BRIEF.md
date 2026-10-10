# CSS Pro — living product brief

Updated: 2026-10-09. Working title: CSS Pro. This file is the source of truth; revise it when requirements change.

## Goal and audience
A public visual library for people building websites with AI. Browse → filter → inspect → star → download code or copy prompts. Manually designed work is equally welcome. Browsing and reuse do not require an account.

## Confirmed decisions
- Quiet editorial gallery; neutral platform chrome, large previews, responsive mobile/desktop layouts.
- Components and single pages. Two submission types: HTML/CSS designs (optional prompt), and screenshot/prompt recipes (no code required).
- Immediate publishing, saved drafts, owner editing/unpublishing/deletion; administrator moderation and reporting.
- Required screenshots, title, description, 1–5 controlled tags, reuse instructions, MIT agreement and asset attribution.
- Live sandboxed HTML/CSS preview only. No JavaScript, external stylesheets, remote fonts, framework execution or arbitrary archives.
- Public downloads; account required for publishing, stars and reports. Google/GitHub OAuth.
- One standard MIT license for code/prompt text. Creators must hold redistribution rights to included assets.
- Free-tier start: React + TypeScript + Vite; Cloudflare Pages; Supabase Auth/Postgres/Storage.
- Search titles/descriptions/creators/tags. OR within filter group, AND across groups. URL state; newest/most-starred/relevance sorting.
- Private starred lists; public published creator profiles.

## MVP acceptance
Both types can be saved as drafts, published, edited, unpublished and deleted. Preview isolation blocks scripts/network/navigation. Downloads contain accepted source, assets, README, attribution and MIT license. Database/storage policies enforce owner/draft/hidden permissions. Moderation prevents authors restoring hidden work. Responsive gallery, detail, submission and personal library work with keyboard controls and clear empty/error/loading states.

## Resource limits
HTML and CSS: 200 KB each. Prompt: 20,000 characters. Up to 5 screenshots and 10 MB uploaded raster images total per design; PNG/JPEG/WebP only. Controlled tags: 1–5. Rate limits enforced on server mutations. No credentials in source.

## Exclusions
Comments, follows, DMs, payments, platform AI generation, semantic search, arbitrary runnable projects, public revision history and SSR are post-MVP.

## Changes and process
For any change: record request/date, affected tasks/data, chosen behavior, revised acceptance and dependencies. Preserve prior decisions here. Routine technical choices are autonomous; material product, cost or data changes require discussion. Track evidence in ROADMAP.md. Do not describe demo persistence as a live multi-user backend.

## Later milestones
Improve reuse (tokens/revisions), discovery (collections/search feedback), reach (SSR/social previews), content (framework packages/isolated JS), then community (forks/comments).

## Decision log
- 2026-10-09: Implement full browser-local demonstration when Supabase environment is absent; visibly label all demo content and local persistence. The same UI switches to Supabase with environment configuration. Production launch remains gated on real credentials, migrated database and live access-policy tests.
- 2026-10-10: Beta implementation uses client-side filtering of authorized records. Full-text/tag database indexes are prepared; server-side search/pagination and thumbnail-only loading are the first scaling task. Tag editing remains a versioned allowlist change; account suspension is an admin RPC. Public launch requires live-provider verification. See ROADMAP.md for evidence and remaining gates.
- 2026-10-10: User requested GitHub repository `tyy-d/css_pro` and GitHub-hosted website. Publish the public demo on GitHub Pages through Actions; keep Supabase integration available but unconfigured. Relative build assets and base-aware links support the project subpath. Cloudflare remains an optional alternative.
