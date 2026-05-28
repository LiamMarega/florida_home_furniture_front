# Skill Registry — florida_home_furniture_front

Generated: 2026-05-27
Source: project-level + user-level skill directories

## Project Conventions

| File | Notes |
|------|-------|
| `.cursor/rules/not-unnesesary-files.mdc` | Do not create files unless necessary; prefer editing existing |
| `.eslintrc.json` | ESLint config extending `next/core-web-vitals` |
| `tsconfig.json` | TypeScript strict mode, `@/*` path alias to root |
| `components.json` | shadcn/ui config: default style, RSC enabled, `@/components/ui` alias |
| `tailwind.config.ts` | Custom brand colors, CSS variables, custom font families |

## Compact Rules

### Project-Level Skills (project root directories — deduplication wins)

#### agent-harness-construction
**Trigger**: AI agent action spaces, tool definitions, observation formatting.
**Rules**: Design agent tools and actions for high completion rates. Use structured action spaces with explicit success criteria. Format observations to minimize ambiguity. Test with eval harness before deployment.

#### agentic-engineering
**Trigger**: Eval-first execution, decomposition, cost-aware model routing.
**Rules**: Start with eval criteria before implementation. Decompose tasks into atomic verifiable units. Route subtasks to cheapest capable model. Always measure pass rate, cost, and time.

#### ai-first-engineering
**Trigger**: Teams where AI generates majority of implementation output.
**Rules**: Structure work for AI parity — decompose specs, prefer declarative patterns, use spec-driven development. Keep PRs small (≤400 lines). Use work-unit commits. Review AI output systematically.

#### ai-regression-testing
**Trigger**: Regression testing in AI-assisted development, catching AI blind spots.
**Rules**: Use sandbox-mode API testing without database dependencies. Always test where AI writes AND reviews code (same model blind spot). Automate bug-check workflows. Run regression suite after every change batch.

#### api-design
**Trigger**: REST API design, resource naming, status codes, pagination, versioning.
**Rules**: Use plural nouns for resources, consistent status codes, cursor-based pagination, envelope error responses. Version via URL prefix or header. Rate limit with 429 + Retry-After.

#### backend-patterns
**Trigger**: Backend architecture, Node.js, Express, Next.js API routes.
**Rules**: Layer separation (routes → service → data). Validate input at boundary. Use error-first design. Cache aggressively. Prefer streaming for large payloads.

#### blueprint
**Trigger**: Multi-session, multi-agent engineering plans from one-line objectives.
**Rules**: Include dependency graph, parallel step detection, anti-pattern catalog. Each step must be self-contained for a fresh agent. Add adversarial review gate before final execution.

#### bun-runtime
**Trigger**: Adopting Bun, migrating from Node, Bun scripts/tests, Vercel with Bun.
**Rules**: Use Bun for faster installs and native TS. Note Vercel support is experimental. Use `bun run` as drop-in for npm scripts. `bun test` as built-in test runner.

#### carrier-relationship-management
**Trigger**: Managing carrier portfolios, negotiating rates, carrier performance.
**Rules**: Score carriers on on-time %, damage rate, cost/mile, communication. Run quarterly RFPs with data-backed negotiation. Use tiered carrier strategy (core/secondary/spot).

#### claude-api
**Trigger**: Building apps with Claude API, Anthropic SDKs.
**Rules**: Use Messages API for chat. Enable streaming for UX. Use prompt caching for large contexts. Extended thinking for complex reasoning. Tool use for structured outputs.

#### claude-devfleet
**Trigger**: Multi-agent orchestration via DevFleet, parallel agents in worktrees.
**Rules**: Plan project as chained missions. Monitor agent progress. Read structured reports. Use isolated worktrees per agent to prevent conflicts.

#### clickhouse-io
**Trigger**: ClickHouse query optimization, analytics, data engineering.
**Rules**: Use materialized views for aggregations. Prefer low-cardinality types. Partition by time for range queries. Use `ORDER BY` columns matching query patterns.

#### coding-standards
**Trigger**: TypeScript, JavaScript, React, Node.js code standards.
**Rules**: Use const/let, no var. Prefer early returns. Name exports clearly. Use TypeScript strict mode. Avoid `any`. Use async/await over raw promises. Atomic commits per concern.

#### compose-multiplatform-patterns
**Trigger**: Compose Multiplatform, Jetpack Compose, KMP UI.
**Rules**: State hoisting with ViewModel. Unidirectional data flow. Prefer `StateFlow` in ViewModels. Use `remember`/`derivedStateOf` for local state. Navigation via Compose Navigation.

#### configure-ecc
**Trigger**: Installing Everything Claude Code skills, verifying paths.
**Rules**: Interactive installer for ECC components. Supports user-level and project-level install. Verifies paths after install. Optionally optimize installed files.

