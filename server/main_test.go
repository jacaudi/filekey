package main

import (
	"io/fs"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func makeHandler(t *testing.T) http.Handler {
	t.Helper()
	appFS, err := fs.Sub(staticFiles, "app")
	if err != nil {
		t.Fatalf("failed to create sub FS: %v", err)
	}
	indexContent, err := prepareIndexContent(appFS)
	if err != nil {
		t.Fatalf("failed to read embedded index.html: %v", err)
	}
	return buildHandler(appFS, indexContent)
}

func TestVersionInjection(t *testing.T) {
	raw, err := staticFiles.ReadFile("app/index.html")
	if err != nil {
		t.Fatalf("failed to read embedded index.html: %v", err)
	}
	if !strings.Contains(string(raw), "__APP_VERSION__") {
		t.Fatal("embedded index.html must contain __APP_VERSION__ placeholder")
	}

	handler := makeHandler(t)
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	body := w.Body.String()
	if strings.Contains(body, "__APP_VERSION__") {
		t.Error("served response must not contain raw __APP_VERSION__ placeholder")
	}
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

func TestSecurityHeaders(t *testing.T) {
	handler := makeHandler(t)

	secHeaders := map[string]string{
		"X-Frame-Options":           "DENY",
		"X-Content-Type-Options":    "nosniff",
		"Referrer-Policy":           "strict-origin-when-cross-origin",
		"Permissions-Policy":        "camera=(), microphone=(), geolocation=()",
		"Strict-Transport-Security": "max-age=63072000; includeSubDomains",
	}

	for _, path := range []string{"/", "/sw.js", "/manifest.json", "/logo.svg"} {
		t.Run(path, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, path, nil)
			w := httptest.NewRecorder()
			handler.ServeHTTP(w, req)

			for header, want := range secHeaders {
				if got := w.Header().Get(header); got != want {
					t.Errorf("%s: got %q, want %q", header, got, want)
				}
			}
		})
	}
}

func TestCSPHeader(t *testing.T) {
	handler := makeHandler(t)

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	csp := w.Header().Get("Content-Security-Policy")
	if csp == "" {
		t.Fatal("Content-Security-Policy header missing")
	}

	for _, directive := range []string{
		"default-src 'self'",
		"script-src 'self' 'unsafe-inline'",
		"style-src 'self' 'unsafe-inline'",
		"worker-src 'self' blob:",
	} {
		if !strings.Contains(csp, directive) {
			t.Errorf("CSP missing directive: %s", directive)
		}
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

func TestFKDebugInjection(t *testing.T) {
	handler := makeHandler(t)
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)
	body := w.Body.String()
	if !strings.Contains(body, "let FK_DEBUG = false") {
		t.Error("default response must contain 'let FK_DEBUG = false'")
	}
	if strings.Contains(body, "let FK_DEBUG = true") {
		t.Error("default response must NOT contain 'let FK_DEBUG = true'")
	}
}

func TestFKDebugEnabled(t *testing.T) {
	t.Setenv("FK_DEBUG", "true")
	handler := makeHandler(t)
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)
	body := w.Body.String()
	if strings.Contains(body, "let FK_DEBUG = false") {
		t.Error("FK_DEBUG=true: response must NOT contain 'let FK_DEBUG = false'")
	}
	if !strings.Contains(body, "let FK_DEBUG = true") {
		t.Error("FK_DEBUG=true: response must contain 'let FK_DEBUG = true'")
	}
}

func TestParsePort(t *testing.T) {
	tests := []struct {
		name     string
		flagPort int
		env      string
		want     int
		wantErr  bool
	}{
		{"empty env uses flag", 8080, "", 8080, false},
		{"valid env overrides flag", 8080, "3000", 3000, false},
		{"garbage fails", 8080, "abc", 0, true},
		{"trailing junk fails (Sscanf regression)", 8080, "80abc", 0, true},
		{"negative fails", 8080, "-1", 0, true},
		{"zero fails", 8080, "0", 0, true},
		{"too large fails", 8080, "70000", 0, true},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got, err := parsePort(tc.flagPort, tc.env)
			if tc.wantErr {
				if err == nil {
					t.Fatalf("parsePort(%d, %q): expected error, got %d", tc.flagPort, tc.env, got)
				}
				return
			}
			if err != nil {
				t.Fatalf("parsePort(%d, %q): unexpected error: %v", tc.flagPort, tc.env, err)
			}
			if got != tc.want {
				t.Errorf("parsePort(%d, %q) = %d, want %d", tc.flagPort, tc.env, got, tc.want)
			}
		})
	}
}
