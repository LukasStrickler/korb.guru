# Documentation standards

**Audience:** Contributors and agents editing docs.  
**Doc type:** Reference (main entry for doc workflow).

Documentation in this repo follows the **docs-write** skill and the **full guide** below. All guides live under **`.docs/`** (not `docs/`).

## Where to read

| Resource                                                                                 | Purpose                                                                            |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| [documentation-guide.md](../.agents/skills/docs-write/references/documentation-guide.md) | **Full guide** — Divio types, style, structure, visuals, API/ADR/runbook patterns. |
| [docs-write SKILL.md](../.agents/skills/docs-write/SKILL.md)                             | Workflow checklist and when to run docs-check.                                     |
| [.docs/README.md](README.md)                                                             | Index — guides, reference, architecture, runbooks.                                 |

## TL;DR (style)

- **Focused:** Document what is necessary; skip trivial refactors.
- **Skimmable:** Purpose first; headings, tables, short lists; examples before long prose.
- **Active voice** and consistent terms (e.g. **`pnpm dev:app`** = backend then interactive Expo — same wording everywhere).
- **Cross-links** to related guides; relative paths from `.docs/`.
- **Update when code changes** — especially dev scripts and env vars.

## Doc types (Divio)

| Type        | Location                            | Use for                    |
| ----------- | ----------------------------------- | -------------------------- |
| How-to      | `.docs/guides/`                     | Steps to accomplish a task |
| Reference   | `.docs/reference/`                  | Facts, env, API            |
| Explanation | `.docs/architecture/`, `.docs/adr/` | Why and tradeoffs          |
| Runbook     | `.docs/runbooks/`                   | Deploy, incident steps     |

## Checklist (before merging doc edits)

- [ ] Audience and doc type clear at top (where helpful).
- [ ] Terminology matches [Local development](guides/local-dev.md) dev-command table.
- [ ] Links relative and valid from file location.
- [ ] No duplicate contradictory command descriptions across README / apps/README / AGENTS.
