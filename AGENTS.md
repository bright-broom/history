# Repository guidance

- Use Node.js 22 and npm. package-lock.json is authoritative.
- Domain and services depend on domain ports. Runtime adapters are composed in src/server.
- Run npm run check-all for application/tooling changes. Build only when application, dependencies, or deployment configuration changes. Documentation-only changes do not need builds.
- Keep automation bounded: no recursive fix/review loops, no unattended merges, no new paid services. Preserve existing user changes.

## Code Review Rules

- Prioritize reproducible bugs and consequential security/data-integrity regressions. Include the affected path and trigger; do not duplicate lint results or propose cosmetic rewrites.
- Historical dates must be timezone independent. Validate every YAML's path and content. Missing documents may return null; malformed data and I/O failures must remain errors. Count monthly events only, not summary duplicates.
- Keep Actions tokens read-only unless a specific job needs more. Never run PR code with privileged pull_request_target/workflow_run credentials. Path-based skipping must fail open for unknown paths and missing history, retain a completed required check, and include deleted/renamed application files.
