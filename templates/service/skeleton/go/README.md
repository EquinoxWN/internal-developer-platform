# ${{ values.name }}

${{ values.description }}

Owned by `${{ values.owner }}`. Created from the platform `service` template.

```bash
go test ./...   # tests
go run .        # serve on PORT (default 8080)
docker build -t ${{ values.name }} .
```

Endpoints: `GET /`, `GET /healthz`{% if values.database %}, `GET /readyz` (needs `DATABASE_URL`){% endif %}.
