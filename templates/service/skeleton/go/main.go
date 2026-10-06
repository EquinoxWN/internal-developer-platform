// Command ${{ values.name }}: ${{ values.description }}
package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"time"
)

// newMux returns the service routes.
func newMux(databaseURL string) *http.ServeMux {
	mux := http.NewServeMux()
	reply := func(w http.ResponseWriter, status int, body map[string]string) {
		w.Header().Set("content-type", "application/json")
		w.WriteHeader(status)
		_ = json.NewEncoder(w).Encode(body)
	}
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) {
		reply(w, http.StatusOK, map[string]string{"status": "ok"})
	})
{%- if values.database %}
	mux.HandleFunc("GET /readyz", func(w http.ResponseWriter, _ *http.Request) {
		if databaseURL == "" {
			reply(w, http.StatusServiceUnavailable, map[string]string{"database": "DATABASE_URL is not set"})
			return
		}
		reply(w, http.StatusOK, map[string]string{"database": "configured"})
	})
{%- endif %}
	mux.HandleFunc("GET /{$}", func(w http.ResponseWriter, _ *http.Request) {
		reply(w, http.StatusOK, map[string]string{"service": "${{ values.name }}"})
	})
	return mux
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	server := &http.Server{
		Addr:              ":" + port,
		Handler:           newMux(os.Getenv("DATABASE_URL")),
		ReadHeaderTimeout: 5 * time.Second,
	}
	log.Printf("${{ values.name }} listening on %s", port)
	log.Fatal(server.ListenAndServe())
}
