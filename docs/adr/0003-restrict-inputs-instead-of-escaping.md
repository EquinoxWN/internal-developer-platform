# ADR 0003: Restrict form inputs to safe characters instead of escaping them per file type

- **Status:** Accepted

## Context

Form values end up in many file types at once: YAML (`catalog-info.yaml`), JSON (`package.json`),
TOML, Go and Python source, Markdown, Dockerfiles, and even file paths. Each format has its own
escaping rules, and a value such as `Pay "fast"`, a line break, or `${{ secrets }}` could break a
file, inject YAML keys, or be re-evaluated by a later templating pass. A name like `../x` could
turn a file path into a write outside the output directory.

## Decision

- Every parameter has a strict pattern: names are lowercase words joined by single dashes (at most
  40 characters), owners are `group:<name>`, repository locations are `github.com?owner=...&repo=...`,
  and descriptions are one line of 10 to 200 characters without quotes, braces, backticks, dollar
  signs, angle brackets or backslashes.
- Values placed in YAML and JSON go through `dump` (JSON quoting) where they are free text.
- Independently of validation, the renderer refuses any rendered path that is empty, absolute or
  outside the output directory, and any file written twice.

## Consequences

- Tests show that injection attempts (`${{ }}`, `{% %}`, quotes, line breaks, `../`) are rejected
  before a single file is written, and that the renderer still refuses unsafe paths if validation
  were bypassed.
- Some legitimate descriptions are refused (for example ones with quotes); the error message says
  what is allowed, and descriptions can be edited in the generated repository afterwards.
- The patterns live in `template.yaml`, so the Backstage form enforces the same rules in the browser.
