# ${{ values.name }}

${{ values.description }}

- **Owner:** ${{ values.owner }}
- **Language:** ${{ values.language }}
- **Endpoints:** `GET /` (service name), `GET /healthz` (liveness){% if values.database %}, `GET /readyz` (database configured){% endif %}

Created from the platform's `service` template, so CI, the container image and this catalog entry
follow the platform standards from the first commit.
