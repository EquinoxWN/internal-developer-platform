.PHONY: setup lint test measure bench audit ci

setup:
	npm ci

# Strict TypeScript type check (no emit).
lint:
	npm run lint

# Renderer and validation tests, plus all six generated services (3 languages, with and without a
# database) checked against Backstage's catalog rules and running their own tests.
test:
	npm test

# Time from form values to a generated service whose own tests pass, per language.
measure:
	npm run measure

bench:
	@echo "M3: time-to-first-deploy before vs after, and a recorded run from form to running service"

# Known vulnerabilities in npm dependencies (high and critical fail).
audit:
	npm audit --audit-level=high

ci: setup lint test
