# Security Policy

## Scope
This project focuses on safely rendering **untrusted UGC (user‑generated UI)**. The security surface in scope includes:

- Card validation (`packages/validator`)
- Rendering safeguards (`packages/react`)
- Type/schema definitions that drive validation (`packages/types`, `packages/schema`)

Out of scope (but still important for adopters):

- Host application logic and data sources
- Asset hosting/CDN configuration and network policies
- Prompting/LLM output quality and post‑processing
- Third‑party dependency vulnerabilities unless they directly impact the library’s security guarantees

## Threat Model (High‑Level)
- **Goal:** prevent untrusted UI from escaping its container, loading unsafe external content, or abusing layout to spoof/overlay host UI.
- **Non‑goals:** full sandboxing of browser execution, runtime expression evaluation, or protection against compromised host apps.
- **Status:** best‑effort; not formally audited.

## Reporting Vulnerabilities
Please **avoid public disclosure** until a fix is available.

Preferred:
- If hosted on GitHub, use **Security Advisories** to report privately.

Fallback:
- Open an issue labeled `security` with minimal details and request a private channel.

If no private channel is available, contact the maintainer listed in `README.md` (if present).

## Response Expectations
- We aim to acknowledge reports within **7 days** and provide a fix or mitigation plan as soon as practical.
- No formal SLA is currently offered.

## Safe Usage Guidelines (Consumers)
- **Always validate** cards before rendering.
- Use the provided **asset allowlist** (`@assets/`) and reject external URLs.
- Keep renderer/validator versions in sync.
- Treat JSON Schema as **structural** validation only; do not rely on it for security.
