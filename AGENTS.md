# Agent Instructions

<!-- BEGIN:agentic-delivery-workflow -->
This repo uses the agentic delivery workflow.

Before coding, read:
- `AGENTS.workflow.md`
- `.agentic-workflow.yml`
- `docs/wp/RULINGS.md`

Required defaults:
- Choose Program/Migration, Work Package, Small Fix, or Gate lane before editing.
- For large/risky programs, audit first, freeze `docs/wp/program-manifest.md`, sequence by risk, and gate every wave.
- Create/switch to a branch before story or code changes.
- For work packages, maintain `docs/wp/wpNN-stories.md` and `docs/wp/wpNN-progress.md`.
- Use Git worktrees only when needed, and only under `.worktrees/`.
- Never create sibling project folders for work packages.
- Use sub-agents only for parallel work packages, independent review, gate runs, or context isolation.
- Route model quality by risk: high for orchestration/security/architecture/data/AI/final review, mid for standard WPs, low for scaffolding/docs/checks/mechanical fixes.
- Run the configured checks and record docs updated/not needed.
<!-- END:agentic-delivery-workflow -->
