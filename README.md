# Agent Team

Six reusable personas for coordinating coding work in Codex and Claude. One set of instructions, shared between both hosts.

| Agent | Role |
| --- | --- |
| Kira | Lead: scope, delegation, evidence, synthesis |
| Tanis | Implementation and integrations |
| Vex | Frontend, interaction, accessibility |
| Cade | Independent code review and quality |
| Rook | Tests, reproduction, debugging |
| Sage | Architecture and documentation |

These are instruction profiles, not autonomous services. They do not install model runtimes, supply account access, or guarantee parallel workers. Their adapters use only capabilities actually available in the current host; when delegation is unavailable, the assistant works directly and reports the verification gap.

## Install

Requires Node.js 18 or newer and a compatible Codex or Claude skill host. No npm dependencies are needed. Clone or download this repository, then run from its folder:

```sh
node scripts/install.cjs --dry-run
node scripts/install.cjs
```

The installer copies six persona folders into `~/.agents/skills/` and creates directory links from `~/.claude/skills/` to them. On Windows these are junctions; on macOS/Linux they are directory symlinks. Codex installations that discover `~/.agents/skills` read the shared source directly. Reload skills or start a fresh chat after installation. Some hosts do not discover these locations: explicitly ask the assistant to read the relevant `SKILL.md`, or use that host's documented skill-import mechanism.

Installation is explicit, not automatic on download or `npm install`. It never reads credentials, changes model configuration, installs scheduled jobs, or contacts either model provider. It stops before writing if any existing profile would conflict. Existing unrelated profiles, modified managed profiles, and links pointing elsewhere are preserved, even with `--update`.

For a disposable home or a different target account directory:

```sh
node scripts/install.cjs --root "path/to/test-home" --dry-run
node scripts/install.cjs --root "path/to/test-home"
```

`--root` is a home directory, not the skills directory. The default is the current user's OS home directory. Custom `CODEX_HOME` or Claude configuration locations are not inferred. Parents containing symlinks/junctions are refused; use an ordinary target directory.

## Use

In Codex, invoke `$kira`; in Claude, use `/kira` where skill slash commands are supported. You can also explicitly ask the assistant to use a named installed profile. The profiles are opt-in rather than automatically selecting personas for every coding task.

> Use Kira to coordinate this feature. Tanis owns the backend, Vex owns the interface, Rook verifies the behavior, and Cade reviews the final diff. Keep edits within this project and report actual test evidence.

See [examples](examples/delegation.md) for smaller tasks and a portable worker brief. Persona names do not select a model. The runtime's configuration and permissions still apply, and a review verdict is not permission to publish or deploy.

Each persona prefixes spoken chat with its uppercase name, such as `KIRA:`. A compatible TTS app can route those blocks to voices. This repository does not include audio playback, voice IDs, an Agent Hub app, API keys, or billing integrations. Do not assume standard Claude/Codex chat will speak with these voices.

## Customize and update

Edit the installed `~/.agents/skills/<name>/SKILL.md` once; Claude's link points to that same file. Already-running chats may retain old instructions until reloaded. Keep personal preferences and secrets out of public forks.

After downloading a newer repository version:

```sh
node scripts/install.cjs --dry-run --update
node scripts/install.cjs --update
```

The installer compares version and SHA-256 file hashes. Unchanged installs are idempotent. Updates replace only unmodified copies managed by this installer and preserve the prior folder under `~/.agent-team-backups/`. It never overwrites local edits or extra files. For customized or pre-existing profiles, compare and merge the new instructions manually; there is deliberately no force-overwrite switch. A persona removed from a later release stays installed: the installer lists it as `retired` on every run and leaves it alone. To drop it, delete its Claude link (`~/.claude/skills/<name>`) first, then its folder (`~/.agents/skills/<name>`).

The installer preflights all profiles before writing. Installation is not a filesystem-wide transaction: a disk or link-creation failure can leave some profiles installed. Correct the reported problem and rerun; unchanged profiles are skipped. A crash may leave a lock or staging folder in the chosen home directory. Remove a stale lock only after confirming no installer is running. Staging folders and backups are left for inspection, not automatically deleted.

To uninstall, remove the six persona Claude **links themselves** first, then remove their shared folders only if you no longer need their contents. Do not recursively delete through a junction or symlink. This package provides no automatic uninstaller.

## Verification and license

```sh
npm test
```

Tests use disposable home directories, including real directory links, conflict preservation, local edits, idempotence, and backed-up updates. They do not validate model quality or account compatibility. Windows junction behavior has been exercised locally; POSIX symlink behavior should be verified on those platforms before relying on it.

[MIT license](LICENSE). Contributions should remain portable and avoid personal account details, project-specific launchers, and claims of tools that are not installed.
