# Development instructions
Read PROJECT_BRIEF.md and ROADMAP.md before changing the project. Follow the confirmed scope and selected stack. Maintain a usable vertical slice; do not silently replace backend functionality with mock behavior. Label browser-local demo state clearly. Never commit credentials.

Implement the next unblocked milestone, preserve existing work, run relevant tests/builds, and update roadmap evidence and next steps. For changed requirements, update the brief and affected task acceptance before implementing. Do not mark a task done without evidence. Keep production launch blockers distinct from local implementation completion. Do not deploy or connect preview builds to production data accidentally.

Use trusted application code only outside the preview iframe. Uploaded HTML/CSS is untrusted. Preserve sandbox/CSP/validation, access policies and limits. No scripts, external CSS or project execution in submitted previews. Use narrowly scoped tests for permissions, preview safety, downloads and user journeys.
