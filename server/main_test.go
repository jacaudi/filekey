package main

import (
	"io/fs"
	"net/http"
	"net/http/httptest"
	"testing"
)

func makeHandler(t *testing.T) http.Handler {
	t.Helper()
	appFS, err := fs.Sub(staticFiles, "app")
	if err != nil {
		t.Fatalf("failed to create sub FS: %v", err)
	}
	fileServer := http.FileServer(http.FS(appFS))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/sw.js":
			w.Header().Set("Cache-Control", "no-store")
			w.Header().Set("Service-Worker-Allowed", "/")
		case "/", "/index.html", "/manifest.json":
			w.Header().Set("Cache-Control", "no-cache")
		default:
			w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
		}
		fileServer.ServeHTTP(w, r)
	})
}

func TestCacheControlHeaders(t *testing.T) {
	handler := makeHandler(t)

	tests := []struct {
		path    string
		wantCC  string
		wantSWA string
	}{
		{"/sw.js", "no-store", "/"},
		{"/", "no-cache", ""},
		{"/index.html", "no-cache", ""},
		{"/manifest.json", "no-cache", ""},
		{"/logo.svg", "public, max-age=31536000, immutable", ""},
	}

	for _, tc := range tests {
		t.Run(tc.path, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, tc.path, nil)
			w := httptest.NewRecorder()
			handler.ServeHTTP(w, req)

			if got := w.Header().Get("Cache-Control"); got != tc.wantCC {
				t.Errorf("Cache-Control: got %q, want %q", got, tc.wantCC)
			}
			if tc.wantSWA != "" {
				if got := w.Header().Get("Service-Worker-Allowed"); got != tc.wantSWA {
					t.Errorf("Service-Worker-Allowed: got %q, want %q", got, tc.wantSWA)
				}
			}
		})
	}
}

func TestEmbeddedFiles(t *testing.T) {
	for _, path := range []string{
		"app/index.html",
		"app/sw.js",
		"app/manifest.json",
		"app/logo.svg",
	} {
		t.Run(path, func(t *testing.T) {
			if _, err := staticFiles.Open(path); err != nil {
				t.Errorf("embedded file not found: %v", err)
			}
		})
	}
}
