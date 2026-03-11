# Agent Skills

Project-specific agent skills for code quality, testing, git workflow, and PR automation.

## STRUCTURE

```
.agents/skills/
├── git-commit/         # Conventional commits, atomic commits
├── code-quality/       # TypeScript/ESLint/Prettier checks
├── docs-write/         # Documentation writing standards
├── ui-animation/       # Tailwind + Motion patterns, a11y
├── tdd/                # Red-Green-Refactor workflow
└── resolve-pr-comments/ # Multi-agent PR comment resolver
```

## WHERE TO LOOK

| Task                    | Skill                 | SKILL.md Location                             |
| ----------------------- | --------------------- | --------------------------------------------- |
| Write a commit          | `git-commit`          | `.agents/skills/git-commit/SKILL.md`          |
| Run lint/typecheck      | `code-quality`        | `.agents/skills/code-quality/SKILL.md`        |
| Write/update docs       | `docs-write`          | `.agents/skills/docs-write/SKILL.md`          |
| Add animations          | `ui-animation`        | `.agents/skills/ui-animation/SKILL.md`        |
| Write tests (TDD)       | `tdd`                 | `.agents/skills/tdd/SKILL.md`                 |
| Resolve PR bot comments | `resolve-pr-comments` | `.agents/skills/resolve-pr-comments/SKILL.md` |

## CONVENTIONS

**Loading Skills**

- Load via `skill` tool before starting work: `skill(name="git-commit")`
- Each skill has `SKILL.md` (instructions) + optional `AGENTS.md` (context)

**Skill-Specific Rules**

- **git-commit**: Conventional Commits format, atomic commits, never lose >1 small step
- **code-quality**: TypeScript typecheck, ESLint, Prettier, Markdown validation
- **docs-write**: Follow `.docs/DOCUMENTATION_GUIDE.md`, clear structure
- **ui-animation**: Always respect `prefers-reduced-motion`, never animate layout props
- **tdd**: Red-Green-Refactor, log seed on failure, review snapshot diffs
- **resolve-pr-comments**: Use `background_task`, never raw `gh api`, never escalate without investigation

## ANTI-PATTERNS

- Do not skip loading a relevant skill — always check `skill` tool first
- Do not ignore skill-specific DO NOT/NEVER rules
- Do not create new skills without SKILL.md + AGENTS.md structure
