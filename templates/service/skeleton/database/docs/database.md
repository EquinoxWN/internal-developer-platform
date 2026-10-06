# Database

`${{ values.name }}` uses PostgreSQL. The service reads its connection string from the
`DATABASE_URL` environment variable and reports `/readyz` as unavailable until it is set.
Migrations live in `db/migrations/` and are applied in file-name order.
