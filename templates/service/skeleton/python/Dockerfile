# Base image pinned by digest; the service runs as an unprivileged user.
FROM python:3.12-slim@sha256:02108f5d322dd89f1c9e552442c25acb0543dfdbc455693a5599624f20d9155d
WORKDIR /app
ENV PYTHONPATH=/app/src PYTHONDONTWRITEBYTECODE=1 PORT=8080 HOST=0.0.0.0
COPY src ./src
RUN useradd --uid 10001 --no-create-home app
USER app
EXPOSE 8080
CMD ["python", "-m", "${{ values.module }}.app"]