#### content-engine
**Trigger**: Social posts, threads, scripts, newsletters, multi-platform campaigns.
**Rules**: Create platform-native content. Adapt one source asset per platform. Never post identical content cross-platform. Include engagement hooks per channel norms.

#### dmux-workflows
**Trigger**: Multi-agent orchestration via dmux (tmux), parallel agent sessions.
**Rules**: Use tmux panes to run multiple agents in parallel. Coordinate via shared files or ENGRAMS. Monitor all panes for completion.

#### docker-patterns
**Trigger**: Docker, Docker Compose, container dev, multi-service orchestration.
**Rules**: Use multi-stage builds to minimize image size. Prefer distroless or Alpine for production. Use health checks. Never run as root. Use compose profiles for dev vs prod.

#### documentation-lookup
**Trigger**: Questions about libraries, frameworks, APIs (React, Next.js, Prisma, etc.).
**Rules**: Use Context7 MCP (`resolve-library-id` + `query-docs`) for up-to-date docs. Never rely on training data for API specifics.

#### frontend-patterns
**Trigger**: React, Next.js, state management, performance, UI patterns.
**Rules**: server components by default, client components only when needed. Use `'use client'` minimally. Optimize images with next/image. Lazy load heavy components. Use React 19 patterns.

#### frontend-slides
**Trigger**: Building HTML presentations, converting PPT/PPTX to web.
**Rules**: Start from scratch or convert existing PPT. Use Reveal.js or custom HTML. Include speaker notes. Optimize for both presentation and web viewing.

#### mcp-server-patterns
**Trigger**: Building MCP servers, tools/resources, stdio vs HTTP, SDK upgrade.
**Rules**: Use Node/TypeScript MCP SDK. Zod for input validation. Prefer Streamable HTTP for production, stdio for local. Expose tools for actions, resources for data.

#### migrating-to-vendure-dashboard
**Trigger**: Migrating Vendure Admin UI from Angular to React Dashboard.
**Rules**: Follow Vendure's migration guide for React Dashboard extensions. Use the new extension API. Register React components instead of Angular.

#### nextjs-turbopack
**Trigger**: Next.js 16+, Turbopack, dev startup, HMR, production bundles.
**Rules**: Turbopack for dev (faster startup + HMR), webpack for production builds. Use `experimental.turbo` selectively. Check Turbopack compatibility for your plugins.

#### nutrient-document-processing
**Trigger**: Document processing, PDF, DOCX, OCR, extraction, signing.
**Rules**: Use Nutrient DWS API. Support PDF, DOCX, XLSX, PPTX. Use OCR for scanned docs. Validate redactions before applying.

#### video-editing
**Trigger**: Video editing, cutting, structuring, FFmpeg, Remotion, Descript.
**Rules**: Full pipeline from raw capture through AI tools (ElevenLabs, fal.ai) to final polish. Use FFmpeg for programmatic edits. Remotion for React-based video generation.

### User-Level Skills (complementary, project-level deduplication applied)

#### branch-pr
**Trigger**: Creating PRs, opening PRs, preparing changes for review.
**Rules**: Issue-first enforcement. Use conventional commit format. Include PR template sections. Reference related issues.

#### chained-pr
**Trigger**: PR exceeds 400 lines, chained/stacked PRs, reviewable slices.
**Rules**: Split into ≤400 line reviewable chunks. Each PR must be independently testable. Use work-unit commits. Stack PRs targeting the same base branch.

#### cognitive-doc-design
**Trigger**: Writing guides, READMEs, RFCs, onboarding docs, architecture docs.
**Rules**: Progressive disclosure. Chunk information. Use signposting. Tables over prose for comparisons. Recognition over recall. Checklists for procedures.

#### comment-writer
**Trigger**: Drafting PR feedback, review comments, maintainer replies, GitHub comments.
**Rules**: Warm and direct. Be specific about what needs to change and why. Offer alternatives not just criticism. Use "we" for team suggestions.

#### go-testing
**Trigger**: Writing Go tests, teatest, Bubbletea TUI testing, coverage.
**Rules**: Use `testing` package + `testify` or `teatest`. Table-driven tests for multiple cases. TUI testing with `teatest` for Bubbletea apps.

#### issue-creation
**Trigger**: Creating GitHub issues, reporting bugs, requesting features.
**Rules**: Issue-first enforcement. Include reproduction steps. Label appropriately. Reference related code/PRs.

#### judgment-day
**Trigger**: "judgment day", adversarial review, dual review, fix + re-judge.
**Rules**: Two independent blind judges review the same target. Synthesize findings. Apply fixes. Re-judge until both pass. Escalate after 2 iterations.

