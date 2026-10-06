# RFC 0001: internal-developer-platform design

- **Status:** Accepted (M1 implemented)
- **Author:** EquinoxWN
- **Created:** 2026

## Problem

Starting a new service in most companies takes days of copy-and-paste: a repository from an old
project, a CI file that half works, a Dockerfile running as root on an unpinned image, a catalog
entry nobody writes, and a ticket to get a database. Every copy drifts, so standards (pinned
dependencies, non-root containers, ownership metadata) are re-fought for each service. A platform
team wants the opposite: one form where a developer picks a name, a language and whether they need
a database, and gets a repository that already builds, tests, ships a hardened image and is
registered in the catalog, following the platform's standards from the first commit.

## Goals

- A Backstage Software Template (`scaffolder.backstage.io/v1beta3`) with a three-page form: name,
  description and owner; language (Node.js, Python, Go) and database; repository location.
- Skeletons that generate a working HTTP service per language, with its own tests, a CI workflow
  with every action pinned to a commit SHA, a Dockerfile with digest-pinned base images and a
  non-root user, TechDocs, and a `catalog-info.yaml` that Backstage accepts (plus a `Resource`
  entity and migrations when a database is requested).
- Form input is validated before anything is generated, so nothing a developer types can break or
  inject into generated files.
- The template is verified without running Backstage: a local renderer with Backstage's templating
  rules generates every combination, and the generated output is checked by Backstage's own
  catalog validators and by running each generated service's tests.
- Later: a Crossplane claim provisions the database through a composition (M2), Flux deploys to dev
  and promotes by pull request (M2), dashboards, alerts and scorecards (M3).

## Non-goals

- Running a Backstage instance in this repo (it is a large application with its own database);
  the template is portable to any Backstage, and the local renderer exists to test it.
- Creating real GitHub repositories in tests: `publish:github` and `catalog:register` are planned,
  with their inputs and outputs computed, but not executed.
- Supporting every scaffolder action; only the three the template uses.

## Proposed design

![architecture](../architecture.png)

```
form values ─► Ajv (JSON Schema from template.yaml, defaults filled) ─► steps in order:
   fetch-code      fetch:template  ./skeleton/<language>   (code, tests, Dockerfile, CI)
   fetch-common    fetch:template  ./skeleton/common       (catalog-info.yaml, TechDocs)
   fetch-database  fetch:template  ./skeleton/database     only if: ${{ parameters.database }}
   publish         publish:github  (planned: repoUrl, visibility, default branch)
   register        catalog:register (planned: repoContentsUrl + /catalog-info.yaml)
                ─► output links: repository URL, catalog entity ref
```

| Part | M1 implementation |
|---|---|
| Template | `templates/service/template.yaml`: three parameter pages, five steps, output links; Backstage form hints (`OwnerPicker`, `RepoUrlPicker`) kept for the real UI |
| Validation | The parameter pages are merged into one JSON Schema and checked with Ajv (all errors, defaults applied); patterns restrict names, owners, repo URLs and descriptions to safe characters |
| Rendering | Nunjucks configured like Backstage's scaffolder (`${{ }}` expressions, no autoescape) plus Backstage's `parseRepoUrl` and `projectSlug` filters; undefined variables are errors; whole-string expressions keep their type, so `if: ${{ parameters.database }}` is a real boolean |
| File safety | File paths are templates too; a path that renders empty, absolute or outside the output directory is refused, and two steps cannot write the same file |
| Skeletons | Node.js 24 (`node:http`, `node --test`), Python 3.12 (`http.server`, `unittest`), Go 1.26 (`net/http`, `httptest`); all standard-library only, so a new service has no dependencies to audit |
| Catalog check | `@backstage/catalog-model`: envelope and field-format policies plus the `Component` and `Resource` kind validators |
| CLI | `idp scaffold --template ... --out ... --set key=value` and `idp validate-catalog <file>` |
| CI | Runs every generated service's tests, then builds each generated image, runs it and probes `/healthz` and `/readyz` |

## Alternatives considered

| Option | Why not (yet) |
|---|---|
| Run Backstage in CI and drive the real scaffolder | The most faithful test, but it needs a full Backstage app, a database and GitHub credentials in CI. The local renderer follows the same templating rules and the output is validated with Backstage's own library; the gap (exact action implementations) is small and documented. See ADR 0002. |
| Cookiecutter, Yeoman or `gh repo create --template` | Fine generators, but they do not register the service in a catalog or drive a form with ownership and policy; Backstage is the portal the roadmap builds on (TechDocs, scorecards). |
| A repository template copied by hand | No validation, no catalog entry, and each copy drifts; exactly the problem being solved. |
| Free-text description with escaping in every file | Escaping differs per file type (YAML, JSON, Go strings, Markdown); restricting the input with a pattern and using `dump` (JSON quoting) for YAML values is simpler to prove safe. See ADR 0003. |
| Frameworks in the skeletons (Express, FastAPI, Gin) | Nicer APIs, but every new service would start with dependencies to update and audit; the skeletons stay standard-library only and teams add frameworks deliberately. |

## Measurement plan

- M1: 57 tests. Parameter validation (bad names, injection attempts, repo URLs, every problem at
  once), expression evaluation, rendering safety, template structure, catalog validation, and the
  six generated services (3 languages x database or not): files, no leftover template syntax,
  Backstage catalog validity, pinned CI actions, digest-pinned non-root images, the services' own
  tests, and the planned publish and register actions. `make measure` times form-to-passing-tests.
- M2: Crossplane claim applied to a local cluster; Flux reconciles the generated service to dev.
- M3: time-to-first-deploy before vs after, and a recorded run from form to running service.

## Milestones

- **M1 (done):** template, three language skeletons with database option, local renderer, catalog
  validation, CLI, 57 tests, CI building and probing every generated image.
- **M2:** Crossplane composition and claim for PostgreSQL and a bucket; Flux GitOps deployment with
  promotion by pull request.
- **M3:** generated Grafana dashboard and alerts, catalog scorecards (owner, docs, SLOs), proof.

## Risks and open questions

- The local renderer can drift from Backstage's scaffolder (Backstage renders in a sandbox and has
  more filters); the template only uses features both support, and a Backstage instance should
  dry-run the template before it is published to developers.
- Pinned image digests and action SHAs age; Dependabot watches the skeleton Dockerfiles, and the
  generated services inherit fresh pins only when the template is updated.
- `group:<name>` owners are checked by pattern, not against the real catalog; Backstage's
  `OwnerPicker` does that in the real form.
