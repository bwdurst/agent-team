# Checklists by change type

Apply every checklist that matches the change; one change can match several. Report each item as pass, fail, or not verifiable, with the evidence. For application code that takes input from users or other systems, also apply [security-checklist.md](security-checklist.md).

## CI/CD workflow files (`.github/workflows/*`, deploy scripts)
- Scope matches the description; top-level and job `permissions` are least privilege and unchanged unless stated.
- Third-party actions pinned to commit SHAs; no new unpinned actions or images.
- No secret VALUES printed (check every echo, `::error::`, `--query`); names only.
- No injection: no `${{ }}` of untrusted text (branch names, PR titles, inputs) inside `run:`; variables quoted.
- A failure or rollback still fails the run; new diagnostics cannot abort early or turn it green. Check timeout paths (`set -e` ends a step before later lines run), not just explicit failures.
- Every new cloud API call is permitted by the role the job assumes (read the policy); tolerated failures are deliberate.
- The workflow only runs on its real trigger, so say what cannot be tested before merge and what the first run on main will do if the new step is wrong.

## Access, auth, and permission data (sign-in, roles, app access, allow-lists, user imports)
- Fails closed: what access exists before the change applies, when matching fails, for empty lists, for removed or offboarded people. Nobody gains more access than before.
- Matching key is verified and normalized (email lowercased, duplicates, aliases); old identifiers are not silently reused.
- No path to admin or super admin except the intended source.
- Trace the consumer end to end: who reads the new field, when, and what a failed write leaves behind.
- Safe to run twice; rollback plan; forced or replace paths behave as documented.
- No emails, tokens, or keys in logs, fixtures, docs, or the diff.

## Database migrations and data imports
- Runs inside one transaction and rolls back together; scoped to the intended rows; idempotent.
- Order of operations against go-live: what happens between merge and the import.
- Tests prove the outcome (data arrives and is usable), not just that a column or flag is set.

## Infrastructure and IAM
- Least privilege, scoped to the resource; no wildcard grants widened; no vendor or third-party access added without being stated.
- Reversible by a plain revert; say what a revert would not undo.

## Any change
- Author is not the approver; CI is green; the description matches the diff; a plain revert undoes it.
