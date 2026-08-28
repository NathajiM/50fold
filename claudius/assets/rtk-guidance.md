## Token discipline — RTK

If `rtk` is on PATH, prefer RTK-wrapped shell commands for **noisy output**. RTK filters command output before it enters context (typically 30–90% smaller): `rtk git diff`, `rtk git status`, `rtk git log`, `rtk test <cmd>`, `rtk jest`, `rtk pytest`, `rtk cargo test`, `rtk tsc`, `rtk lint`, `rtk err <cmd>`.

Rules:
- **Noisy command output → RTK.** Test runs, builds, typechecks, lint, diffs, logs.
- **Exact strings matter → raw.** When you need a verbatim error, a precise stack trace, or evidence for a verdict, use `rtk proxy <cmd>` (runs unfiltered, still tracked) or read RTK's tee file for the failed run. Never quote a compressed summary as if it were exact output.
- **File reading/searching → native tools.** Read/Grep/Glob are already efficient and integrate with permissions; RTK's hook only rewrites Bash calls anyway.
- If `rtk` is absent, run the plain command. Never fail a task because RTK is missing.
