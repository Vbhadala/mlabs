# Run log — fork-setup-tier-b

- TB1: app.config.ts doc comment also contains `com.example.mlabs`; substitution leaves it (docs), so the idempotency detector must be VALUE-targeted (bundleIdentifier:/package: positions + host), not a blanket string check — caught by testing substitutions against real file contents, not just inline fixtures.
