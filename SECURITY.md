# Security policy

## Supported versions

This SDK is pre-1.0. Only the `main` branch (latest commit) is supported
with security fixes; there are no maintained release branches yet.

## Reporting a vulnerability

Please **do not** open a public issue for a security report.

Preferred: use [GitHub Security Advisories](https://github.com/max-trifonov/letopis-node/security/advisories/new)
for this repository — it opens a private channel with maintainers.

Fallback: email **mp.trifonov@gmail.com** with a description of the
issue, impact, and steps to reproduce.

## Scope

In scope: this package's code — the HTTP client, request signing,
`verifyWebhookSignature`, and the optional NestJS integration.

Out of scope: the Letopis server itself (report there:
https://github.com/max-trifonov/letopis/security), and vulnerabilities in
Node.js, NestJS, or other third-party dependencies (report upstream).

A vulnerability that only matters if you already trust the caller with
your Letopis API key (e.g. logging the key at debug level) is still in
scope — please report it.
