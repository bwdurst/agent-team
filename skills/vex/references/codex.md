# Codex adapter

Identify this host from its system context and available tool schemas. Inspect applicable AGENTS.md instructions. This package does not install collaboration tools or register worker processes.

If in-chat collaboration is exposed, use its actual spawn, message, and wait APIs. For example, some hosts expose collaboration.spawn_agent; others do not. Check the schema rather than copying unsupported arguments. Pass the specialist's installed SKILL.md path and a concrete role brief. Workers share files unless the host explicitly isolates them, so assign disjoint ownership or sequence edits.

Use a fresh context for independent reviews when supported. Inherit the host's configured model unless the user or applicable instructions choose otherwise; never transfer Claude model names into Codex. Do not downgrade reviews silently.

Reuse a running worker only through supported controls; wait without tight polling. Validate completion evidence, not just a progress message. Do not create user-facing chats or scheduled jobs as a substitute for unavailable subagents. Such actions need their own applicable authorization.

If collaboration is absent or prohibited, do the authorized work directly in this session. Distinguish a self-review from an independent review and name missing verification. Never simulate tool success or fabricate worker reports.

