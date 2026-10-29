# Application security checklist

Read this when the change under review takes input from a user or another system: API routes, web pages, handlers, importers, webhooks. Apply it with extra suspicion to AI-generated code, which tends to look complete while skipping these checks. Report each item as pass, fail, or not verifiable, with the evidence.

## Access
- Authentication: every route requires sign-in unless it is on an explicit, justified public list. A new route does not default to open.
- Authorization per record, not just per login: user A cannot read or change user B's record by editing an ID in the URL or body. Role checks run on the server, never only by hiding a button.
- No path to admin except the intended source. Check what happens for empty lists, removed users, and failed matching (fail closed).

## Input and output
- Input is validated on the server. SQL is parameterized; request data never builds SQL, shell commands, file paths, `eval`, or deserialized objects. Uploads are limited by type, size, and destination path.
- Output never places raw user data into HTML (XSS). Errors do not return stack traces, SQL, or personal data.

## Secrets and sensitive data
- No secrets in code, logs, fixtures, or anything the browser receives (public-prefixed environment variables and client bundles count). Tokens expire; signature, audience, and expiry are verified, not just decoded.
- Sensitive data (tax, identity, financial, health) is not logged, is masked in the UI by default, is encrypted in transit and at rest, and has access recorded. Say plainly when a change moves such data somewhere new.

## Cross-site and abuse
- Cookies set HttpOnly, Secure, and SameSite. State-changing routes resist CSRF. Login and expensive endpoints are rate limited. CORS is not a wildcard with credentials.

## Dependencies
- Each new library is needed, maintained, and pinned, and the lockfile change is intended. Run the ecosystem's audit (`npm audit --omit=dev`, `pip-audit`) when dependencies change and report the counts.
- After a major upgrade, exercise the feature in a real browser or runtime. Unit tests that mock the library cannot catch loading, worker, or bundler breaks.

## AI features
- Text from users, documents, or the web must never trigger a tool call or data access on its own (prompt injection). Model output is treated as untrusted input. Tool permissions are least privilege. No secrets or client data go into prompts that leave the account boundary.

## Finish with a trace
Follow one request end to end for the riskiest path in the diff: who can call it, what identity it runs as, what data it can reach, what is logged.
