# Practical handoffs

## One task, no worker needed

> Use Tanis to fix this parser's empty-input behavior. Read the existing tests, keep the change focused, and run the relevant check. Report what you verified and what remains unverified.

## Independent review

> Use Cade to review the current diff against the requested behavior. Look for concrete regressions and security issues. Do not assume the implementation is correct. Run relevant available checks, then provide a verdict with evidence and remaining gaps.

If the current assistant authored the change and no independent worker is available, it should call this a self-review, not an independent review.

## Kira coordinating a feature

> Use Kira to add a project search field. Vex owns interface changes. Rook verifies keyboard use, empty results, and behavior while responses stream. Cade independently reviews the final changes when a worker is available. Keep the current project's conventions and do not publish anything.

Kira should inspect the repository before assigning file ownership. Overlapping edits run sequentially. A smaller task may need only one implementation worker and one review, not every team member.

## Portable worker brief

```text
Role: Rook; read the installed rook/SKILL.md and this host's adapter.
Goal: reproduce and verify the search interaction.
Workspace: the absolute path of the actual checkout.
Ownership: name the exact test files this worker may change.
Constraints: preserve unrelated edits; no external publication.
Evidence: commands run, observed behavior, failure cases, and unresolved gaps.
Return: verdict first, then concise findings and paths.
```

Use the runtime's real worker API. Do not paste commands for a different application or assume a registered custom agent exists. Worker dispatch and model selection depend on the host, not on these prose examples.
