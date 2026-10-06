# ADR 0002: Test the Backstage template by rendering it locally and validating the output

- **Status:** Accepted

## Context

A software template is code: a typo in a skeleton, a missing value, or a catalog file Backstage
rejects only shows up when a developer fills in the form, and by then the broken repository exists.
Testing through a real Backstage needs the whole application, a database, and GitHub credentials
that can create repositories, which is heavy for CI and risky to run on every push.

## Decision

Keep `template.yaml` as a standard Backstage template, and add a small local scaffolder that runs
it with Backstage's templating rules (Nunjucks with `${{ }}`, Backstage's repo-URL filters, typed
whole-string expressions, step `if` conditions). It executes `fetch:template` steps for real and
plans `publish:github` and `catalog:register`, computing their outputs so later steps and the
template's output links can use them. Tests then check the generated files with independent tools:
Backstage's own `@backstage/catalog-model` validators for `catalog-info.yaml`, the generated
services' own test suites, and, in CI, `docker build` and `docker run` of every generated image.

## Consequences

- Every language and option combination is generated and verified on every push, in seconds,
  without credentials; a broken skeleton fails CI before any developer sees it.
- Undefined template variables are errors in the local renderer, which is stricter than Backstage's
  default and catches typos earlier.
- The local renderer is not Backstage: subtle differences in action behaviour are possible. The
  template sticks to features both support, and the RFC lists a Backstage dry run as the release
  step.
