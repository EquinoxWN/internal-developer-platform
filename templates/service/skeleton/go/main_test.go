package main

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func get(t *testing.T, h http.Handler, method, path string) *httptest.ResponseRecorder {
	t.Helper()
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(method, path, nil))
	return rec
}

func TestLivenessProbeAnswersOK(t *testing.T) {
	rec := get(t, newMux(""), http.MethodGet, "/healthz")
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), `"ok"`) {
		t.Fatalf("got %d %s", rec.Code, rec.Body.String())
	}
}

func TestRootNamesTheService(t *testing.T) {
	rec := get(t, newMux(""), http.MethodGet, "/")
	if !strings.Contains(rec.Body.String(), `"${{ values.name }}"`) {
		t.Fatalf("got %s", rec.Body.String())
	}
}

func TestUnknownPathsAndMethodsAreRefused(t *testing.T) {
	if rec := get(t, newMux(""), http.MethodGet, "/nope"); rec.Code != http.StatusNotFound {
		t.Fatalf("got %d", rec.Code)
	}
	if rec := get(t, newMux(""), http.MethodPost, "/"); rec.Code != http.StatusMethodNotAllowed {
		t.Fatalf("got %d", rec.Code)
	}
}
{%- if values.database %}

func TestReadinessDependsOnTheDatabaseSetting(t *testing.T) {
	if rec := get(t, newMux(""), http.MethodGet, "/readyz"); rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("got %d", rec.Code)
	}
	if rec := get(t, newMux("postgres://db/app"), http.MethodGet, "/readyz"); rec.Code != http.StatusOK {
		t.Fatalf("got %d", rec.Code)
	}
}
{%- endif %}
