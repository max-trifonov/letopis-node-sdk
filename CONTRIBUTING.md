# Contributing to the Letopis Node SDK

Thanks for your interest! A few ground rules:

- **DCO**: every commit must be signed off (`git commit -s`), certifying
  the [Developer Certificate of Origin](https://developercertificate.org/).
- **Before pushing**: `npm run build && npm test` must pass.
- Significant changes (new resources, breaking API shape changes) deserve
  an issue first — this SDK mirrors the [Letopis core API](https://github.com/max-trifonov/letopis),
  so behavior should stay in sync with the server contract.

Project layout: `src/client.ts` is the entry point (`LetopisClient`);
`src/pending-*.ts` are fluent builders for ingest/batch/activity calls;
`src/resources/` wrap admin endpoints; `src/nestjs/` is an optional
NestJS module (peer deps only, never required for plain usage);
`src/testing/fake.ts` (`FakeLetopisClient`) is the in-memory test double
consumers should use instead of hitting a real server in their own test
suites.

By participating in this project you agree to abide by the
[Code of Conduct](CODE_OF_CONDUCT.md). Found a security issue? See
[SECURITY.md](SECURITY.md) instead of opening a public issue.
