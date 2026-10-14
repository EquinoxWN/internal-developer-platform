# Base image pinned by digest; the service runs as an unprivileged user.
FROM python:3.14-slim@sha256:a2b82f3c48559aa0a8446d9af49826b6e2b2016f4cd2afabfe6013ec53729170
WORKDIR /app
ENV PYTHONPATH=/app/src PYTHONDONTWRITEBYTECODE=1 PORT=8080 HOST=0.0.0.0
COPY src ./src
RUN useradd --uid 10001 --no-create-home app
USER app
EXPOSE 8080
CMD ["python", "-m", "${{ values.module }}.app"]