#### skill-creator
**Trigger**: Creating new skills, adding agent instructions, documenting patterns.
**Rules**: Follow Agent Skills spec. Include trigger conditions. Bundle executable scripts. Test before deployment.

#### work-unit-commits
**Trigger**: Structuring commits, splitting PRs, planning chained PRs.
**Rules**: Each commit = one deliverable work unit. Tests and docs beside the code they verify. Commit message explains what AND why.

### User-Level Skills (not in project-level, no dedup)

- **ab-test-setup**, **ad-creative**, **agent-eval**, **ai-seo**, **analytics-tracking**, **architecture-decision-records**, **brainstorming**, **browser-use**, **churn-prevention**, **click-path-audit**, **cloud**, **codebase-onboarding**, **cold-email**, **competitor-alternatives**, **content-hash-cache-pattern**, **content-strategy**, **context-budget**, **continuous-agent-loop**, **continuous-learning**, **continuous-learning-v2**, **copy-editing**, **copywriting**, **cost-aware-llm-pipeline**, **cpp-coding-standards**, **cpp-testing**, **crosspost**, **customer-research**, **customs-trade-compliance**, **data-scraper-agent**, **database-migrations**, **deep-research**, **deployment-patterns**, **dispatching-parallel-agents**, **e2e-testing**, **email-sequence**, **energy-procurement**, **enterprise-agent-ops**, **eval-harness**, **everything-claude-code-conventions**, **exa-search**, **executing-plans**, **fal-ai-media**, **finishing-a-development-branch**, **flutter-dart-code-review**, **form-cro**, **foundation-models-on-device**, **free-tool-strategy**, **golang-patterns**, **gsap-core**, **gsap-frameworks**, **gsap-performance**, **gsap-plugins**, **gsap-react**, **gsap-scrolltrigger**, **gsap-timeline**, **gsap-utils**, **humanizer**, **inventory-demand-planning**, **investor-materials**, **investor-outreach**, **iterative-retrieval**, **java-coding-standards**, **jpa-patterns**, **kotlin-coroutines-flows**, **kotlin-exposed-patterns**, **kotlin-ktor-patterns**, **kotlin-patterns**, **kotlin-testing**, **laravel-patterns**, **launch-strategy**, **lead-magnets**, **logistics-exception-management**, **market-research**, **marketing-ideas**, **marketing-psychology**, **nanoclaw-repl**, **nuxt4-patterns**, **onboarding-cro**, **open-source**, **page-cro**, **paid-ads**, **paywall-upgrade-cro**, **perl-patterns**, **perl-security**, **perl-testing**, **playwright-dev**, **popup-cro**, **postgres-patterns**, **pricing-strategy**, **product-marketing-context**, **production-scheduling**, **programmatic-seo**, **project-guidelines-example**, **prompt-optimizer**, **python-patterns**, **python-testing**, **pytorch-patterns**, **quality-nonconformance**, **ralphinho-rfc-pipeline**, **receiving-code-review**, **referral-program**, **regex-vs-llm-structured-text**, **remote-browser**, **requesting-code-review**, **returns-reverse-logistics**, **revops**, **rules-distill**, **rust-patterns**, **rust-testing**, **sales-enablement**, **santa-method**, **schema-markup**, **search-first**, **security-review**, **security-scan**, **seo-audit**, **signup-flow-cro**, **site-architecture**, **skill-comply**, **social-content**, **springboot-patterns**, **springboot-security**, **springboot-tdd**, **springboot-verification**, **strategic-compact**, **subagent-driven-development**, **swift-actor-persistence**, **swift-concurrency-6-2**, **swift-protocol-di-testing**, **swiftui-patterns**, **systematic-debugging**, **tdd-workflow**, **team-builder**, **test-driven-development**, **using-git-worktrees**, **using-superpowers**, **verification-before-completion**, **verification-loop**, **videodb**, **visa-doc-translate**, **writing-plans**, **writing-skills**, **x-api**

## Trigger Reference by Code Context

| File Pattern | Relevant Skills |
|-------------|-----------------|
| `*.tsx`, `*.ts` | coding-standards, frontend-patterns, nextjs-turbopack |
| `components/**` | frontend-patterns, coding-standards |
| `app/**` | frontend-patterns, nextjs-turbopack |
| `lib/**` | api-design, backend-patterns, coding-standards |
| `lib/graphql/**` | api-design, backend-patterns |
| `hooks/**` | frontend-patterns, coding-standards |
| `*.css` | frontend-patterns |
| `next.config.*` | nextjs-turbopack |
| `Dockerfile`, `docker-compose.*` | docker-patterns |
| `*.test.*`, `*.spec.*` | (no test runner detected — future) |
