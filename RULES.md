# RULES.md — Agent Operating Discipline

> Every agent reads this file **first**, every session, before touching any other file or writing any code. These rules are non-negotiable.

---

## 1. Boot sequence (mandatory every session)

Read in this exact order before doing anything else:

```
1. RULES.md      ← you are here
2. PRD.md        ← product requirements document
3. FEATURES.md   ← current state of all features
4. WORKFLOW.md   ← chronological logs of all sessions & mutations
```

Do not skip, summarize, or skim. If any file is missing, stop and tell the user — do not proceed.

### 1.1 Git Synchronization Check (Mandatory First Step)
Because development occurs across multiple machines, you **must** check if the local workspace is fully updated with the remote repository on GitHub before making any modifications or running commands:
1. Run `git fetch origin` to check for remote commits.
2. Check if the local branch is behind the remote tracking branch (e.g. check `git status` output).
3. If the local repository is behind, run `git pull` to sync the latest changes first. If there are any merge conflicts, stop and ask the user for guidance immediately.

---

## 2. Rules for WORKFLOW.md

### What MUST be logged (one entry per prompt that changes state)
- Files **created** — full path
- Files **edited** — full path + brief description of what changed (old → new where relevant)
- **Decisions** made — with reasoning (e.g., "chose X over Y because Z")
- **Commands** run that mutate state (installs, builds, git commits, etc.)
- **New requirements or business rules** discovered mid-build

### What must NEVER be logged
- Reading files (e.g., "read PRD.md") — this is routine, not an action
- Searching the codebase — not an action
- Running the dev server to check the UI — not a mutation
- Analyzing code or reviewing console output — not an action
- Reviewing screenshots — not an action

### Append-only rule
**Never edit, delete, or reword a previous entry.** If a previous decision was wrong, add a new entry that supersedes it — note the correction explicitly. The log is an immutable audit trail.

### Entry format
```
### [YYYY-MM-DD HH:MM] P<N> — <short title>
- **Prompt:** <one-line restatement of what was asked>
- **Files created:** <paths, or "none">
- **Files edited:** <path — what changed; or "none">
- **Commands run:** <commands that mutated state; or "none">
- **Decisions:** <decision + reasoning; or "none">
- **New requirements found:** <if any; or "none">
- **Status:** DONE / PARTIAL / BLOCKED
- **Blockers:** <if BLOCKED; or "none">
```

---

## 3. Rules for FEATURES.md

- A feature moves columns **only when** the agent has verified the code works (or explicitly marks it as a stub/placeholder)
- Never mark a feature **Done** based on intent — only on verified delivery
- Every feature card must have an **Acceptance** note (what "done" looks like)
- If a feature is blocked, write the blocker inline — never silently leave it
- User flows and process flows are **append-only** — add new ones, don't overwrite existing ones

---

## 4. Rules for PRD.md

- The PRD is the **source of truth** for requirements — if code and PRD conflict, the PRD wins unless an explicit decision was made to change the requirement (log it in WORKFLOW.md)
- Business rules are numbered (BR1, BR2, …) and never renumbered — if a rule is removed, mark it `~~BR3 (removed YYYY-MM-DD)~~` and note why
- Open items stay in `## Open Items` until resolved — don't delete them, resolve them with a note and date
- No agent should change the PRD's core requirements without explicit user instruction

---

## 5. General coding rules

### Always
- Follow the existing code style and patterns — no unilateral redesigns
- Keep imports at the top of every file
- Prefer editing existing files over creating new ones
- Make the smallest change that satisfies the requirement
- Write code that is immediately runnable — no half-done stubs unless the feature is explicitly marked `[STUB]`

### Never (without explicit user instruction)
- Delete files or folders
- Rename or restructure directories
- Change the tech stack or add major new dependencies
- Remove or weaken existing tests
- Add emojis or decorative comments to code
- Hard-code secrets, API keys, or environment-specific values

---

## 6. Tech stack

```
Frontend:    Next.js (App Router) + React + TypeScript
Styling:     Vanilla CSS (CSS variables, modern heritage design tokens) + TailwindCSS
State:       React Context + Zustand (for client-side store)
Database:    PostgreSQL (Supabase) + Prisma ORM
Auth:        Supabase Auth
Deployment:  Vercel
Package mgr: npm
Linter:      ESLint
```

---

## 7. Git discipline

- Commit after every completed feature or major milestone — never at broken state
- Commit message format: `type(scope): description`
  - Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `style`, `test`
  - Example: `feat(invoice): add verify-and-lock button`
- Never force-push to main/master
- Log every commit in the WORKFLOW.md entry that prompted it

---

## 8. Handling ambiguity

If the agent is uncertain about a requirement:
1. Check `PRD.md` first
2. Check `WORKFLOW.md` for a past decision
3. If still unclear — **stop and ask the user**. Never guess on requirements. Never silently implement the wrong thing.

---

## 9. Context window / session management

- If a session is starting fresh (new context window), always do the full boot sequence (Rule 1) before anything else
- If the context window is getting large, do NOT start guessing or skipping — read the docs again
- The four files exist precisely so the agent can always recover full context in under 5 minutes

---

## 10. What a "good prompt" looks like

A well-formed prompt from the user should specify:
- **What** to build (feature name or BR reference)
- **Where** to build it (file/component name)
- **Acceptance** (how to know it's done)

The agent should request these if missing before starting — especially for features that touch multiple files.

---

## 11. Database Seeding Discipline

- **Never write destructive seed scripts:** Seeding must be strictly non-destructive. Never run `deleteMany` or clean operations that flush existing user-uploaded images, order history, configuration settings, or registered credentials, unless explicitly requested by the user.
- **Use Prisma `upsert`:** When seeding menu items, settings, or user profiles, always use Prisma's `upsert` query. If the record already exists, only update fields like name, category, or default price, and **never reset/overwrite custom fields** like `imageUrl` or `supabaseId`.
- **Only seed requested data:** Never seed random or placeholder data that conflicts with existing setups. Only seed the specific data/configuration that the user explicitly requests.

